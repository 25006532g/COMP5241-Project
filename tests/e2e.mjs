import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { chromium, firefox, webkit, expect } from "@playwright/test";
import sharp from "sharp";
import { FAMILIES, curriculumSelectionSchema, subjectSelection } from "../src/lib/curriculum.ts";

nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const origin = process.env.E2E_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname), "Browser tests require a local application server.");
assert.equal(origin, process.env.NEXT_PUBLIC_SITE_URL, "E2E_BASE_URL must match NEXT_PUBLIC_SITE_URL for auth redirects.");
const database = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const users = [];
const runId = randomUUID();
const output = join(tmpdir(), `forge-e2e-${runId}`);
let browser;
let editorPage;
let profilePage;
let stage = "initialize";

function step(name) { stage = name; console.log(`CHECK ${name}`); }
function checked(result) { if (result.error) throw new Error("Fixture operation failed"); return result.data; }
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
  const profile = checked(await database.from("profiles").select("age,learning_setup_revision,onboarding_completed_at,onboarding_background,diagnostic_summary").eq("id", id).single());
  assert.equal(profile.age, 22);
  assert.ok(profile.onboarding_completed_at, "Onboarding must be saved through its real UI.");
  assert.ok(Number.isInteger(profile.learning_setup_revision) && profile.learning_setup_revision > 0);
  await expect(page.locator('input[name="setupRevision"]')).toHaveValue(String(profile.learning_setup_revision));
  return profile.learning_setup_revision;
}
async function account(role) {
  const email = `forge-e2e-${role}-${runId}@example.com`;
  const password = `Test9!${randomUUID()}`;
  const data = checked(await database.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: `Test ${role}`, age: 22, age_range: "18-24" }, app_metadata: role === "admin" ? { role: "admin" } : {} }));
  users.push(data.user.id);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await page.goto(`${origin}/login`);
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await completeOnboarding(page, data.user.app_metadata?.role);
  await expect(page.getByRole("heading", { name: `Welcome, Test ${role}.` })).toBeVisible();
  return { id: data.user.id, page, context, password, email };
}
async function quiz(page, correctCount) {
  for (let index = 0; index < 10; index++) await page.locator(`input[name="question-${index}"]`).nth(index < correctCount ? 0 : 1).check();
  await page.getByRole("button", { name: "Submit quiz", exact: true }).click();
  await expect(page.getByRole("heading", { name: `${correctCount} / 10 (${correctCount * 10}%)`, exact: true })).toBeVisible();
}
async function fits(page, filename) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Horizontal overflow");
  await page.screenshot({ path: join(output, filename), fullPage: true });
}

