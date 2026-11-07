import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { chromium, expect } from "@playwright/test";
import { lessonSchema } from "../src/lib/learning.ts";
import { FAMILIES, curriculumSelectionSchema, subjectSelection, validateCurriculumContent } from "../src/lib/curriculum.ts";

nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const origin = new URL(process.env.E2E_BASE_URL ?? "http://127.0.0.1:3126");
assert.ok(["localhost", "127.0.0.1"].includes(origin.hostname), "A local application server is required.");
assert.equal(origin.protocol, "http:", "Use the local HTTP development server.");
assert.equal(origin.username + origin.password + origin.search + origin.hash, "", "Use a plain local origin.");
const database = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const runId = randomUUID();
const users = [];
let browser;
let stage = "initialize";
let evidence = "";
let activePage;
let passed = 0;
let screenshotDirectory;

function step(name) { stage = name; evidence = ""; console.log(`CHECK ${name}`); }
async function screenshot(page, name) {
  screenshotDirectory ??= await mkdtemp(join(tmpdir(), "forge-instructor-qa-"));
  const path = join(screenshotDirectory, `${name}.png`);
  await page.screenshot({ path, fullPage: true, mask: [page.locator('input[type="password"]')] });
  console.log(`SCREENSHOT ${path}`);
}
async function responsive(page, name) {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width < 900) {
      await expect(page.locator("#learner-navigation")).toHaveAttribute("inert", "");
      await page.getByRole("button", { name: "Open navigation", exact: true }).click();
      await expect(page.getByRole("button", { name: "Close navigation", exact: true })).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Open navigation", exact: true })).toBeFocused();
      await expect(page.locator("#learner-navigation")).toHaveAttribute("inert", "");
    }
    await screenshot(page, `${name}-${width}`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
}
function checked(result, operation) {
  if (result.error) throw new Error(`${operation} failed (provider detail suppressed)`);
  return result.data;
}
async function visit(page, path) {
  activePage = page;
  await page.goto(`${origin.origin}${path}`);
}
async function success(page, text) {
  evidence = `Expected successful UI action: ${text}`;
  await expect(page.getByRole("status").filter({ hasText: text })).toHaveCount(1);
  await expect(page.locator('.form-notice[role="alert"]')).toHaveCount(0);
}
async function denied(page, path) {
  await visit(page, path);
  evidence = "Expected unavailable-page heading and no editor or learner management controls";
  await expect(page.getByRole("heading", { name: "Lesson or page unavailable.", exact: true })).toBeVisible();
  await expect(page.locator('input[name="content"], input[name="learnerId"], .account-row')).toHaveCount(0);
}
function pass() { passed++; console.log(`PASS ${stage}`); }
function fixtureCurriculum() {
  const selection = subjectSelection("Software testing");
  assert.ok(selection, "The existing testing fixture must resolve through the curriculum registry.");
  return curriculumSelectionSchema.parse({
    subject: FAMILIES[selection.family],
    metadata: { version: 1, topic: selection.topic, audience: "learners", difficulty: "foundation",
      outcomes: ["Plan a reproducible test from a software requirement."],
      prerequisites: ["Read a short software requirement."] },
  });
}
async function fillCurriculumMetadata(page, selection = fixtureCurriculum()) {
  await page.locator('select[name="subject"]').selectOption(selection.subject);
  await page.locator('select[name="curriculumTopic"]').selectOption(selection.metadata.topic);
  await page.locator('select[name="audience"]').selectOption(selection.metadata.audience);
  await page.locator('select[name="difficulty"]').selectOption(selection.metadata.difficulty);
  await page.locator('textarea[name="outcomes"]').fill(selection.metadata.outcomes.join("\n"));
  await page.locator('textarea[name="prerequisites"]').fill(selection.metadata.prerequisites.join("\n"));
}
async function completeOnboarding(page, trustedRole) {
  const instructor = trustedRole === "admin" || trustedRole === "instructor";
  await page.waitForURL("**/onboarding");
  await expect(page.getByRole("group", { name: instructor ? "Instructor background and teaching goals" : "Learner background and learning goals", exact: true })).toBeVisible();
  await page.getByLabel("Background", { exact: true }).selectOption(instructor ? "teaching" : "coursework");
  await page.getByRole("form", { name: "Background and goals" }).getByRole("checkbox").first().check();
  await page.getByLabel("Your chosen learning level", { exact: true }).selectOption("foundation");
  await page.getByRole("button", { name: /^Save (and complete onboarding|background changes)$/ }).click();
  await expect(page.getByRole("status")).toContainText("Background, goals and your chosen level are saved.");
  await page.getByRole("link", { name: "Continue to dashboard", exact: true }).click();
  await page.waitForURL("**/dashboard");
}
async function assertProfileRevision(page, id) {
  const profile = checked(await database.from("profiles").select("age,learning_setup_revision,onboarding_completed_at,onboarding_background,diagnostic_summary").eq("id", id).single(), "Read temporary onboarding profile");
  assert.equal(profile.age, 22);
  assert.ok(profile.onboarding_completed_at, "Onboarding must be saved through its real UI.");
  assert.ok(Number.isInteger(profile.learning_setup_revision) && profile.learning_setup_revision > 0);
  await expect(page.locator('input[name="setupRevision"]')).toHaveValue(String(profile.learning_setup_revision));
  return profile.learning_setup_revision;
}
async function lesson(owner, label, visibility = "private") {
  assert.ok(users.includes(owner.id), "Fixture owner must belong to this run");
  const content = validateCurriculumContent(lessonSchema.parse({
    title: `QA ${label} ${runId}`, ...fixtureCurriculum(),
    summary: "Manually reviewed SDLC fixture covering test planning, execution and defect review.",
    slides: ["Plan requirements", "Design test cases", "Execute tests", "Review defects"].map(title => ({ title,
      body: "Trace each software requirement to a reproducible test and compare actual with expected results.",
      example: "For a calculator addition requirement, verify that adding two and three returns five." })),
    activity: { prompt: "Order the software testing lifecycle.", steps: ["Plan tests from requirements", "Execute test cases", "Review defects and retest"] },
    questions: Array.from({ length: 10 }, (_, index) => ({ prompt: `SDLC check ${index + 1}: what establishes expected software behavior?`,
      options: ["Agreed requirements", "Random output", "Skipping tests", "Ignoring defects"], correct: 0,
      explanation: "Agreed requirements define expected behavior and guide test cases." })),
  }));
  return checked(await database.from("forge_lessons").insert({ owner_id: owner.id, title: content.title,
    subject: content.subject, summary: content.summary, content, visibility,
    published_at: visibility === "public" ? new Date().toISOString() : null,
  }).select("*").single(), "Create isolated SDLC fixture");
}
async function readLesson(id) {
  return checked(await database.from("forge_lessons").select("*").eq("id", id).single(), "Read fixture lesson");
}
async function editor(page, id) {
  evidence = "Expected hydrated lesson editor for the selected fixture";
  await visit(page, `/studio?edit=${id}`);
  await expect(page.locator('input[name="lessonId"]').first()).toHaveAttribute("data-editor-ready", "true");
}
async function searchLearners(page, query) {
  activePage = page;
  await page.getByLabel("Learner email filter", { exact: true }).fill(query);
  await page.getByRole("button", { name: "Find learners", exact: true }).click();
  await expect(page.getByRole("button", { name: "Find learners", exact: true })).toBeEnabled();
  await expect(page.locator('.form-notice[role="alert"]')).toHaveCount(0);
}
async function progress(id) {
  return {
    enrollments: checked(await database.from("forge_enrollments").select("*").eq("lesson_id", id).order("user_id"), "Read fixture enrollments"),
    attempts: checked(await database.from("forge_attempts").select("*").eq("lesson_id", id).order("id"), "Read fixture attempts"),
  };
}
async function account(role) {
  evidence = `Create temporary ${role} account`;
  const email = `forge-instructor-${runId}-${role}@example.com`;
  const password = `Test9!${randomUUID()}`;
  const { user } = checked(await database.auth.admin.createUser({ email, password, email_confirm: true,
    user_metadata: { display_name: `QA ${role}`, age: 22, age_range: "18-24" },
    app_metadata: role === "admin" ? { role: "admin" } : { role: "learner", ai_access: false },
  }), "Temporary account creation");
  users.push(user.id);
  evidence = `Open browser context for temporary ${role}`;
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route("**/*", route => new URL(route.request().url()).origin === origin.origin ? route.continue() : route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await visit(page, "/login");
  evidence = `Sign in temporary ${role} through local login form`;
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await completeOnboarding(page, user.app_metadata?.role);
  await visit(page, "/profile");
  await assertProfileRevision(page, user.id);
  await visit(page, "/dashboard");
  return { id: user.id, email, page, context };
}
async function accountRow(admin, target) {
  await visit(admin.page, "/admin/accounts");
  await admin.page.getByLabel("Email filter", { exact: true }).fill(target.email);
  await admin.page.getByRole("button", { name: "Search accounts", exact: true }).click();
  const row = admin.page.locator(".account-row").filter({ has: admin.page.locator(`input[name="accountId"][value="${target.id}"]`) });
  await expect(row).toHaveCount(1);
  await expect(admin.page.locator(".account-row")).toHaveCount(1);
  return row;
}

try {
  step("onboarding/profile schema preflight");
  evidence = "Requires age eligibility and 20261015_onboarding_diagnostic.sql on the approved disposable database; no fixtures created yet.";
  checked(await database.from("profiles").select("age,learning_setup_revision,onboarding_completed_at,onboarding_background,diagnostic_summary").limit(0), "Onboarding/profile schema preflight");
  browser = await chromium.launch();
  step("anonymous protected-page denial");
  const anonymous = await browser.newContext();
  for (const path of ["/admin", "/admin/accounts", "/teaching", "/studio", "/reports", "/onboarding", "/diagnostic"]) {
    evidence = `Anonymous ${path} must redirect to a local login page`;
    const response = await anonymous.request.get(`${origin.origin}${path}`, { maxRedirects: 0 });
    assert.equal(response.status(), 307, "Anonymous protected request must redirect");
    const destination = new URL(response.headers().location, origin);
    assert.ok(["localhost", "127.0.0.1"].includes(destination.hostname), "Auth redirect must stay local");
    assert.equal(destination.pathname, "/login");
  }
  await anonymous.close();
  pass();
  step("create isolated admin, instructor candidate and two verified learners");
  const admin = await account("admin");
  const owner = await account("owner");
  const learner = await account("learner");
  const second = await account("second");
  pass();
  step("learner and administrator private-authoring boundaries");
  const own = await lesson(owner, "owner");
  const otherPrivate = await lesson(learner, "other-private");
  const otherPublic = await lesson(admin, "other-public", "public");
  for (const path of ["/admin", "/admin/accounts", "/teaching"]) await denied(owner.page, path);
  await denied(admin.page, `/studio?edit=${otherPrivate.id}`);
  await editor(owner.page, own.id);
  await expect(owner.page.locator('input[name="publish"]')).toHaveCount(0);
  await owner.page.locator('input[name="lessonId"]').first().evaluate(input => {
    const publish = document.createElement("input");
    publish.type = "hidden"; publish.name = "publish"; publish.value = "on";
    input.form.append(publish);
  });
  await owner.page.getByRole("button", { name: "Save lesson", exact: true }).click();
  await expect(owner.page.locator('.form-notice[role="alert"]')).toHaveText("Instructor access is required to publish lessons.");
  assert.deepEqual(await readLesson(own.id), own, "Learner publish denial must not change the lesson");
  pass();
  step("administrator email lookup and UI instructor grant");
  const row = await accountRow(admin, owner);
  await row.locator('select[name="role"]').selectOption("instructor");
  const grantRequest = admin.page.waitForRequest(request => request.method() === "POST" && Boolean(request.headers()["next-action"]));
  await row.getByRole("button", { name: "Save permissions", exact: true }).click();
  const capturedGrant = await grantRequest;
  await success(admin.page, "Account permissions saved.");
  assert.equal(checked(await database.auth.admin.getUserById(owner.id), "Verify temporary role").user.app_metadata.role, "instructor");
  await visit(owner.page, "/onboarding");
  await completeOnboarding(owner.page, "instructor");
  const instructorBackground = checked(await database.from("profiles").select("onboarding_background").eq("id", owner.id).single(), "Verify trusted instructor onboarding").onboarding_background;
  assert.equal(instructorBackground.role, "instructor");
  await screenshot(admin.page, "instructor-granted");
  await responsive(admin.page, "account-layout");
  pass();
  step("learner cannot invoke captured administrator action");
  const deniedGrant = await learner.context.request.post(`${origin.origin}/admin/accounts`, {
    headers: { "next-action": capturedGrant.headers()["next-action"], "content-type": capturedGrant.headers()["content-type"], origin: origin.origin },
    data: capturedGrant.postDataBuffer(), maxRedirects: 0,
  });
  assert.equal(deniedGrant.status(), 200, "Expected handled server-action denial");
  assert.ok((await deniedGrant.text()).includes("Administrator access required."), "Server action must reject non-admin actor");
  pass();
  step("administrator AI approval requires explicit consent review, not recorded age");
  const ageRow = await accountRow(admin, owner);
  await ageRow.locator('input[name="aiAccess"]').check();
  await ageRow.locator('input[name="confirmAi"]').uncheck();
  await ageRow.getByRole("button", { name: "Save permissions", exact: true }).click();
  await expect(ageRow.getByRole("alert")).toHaveText("Confirm administrator consent review before approving external AI access.");
  await ageRow.locator('input[name="confirmAi"]').check();
  await ageRow.getByRole("button", { name: "Save permissions", exact: true }).click();
  await success(admin.page, "Account permissions saved.");
  assert.equal(checked(await database.auth.admin.getUserById(owner.id), "Verify trusted grant").user.app_metadata.ai_access, true);
  await ageRow.locator('input[name="aiAccess"]').uncheck();
  await ageRow.getByRole("button", { name: "Save permissions", exact: true }).click();
  await success(admin.page, "Account permissions saved.");
  assert.equal(checked(await database.auth.admin.getUserById(owner.id), "Verify AI remains disabled").user.app_metadata.ai_access, false);
  await screenshot(admin.page, "administrator-ai-approval-revoked");
  pass();
  step("instructor edits and publishes own private lesson through studio");
  await editor(owner.page, own.id);
  await owner.page.getByLabel(/^Summary/).fill("Reviewed SDLC test planning lesson updated through the real studio editor.");
  await owner.page.getByRole("button", { name: "Save lesson", exact: true }).click();
  await expect(owner.page.locator('input[name="version"]')).toHaveValue("2");
  assert.equal((await readLesson(own.id)).visibility, "private");
  await owner.page.locator('input[name="publish"]').check();
  await owner.page.getByRole("button", { name: "Save lesson", exact: true }).click();
  await expect(owner.page.locator('input[name="version"]')).toHaveValue("3");
  const published = await readLesson(own.id);
  assert.equal(published.visibility, "public");
  assert.equal(published.summary, "Reviewed SDLC test planning lesson updated through the real studio editor.");
  assert.ok(published.published_at);
  await expect(owner.page.locator('.form-notice[role="alert"]')).toHaveCount(0);
  await screenshot(owner.page, "own-lesson-published");
  pass();
  step("instructor cannot edit others public lessons or inspect private lessons");
  for (const path of ["/admin", "/admin/accounts", `/studio?edit=${otherPublic.id}`, `/studio?edit=${otherPrivate.id}`, `/courses/${otherPrivate.id}`, `/teaching?lesson=${otherPublic.id}`, `/teaching?lesson=${otherPrivate.id}`]) await denied(owner.page, path);
  await editor(owner.page, own.id);
  await owner.page.locator('input[name="lessonId"]').evaluate((input, id) => { input.value = id; }, otherPublic.id);
  await owner.page.getByRole("button", { name: "Save lesson", exact: true }).click();
  await expect(owner.page.locator('.form-notice[role="alert"]')).toHaveText("You cannot edit this lesson.");
  assert.deepEqual(await readLesson(otherPublic.id), otherPublic, "Cross-owner edit must leave public lesson unchanged");
  assert.deepEqual(await readLesson(otherPrivate.id), otherPrivate, "Private lesson must remain unchanged");
  pass();
  step("verified learner directory excludes admin and instructor accounts");
  await visit(owner.page, `/teaching?lesson=${own.id}`);
  await searchLearners(owner.page, runId);
  await expect(owner.page.locator('input[name="learnerId"]')).toHaveCount(2);
  for (const target of [learner, second]) await expect(owner.page.locator(`input[name="learnerId"][value="${target.id}"]`)).toHaveCount(1);
  for (const target of [admin, owner]) {
    await searchLearners(owner.page, target.email);
    await expect(owner.page.getByRole("status").filter({ hasText: "No verified learners match this email filter." })).toBeVisible();
    await expect(owner.page.locator('input[name="learnerId"]')).toHaveCount(0);
  }
  pass();
  step("new and duplicate learner enrollment preserves attendance and quiz records");
  checked(await database.from("forge_enrollments").insert({ user_id: learner.id, lesson_id: own.id,
    enrollment_kind: "public", attendance_kind: "public", attended_at: "2026-09-24T12:00:00.000Z" }), "Seed duplicate enrollment progress");
  checked(await database.from("forge_attempts").insert({ user_id: learner.id, lesson_id: own.id, original_lesson_id: own.id,
    lesson_title: published.title, lesson_version: published.version, certificate_kind: "public",
    questions: published.content.questions, answers: Array(10).fill(0), score: 10 }), "Seed completed quiz progress");
  const before = await progress(own.id);
  await searchLearners(owner.page, runId);
  await expect(owner.page.locator('input[name="learnerId"]')).toHaveCount(2);
  for (const target of [learner, second]) await owner.page.locator(`input[name="learnerId"][value="${target.id}"]`).check();
  await owner.page.getByRole("button", { name: "Enroll selected learners", exact: true }).click();
  await success(owner.page, "Enrollment confirmed for 2 selected learner(s). Existing progress is unchanged.");
  const after = await progress(own.id);
  assert.equal(after.enrollments.length, 2);
  assert.deepEqual(after.enrollments.find(record => record.user_id === learner.id), before.enrollments[0], "Duplicate enrollment must preserve all fields");
  assert.equal(after.enrollments.find(record => record.user_id === second.id).enrollment_kind, "public");
  assert.deepEqual(after.attempts, before.attempts, "Quiz progress must be preserved");
  await screenshot(owner.page, "enrollment-preserved");
  await responsive(owner.page, "teaching-layout");
  await visit(learner.page, "/paths");
  await expect(learner.page.getByRole("heading", { name: "Learning paths", exact: true })).toBeVisible();
  await responsive(learner.page, "paths-layout");
  pass();
  step("reports show own counts and exclude other owners and private lessons");
  await visit(owner.page, "/reports");
  await expect(owner.page.getByRole("heading", { level: 2 })).toHaveText([own.title]);
  await expect(owner.page.getByRole("heading", { name: "CURRENT PUBLIC ENROLLMENT ROSTER", exact: true })).toBeVisible();
  await expect(owner.page.locator(".learning-section")).toContainText(`Current lesson version ${published.version}`);
  await expect(owner.page.locator(".learning-section")).toContainText("2 learners · 0 reviewed · 0 attended · 1 passed");
  await expect(owner.page.getByRole("heading", { name: "Public attempt history (all versions)", exact: true })).toBeVisible();
  await expect(owner.page.locator(".learning-section details")).toHaveCount(1);
  await expect(owner.page.locator(".learning-section summary")).toContainText("10/10");
  await expect(owner.page.locator(".learning-section summary")).toContainText(`Version ${published.version}`);
  await screenshot(owner.page, "own-lesson-report");
  await visit(owner.page, `/reports?lesson=${otherPublic.id}`);
  await expect(owner.page.getByRole("heading", { level: 2 })).toHaveText([own.title]);
  await visit(learner.page, "/reports");
  await expect(learner.page.getByText("No published lessons have been granted to your account for review.")).toBeVisible();
  await expect(learner.page.locator(".learning-section")).toHaveCount(0);
  pass();
  step("prepare stale authorized forms before administrator revocation");
  const privateDraft = await lesson(owner, "revocation-private");
  const publishPage = await owner.context.newPage();
  const importPage = await owner.context.newPage();
  const enrollmentPage = await owner.context.newPage();
  for (const page of [publishPage, importPage, enrollmentPage]) page.setDefaultTimeout(15000);
  await editor(publishPage, privateDraft.id);
  await publishPage.locator('input[name="publish"]').check();
  await editor(owner.page, own.id);
  await visit(importPage, "/teaching");
  await fillCurriculumMetadata(importPage);
  await importPage.getByLabel("Learning objective within the selected curriculum topic").fill("Plan software tests from agreed requirements.");
  await importPage.getByLabel("Teaching file").setInputFiles({ name: "sdlc.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\nQA fixture: role denial must occur before parsing.\n%%EOF") });
  await importPage.locator('input[name="consent"]').check();
  await visit(enrollmentPage, `/teaching?lesson=${own.id}`);
  await searchLearners(enrollmentPage, second.email);
  await enrollmentPage.locator(`input[name="learnerId"][value="${second.id}"]`).check();
  pass();
  step("administrator revokes instructor through UI");
  const revokeRow = await accountRow(admin, owner);
  await revokeRow.locator('select[name="role"]').selectOption("learner");
  await revokeRow.locator('input[name="aiAccess"]').uncheck();
  await revokeRow.getByRole("button", { name: "Save permissions", exact: true }).click();
  await success(admin.page, "Account permissions saved.");
  assert.equal(checked(await database.auth.admin.getUserById(owner.id), "Verify role revoked").user.app_metadata.role, "learner");
  pass();
  step("next stale-page publish request is denied after revocation");
  activePage = publishPage;
  await publishPage.getByRole("button", { name: "Save lesson", exact: true }).click();
  await expect(publishPage.locator('.form-notice[role="alert"]')).toHaveText("Instructor access is required to publish lessons.");
  assert.deepEqual(await readLesson(privateDraft.id), privateDraft);
  pass();
  step("next stale-page public edit is denied after revocation");
  activePage = owner.page;
  await owner.page.getByRole("button", { name: "Save lesson", exact: true }).click();
  await expect(owner.page.locator('.form-notice[role="alert"]')).toHaveText("You cannot edit this lesson.");
  assert.deepEqual(await readLesson(own.id), published);
  pass();
  step("next stale-page material import is denied before parsing or AI");
  activePage = importPage;
  await importPage.getByRole("button", { name: "Generate editable draft", exact: true }).click();
  await expect(importPage.locator('.form-notice[role="alert"]')).toHaveText("Instructor access required.");
  const quota = checked(await database.from("forge_requests").select("count").eq("user_id", owner.id), "Verify no generation quota used");
  assert.equal(quota.length, 0, "No AI generation request should have been claimed");
  await screenshot(importPage, "revoked-import-denied");
  pass();
  step("next stale-page learner enrollment is denied after revocation");
  activePage = enrollmentPage;
  await enrollmentPage.getByRole("button", { name: "Enroll selected learners", exact: true }).click();
  await expect(enrollmentPage.locator('.form-notice[role="alert"]')).toHaveText("You cannot manage enrollment for this lesson.");
  assert.deepEqual(await progress(own.id), after);
  await screenshot(enrollmentPage, "revoked-enrollment-denied");
  pass();
  step("fresh revoked instructor pages and reports deny elevated access");
  for (const path of ["/teaching", "/admin/accounts", `/studio?edit=${own.id}`]) await denied(owner.page, path);
  await visit(owner.page, "/reports");
  await expect(owner.page.getByText("No published lessons have been granted to your account for review.")).toBeVisible();
  await expect(owner.page.locator(".learning-section")).toHaveCount(0);
  await editor(owner.page, privateDraft.id);
  await expect(owner.page.locator('input[name="publish"]')).toHaveCount(0);
  await screenshot(owner.page, "revoked-private-editor");
  pass();
  console.log(`PASS all ${passed} instructor QA stages; no mail callbacks or AI generation requested`);
} catch (error) {
  if (activePage && !activePage.isClosed()) await screenshot(activePage, "failure").catch(() => console.error("Failure screenshot unavailable"));
  const safeAlerts = ["Could not save this lesson.", "You cannot edit this lesson.", "Instructor access required.",
    "Could not search accounts. Check your session and search value, then retry.",
    "Learner search failed. Check your session and search value, then retry.", "Could not create this lesson. Check the database migration."];
  const alerts = await activePage?.locator('.form-notice[role="alert"]').allTextContents().catch(() => []);
  const matched = safeAlerts.filter(message => alerts?.some(text => text.includes(message)));
  const line = error.stack?.match(/instructor-e2e\.mjs:(\d+):\d+/)?.[1];
  console.error(`FAIL ${stage}: ${evidence || "Assertion or request failed"} (${error.name}, harness line ${line ?? "unknown"})`);
  for (const detail of ["Target page, context or browser has been closed", "Browser closed", "ECONNREFUSED", "Timeout", "net::ERR", "strict mode violation"]) {
    if (error.message?.includes(detail)) console.error(`Runtime evidence: ${detail}`);
  }
  if (matched.length) console.error(`UI evidence: ${matched.join(" | ")}`);
  else if (alerts?.length) console.error("UI alert present; unrecognized text suppressed to protect account data");
  console.error(`Completed ${passed} stages; later stages were NOT run`);
  process.exitCode = 1;
} finally {
  let cleaned = 0;
  for (const id of users.reverse()) {
    try { checked(await database.auth.admin.deleteUser(id), "Temporary account cleanup"); cleaned++; }
    catch { console.error("FAIL cleanup: temporary account deletion failed"); process.exitCode = 1; }
  }
  console.log(`CLEANUP deleted ${cleaned}/${users.length} temporary accounts`);
  await browser?.close().catch(() => { process.exitCode = 1; });
}