try {
  step("onboarding/profile schema preflight");
  try { checked(await database.from("profiles").select("age,learning_setup_revision,onboarding_completed_at,onboarding_background,diagnostic_summary").limit(0)); }
  catch { throw new Error("Both E2E scopes require the age-eligibility and 20261015_onboarding_diagnostic.sql migrations for onboarding/profile editing. Have the owner verify them on the approved disposable database before rerunning. No fixtures created; provider details omitted."); }
  if (process.env.E2E_SCOPE !== "authoring") {
    step("full-suite schema preflight");
    for (const [table, columns, requirement] of [
      ["forge_resume", "*", "forge_resume and service-role access (20260927_resume_ran.sql and 20260930_resume_grant_ran.sql)"],
      ["forge_reflections", "id,owner_id,date,delegation,description,discernment,diligence,revision,created_at,updated_at", "daily reflections required by complete account export (20261022_daily_reflections_ran.sql; source file is not application evidence)"],
    ]) {
      try { checked(await database.from(table).select(columns).limit(0)); }
      catch { throw new Error(`Full E2E requires readable ${requirement}. Have the owner apply outstanding README migrations in order on the approved disposable database, then rerun. No fixtures created; provider details omitted.`); }
    }
  } else {
    console.log("Authoring scope requires real onboarding and profile schema readiness; it does not verify full profile persistence or resume readiness.");
  }
  await mkdir(output, { recursive: true });
  browser = await ({ firefox, webkit }[process.env.E2E_BROWSER] ?? chromium).launch();
  step("anonymous and stale-session protected access");
  const anonymous = await browser.newContext();
  for (const cookie of [undefined, { name: "sb-stale-auth-token", value: "expired", domain: new URL(origin).hostname, path: "/" }]) {
    if (cookie) await anonymous.addCookies([cookie]);
    for (const path of ["/dashboard", "/onboarding", "/diagnostic"]) {
      const pageResponse = await anonymous.request.get(`${origin}${path}`, { maxRedirects: 0 });
      assert.equal(pageResponse.status(), 307);
      assert.equal(new URL(pageResponse.headers().location, origin).pathname, "/login");
    }
    const apiResponse = await anonymous.request.get(`${origin}/api/account/export`, { maxRedirects: 0 });
    assert.equal(apiResponse.status(), 401);
  }
  await anonymous.close();
  step("temporary learner, reviewer and administrator sign-in");
  const owner = await account("owner");
  editorPage = owner.page;
  const learner = await account("learner");
  profilePage = learner.page;
  const admin = await account("admin");
  const title = `Test lesson ${runId}`;
  step("auth validation and provider error focus");
  const validationContext = await browser.newContext();
  const validationPage = await validationContext.newPage();
  await validationPage.goto(`${origin}/login`);
  await validationPage.getByLabel("Email address", { exact: true }).evaluate(input => { input.type = "text"; });
  await validationPage.getByLabel("Email address", { exact: true }).fill("invalid-email");
  await validationPage.getByLabel("Password", { exact: true }).fill("Wrong9!Password");
  await validationPage.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(validationPage.getByLabel("Email address", { exact: true })).toBeFocused();
  await validationPage.getByLabel("Email address", { exact: true }).fill(owner.email);
  await validationPage.getByLabel("Password", { exact: true }).fill("Wrong9!Password");
  await validationPage.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(validationPage.locator('.form-notice[role="alert"]')).toContainText("The email or password is incorrect.");
  await expect(validationPage.locator('.form-notice[role="alert"]')).toBeFocused();
  await validationContext.close();
  step("profile validation focuses the invalid field");
  await owner.page.goto(`${origin}/profile`);
  await expect(owner.page.locator(".settings-panel")).toHaveAttribute("data-profile-ready", "true");
  await assertProfileRevision(owner.page, owner.id);
  const profileName = owner.page.locator('input[name="displayName"]');
  await profileName.evaluate(input => { input.minLength = 0; });
  await profileName.fill("X");
  await owner.page.locator('input[name="age"]').fill("22");
  await owner.page.getByRole("button", { name: "Save profile" }).click();
  await expect(profileName).toHaveAttribute("aria-invalid", "true");
  await expect(profileName).toBeFocused();
  step("catalog search keyboard access and active navigation");
  await owner.page.goto(`${origin}/catalog`);
  await expect(owner.page.getByRole("link", { name: "Course catalog" })).toHaveAttribute("aria-current", "page");
  await expect(owner.page.locator('input[name="q"]')).toHaveAttribute("data-shortcut-ready", "true");
  await owner.page.keyboard.press("/");
  await expect(owner.page.locator('input[name="q"]')).toBeFocused();
  await owner.page.keyboard.press("Escape");
  await expect(owner.page.locator('input[name="q"]')).not.toBeFocused();
  await owner.page.setViewportSize({ width: 390, height: 844 });
  await owner.page.getByRole("button", { name: "Open navigation" }).click();
  await expect(owner.page.getByRole("button", { name: "Close navigation", exact: true })).toBeFocused();
  await owner.page.keyboard.press("Escape");
  await expect(owner.page.getByRole("button", { name: "Open navigation" })).toBeFocused();
  await owner.page.setViewportSize({ width: 1440, height: 1000 });
  step("manual private lesson authoring through the editor");
  await owner.page.goto(`${origin}/studio?manual=1`);
  await expect(owner.page.locator('input[name="lessonId"]').first()).toHaveAttribute("data-editor-ready", "true");
  await owner.page.getByLabel("Title", { exact: true }).fill(title);
  await fillCurriculumMetadata(owner.page);
  await owner.page.getByLabel("Summary", { exact: true }).fill("A temporary end-to-end test of the learning workflow.");
  for (let index = 0; index < 4; index++) {
    const slide = owner.page.getByRole("group", { name: `Slide ${index + 1}`, exact: true });
    await slide.getByLabel("title", { exact: true }).fill(`Testing step ${index + 1}`);
    await slide.getByLabel("body", { exact: true }).fill("Arrange the inputs, act on the function, then assert the expected output.");
    await slide.getByLabel("example", { exact: true }).fill("Arrange two numbers, add them, and check their sum.");
  }
  await owner.page.getByLabel("Prompt", { exact: true }).fill("Put the test steps in order.");
  await owner.page.getByLabel("Steps in correct order, one per line", { exact: true }).fill("Arrange inputs\nAct on the function\nAssert the output");
  for (let index = 0; index < 10; index++) {
    const question = owner.page.locator("details").nth(index);
    await question.locator("summary").click();
    await question.getByLabel("Question", { exact: true }).fill(`Question ${index + 1}: what comes first?`);
    for (const [option, text] of ["Arrange", "Assert", "Act", "Skip"].entries()) await question.getByLabel(`Option ${option + 1}`, { exact: true }).fill(text);
    await question.getByLabel("Explanation", { exact: true }).fill(`Answer-key-only explanation ${runId}`);
  }
  await owner.page.getByRole("button", { name: "Save lesson", exact: true }).click();
  await expect(owner.page.getByRole("status")).toContainText("Lesson created.");
  const lessonUrl = await owner.page.getByRole("link", { name: "Open lesson", exact: true }).getAttribute("href");
  const lessonId = lessonUrl.split("/").at(-1);
  const createdLesson = checked(await database.from("forge_lessons").select("visibility,subject,content").eq("id", lessonId).single());
  assert.equal(createdLesson.visibility, "private");
  assert.equal(createdLesson.subject, fixtureCurriculum().subject);
  assert.deepEqual(createdLesson.content.metadata, fixtureCurriculum().metadata);

  step("enrolled resume links lead to the lesson player");
  await owner.page.goto(`${origin}/catalog`);
  await expect(owner.page.locator(".catalog-card").filter({ hasText: title }).getByRole("link", { name: "View and enroll" })).toHaveAttribute("href", lessonUrl);
  await owner.page.goto(`${origin}${lessonUrl}`);
  await owner.page.getByRole("button", { name: "Enroll in lesson" }).click();
  await expect(owner.page.getByRole("link", { name: "Open lesson" }).first()).toBeVisible();
  await owner.page.goto(`${origin}/catalog`);
  await expect(owner.page.locator(".catalog-card").filter({ hasText: title }).getByRole("link", { name: "Continue lesson" })).toHaveAttribute("href", `${lessonUrl}/lessons/1`);
  await owner.page.goto(`${origin}/dashboard`);
  await expect(owner.page.locator(".learning-list").getByRole("link", { name: new RegExp(title) })).toHaveAttribute("href", `${lessonUrl}/lessons/1`);
  if (process.env.E2E_SCOPE === "authoring") {
    step("lesson section and quiz result focus");
    await owner.page.goto(`${origin}${lessonUrl}/lessons/1`);
    await owner.page.setViewportSize({ width: 844, height: 390 });
    assert.equal(await owner.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Lesson overflows mobile landscape width");
    const coachQuestion = owner.page.getByLabel("Ask about this lesson");
    await coachQuestion.scrollIntoViewIfNeeded();
    await expect(coachQuestion).toBeInViewport();
    await owner.page.setViewportSize({ width: 1440, height: 1000 });
    await expect(owner.page.getByRole("heading", { name: "Testing step 1" })).toBeVisible();
    await owner.page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(owner.page.getByRole("heading", { name: "Testing step 2" })).toBeFocused();
    await owner.page.getByRole("button", { name: "Practice", exact: true }).first().click();
    await expect(owner.page.getByRole("heading", { name: "Put the test steps in order." })).toBeFocused();
    await owner.page.getByRole("button", { name: "Final quiz", exact: true }).click();
    await expect(owner.page.getByRole("heading", { name: "Final quiz" })).toBeFocused();
    for (let index = 0; index < 10; index++) await owner.page.locator(`input[name="question-${index}"]`).first().check();
    await owner.page.getByRole("button", { name: "Submit quiz" }).click();
    await expect(owner.page.getByRole("heading", { name: "10 / 10 (100%)" })).toBeFocused();
    await owner.page.getByRole("button", { name: "Retry quiz" }).click();
    await expect(owner.page.getByRole("heading", { name: "Final quiz" })).toBeFocused();
  }

  step("combined catalog filters, empty state and clear");
  await owner.page.goto(`${origin}/catalog`);
  await owner.page.locator('input[name="q"]').fill(title);
  await owner.page.locator('select[name="subject"]').selectOption(fixtureCurriculum().subject);
  await owner.page.locator('select[name="audience"]').selectOption(fixtureCurriculum().metadata.audience);
  await owner.page.locator('select[name="difficulty"]').selectOption(fixtureCurriculum().metadata.difficulty);
  await owner.page.locator('select[name="visibility"]').selectOption("private");
  await owner.page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(owner.page.locator(".catalog-card")).toHaveCount(1);
  await expect(owner.page.locator(".catalog-card")).toContainText(title);
  await owner.page.locator('select[name="visibility"]').selectOption("public");
  await owner.page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(owner.page.getByRole("heading", { name: "No matching lessons." })).toBeVisible();
  await owner.page.getByRole("link", { name: "Clear", exact: true }).click();
  await expect(owner.page.locator('input[name="q"]')).toHaveValue("");
  await expect(owner.page.locator('select[name="audience"]')).toHaveValue("");
  await expect(owner.page.locator('select[name="difficulty"]')).toHaveValue("");
  await expect(owner.page.locator(".catalog-card").filter({ hasText: title })).toHaveCount(1);

  step("consecutive editor saves use the latest version");
  await owner.page.goto(`${origin}/studio?edit=${lessonId}`);
  await expect(owner.page.locator('input[name="lessonId"]').first()).toHaveAttribute("data-editor-ready", "true");
  await owner.page.setViewportSize({ width: 844, height: 390 });
  assert.equal(await owner.page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Editor overflows mobile landscape width");
  await owner.page.getByRole("button", { name: "Preview lesson" }).click();
  await expect(owner.page.getByRole("button", { name: "Close preview" })).toBeInViewport();
  await owner.page.getByRole("button", { name: "Close preview" }).click();
  await owner.page.setViewportSize({ width: 1440, height: 1000 });
  await owner.page.getByLabel(/^Summary/).fill("Preview and navigation check before saving.");
  await owner.page.getByRole("button", { name: "Preview lesson" }).click();
  await expect(owner.page.getByRole("dialog", { name: "Learner-facing lesson preview" })).toContainText("Preview and navigation check before saving.");
  await owner.page.getByRole("button", { name: "Close preview" }).click();
  const cancelledLink = owner.page.getByRole("link", { name: "Course catalog" }).click();
  await (await owner.page.waitForEvent("dialog")).dismiss();
  await cancelledLink;
  await expect(owner.page).toHaveURL(`${origin}/studio?edit=${lessonId}`);
  await owner.page.goto(`${origin}/catalog`);
  await owner.page.goto(`${origin}/studio?edit=${lessonId}`);
  await expect(owner.page.locator('input[name="lessonId"]').first()).toHaveAttribute("data-editor-ready", "true");
  await owner.page.getByLabel(/^Summary/).fill("Unsaved browser history edit.");
  const dismissedBack = owner.page.waitForEvent("dialog");
  await owner.page.evaluate(() => history.back());
  await (await dismissedBack).dismiss();
  await expect(owner.page).toHaveURL(`${origin}/studio?edit=${lessonId}`);
  await expect(owner.page.getByLabel(/^Summary/)).toHaveValue("Unsaved browser history edit.");
  for (const version of [2, 3]) {
    await owner.page.getByLabel(/^Summary/).fill(`Temporary learning workflow fixture, revision ${version}.`);
    await owner.page.getByRole("button", { name: "Save lesson", exact: true }).click();
    await expect(owner.page.locator('input[name="version"]')).toHaveValue(String(version));
  }
  step("failed editor save preserves unsaved changes");
  checked(await database.from("forge_lessons").update({ version: 4 }).eq("id", lessonId).eq("version", 3).select("id").single());
  await owner.page.getByLabel(/^Summary/).fill("Unsaved after a concurrent edit.");
  await owner.page.getByRole("button", { name: "Save lesson", exact: true }).click();
  await expect(owner.page.getByRole("alert").filter({ hasText: "changed in another session" })).toBeVisible();
  const cancelledFailedSaveLink = owner.page.getByRole("link", { name: "Course catalog" }).click();
  await (await owner.page.waitForEvent("dialog")).dismiss();
  await cancelledFailedSaveLink;
  await expect(owner.page).toHaveURL(`${origin}/studio?edit=${lessonId}`);
  await expect(owner.page.getByLabel(/^Summary/)).toHaveValue("Unsaved after a concurrent edit.");
  const acceptLink = dialog => { void dialog.accept().catch(() => {}); };
  owner.page.on("dialog", acceptLink);
  try {
    await owner.page.getByRole("link", { name: "Course catalog" }).click();
    await expect(owner.page).toHaveURL(`${origin}/catalog`);
  } finally { owner.page.off("dialog", acceptLink); }
  await owner.page.goto(`${origin}${lessonUrl}`);
  await owner.page.getByRole("link", { name: "Edit lesson" }).click();
  await expect(owner.page.locator('input[name="lessonId"]').first()).toHaveAttribute("data-editor-ready", "true");
  await owner.page.getByLabel(/^Summary/).fill("Unsaved client-side history edit.");
  const cancelledClientBack = owner.page.waitForEvent("dialog");
  await owner.page.evaluate(() => history.back());
  await (await cancelledClientBack).dismiss();
  await expect(owner.page).toHaveURL(`${origin}/studio?edit=${lessonId}`);
  await expect(owner.page.getByLabel(/^Summary/)).toHaveValue("Unsaved client-side history edit.");
  const acceptBack = dialog => { void dialog.accept().catch(() => {}); };
  owner.page.on("dialog", acceptBack);
  try {
    await owner.page.evaluate(() => history.back());
    await expect(owner.page).toHaveURL(`${origin}${lessonUrl}`);
  } finally { owner.page.off("dialog", acceptBack); }

  if (process.env.E2E_SCOPE === "authoring") {
    step("reviewer preview preserves draft isolation and published content");
    await admin.page.goto(`${origin}/studio?edit=${lessonId}`);
    await expect(admin.page.getByRole("heading", { name: "Lesson or page unavailable." })).toBeVisible();
    await owner.page.goto(`${origin}/studio?edit=${lessonId}`);
    await owner.page.getByRole("button", { name: "Submit for publication review" }).click();
    await expect(owner.page.getByRole("status")).toContainText("Submitted.");
    await admin.page.goto(`${origin}/studio?edit=${lessonId}`);
    await admin.page.getByRole("button", { name: "Preview lesson" }).click();
    const reviewPreview = admin.page.getByRole("dialog", { name: "Learner-facing lesson preview" });
    await expect(reviewPreview).toContainText(title);
    await expect(reviewPreview).not.toContainText(`Answer-key-only explanation ${runId}`);
    await admin.page.getByRole("button", { name: "Close preview" }).click();
    await admin.page.getByRole("checkbox", { name: "Review and publish this lesson" }).check();
    await admin.page.getByRole("button", { name: "Save lesson", exact: true }).click();
    await expect.poll(async () => checked(await database.from("forge_lessons").select("visibility").eq("id", lessonId).single()).visibility).toBe("public");
    await admin.page.goto(`${origin}/studio?edit=${lessonId}`);
    await admin.page.getByRole("button", { name: "Preview lesson" }).click();
    await expect(admin.page.getByRole("dialog", { name: "Learner-facing lesson preview" })).toContainText(title);
    await expect(admin.page.getByRole("dialog", { name: "Learner-facing lesson preview" })).not.toContainText(`Answer-key-only explanation ${runId}`);
    console.log("PASS authoring workflow with temporary-account cleanup");
  } else {

  step("private isolation, including unsubmitted drafts from administrators");
  for (const actor of [learner, admin]) {
    await actor.page.goto(`${origin}${lessonUrl}`);
    await expect(actor.page.getByRole("heading", { name: "Lesson or page unavailable." })).toBeVisible();
    await actor.page.goto(`${origin}/studio?edit=${lessonId}`);
    await expect(actor.page.getByRole("heading", { name: "Lesson or page unavailable." })).toBeVisible();
  }
  step("self-enrollment and bookmark persistence");
  await learner.page.goto(`${origin}${lessonUrl}/lessons/1`);
  await expect(learner.page.getByRole("heading", { name: "Lesson or page unavailable." })).toBeVisible();
  await owner.page.goto(`${origin}${lessonUrl}`);
  await owner.page.getByRole("button", { name: "Bookmark lesson", exact: true }).click();
  await expect(owner.page.getByRole("button", { name: "Remove bookmark", exact: true })).toHaveAttribute("aria-pressed", "true");
  await owner.page.reload();
  await expect(owner.page.getByRole("button", { name: "Remove bookmark", exact: true })).toHaveAttribute("aria-pressed", "true");
  await owner.page.getByRole("link", { name: "Open lesson", exact: true }).first().click();
  await expect(owner.page.locator(".slide-stage")).toBeVisible();
  assert.equal((await owner.page.content()).includes(`Answer-key-only explanation ${runId}`), false);
  step("desktop/mobile lesson framing and ordering activity");
  await fits(owner.page, "lesson-desktop.png");
  await owner.page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => owner.page.locator(".portal-sidebar").evaluate(element => element.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
  await fits(owner.page, "lesson-mobile.png");
  await owner.page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await expect(owner.page.locator(".portal-sidebar")).toHaveClass(/portal-sidebar-open/);
  await owner.page.keyboard.press("Escape");
  await expect.poll(() => owner.page.locator(".portal-sidebar").evaluate(element => element.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
  await expect(owner.page.getByRole("button", { name: "Open navigation", exact: true })).toBeFocused();
  await owner.page.getByRole("button", { name: "Practice", exact: true }).first().click();
  await owner.page.getByRole("button", { name: "Move step 3 up", exact: true }).click();
  await owner.page.getByRole("button", { name: "Move step 2 up", exact: true }).click();
  await owner.page.getByRole("button", { name: "Move step 3 up", exact: true }).click();
  await owner.page.getByRole("button", { name: "Check order", exact: true }).click();
  await expect(owner.page.getByRole("status")).toHaveText("Correct order.");
  step("attendance before submission and 5/10 failure followed by 6/10 pass");
  await owner.page.getByRole("button", { name: "Final quiz", exact: true }).click();
  await expect(owner.page.locator(".quiz-question")).toHaveCount(10);
  assert.ok(checked(await database.from("forge_enrollments").select("attended_at").eq("user_id", owner.id).eq("lesson_id", lessonId).single()).attended_at);
  assert.equal(checked(await database.from("forge_attempts").select("id").eq("user_id", owner.id)).length, 0);
  await quiz(owner.page, 5);
  await expect(owner.page.getByRole("link", { name: "Download certificate" })).toHaveCount(0);
  await owner.page.getByRole("button", { name: "Retry quiz", exact: true }).click();
  await quiz(owner.page, 6);
  const certificateUrl = await owner.page.getByRole("link", { name: "Download certificate" }).getAttribute("href");
  const privateCertificate = await owner.context.request.get(`${origin}${certificateUrl}`);
  assert.equal(privateCertificate.status(), 200);
  assert.ok((await privateCertificate.text()).includes("Private Self-Learning"));
  assert.equal((await learner.context.request.get(`${origin}${certificateUrl}`)).status(), 404);

  step("explicit review submission, administrator publication and snapshot preservation");
  await owner.page.goto(`${origin}/studio?edit=${lessonId}`);
  await owner.page.getByRole("button", { name: "Submit for publication review", exact: true }).click();
  await expect(owner.page.getByRole("status")).toContainText("Submitted.");
  await admin.page.goto(`${origin}/studio?edit=${lessonId}`);
  await admin.page.getByRole("checkbox").check();
  await admin.page.getByRole("button", { name: "Save lesson", exact: true }).click();
  await expect.poll(async () => checked(await database.from("forge_lessons").select("visibility").eq("id", lessonId).single()).visibility).toBe("public");
  assert.ok((await (await owner.context.request.get(`${origin}${certificateUrl}`)).text()).includes("Private Self-Learning"));
  step("published enrollment, server grading and public certificate");
  await learner.page.goto(`${origin}${lessonUrl}`);
  await learner.page.getByRole("button", { name: "Enroll in lesson", exact: true }).click();
  await learner.page.getByRole("link", { name: "Open lesson", exact: true }).first().click();
  await learner.page.getByRole("button", { name: "Final quiz", exact: true }).click();
  await quiz(learner.page, 10);
  const publicUrl = await learner.page.getByRole("link", { name: "Download certificate" }).getAttribute("href");
  assert.ok((await (await learner.context.request.get(`${origin}${publicUrl}`)).text()).includes("Public Published Lesson"));
  step("stale quizzes cannot be graded against an updated lesson");
  await learner.page.getByRole("button", { name: "Retry quiz", exact: true }).click();
  checked(await database.from("forge_lessons").update({ version: 5 }).eq("id", lessonId).eq("owner_id", owner.id));
  for (let index = 0; index < 10; index++) await learner.page.locator(`input[name="question-${index}"]`).first().check();
  await learner.page.getByRole("button", { name: "Submit quiz", exact: true }).click();
  await expect(learner.page.getByRole("alert").filter({ hasText: "This lesson has been updated." })).toBeVisible();
  assert.equal(checked(await database.from("forge_attempts").select("id").eq("user_id", learner.id)).length, 1);
  step("reviewer grant/revocation and exclusion of private attempts");
  await learner.page.goto(`${origin}/reports`);
  await expect(learner.page.getByText("No published lessons have been granted to your account for review.")).toBeVisible();
  await admin.page.goto(`${origin}/admin`);
  const review = admin.page.locator(".learning-list > div").filter({ has: admin.page.getByRole("heading", { name: title, exact: true }) });
  await review.locator("summary").click();
  await review.getByLabel("Registered reviewer user ID").fill(learner.id);
  await review.getByRole("button", { name: "Add reviewer", exact: true }).click();
  await expect(review.getByRole("button", { name: "Revoke access", exact: true })).toBeVisible();
  await learner.page.reload();
  await expect(learner.page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await expect(learner.page.locator(".learning-section details")).toHaveCount(1);
  await review.getByRole("button", { name: "Revoke access", exact: true }).click();
  await expect(review.getByRole("button", { name: "Revoke access", exact: true })).toHaveCount(0);
  await learner.page.reload();
  await expect(learner.page.getByText("No published lessons have been granted to your account for review.")).toBeVisible();
  step("account export contains only the requesting learner's attempts");
  const exported = await learner.context.request.get(`${origin}/api/account/export`);
  assert.equal(exported.status(), 200);
  const records = (await exported.json()).records;
  assert.equal(records.forge_attempts.length, 1);
  assert.ok(records.forge_attempts.every(attempt => attempt.user_id === learner.id));
  assert.ok(Array.isArray(records.forge_reflections), "Complete export must include private daily reflections");
  assert.ok(records.forge_reflections.every(entry => entry.owner_id === learner.id));

  step("profile fields and validated image upload persist across reloads");
  await learner.page.goto(`${origin}/profile`);
  const profileRevision = await assertProfileRevision(learner.page, learner.id);
  await learner.page.route("**/api/account/export", route => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"Unavailable"}' }));
  await learner.page.getByRole("button", { name: "Download my data" }).click();
  await expect(learner.page.getByRole("alert", { name: "" }).filter({ hasText: "Could not download your data." })).toBeVisible();
  await learner.page.unroute("**/api/account/export");
  const download = learner.page.waitForEvent("download");
  await learner.page.getByRole("button", { name: "Retry data export" }).click();
  assert.equal((await download).suggestedFilename(), "forge-learning-data.json");
  await expect(learner.page.getByRole("alert").filter({ hasText: "Could not download your data." })).toHaveCount(0);
  const image = await sharp({ create: { width: 320, height: 240, channels: 3, background: "#28795e" } }).png().toBuffer();
  await learner.page.getByLabel("Display name", { exact: true }).fill("Test updated learner");
  await learner.page.locator('input[name="age"]').fill("22");
  await learner.page.locator('select[name="level"]').selectOption("intermediate");
  await learner.page.locator('input[name="subjects"]').fill("Testing, TypeScript");
  await learner.page.locator('textarea[name="goals"]').fill("Practice reliable testing.");
  await learner.page.locator('input[name="avatar"]').setInputFiles({ name: "test.png", mimeType: "image/png", buffer: image });
  await expect(learner.page.getByAltText("Selected profile picture preview")).toBeVisible();
  await learner.page.getByRole("button", { name: "Cancel picture change" }).click();
  await expect(learner.page.getByAltText("Selected profile picture preview")).toHaveCount(0);
  await learner.page.locator('input[name="avatar"]').setInputFiles({ name: "test.png", mimeType: "image/png", buffer: image });
  await learner.page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(learner.page.getByRole("status")).toContainText("Profile updated successfully.");
  await learner.page.reload();
  await expect(learner.page.getByLabel("Display name", { exact: true })).toHaveValue("Test updated learner");
  await expect(learner.page.locator('input[name="age"]')).toHaveValue("22");
  const savedProfile = checked(await database.from("profiles").select("age,display_name,avatar_url,learning_level,preferred_subjects,learning_goals,learning_setup_revision").eq("id", learner.id).single());
  assert.equal(savedProfile.age, 22);
  assert.equal(savedProfile.display_name, "Test updated learner");
  assert.equal(savedProfile.learning_level, "intermediate");
  assert.deepEqual(savedProfile.preferred_subjects, ["Testing", "TypeScript"]);
  assert.equal(savedProfile.learning_goals, "Practice reliable testing.");
  assert.equal(savedProfile.learning_setup_revision, profileRevision + 1);
  await expect(learner.page.locator('input[name="setupRevision"]')).toHaveValue(String(savedProfile.learning_setup_revision));
  const metadata = await sharp(Buffer.from(savedProfile.avatar_url.split(",")[1], "base64")).metadata();
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.width, 160);
  assert.equal(metadata.height, 160);
  await expect(learner.page.getByAltText("Your profile")).toBeVisible();
  assert.ok(await learner.page.getByAltText("Your profile").evaluate(element => element.complete && element.naturalWidth > 0));

  step("invalid and oversized uploads preserve the saved profile");
  for (const upload of [
    { name: "invalid.png", mimeType: "image/png", buffer: Buffer.from("Not an image") },
    { name: "oversized.png", mimeType: "image/png", buffer: Buffer.alloc(2 * 1024 * 1024 + 1) },
  ]) {
    await learner.page.getByLabel("Display name", { exact: true }).fill("Must not be saved");
    await learner.page.locator('input[name="avatar"]').setInputFiles(upload);
    await learner.page.getByRole("button", { name: "Save profile", exact: true }).click();
    await expect(learner.page.getByRole("status")).toContainText("Choose a valid JPG or PNG");
    const unchanged = checked(await database.from("profiles").select("display_name,avatar_url").eq("id", learner.id).single());
    assert.equal(unchanged.display_name, "Test updated learner");
    assert.equal(unchanged.avatar_url, savedProfile.avatar_url);
  }
  await learner.page.reload();
  await assertProfileRevision(learner.page, learner.id);
  await learner.page.getByLabel("Remove picture", { exact: true }).check();
  await learner.page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(learner.page.getByRole("status")).toContainText("Profile updated successfully.");
  assert.equal(checked(await database.from("profiles").select("avatar_url").eq("id", learner.id).single()).avatar_url, null);
  await expect(learner.page.getByAltText("Your profile")).toHaveCount(0);

  step("wrong deletion password is rejected without deleting records");
  await owner.page.goto(`${origin}/profile/delete`);
  await owner.page.getByLabel("Current password", { exact: true }).fill("Incorrect9!Password");
  await owner.page.locator('input[name="confirm"]').check();
  await owner.page.getByRole("button", { name: "Delete account permanently", exact: true }).click();
  await expect(owner.page.getByRole("alert").filter({ hasText: "The password could not be verified." })).toBeVisible();
  assert.ok(checked(await database.auth.admin.getUserById(owner.id)).user);
  assert.equal(checked(await database.from("forge_lessons").select("id").eq("id", lessonId)).length, 1);

  step("author deletion clears session and retains another learner's certificate");
  await owner.page.getByLabel("Current password", { exact: true }).fill(owner.password);
  await owner.page.locator('input[name="confirm"]').check();
  await owner.page.getByRole("button", { name: "Delete account permanently", exact: true }).click();
  await owner.page.waitForURL("**/login?success=**");
  assert.equal(checked(await database.from("profiles").select("id").eq("id", owner.id)).length, 0);
  assert.equal(checked(await database.from("forge_attempts").select("id").eq("user_id", owner.id)).length, 0);
  assert.equal(checked(await database.from("forge_lessons").select("id").eq("id", lessonId)).length, 0);
  assert.equal((await owner.context.request.get(`${origin}/api/account/export`)).status(), 401);
  users.splice(users.indexOf(owner.id), 1);
  const retained = await learner.context.request.get(`${origin}${publicUrl}`);
  assert.equal(retained.status(), 200);
  assert.ok((await retained.text()).includes("Public Published Lesson"));

  step("learner deletion removes their retained results and certificate access");
  await learner.page.goto(`${origin}/profile/delete`);
  await learner.page.getByLabel("Current password", { exact: true }).fill(learner.password);
  await learner.page.locator('input[name="confirm"]').check();
  await learner.page.getByRole("button", { name: "Delete account permanently", exact: true }).click();
  await learner.page.waitForURL("**/login?success=**");
  assert.equal(checked(await database.from("forge_attempts").select("id").eq("user_id", learner.id)).length, 0);
  assert.equal((await learner.context.request.get(`${origin}${publicUrl}`)).status(), 401);
  users.splice(users.indexOf(learner.id), 1);

  step("invalid verification links and unauthenticated resets are rejected");
  const authContext = await browser.newContext();
  const authPage = await authContext.newPage();
  authPage.setDefaultTimeout(20000);
  for (const query of ["", "?type=unsupported&token_hash=synthetic", "?code=synthetic&token_hash=synthetic&type=recovery", "?code=synthetic"]) {
    const response = await authContext.request.get(`${origin}/auth/confirm${query}`, { maxRedirects: 0 });
    assert.equal(response.status(), 307);
    const destination = new URL(response.headers().location);
    assert.equal(destination.origin, origin);
    assert.equal(destination.pathname, "/login");
    assert.ok(destination.searchParams.has("error"));
    assert.equal(response.headers()["cache-control"], "private, no-store");
    assert.equal(response.headers()["referrer-policy"], "no-referrer");
  }
  await authPage.goto(`${origin}/auth/confirm?token_hash=invalid&type=recovery&next=/reset-password`);
  await expect(authPage.locator(".form-notice[role=alert]")).toContainText("Verification link is invalid or expired.");
  await authPage.goto(`${origin}/reset-password`);
  await authPage.getByLabel("Password", { exact: true }).fill(`Reset9!${randomUUID()}`);
  await authPage.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(authPage.locator(".form-notice[role=alert]")).toContainText("Request a new link or try again later.");

  step("signup token confirmation, safe redirect and single-use verification");
  const signupEmail = `forge-e2e-signup-${runId}@example.com`;
  const signupPassword = `Signup9!${randomUUID()}`;
  const signup = checked(await database.auth.admin.generateLink({
    type: "signup", email: signupEmail, password: signupPassword,
    options: { data: { display_name: "Test signup", age: 22, age_range: "18-24" } },
  }));
  users.push(signup.user.id);
  assert.equal(Boolean(signup.user.email_confirmed_at), false);
  await authPage.goto(`${origin}/login`);
  await authPage.getByLabel("Email address", { exact: true }).fill(signupEmail);
  await authPage.getByLabel("Password", { exact: true }).fill(signupPassword);
  await authPage.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(authPage.locator(".form-notice[role=alert]")).toContainText("email is not verified");
  const signupUrl = new URL("/auth/confirm", origin);
  signupUrl.searchParams.set("token_hash", signup.properties.hashed_token);
  signupUrl.searchParams.set("type", "signup");
  signupUrl.searchParams.set("next", "/\\example.org");
  const confirmed = await authContext.request.get(signupUrl.toString(), { maxRedirects: 0 });
  assert.equal(confirmed.status(), 307);
  assert.equal(confirmed.headers()["cache-control"], "private, no-store");
  assert.equal(confirmed.headers()["referrer-policy"], "no-referrer");
  assert.ok(confirmed.headers().location === `${origin}/dashboard`, "Verification destination must stay on the app origin");
  assert.ok(checked(await database.auth.admin.getUserById(signup.user.id)).user.email_confirmed_at);
  await authPage.goto(`${origin}/dashboard`);
  await completeOnboarding(authPage, signup.user.app_metadata?.role);
  await expect(authPage.getByRole("heading", { name: "Welcome, Test signup." })).toBeVisible();
  const reused = await authContext.request.get(signupUrl.toString(), { maxRedirects: 0 });
  const reusedDestination = new URL(reused.headers().location);
  assert.equal(reusedDestination.pathname, "/login");
  assert.ok(reusedDestination.searchParams.has("error"));
  await authPage.getByRole("button", { name: "Log out", exact: true }).click();
  await authPage.waitForURL("**/login");

  step("generated recovery link changes password through the real reset form");
  const recovery = checked(await database.auth.admin.generateLink({ type: "recovery", email: admin.email }));
  const recoveryUrl = new URL("/auth/confirm", origin);
  recoveryUrl.searchParams.set("token_hash", recovery.properties.hashed_token);
  recoveryUrl.searchParams.set("type", "recovery");
  recoveryUrl.searchParams.set("next", "/reset-password");
  const recoveryResponse = await authContext.request.get(recoveryUrl.toString(), { maxRedirects: 0 });
  assert.equal(recoveryResponse.status(), 307);
  assert.equal(recoveryResponse.headers()["cache-control"], "private, no-store");
  assert.equal(recoveryResponse.headers()["referrer-policy"], "no-referrer");
  assert.ok(recoveryResponse.headers().location === `${origin}/reset-password`, "Recovery must reach the reset form");
  await authPage.goto(`${origin}/reset-password`);
  await authPage.getByLabel("Password", { exact: true }).fill("weakpassword");
  await authPage.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(authPage.locator(".form-notice[role=alert]")).toContainText("Add one uppercase letter.");
  const replacementPassword = `Updated9!${randomUUID()}`;
  await authPage.getByLabel("Password", { exact: true }).fill(replacementPassword);
  await authPage.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(authPage.getByRole("status")).toContainText("Password updated.");
  await authPage.goto(`${origin}/dashboard`);
  await authPage.getByRole("button", { name: "Log out", exact: true }).click();
  await authPage.waitForURL("**/login");
  await authPage.getByLabel("Email address", { exact: true }).fill(admin.email);
  await authPage.getByLabel("Password", { exact: true }).fill(admin.password);
  await authPage.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(authPage.locator(".form-notice[role=alert]")).toContainText("The email or password is incorrect.");
  await authPage.getByLabel("Email address", { exact: true }).fill(admin.email);
  await authPage.getByLabel("Password", { exact: true }).fill(replacementPassword);
  await authPage.getByRole("button", { name: "Log in", exact: true }).click();
  await authPage.waitForURL("**/dashboard");
  await expect(authPage.getByRole("heading", { name: "Welcome, Test admin." })).toBeVisible();
  const recoveryReuse = await authContext.request.get(recoveryUrl.toString(), { maxRedirects: 0 });
  assert.equal(new URL(recoveryReuse.headers().location).pathname, "/login");
  await authContext.close();
  console.log(`PASS authenticated workflow; screenshots: ${output}`);
  }
} catch (error) {
  console.error(`FAIL ${stage} (${error.name}). Credentials and server responses are omitted.`);
  if (stage === "full-suite schema preflight" || stage === "onboarding/profile schema preflight") console.error(error.message);
  if (["catalog search keyboard access and active navigation", "anonymous and stale-session protected access", "manual private lesson authoring through the editor", "enrolled resume links lead to the lesson player", "profile validation focuses the invalid field", "failed editor save preserves unsaved changes"].includes(stage)) console.error(error.message);
  if (stage.startsWith("profile fields") && profilePage) {
    console.error(error.message);
    await profilePage.screenshot({ path: join(output, "profile-failure.png"), fullPage: true });
    console.log(`Profile diagnostic screenshot: ${join(output, "profile-failure.png")}`);
  }
  if (stage === "consecutive editor saves use the latest version" && editorPage) {
    console.error(error.message);
    await editorPage.screenshot({ path: join(output, "editor-failure.png"), fullPage: true });
    console.log(`Editor diagnostic screenshot: ${join(output, "editor-failure.png")}`);
  }
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  for (const id of users.reverse()) {
    try { checked(await database.auth.admin.deleteUser(id)); }
    catch { console.error(`CLEANUP FAILED for temporary test account ${id}; remove it in Supabase Auth.`); process.exitCode = 1; }
  }
  console.log("Temporary-account cleanup completed; no existing accounts were modified.");
}