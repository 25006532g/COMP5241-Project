# Forge Learning Studio

A Next.js 16 / React 19 learning application for COMP5241, using Supabase Auth/Postgres and server-side OpenRouter inference.

For a presentation-ready overview of features, design choices and prototype screenshots, see [Project showcase](PROJECT_SHOWCASE.md).

Track remaining work, blockers, acceptance criteria and verification updates in [IMPLEMENTATION_TRACKER.md](IMPLEMENTATION_TRACKER.md).

## 5 November 2026 — independent bounded presentation acceptance

Independent local reruns: **9/9 existing focused tests + 3/3 new grouped
acceptance tests passed**; new-test ESLint, scrubbed-environment/network-denial
probe and Git diff whitespace check passed. The implementer's 391-test suite and
build were **not rerun** or adopted as independent results. Coordinator retains
acceptance ownership; this is not release certification.

Verified with actual model/actions/helpers, in-memory PGlite and mounted offline
React/Fabric: exact 1/30/31-slide and 100/101-object boundaries without clipping,
schema roundtrip/legacy preservation, strict standard/AI contracts, private image
authorization/tampering, staging failure/retry/retention, linked-image reopening,
version protection and account blob-cleanup ordering. Browser checks include CJK
composition/selected-text formatting, multiselect, real mouse drag and keyboard
undo/redo, image replacement undo, uncertain-save locks, fullscreen-denial feedback,
320/1440 layout/focus and current-unsaved-draft toolbar PPTX text/shape/image OOXML.
Missing images cancel export instead of producing a partial download.

Only `tests/presentation-acceptance.test.mjs` and these existing documentation
files were added/edited by this QA turn. All 187 pre-existing product, migration,
configuration and test files fingerprint identically. Six synthetic screenshots
were actually opened; exact commands, artifacts, QA-only test corrections and
cleanup are recorded in the tracker. **No product defect reproduced.**

Connected Supabase permissions/action transport, target migration/bucket/cache
configuration and native PowerPoint desktop fidelity remain **open external
gates**. Target-applied state is unknown; `_ran` filenames prove nothing.
High-fidelity PPTX import remains deferred. No remote operation, server startup,
provider request, dependency installation, full suite/build or commit was run.

## 5 November 2026 — recovered presentation editor (local implementation)

The existing partial implementation was recovered and continued, **not restarted**.
This entry supersedes the older text-only manual-editor description below.
Independent QA and coordinator acceptance are still required.

**Use:** `/studio?manual=1` opens a blank 16:9 presentation. Create, rename,
duplicate, reorder or delete slides; add and edit text directly on the canvas
(including Chinese IME), format selected characters, insert shapes and PNG/JPEG
images, and use the outline/properties for keyboard selection, movement, sizing,
rotation, alignment and stacking. Panels collapse on narrow screens. Undo/redo
covers slide, object and typing changes. Preview remains usable as a dialog when
fullscreen is denied. **Export editable PPTX** exports the current unsaved author
draft as native text/shapes and embedded images, excluding quizzes/answer keys.
Review font availability, line wrapping and line spacing in desktop PowerPoint;
fonts are not embedded and pixel-identical rendering is not promised.

**Persistence and limits:** app-owned schemaVersion 1 JSON, 960×540, 1–30 slides,
100 objects per slide, 50 undo entries, 10,000 characters per textbox and a
1.5-million-character serialized document limit. Rotated corners must fit the
slide; images preserve their source aspect ratio. Text overflow blocks save/export
with feedback. Slide quizzes remain optional (0 or 3–10 questions); standard/AI
lessons remain 4–6 slides with exactly 10 questions. Save stays private for every
role; Save and publish requests separate administrator review. Confirmed versions,
conflict rejection, repeated-save protection and uncertain-save locks remain.
Learner/review rendering, resume through slide index29, text-only bounded coaching,
account export and deletion are integrated. Legacy lessons remain readable;
editing converts them in memory only, with no persisted upgrade until explicit save.

**Private images:** authenticated server actions decode signed PNG/JPEG files,
check dimensions (8,000px/side, 16MP, 4MiB input/output), strip metadata and store
sanitized PNGs. No SVG, remote URL insertion or public bucket access. Staging is
limited to 64MiB/draft and 10 active drafts/account. Unreferenced images remain
undo-safe for seven days; discard/expired cleanup is explicit and retryable.
Saved references survive expiry/discard. An operator must schedule abandoned-draft
cleanup; no remote job was installed. Account JSON export includes canonical
content and private asset metadata, **not image binaries**; export owned lessons
as PPTX to download their embedded images. Deletion stops if blob cleanup is
unconfirmed.

**Target setup is NOT performed or verified.** The workspace prerequisite is
`supabase/migrations/20261105093000_slide_authoring_ran.sql` (older entries below
use its former non-`_ran` name). A filename does not establish target application.
After separate target authorization, back up and verify prerequisites, apply
`supabase/migrations/20261105140000_presentations.sql`, verify private
`forge-presentation-images` bucket/policies and service-role-only access, refresh
PostgREST's schema cache, and deploy matching code. The migration provisions the
bucket only where the Storage schema exists; local PGlite tests simulate it.
Do not roll back to legacy constraints/code over v1 documents, long resumes or
asset references without a coordinated data/application/storage restoration plan.
No target migration, remote Storage creation, deployment, provider call or
connected test suite was authorized or run.

**Local verification:** final frozen offline suite **391/391 passed** (430.22s,
zero failures/skips/cancellations), scoped ESLint passed, and isolated
typegen/TypeScript/webpack packaging build passed. Fabric6.7.1 / React19.1 / PptxGenJS4.0.1 compatibility is
proved in real offline Chromium, including hidden-textarea Chinese IME and native
OOXML. Final verification details, exact inventory, failure/recovery evidence and
commands are in the tracker. Reproduce without environment files or services:

```powershell
node tests/offline-run.mjs --experimental-strip-types --test --test-concurrency=1 "tests/*.test.mjs"
node tests/offline-run.mjs tests/offline-build.mjs --presentation-gate
```

The second command uses an allowlisted temporary snapshot, disables the actual
environment loader/network, runs typegen + TypeScript + webpack build, includes a
temporary browser packaging route, and removes its snapshot/junction in `finally`.
Webpack dev/build scripts and the narrowly scoped PptxGenJS `node:fs/https` shim
are intentional for this browser dependency; no dependency reinstall was needed.
JSZip is now a direct test dependency rather than an accidental transitive import.
High-fidelity PPTX/binary PPT import remains deferred: the existing bounded
PDF/DOCX/PPTX **text-only** adapter retains its extraction limits, not source layout.
Native desktop PowerPoint fidelity and connected Supabase/action-transport
acceptance remain external gates, not local passes.

## 5 November 2026 — independent bounded LOCAL acceptance

**29 distinct focused tests passed across the bounded runs**, not a new full-suite
or build result. Initial matrix: **28/29**; the only failure was a QA-added exact
Audience selector, corrected to its accessible combobox role. Browser-only rerun:
**1/1**. Scoped three-test-file ESLint and an OS-only/network-denial probe passed.
Actual PGlite SQL/actions/access helpers and mounted Chromium at **320/1440px**
confirmed the legacy23514 reproduction, new slide0/3 versus1/2 boundaries, strict
standard10, retained historical snapshots, private/review publication, owner denial,
repeat/uncertain saves, variable quiz results and keyboard/upload recovery.

QA changed only `tests\slide-acceptance.test.mjs` (new), strengthened the two
`tests\slide-authoring*.test.mjs` files, and added README/tracker verification entries.
The existing application/migration/dependency work is preserved. Five screenshots
were actually opened under
`C:\Users\SOLUSER\AppData\Local\Temp\forge-slide-authoring-AwlPYg`.
Exact commands, results, cleanup and fingerprints are in the tracker entry below.

**No product defect reproduced in this scope; not overall feature completion.**
`supabase\migrations\20261105093000_slide_authoring.sql` exists but is **NOT applied
to target Supabase**. After separate target authorization: back up, apply that
additive migration after existing prerequisites, refresh the PostgREST schema cache,
deploy matching application code, then perform connected author/review/learner checks.
Do not restore the old ten-question constraint over new short-quiz data; rollback
needs a coordinated data/application plan and was not tested. Target grants/cache,
real deployed action transport/races and PDF worker packaging remain **UNVERIFIED**.
Binary PPT/DOC and original-layout/full-format fidelity remain **UNFULFILLED**,
not accepted by text-only/ordered-PPTX checks. No remote service, server startup,
provider/quota use, connected suite, commit or deployment was performed.

## 5 November 2026 — Create lesson repair (local implementation; independent QA requested)

Create lesson now has owner-only history at the top of `/studio`, simple steps,
a **blank** manual editor and a separate upload page. Earlier dated starter-default
instructions below are superseded. Catalog learning and the teaching roster remain.
Slide lessons support 3–6 Title/Body slides, four persisted style controls, and
either no quiz or 3–10 questions. Save is private; Save and publish requests ADMIN
review for **every** author role. Administrator approval is a separate saved-version
action. Repeated saves retain the confirmed ID/version; uncertain saves block replay.

The reported Supabase error is reproducible: **23514,
`forge_lessons_content_check`** in `20260923_learning_ran.sql` requires ten questions.
The new **`supabase\migrations\20261105093000_slide_authoring.sql`** updates lesson,
attempt and resume checks without modifying any `_ran` file, existing rows or grants.
New checks reject missing/null/wrong-type structures instead of passing SQL NULL.
They are `NOT VALID` to retain historical rows admitted by the old checks; they
still enforce new writes/updates. Historical malformed rows require a separate
authorized audit before validating the constraints. Standard/AI lessons retain
4–6 slides and exactly ten questions; shorter quizzes use a 60% rounded-up pass mark
consistently in learning, reports, progress and certificates. No quiz means no award.

**Import limits, not full-format conversion:** PDF/DOCX/PPTX text extraction only;
binary PPT/DOC remain explicitly unsupported (export to PPTX/DOCX first). Text mode
accepts up to 2,400 extracted characters; PPTX slide mode preserves real source
order/boundaries for 3–6 slides, each with text and at most 400 characters. Both use
the existing 4 MiB/resource-bounded safe parser. Over-limit content is rejected,
not truncated. Images, original fonts, layout and full visual fidelity are **not**
imported. Originals are neither retained nor sent to AI.

Local evidence: serial offline suite **378/378**, focused real-action/PGlite and
mounted Chromium checks, scoped ESLint, direct TypeScript and an isolated
environment-file-free webpack build. Reproducible safe commands:
`node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 "tests/*.test.mjs"`
and `node tests\offline-run.mjs tests\offline-build.mjs`.
The runner uses OS-only child environments and network denial; the build snapshots
only allowlisted files and replaces the dotenv loader. See the tracker for failed
iterations and evidence limits. No connected tests, remote migration, provider call,
commit or deployment occurred. Coordinator owns acceptance/handover; independent QA
must verify the authorized target migration/cache, real action transport, approval
and deployed PDF worker packaging. A linked-dependency snapshot does not prove that
last packaging requirement.

## 3 November 2026 - Daily 4D reflections hidden for everyone

Per the latest owner request, Daily 4D reflections is removed from desktop/mobile
navigation for learners, instructors and administrators. The `/reflections` page
returns not found, and all five reflection server actions return `unavailable`
before authentication or reflection-data access. The global
`dailyReflectionsEnabled` switch in `src/lib/reflections.ts` is `false`.

Existing records are retained; account data export and account-deletion behavior
are unchanged. Lesson content about the 4D framework is not affected. This decision
supersedes the daily-reflection demo-flow requirement in the dated checkpoints below.
Local regression checks passed; deployment and independent QA are not claimed.

## 22 October 2026 — independent paths + fresh integration checkpoint: LOCAL PASS

The frozen optional-path repair passed independent functional/privacy/reliability checks.
One temp-only actual-action probe passed **1/1 (seven scenarios)**, including replacement
of the trusted User/grant during a genuine deferred provider wait, auth loss/account switch,
whole-result scope rejection and recovery. The original User was not mutated.

**One fresh standard serial `npm test`: 340/340 across 31 test files**, zero failures,
skips or cancellations. Scoped six-file ESLint and direct TypeScript passed. In a physical,
environment-file-free snapshot only, serialized **Next typegen → direct TypeScript →
`next build --webpack` passed**. Existing dependencies/offline Chromium/PGlite only;
OS-only child environment and network denial throughout, no actual environment loader,
server, connected fixture, provider/quota operation or migration. Fresh path320/1440 and
representative report/reflection/starter images were actually opened; keyboard/focus,
wrapping and visual readability spot-checks are not full accessibility approval.

No product defect reproduced; no source/test/script/CSS/SQL/manifest change by QA.
All six frozen hashes and the broader 2,244-entry source/config/test/schema/existing-Next
freeze match before/after. Owned snapshot removed after unlinking its dependency junction;
repository dependencies intact, no cleanup failure. Commands, timings, fingerprints,
sanitized transcripts/probe and exact image paths are in the tracker.

**Still THREE connected demo flows + TWO approval packages = FIVE workstreams.**
All three are locally implemented, not unbuilt screens; optional paths add no fourth flow.
Next critical step is planned shared-screen connected acceptance, not deferred features
or a login request now. Real Next action transport/Postgres races, target schema/grants/
cache/app version, one genuine eligible free-AI generation, owner curriculum/reflection/
source-fact/pedagogy review and final rehearsal/accessibility/submission remain open.
The approved **10–12-minute TARGET** is unchanged: rehearsal **NOT RUN**, duration
**UNMEASURED**. Coordinator owns final acceptance; this is not complete-demo, production
or academic-content certification. Six deferrals and the20Oct provider policy are unchanged.
The writer-only checkpoint below is dated history. `PROJECT_SHOWCASE.md:57–60` still
needs writer status synchronization; it was intentionally read-only for this QA.

## 22 October 2026 — optional learning-path reliability repair (LOCAL writer evidence; QA requested)

**Remaining demo count: THREE connected DEMO FLOWS plus TWO non-flow approval gates =
the existing FIVE workstreams**, not five unbuilt modules:

1. Connected core author/learner journey, quiz, certificates **and reports**.
2. Connected private daily 4D reflection CRUD, export and deletion.
3. One genuine eligible free-AI generation.
4. **Non-flow gate:** owner review of three lesson sources, answer keys and pedagogy.
5. **Non-flow gate:** final rehearsal, accessibility and submission approval.

All three flows have local implementations; actual connected acceptance remains
**PENDING**. This bounded repair of **existing optional paths is not a fourth required
flow, new module or reactivated deferred scope**. The six existing deferrals are unchanged.
The 31 October supervised Hong Kong 13+ demo remains the target. Owner14:04 approved
the **10–12-minute TARGET**; rehearsal **NOT RUN**, duration **UNMEASURED**. The09:54
local-first/shared-screen-later sequence stands; no login is requested now.

Paths now fail closed on fresh entry auth (including user plus auth error), refresh
auth after inference, reject a different owner before further reads, and recheck the
fresh trusted grant/profile age. The existing form prevents same-tick duplicate submits,
retains inputs on failure, catches transport rejection with fixed allowance/no-auto-retry
feedback, focuses errors/results and discards whole stale paths using canonical validation.
The page keys private client state by owner/coarse preferences; late old-context responses
cannot populate a new owner. Local recommendations remain available without inference.
Nothing is persisted/enrolled; consent, anonymized candidate tokens, shared quota and
the20Oct shared free-client policy/model/budget remain unchanged.

**Actual writer evidence:** reproduced auth/grant red regressions and page/transport reds;
then focused serial recommendations/path-UI/curriculum-UI/eligibility/OpenRouter **59/59**
passed. Final expanded age/metadata/keyboard/reload checks **22/22** passed; scoped ESLint,
direct TypeScript and whitespace passed. Offline Chromium320/1440 pending/error/success/
local images were captured and opened. Exact commands, iterations, freeze hashes and
cleanup are in the tracker. No full suite/build, environment-file access, remote service,
quota/provider operation, migration or server startup. **Independent integration QA is
requested**, including one fresh full serial suite and isolated environment-free Next
build after freeze. This is not connected/provider, atomic grant-lock, full accessibility,
content-review or production acceptance; Coordinator owns final acceptance.

Previous reports **37/37 + 6/6** remain bounded independently accepted LOCAL evidence;
the showcase's current status is synchronized. Earlier305/build, reference61 and
diagnostic40/41 are dated evidence, not fresh all-app acceptance. User migration `_ran`
filenames remain preserved; application is **UNVERIFIED**. Dated QA-pending notes below
are historical, not a reversal of the accepted reports/diagnostic status.

## 22 October 2026 — independent Task09/12 reports QA: bounded LOCAL PASS

Fresh OS-only, network-guarded serial reports/reports-UI/progress/learning checks passed
**37/37**, with zero failures/skips, plus **6/6 temp-only independent probes** reusing
the actual-route harness, not copied reporting logic. Scoped ESLint, direct TypeScript,
instructor-harness **syntax only** and whitespace checks passed. Auth/role/grant denial,
current-version independent roster evidence, retained public history, stable pagination
beyond1000, sanitized failure/recovery and private-content exclusion passed locally.
Fresh mounted/native report images at320/1440 were opened; Tab/Enter/Space historical
details, visible focus, wrapped IDs/UUIDs and textual statuses passed. Exact commands,
images and sanitized evidence inventory are in the tracker.

Six writer-frozen source/test hashes match before/after; QA changes only README/tracker.
Owned browsers/PGlite closed; no connected fixtures or cleanup failures. No full suite,
Next build, login, environment-file access, remote/provider operation or AI code change.
Coordinator owns final acceptance; connected publication/revocation races, target schema,
transport, owner review, genuine eligible AI and broader accessibility remain untested/open.
All **five demo workstreams** and six deferrals remain open/unchanged. Owner-approved
10–12-minute **target** stands; rehearsal **NOT RUN**, duration **UNMEASURED**.
The showcase's reports status has since been synchronized, without a connected/whole-project
completion claim. Writer evidence below remains dated history.

## 22 October 2026, 14:04 approved continuation — Task09/12 reports integration (writer LOCAL)

**Owner approved the 10–12 minute TARGET walkthrough at 14:04**, and continued local
development. Rehearsal is **NOT RUN** and duration **UNMEASURED**. The 09:54 sequence
remains local features first, shared-screen connected testing later; no login/target
question now. Coordinator owns acceptance; owner owns final content/submission approval.

**Reconciliation:** Coordinator already directly checked the corrected showcase sentence
(formerly line289) against `updateLesson:132–145` and accepted the diagnostic **LOCAL**
packet: **40/40 + 41 native probes**. The original version-wording finding is closed;
that reconciliation changed no diagnostic/application source. Pending/assumption language
in dated entries below is history, not the current decision. The explicit20Oct provider
policy and AI implementation are untouched.

`/reports` now separates **CURRENT PUBLIC ENROLLMENT ROSTER** evidence for each
**current lesson version** from **Public attempt history (all versions)**:

- Rows show explicit review acknowledgement, final-quiz reach and saved public pass,
  each independently or “no record.” Counts use current public enrollments, once per
  learner. Only the same learner/lesson/current version with saved public score **6–10/10**
  passes; five, old-version and private results do not. Review is optional, not a quiz/pass
  gate or comprehension proof. Legacy unversioned attendance is never backfilled.
- All authorized public attempt snapshots remain in history, with version and saved title,
  including removed public enrollees. They are excluded from current-roster counts;
  repeated passes retain independent attempts/certificates. No grading/retention changes.
- Fresh auth rejects error **or** missing user before service DB creation. Instructors see
  only owned published lessons, admins published lessons, ordinary reviewers explicit
  lesson grants. Private/unsubmitted lessons, private enrollments/results and private
  reflections/transcripts are not exposed. No reflection query or new profile directory.
- Checked pagination reads all rows; query failures/missing columns/malformed new data
  throw a sanitized unavailable error to the standard boundary, not zero/partial success.
  This is **not** an atomic snapshot across publication/revocation or separate queries.

**Fresh writer evidence:** requested serial reports/reports-UI/progress/learning packet
**37/37**, scoped ESLint and direct `tsc --noEmit --incremental false` pass. Real report SSR,
actual permission/evidence helpers, synthetic auth/Supabase I/O, offline mounted actual
shell/native details, long IDs/status text and keyboard at320/1440 were checked. No full
suite/build or connected command; `instructor-e2e.mjs` only has aligned labels, **not run**.
Independent reports QA and connected acceptance remain open; exact commands, iterations,
images/cleanup and source freeze are recorded in the tracker.

Exactly **five open demo workstreams** remain (connected core; owner review of three
lessons; one genuine eligible free-AI showcase; connected private4D reflections; demo
package/rehearsal/accessibility/submission approval), not five unbuilt modules. Common
prerequisites are not a sixth. Six deferrals remain: coding runner, binary PPT, student
slide assistant, planner, genuine tailoring, targeted AI revisions. Earlier305/build
and61 reference checks are **dated local baselines**, not current reports acceptance.
User migration `_ran` filenames are preserved; application is **UNVERIFIED**, not queried.
Deadline31Oct, supervised Hong Kong13+ prototype, not public release.

*The following diagnostic checkpoints are retained as dated history.*

## 22 October 2026 — independent diagnostic implementation PASS; documentation correction pending Coordinator

Independent diagnostic QA passed **40/40** setup/OpenRouter/public-config tests and
**41 synthetic native-ESM actual-CLI/shared-client boundary/recovery probes**. Scoped
lint, direct TypeScript, parse-only syntax, whitespace and doc-link/route checks also
passed in that independent run, not rerun here. Sanitized evidence is retained at
`C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-setup-20261022`.

**Historical initial QA disposition: BLOCKED on documentation only.** The sole
source-truth correction is now made in the showcase rehearsal: the next save
**updates the same lesson ID and advances its version**, matching
`src/app/learning/actions.ts:139,143`. Independent QA's failed async `--import`
instrumentation hit a Node-warning/JSON-console-mock collision, resolved with a
synchronous `--require` offline guard; its temporary adapter's initial syntax error
was fixed before the 41 cases. These were QA instrumentation notes, not product
failures; repository source/tests were unchanged.

This follow-up edits only the three owned documents. **No fresh code checks are needed
or run for wording only**; validation is limited to whitespace and frozen-file hashes.
No actual `.env` loading, network/provider/quota access, connected rehearsal, full suite
or build was executed. The current shared-model default and explicit20Oct request
policy remain unchanged. Suggested10–12 minutes remains an assumption pending the
owner; all five workstreams and six deferrals remain open/unchanged. **Coordinator
will directly verify this exact correction before accepting the LOCAL packet**;
owner review, connected/AI proof and rehearsal gates remain, not a self-certified release.

*The initial writer checkpoint below is retained as history, including its QA request.*

## 22 October 2026, 12:10 continuation — setup alignment and demo runbook (LOCAL; independent QA requested)

The existing setup diagnostic now uses the **actual shared OpenRouter client**, deriving
the configured model list/default rather than hardcoding a probe model or request policy.
The owner-selected app default and all app/client settings are **unchanged**. No provider
or reasoning overrides were added; the explicit20Oct policy still controls.
The tiny strict `{ok:true}` probe is locally validated with Zod; false/wrong/malformed/extra
output fails and content is never printed. Invalid CLI arguments exit before environment
loading, database creation or network. Required zero-row checks now also include saved
generation columns and enrollment `progress_evidence`, retaining reflection checks.

**Side effects when later authorized:** `npm run check:setup` loads local configuration
and reads remote DB column metadata (no learner rows); it is **not fully offline**.
Without `--ai` there is **no AI catalog or inference**. `npm run check:setup -- --ai`
uses the shared client's single catalog GET and at most **one quota-consuming completion
POST** (singular model or ordered models, no manual per-model retries); failed
configuration/DB checks block inference. This is not proof of grants/RPCs/cache,
concurrency, account eligibility, provider quality or successful lesson generation.
`check:ai` also contacts provider catalog/quota services; its probe flags consume quota.
None of these connected commands was run here.

[Showcase rehearsal guide](PROJECT_SHOWCASE.md#suggested-academic-demonstration) now
uses actual routes/buttons and marks all connected steps **NOT RUN**. Suggested10–12
minutes is an **ASSUMPTION**, not measured or owner-confirmed. It covers manual learning,
review/attendance/pass distinctions, private reflections and an optional separately
authorized genuine saved-AI demonstration. Historical20Oct synthetic images are not AI
proof. Manual fallback does not count as completed AI.

**Fresh writer checks only:** offline actual-CLI/shared-client VM regressions plus existing
client/public-config tests **40/40**; scoped ESLint and direct TypeScript pass. Exact
commands, red/fixture failures, freeze and limits are in the tracker. No fresh full suite,
Next build, screenshots, owner review or connected rehearsal. Latest independently accepted
reference packet remains61/61; Task22's earlier305/305/build remains dated LOCAL evidence.

Exactly **five open demo workstreams** remain: connected core; owner review of three
canonical-family lessons; one actual eligible free-AI showcase; connected reflection
lifecycle; demo/rehearsal/accessibility/submission approval. Target/schema/version and
action-scope authorization are shared prerequisites, not a sixth feature. All six demo
deferrals below remain. Owner09:54 connected-later sequencing stands; no login/credentials
requested. Deadline31Oct, supervised Hong Kong13+ demo, not public launch. Owner owns final
academic review/submission; Coordinator owns acceptance. **Independent focused QA requested
for this frozen diagnostic/tests/docs slice; no self-certified release.**

## 22 October 2026 — encoded-Unicode repair independently reverified: LOCAL PASS

The original retained ASCII-escaped independent probe now passes against **both actual player and full preview**: literal `資料` and equivalent `%E8%B3%87%E6%96%99` yield two anchors in each, with exact original text/href and zero external requests/page errors. Fresh OS-only, offline five-file serial packet: **61/61**,0 failed/cancelled/skipped/todo; scoped four-file ESLint, direct TypeScript and changed/new-file whitespace checks passed. A separate temp-only actual-consumer probe passed four equivalent CJK/emoji path/query/fragment pairs and30 rejected malformed/control tokens at both320/1440px, including keyboard Tab/Enter/Escape, focus restoration, unverified-reference hints and no horizontal overflow. No source/test changes were made.

Actually opened this independent run's `player-unicode-320.png`, `preview-unicode-320.png`, `player-unicode-1440.png`, `preview-unicode-1440.png` in `C:\Users\SOLUSER\AppData\Local\Temp\forge-lesson-text-NfTUFe`, plus the original probe's fresh320px image. Four-file freeze still **`2741de68b876c1ba6c93ef9cd07ba8851a2aadda5902ce0e5b4e0483a94d6ca6`**; all138 other source/test/script/SQL files also retain the supplied freeze. Exact commands, console/artifact paths and cleanup are in the tracker. Only README/tracker changed; owned browsers/PGlite closed, evidence retained, user Chrome untouched.

This independently clears **only the encoded-Unicode local finding**, not whole-demo/connected/source-review acceptance; Coordinator owns final acceptance. Exactly **five open demo workstreams** and six deferrals remain unchanged. No full suite/build, remote/provider/login, server/install, environment-file/secrets access, connected test, migration application, commit/deploy or agents. Earlier57/57+Unicode-BLOCKED evidence and the writer's red/fixture failures below remain dated history; Task22's earlier305/305 is not fresh evidence.

*Pre-reverification writer checkpoint follows; its request for independent QA is historical.*

## 22 October 2026 — Task08 encoded-Unicode repair; independent re-QA REQUIRED

**History retained:** the reference packet passed **57/57 focused tests**, but independent QA was **BLOCKED** by the actual Unicode UI probe: literal `https://example.org/資料` linked while equivalent `https://example.org/%E8%B3%87%E6%96%99` did not. The earlier305/305 full suite belongs to Task22, **not** new reference acceptance. This repair has writer checks only; fresh independent QA and Coordinator acceptance remain required.

The octet blacklist confused UTF-8 continuation bytes with C1 controls. The existing validator now uses guarded `decodeURIComponent` **only to validate complete UTF-8 and reject decoded Unicode C0/C1/format controls**. Its result never becomes visible text, `href` or stored content. Encoded spaces/reserved query characters remain accepted. Malformed triplets, invalid/overlong/surrogate/out-of-range UTF-8 and actual encoded controls remain literal; credential/authority/scheme/nested-token/raw-markup guards, React escaping and external-link hints/attributes remain. No automatic fetching or source-policy/content/schema/gate change; source availability, correctness and pedagogy are **unverified**.

Fresh exact writer commands below use `$node = 'C:\Program Files\nodejs\node.exe'`, `$safe = 'C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-task22-QA22c719\safe-run.mjs'`, and `$diag = 'file:///C:/Users/SOLUSER/AppData/Local/Temp/forge-independent-task22-QA22c719/manual-diagnostic.mjs'`. Existing helpers were inspected, not edited; children receive OS-only settings, offline Chromium/PGlite, no application-secret inheritance.

| Command from repository root | Writer result |
| --- | --- |
| `& $node $safe --experimental-strip-types --test --test-concurrency=1 tests/lesson-text.test.mjs` | Before production edit **4/7**,3 failed, exit1 (missing encoded anchors and invalid sequences linked); immediately after minimal fix **7/7**, exit0 |
| `& $node $safe --experimental-strip-types --import $diag --test --test-concurrency=1 tests/lesson-text.test.mjs tests/manual-authoring.test.mjs tests/progress.test.mjs tests/resume.test.mjs tests/curriculum-ui.test.mjs` | First **58/61**, exit1: new learner fixture exceeded the unchanged240-character example limit, not a manual timeout. Shortened only new negative fixtures; final **61/61**,0 failed/cancelled/skipped/todo, exit0, Node62.021s/wall62.111s |
| `& $node $safe --experimental-strip-types --test --test-concurrency=1 tests/progress.test.mjs` | Immediately after fixture correction **19/19**, exit0 |
| `& $node $safe node_modules/eslint/bin/eslint.js src/components/lesson-preview.tsx tests/lesson-text.test.mjs tests/manual-authoring.test.mjs tests/progress.test.mjs` | Final exit0 |
| `& $node $safe node_modules/typescript/bin/tsc --noEmit --incremental false` | Final exit0 |

Original assertions and manual5s timeout remain; no recurrence or timeout diagnosis claimed. ASCII-escaped CJK/emoji fixtures first compare canonical URL equivalence, then exercise the production renderer, actual full preview and actual learner route/player with exact literal text/href/storage checks and invalid UTF-8/control negatives. Bounded packet: renderer7 + manual22 + progress19 + resume12 + curriculumUI1. No resume/CSS/migration edit. Four fresh Unicode player/preview images at320/1440px were opened from Temp `forge-lesson-text-5LvZSK`; final packet screenshots/trace retained separately. Scoped whitespace passed; source/test freeze and exact evidence paths are in the tracker. No full suite/build, remote/provider/login, environment-file access, server, install, migration application, commit/deploy or nested agent.

**Five open demo workstreams and all six deferrals below are unchanged.** Prior dirty work and user-renamed `supabase/migrations/20261022_daily_reflections_ran.sql` are preserved; migration application remains unverified. **Request fresh independent re-QA after this source/test freeze; no self-approved release or source-review certification.**

## 22 October 2026, 11:20 request — exactly FIVE open selected-demo workstreams

**Five workstreams remain open, not five unbuilt modules and not the original 25 tracker tasks.** Deadline: **31 October, Hong Kong, supervised 13+ demo**. Local features first; owner shared-screen login/connected testing comes later. No credentials, target access or operation authorization is needed/requested now.

| Workstream / owner | Existing local deliverable | Remaining dependencies / verification gate |
| --- | --- | --- |
| 1. Core learning journey — developer + owner/Coordinator | Core is locally implemented | Authorized connected instructor create/edit/publish → learner enroll/slides/resume → ten-question **server-graded** quiz, **6/10**, unlimited retries, result and **per-pass certificate** still pending |
| 2. Three canonical-family authored starters — author/owner | Local starters and source text; this slice improves reference usability | Owner factual, pedagogical, answer-key, source and supervised13+ suitability review pending; local tests do not review lessons |
| 3. One actual eligible free-AI showcase — owner + developer | Local generation code exists; prefer a saved generation | Actual eligible free-provider success and quality not proven; later separately authorized probe/review, no AI code/client/provider-policy changes now |
| 4. Private daily 4D reflections — developer + owner/Coordinator | Locally implemented; independent local packet accepted | Migration application **unverified by this work**; actual connected CRUD/export/cascade still pending |
| 5. Demo/submission package — owner + Coordinator | Existing documentation/local evidence | Artifacts, rehearsal, accessibility and owner academic final approval incomplete |

Target/schema/app-version/authorization are **shared prerequisites, not a sixth feature**. Coordinator has accepted the supplied **Task22 independent LOCAL packet only**: earlier305/305 full suite, scoped lint/direct TypeScript and environment-free Next webpack snapshot build. That reconciles the historical “Coordinator acceptance requested” wording below, not connected or whole-demo readiness. The original manual five-second save timeout's cause remains unresolved; diagnostic21/21 and full305/305 passed, and historical failures remain recorded.

### Task08 reference usability — LOCAL display enhancement; authorized loader repair passes locally

One exported `LessonText` renderer in the existing preview component now renders explicit absolute **HTTPS** references in slide **body and example**, both learner player and full author preview. Visible URL text, surrounding whitespace/newlines/punctuation and **raw stored content remain unchanged**. Common sentence punctuation is outside the link; balanced path parentheses, Unicode, queries/fragments and multiple references are covered. Headings, questions and answers remain plain.

Conservative token/URL checks reject malformed/credentialed/control-bearing URLs and do not search inside rejected schemes/tokens for a nested HTTPS substring. HTTP, protocol-relative URLs, JavaScript/data and markup-looking input stay React-escaped literal text. No Markdown/rich HTML, fetching/prefetch, provider request, telemetry, source database or new metadata. Native external anchors use a new tab with `rel="noopener noreferrer"` and `referrerPolicy="no-referrer"`; their accessible name includes the original URL plus the external/new-tab/**not verified** hint. Links are underlined, keyboard focusable and wrap at320/1440px. This is **not** source endorsement, a claim of availability/correctness/review, or a guarantee arbitrary HTTPS sites are safe. Author/owner review-pending labels and source selection authority remain.

Earlier reference-writer evidence: the bounded serial packet was **47/57, exit1**, not green. Renderer5/5, unchanged original manual-authoring flows21/21 (plus new starter-preview assertions), progress18/18, curriculum UI1/1 and resume validation2/2 passed. **All ten failures were the resume scheduler harness's missing real preview-module mapping** (nine mounted subtests plus parent, undefined `LessonText`); that writer left the file untouched and requested the loader-only exception. Its scoped ESLint, direct TypeScript and whitespace checks passed, and four reference UI screenshots were actually opened. Exact commands, earlier failing iterations and evidence paths remain in the tracker.

**Authorized loader-only follow-up, 22 October:** resume-only reproduced **2/12, exit1** before the repair and passed **12/12, exit0** immediately after. `tests/resume.test.mjs` now transpiles/loads the actual `lesson-preview.tsx` exports with its existing real React machinery, without a preview/text stub or weakened missing-module guard. Unexecuted metadata views retain explicit adapters; all scheduler assertions, clocks, actions, fixtures and timeouts are unchanged. One requested five-file serial packet then passed **57/57**, zero failed/cancelled/skipped/todo, exit0 (Node58.774s, wall58.865s): renderer5, manual21, progress18, resume12, curriculumUI1. Scoped loader ESLint and whitespace passed; direct TypeScript was not rerun for this `.mjs`-only repair. No full suite/build or source/UI/CSS/SQL changes. The historical manual5s timeout did not recur; its cause remains unresolved. Fresh screenshots/trace were captured by the existing suites, not opened or independently accepted in this repair.

**Independent focused QA requested for the loader repair and reference-display packet; Coordinator owns acceptance.** No release is self-certified. Prior dirty starter/reflection work, learning states/APIs/save/quiz privacy, all six approved deferred feature areas (runner24, binary PPT19, student slide assistant19, private planner23, genuine tailoring18, targeted AI revisions14/16), explicit20Oct no-overrides policy and basic controls are preserved. No network/provider/login, environment-file access, remote write, server, install, commit or deployment; later login alone will not authorize connected operations.

## 22 October 2026 — independent Task22 / curriculum-loader LOCAL QA: PASS

Fresh independent functional/privacy/lifecycle verification passed for the bounded private-reflections implementation and actual-module curriculum-loader repair. **One full existing serial `npm test`: 305/305**, zero failed/cancelled/skipped/todo, Node **154.626s** (wall155.112s). This is the current independent **local** full-suite baseline, not connected-core, whole-demo or production certification. Original quiz6/10, unlimited-retry, per-pass-certificate and starter assertions remain unchanged.

The earlier manual-authoring timeout at `tests/manual-authoring.test.mjs:452` was reconciled by inspecting the complete harness/preview/save flow, one smallest diagnostic run (**21/21**, including the unchanged five-second320px keyboard save), then the single uninstrumented full suite above. It did **not reproduce** in either run. Its cause remains unresolved; no product fix or “known flaky” diagnosis is claimed. Historical writer303/304 and repairer28/30 failures below are preserved, not relabelled green.

Fresh scoped ESLint (21 source/test/script paths), direct TypeScript, changed/new whitespace, actual action/helper/PGlite owner-role probes, and supplemental320/1440 keyboard/native-validation/auth-failure recovery passed. A physically separate selected-source/config snapshot, with no environment files or inherited application settings, passed serialized Next typegen → TypeScript → webpack build; only existing dependencies were linked. `/reflections`, export and proxy compiled. Snapshot removed; no helper services or matching QA/browser/build processes remain. All141 files under `src`, `tests`, `supabase`, `scripts` are byte-identical before/after QA; **only README and tracker were edited**.

Four fresh images were actually opened under `C:\Users\SOLUSER\AppData\Local\Temp\forge-reflections-20261022-C8LUvn`: `unconfirmed-create-320.png`, `confirmed-delete-320.png`, `history-canonical-1440.png`, `validation-focus-1440.png`. Exact commands, test-extension failures/corrections, trace/evidence paths and cleanup are in the new tracker entry. Earlier sections are dated handovers, not the current verdict.

**Coordinator acceptance requested for this LOCAL packet only.** Owner lesson/source/4D-prompt/pedagogical review, authorized nonproduction schema/grants/cache, actual Next action transport, connected lifecycle/Postgres concurrency, eligible live free AI, screenreader/accessibility and submission/release gates remain open. Approved demo deferrals and explicit20Oct provider policy are unchanged. Owner09:54 local-features-first/connected-later sequencing stands: no login request, connected work or provider call now; future shared-screen login is not write/AI authorization.

## 22 October 2026 — narrow curriculum test-loader repair (independent QA pending)

Separately approved test-only repair: `tests/curriculum-ui.test.mjs` now transpiles/registers the **actual** `src/lib/demo-lessons.ts`, following the manual-authoring loader precedent. Existing real learning/curriculum modules and bundled installed Zod remain in use; no helper/content stub, assertion change or application workaround. Original curriculum assertions are unchanged.

OS-only offline checks: the single-file reproducer failed **0/1** with `Unexpected offline dependency @/lib/demo-lessons`; after the one-line mapping change, the **one serial combined** curriculum/demo-lessons/manual-authoring run passed the curriculum test and all eight starter tests, but finished **28/30**, exit1. The manual-authoring 320px activity-formatting subtest timed out after 5000ms waiting for `Lesson created.` (`tests/manual-authoring.test.mjs:452`); its parent also failed. Scoped ESLint passed. Exact commands/timings are in the tracker. **This combined gate is not green.** No retry, full-suite/build rerun or TypeScript run was made (only a JavaScript loader list changed).

The reflection handover's **303/304 full-suite failure below is retained history**, not a new green baseline or independent reflection acceptance. Only this test, README and tracker changed; application/reflection source and all other tests remain frozen. Independent QA must verify the loader repair and reconcile the observed manual-authoring timeout separately. Connected testing remains deferred to later shared-screen login with separate target/operation authorization; no environment-file access, remote/provider calls, servers, installs, migrations, connected suites, commits or deployment.

## 22 October 2026, 09:54 continuation — private daily 4D reflections (local implementation; QA pending)

The owner asked to continue implementation and deferred login/shared-screen connected tests until later. **Task22 is proceeding on the independently accepted local core/starter evidence, not on a claim that connected core is stable.** This is the next bounded approved prototype-MVP slice, not reactivation of the deferred modules below. No login is requested now; later shared-screen login alone will not authorize target writes or provider calls.

In a signed-in application with the separately authorized schema available, open **Daily 4D reflections** in the learner navigation, or `/reflections`. The page and every action require current authentication. Each account has **one editable entry per explicit date**, with stable ID/revision/timestamps and four required plain-text fields: **Delegation, Description, Discernment, Diligence**. Prompts/examples are provided; “not used today” is a valid answer. Each field permits **1–2000 Unicode characters**, must not be whitespace-only, and keeps its original text. The textarea's native `maxLength=4000` accommodates surrogate pairs; the displayed Unicode counter and client/server/database limits enforce 2000 characters.

- **Date assumption:** the default date is calculated in **Asia/Hong_Kong**, explicitly shown on the form. Choose a real `YYYY-MM-DD` date, including leap days or earlier years; no arbitrary last-year restriction. Selecting a date loads first and never saves. History fetches 20 metadata-only entries at a time, newest date/ID first, with an explicit older-page control.
- **Private/no AI/no awards:** only the current owner can read/edit/delete through the application, with no automatic instructor/reviewer/admin access. Text is React-escaped, not executed as HTML/Markdown, forwarded to AI, or sent to analytics/reports. Writing reflections does not infer review, attendance, progress, streaks, grades, passes or certificates.
- **Recovery:** failed reads are visibly unavailable, not saveable blank “new” entries. Failed writes retain the date, selected entry and draft. Unconfirmed/malformed/lost write acknowledgements stop mutations: **Inspect canonical entry**, compare without losing your text, then explicitly use canonical state (with discard confirmation), or keep the draft for a new entry only if the inspected date is empty. Never blindly repeat an uncertain create/update/delete. Revision checks reject stale-tab overwrite/deletion. Reload/inspection never writes; deletion requires explicit confirmation and a new create remains explicit after confirmed deletion. In-app date/history/link/logout navigation guards unsaved text; no always-on browser-unload trap is installed.
- **Lifecycle:** entries remain until individual deletion or account deletion. Complete owner export now includes `forge_reflections` as the **16th** owner-filtered, paginated dataset; a missing schema or failed later page fails the entire private/no-store export, not a partial download. Auth-user deletion cascades only that owner's rows.

**Schema is source only, not applied by this work; application status unverified:** current file `supabase/migrations/20261022_daily_reflections_ran.sql`, after the existing schema and ordered migrations (last predecessor: `20261021_progress_evidence_ran.sql`). The external rename was preserved, not performed here; its suffix is not application evidence. Browser roles have no direct table grants/policies; service role has explicit CRUD. Setup diagnostics and the connected E2E schema/export contract recognize the required table, but **neither setup nor connected suites were executed**. Confirm a disposable nonproduction target/origin, permitted operations, synthetic data and cleanup separately before any migration/connected operation; then verify schema cache, service grants, RLS and actual transport.

**Writer evidence, not independent acceptance:** final serial reflection/UI/account/database/public-config/auth gate **80/80**, scoped ESLint and direct `tsc --noEmit --incremental false` passed with OS-only child environments, PGlite and network-blocked installed Chromium. Four fresh 320px/1440px recovery/history/validation screenshots were actually opened; exact paths/commands/failures are in the tracker. The one full serial `npm test` sweep was **303/304**, not green: the prior starter slice's curriculum browser loader lacks `@/lib/demo-lessons`. That unrelated test remains untouched and needs Coordinator authorization/reconciliation; no repeated full sweep. The latest independent full baseline remains **21Oct283/283**. Independent Task22 QA, owner prompt/pedagogical review, real Next action transport and authorized connected lifecycle/race/accessibility checks remain open. No environment-file access, app-secret inheritance, remote/provider request, service startup, migration application, install, commit or deployment occurred.

## 22 October 2026 — approved prototype-first demo scope; first slice independently accepted LOCAL, owner review pending

The owner approved this scope cut and explicitly authorized implementation on **22 October**. Deadline: **31 October 2026**, supervised Hong Kong demo, ages **13+**, not a public launch. Coordinator retains scope reconciliation and acceptance; the owner retains content approval and final submission responsibility.

| Demo priority | Approved deliverable / current boundary |
| --- | --- |
| 1 | Reliable existing instructor manual create/edit/publish → learner enroll/slides/resume → ten-question server-graded quiz (**6/10**, unlimited retries) → result/per-pass certificate. Local evidence is not connected journey acceptance. |
| 2 | Three owner-reviewed short lessons, one per canonical family. **This first slice supplies three original, schema-valid, review-ready starters, not owner-reviewed lessons.** |
| 3 | Timebox **one proven AI showcase**, preferably existing saved lesson generation; interviews only if more reliable. **No live AI success is proven.** Existing generation, interviews and paths remain accessible. |
| 4 | The first starter slice supplied a coding-agent 4D ordering exercise, **no daily reflections then**. The subsequent 09:54 continuation above implements bounded private daily reflections locally while the owner defers connected testing; connected-core stability is not claimed. |
| 5 (parallel) | Demo/report/video/manuals/slides and submission evidence; owner final responsibility. |

**Owner-approved DEMO deferrals, not completed original requirements:** new embedded JavaScript/Python runner (24), legacy binary PPT conversion (19; **PDF/PPTX only for the demo**), student slide assistant (19), private project planner (23), genuine content tailoring (18), and targeted AI revisions (14/16). Separate roster/cohort/invitation and voice/video deferrals stand. Production hardening can wait, but existing authentication, roles/ownership, upload/resource limits, keys, server grading, free-only validation and AI eligibility cannot be weakened. No provider/client change or privacy relaxation is part of this approval; the explicit **20 October** client policy remains controlling over historical ZDR wording.

### Open and review the authored starters

In an already authorized signed-in application, open **Studio → Authored lesson starters**, or use:

| Starter | Studio URL |
| --- | --- |
| SDLC: a small change from need to feedback | `/studio?manual=1&starter=sdlc-small-change` |
| Coding agents: supervise a small change with 4D | `/studio?manual=1&starter=coding-agent-4d` |
| Product skills: explain a small trade-off | `/studio?manual=1&starter=product-tradeoffs` |

Each starter has canonical subject/metadata, five slides, a meaningful ordering activity and ten distinct four-option questions with explanations. **Opening/reloading only populates the existing editor**: no save, publication, enrollment, AI request or automatic persistence. `/studio?manual=1` remains blank authoring. Invalid/repeated starter parameters show guidance rather than silently choosing content. `?edit=<existing-id>` always loads authorized persisted content, ignoring starter parameters.

Review the visible authorship/review-pending label, outcomes, age suitability, source links, activity order and every quiz answer/explanation. The public source suggestions have **not been remotely verified** in this slice. Reference URLs and review notes also live in the final slide and survive ordinary saves without a new schema. Edit as needed, leave **Review and publish this lesson** unchecked (instructors), then explicitly **Save lesson** privately. Subsequent saves in that editor update the confirmed same ID/version; reopening a starter URL is a new unsaved draft, **not** the saved lesson. Reopen the saved lesson with its Edit link to continue. Dirty-link cancellation and uncertain-save reconciliation remain unchanged; never repeat an unconfirmed create blindly. Learners cannot publish.

**22 October implementer evidence, not acceptance:** requested serial four-file offline gate **42/42**, scoped ESLint and direct TypeScript passed. Actual transpiled Studio/editor/actions, existing in-memory PGlite adapter and network-blocked Chromium exercised the boundaries; starter keys pass the real grader at 6 and fail at 5. Three final review/editor screenshot pairs were opened at 320/1440px. Exact commands, failed attempts and limits are in the tracker. The latest **independent** baseline remains **21 October, 283/283**, not a newly rerun full suite.

**22 October independent LOCAL QA — PASS:** fresh requested serial six-file gate (starter/manual/learning/curriculum/resume/progress) **71/71**, zero failed/cancelled/skipped, **48.422s** Node time; separate inline actual learner-route/client-import probes **4/4**. Scoped ESLint, direct `tsc --noEmit --incremental false`, tracked diff/whitespace and explicit new-file whitespace/newline checks passed. All four delivered source/test SHA-256 fingerprints stayed unchanged. Eleven fresh synthetic screenshots were actually opened, including starter review/editor captures at 320/1440px and keyboard validation/recovery states. No substantive defect reproduced in this bounded scope. Exact commands, evidence paths and limitations are in the tracker; writer results above remain separate. The latest independent **full-suite baseline** is still **21 October, 283/283**, not today's focused run.

**Next gates:** owner content/pedagogical/answer-key and source review; separately authorized target/origin and connected core acceptance; one eligible free AI showcase; broader accessibility and submission/release gates. Neither three owner-reviewed lessons nor the whole connected core journey is accepted by this local result. This work used synthetic local data only, OS-only child environments, in-memory PGlite and offline/network-blocked Chromium; browsers/databases closed. QA edited only these two evidence docs. No connected operation is authorized by these instructions: confirm a disposable nonproduction target, synthetic-only accounts/data, action scope and cleanup before any connected writes; never use real learner records. No source/test repair, environment-file access/import, remote request, live AI/minor-AI enablement, server, install, migration, full-suite/build, commit or deployment occurred.

## 21 October 2026 — explicit progress evidence (independent bounded LOCAL acceptance; connected gates open)

**Fresh independent acceptance after the bounded harness repair — 13:15–13:17 HKT:** the standard serial **`npm test` passed 283/283**, with 0 failed/cancelled/skipped (Node **107.593s**, wall **107.921s**). The original dashboard/onboarding redirect, return and recovery assertions now execute unchanged; the additional test uses the real shared helper/dashboard and onboarding action with synthetic lesson/record adapters. Fresh scoped ESLint and diff/whitespace checks passed. Only the reviewed onboarding test and documentation changed since the first QA; the original 11-file freeze and repaired 12-file aggregate match. All 155 current inputs stayed unchanged through the fresh suite, before these two documentation updates.

The **21 October first-QA** full lint/direct TypeScript/env-free typecheck/build, three independent PGlite probes and **nine actually opened** screenshots at `C:\Users\SOLUSER\AppData\Local\Temp\forge-progress-20261021-hoW80k` remain **source-equivalent earlier evidence**, not freshly rerun build/probe/visual claims. This is bounded local/offline acceptance only; Tasks09/12 remain connected **Open/Partial**, not production/release completion. Exact commands, fingerprints, cleanup and preserved failures are in the latest tracker entry.

### Independent QA block and bounded test-only repair (historical handover)

Independent QA `1d212ede-d03b-4554-8758-3f66e2374460` **BLOCKED** the standard serial suite: **281 passed / 1 failed of 282**, 0 cancelled/skipped, Node **126.828s**. The onboarding test loader rejected the real dashboard's `@/lib/learning` import before its assertions executed; no substantive application defect was demonstrated. QA separately passed three additional PGlite boundary probes, full lint/direct TypeScript, env-free-snapshot typecheck/build, nine fresh screenshots and 155 unchanged fingerprints. Those passes do **not** constitute acceptance of the blocked gate. Report: `C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-progress-20261021-qgb2jj1n\INDEPENDENT_EVIDENCE.md`; QA-opened screenshots: `C:\Users\SOLUSER\AppData\Local\Temp\forge-progress-20261021-hoW80k`.

Coordinator authorized a **test-only** integration repair in `tests/onboarding.test.mjs`: map the actual shared learning module into the existing transpiled loader, retaining its real Zod dependency, and add a narrow real-dashboard/shared-helper assertion after onboarding. Existing redirect/return/recovery assertions are unchanged; no helper answers are fabricated. The exact reproducer went **0/1 → 1/1**; focused onboarding/progress selectors passed **3/3**, scoped ESLint and direct TypeScript passed. Application source, migration and dependency manifests remain frozen. Exact commands, repair fingerprints and the preserved failure are in the tracker. The writer did **not** rerun the full suite; **fresh independent QA must rerun it before local acceptance**. Connected/release gates remain open.

### Delivered behavior and earlier writer evidence

- **REVIEWED** is an optional, explicit **Acknowledge slide review** action on the final slide, not telemetry or proof of comprehension. It saves the authenticated learner's first acknowledgement for that lesson version. Enrollment, bookmarks, resume and visits never fabricate review; missing historical review remains unknown.
- **ATTENDED** means reaching the final quiz, with separate versioned evidence. Review is never required to open the quiz, submit it or retry. Restoring a saved quiz keeps its answers/place and records attendance when the quiz is actually mounted again; old unversioned attendance is not backfilled into a new version.
- **PASSED** requires a saved, server-graded score of at least **6/10** on the ten-question quiz. Review/attendance never award passes or certificates. Unlimited retries and per-passing-attempt private/public certificate snapshots are retained. An older version's pass does not mark the current version passed.
- The real overview/player, progress history and current-version dashboard labels use the same evidence semantics. Old versions remain separate; aggregate counts explicitly say “any version.” Inaccessible lessons do not expose their current private title/content.
- Review/attendance acknowledgements are idempotent. Failed, lost or malformed responses show **unconfirmed**, not success: retry the same version or reload to reconcile. Owner/lesson/version changes discard late player responses. Quiz-save uncertainty directs learners to history before retrying.

**Storage/setup:** apply the new local-only [20261021_progress_evidence.sql](supabase/migrations/20261021_progress_evidence.sql) **after** the existing [20261020_lesson_generation_ran.sql](supabase/migrations/20261020_lesson_generation_ran.sql) and prior migrations, only on a separately authorized target. It adds `forge_enrollments.progress_evidence` (version-keyed timestamps; empty object for existing rows) and the service-only `forge_record_progress` RPC. The RPC rechecks access/enrollment/current version under locks; browser roles cannot call it or read/write the enrollment table. No original migration or historical evidence rows were rewritten. Existing paginated owner `forge_enrollments.*` export and owner/lesson cascades cover the field without another table; retained quiz snapshots keep their existing lifecycle.

**Local evidence:** the final focused six-file command passed **84/84** (0 failed/cancelled/skipped), including real actions/helpers with in-memory PGlite, owner export, existing resume scheduling and offline mounted UI. Scoped ESLint and direct `node node_modules/typescript/bin/tsc --noEmit --incremental false` passed. Nine final synthetic screenshots were opened at `C:\Users\SOLUSER\AppData\Local\Temp\forge-progress-20261021-lLLr5q`: optional review, error/success focus, saved pass, and history/dashboard at 320/1440px. Exact commands and preserved failed attempts are in the tracker.

**Still Open:** real Next action transport, authorized-target migration/grants/schema cache, multi-session Postgres races, connected export/cascade/unload, screenreader and broader report/release gates. No environment files, remote services, AI/provider calls, server startup, installs, commits or deployments were used. First-QA typecheck/build ran only in its env-free snapshot; no Next command was repeated for this test-only repair. Local acceptance does not close Tasks09/12 or connected/release gates.

## 20 October 2026 — saved, resumable lesson generation (independent bounded LOCAL acceptance; connected gates open)

### Fresh independent QA after repair — 12:59–13:05 HKT

**Accepted for bounded offline/local scope only, not production or release.** Independent QA confirmed exactly the six reported repair files changed since its first snapshot. Its own four reservation-time owner/approval/age/import-role race checks now produced **zero completions and zero saved parts in all four cases**, with the pending reservation preserved. The fresh standard **`npm test`** used the repaired serial script and passed **264/264**, with **0 failed/cancelled/skipped** (Node duration **152.931s**, command wall time **153.606s**). Full **`npm run lint`**, direct **`tsc --noEmit --incremental false`**, **`npm run typecheck`** (Next typegen + tsc), **`npm run build`** and diff checks passed. No old parallel/OOM command was rerun.

Real local actions/helpers and all migrations in in-memory PGlite verified saved parts, stable-ID quota/replay/finalization, explicit retry/lease recovery, the actual **99/100/101 identity/tombstone boundary**, and auth-user deletion while an injected completion was suspended, followed by rejected late saves/recreation. Fresh offline Chromium flows covered pause/close/reload, lost acknowledgements, keyboard/status focus, retained inputs and shared layouts at **320/1440px**. QA actually opened **13 fresh screenshots**: seven under `C:\Users\SOLUSER\AppData\Local\Temp\forge-generation-20261020-j2SRxG` and six Studio/Teaching route error/paused images under `C:\Users\SOLUSER\AppData\Local\Temp\forge-tracker08-DmwS9h`. The route functions and actual shared component were mounted through local action bridges; this does **not** establish real Next HTTP/server-action transport.

All commands used existing dependencies and an OS-environment allowlist in an **environment-file-free temporary snapshot**, with dependencies copied **inside** its root. All **145/145** frozen-file fingerprints matched before the two permitted documentation updates; generated files never touched the source checkout. The exact owned snapshot/npm cache were removed at **13:05:03 HKT**; fingerprints, safety metadata, inspected-image hashes and synthetic screenshots remain. See the latest tracker entry for exact commands, timings and the fingerprint.

**Still open:** separately authorized migration/schema-cache/service-grant checks, real action transport, provider/content approval, deployment and actual 90-second hosting/proxy budget, and screenreader testing. Apply `supabase/migrations/20261020_lesson_generation_ran.sql` only after the existing schema/prior migrations on an explicitly authorized target, then refresh schema cache and verify grants/RPCs before deploying this code. No remote migration, provider/catalog/Supabase call, deployment, environment-file access, dependency/key change or production verification was performed. The first blocked QA and implementer correction evidence below remain historical failures, not passes.

### Bounded repair after first independent QA — historical handover

Independent QA `45e54438-4a24-4b59-8a59-aa43a2ca348c` **blocked local acceptance** (12:33–12:41 HKT): reservation-time permission changes still allowed one injected completion before the post-inference guard, and the full serial suite was **257 passed / 1 failed out of 258** because the curriculum UI harness still expected the old generation component/buttons. Earlier focused passes did not cover those defects.

The bounded repair now rechecks **fresh same-owner authentication, AI eligibility and import role after successful reservation, immediately before inference**, while retaining the post-inference check. Four real-action/PGlite regressions first failed **0/4**, then passed **4/4**, with zero completions/parts after reservation-time owner switch, revoked approval, age17 or revoked import instructor role; explicit pending-lease recovery is also checked. New tests exercise the **99/100/101 identity/tombstone boundary** and **account deletion during an in-flight completion**, rejecting late saves/recreation. The existing curriculum route harness now mounts the actual shared component with real local staged actions, preserves curriculum/file/consent error assertions, and checks saved state, keyboard focus, explicit retry and pause.

Only `src/lib/lesson-generation-server.ts`, `tests/lesson-generation.test.mjs`, `tests/curriculum-ui.test.mjs`, `package.json` and these two docs changed in this repair. The approved package edit adds **only `--test-concurrency=1` to `test`**, avoiding the prior parallel V8 OOM problem; no dependencies/lockfiles changed. Implementer reruns: repaired selectors **4/4**, boundary/race **2/2**, curriculum UI **1/1**, combined **15/15**, then standard **`npm test`: 264 passed, 0 failed/cancelled/skipped** (121.025s). Scoped ESLint, direct TypeScript and diff checks passed. Six new full-suite Studio/Teaching error/paused screenshots actually inspected under `C:\Users\SOLUSER\AppData\Local\Temp\forge-tracker08-5L32yV`; exact commands/evidence are in the latest tracker entry.

**Historical repair handover, before the fresh independent rerun above:** the independent blocked verdict was not self-overturned by implementer passes; source was frozen for fresh QA. No build/Next env-loading command, environment-file access, connected calls, remote migration application or deployment was performed in that repair. Actual action transport, service grants/schema cache, hosting budget, screenreader and content/provider gates remain open; the migration stays local-only.

Studio and Teaching now use the same saved-generation UI. **Save generation draft** makes no AI call. Choose **Resume / Retry explicitly** to run separate sequential server requests: outline (4–6 slide titles), one slide at a time, ordering activity (3–6 steps), then two batches of five questions grounded in saved slides. Every valid part is saved immediately; only whole canonical validation and atomic finalization create a normal **private** lesson. Review the completed lesson using its editor link. Manual authoring/editing, publishing and grading are unchanged. No live surface calls the old whole-lesson helper.

- **Pause/close** stops subsequent scheduling, not the current request; its part may still save. Reload recovers the saved draft but never starts inference. Errors/uncertain acknowledgements stop the loop: **Load saved state / reconcile response loss**, then explicitly resume. Never start a new copy to recover an uncertain save. Start IDs are persisted before transport; replay/finalization cannot claim quota or create another lesson. A missing draft can be saved again with the **same** start ID.
- **Budgets:** stage calls explicitly use `timeoutMs: 60000`; catalog lookup, inference and all response-body reads share that one deadline. Shared completion default remains **30000 ms**, maximum **60000 ms**. Coaching and interviews remain **30 seconds**; interview leases remain **75 seconds**. Lesson reservations use a **DB-time 90-second lease**, one unexpired request per owner, expected revision, request-ID replay checks and server-only attempt tokens. An abandoned lease may need to expire before retry.
- **Abuse bounds:** one atomic existing `forge_claim_request` claim per new lesson start, **5 starts/account/UTC database day**, not per part/replay. Each stage allows **3 explicit reservations/attempts maximum**; errors do not auto-retry. Provider/account quotas still apply to each inference. Maximum **10 unfinished drafts** and **100 retained start identities per account**, including completed/deleted identities. Deletion clears draft content/reference; a minimal owner/start-ID tombstone prevents replay from recreating deleted work and still counts toward 100. Account deletion removes it. Hitting that lifetime bound does not enable unlimited inference; manual authoring remains available.
- **Private storage:** new server-only `forge_lesson_generations`, not partial `forge_lessons`; no browser/public grants or administrator exception. All actions derive the owner from current authentication. Every inference rechecks that **same owner**, current adult/admin-approved AI eligibility and (for imports) instructor/admin permission **after reservation immediately before inference**, and again **after inference before saving**. Read/list/delete need no AI grant; owners can delete imported drafts after role revocation. Lists return bounded metadata/counts, not reference text, parts or answer keys. Import finalization still needs instructor permission. No client-supplied final lesson JSON is accepted.
- **Imports:** existing PDF/PPTX signatures, 4 MB/60-page-or-slide limits and unsupported legacy PPT behavior remain. With explicit consent, only extracted reference text **≤20,000 characters** is retained while pending, then cleared at completion/deletion. Original files are never stored. Quiz/activity grounding uses saved slides, not source text; batch two receives only prior question **prompts** for deduplication, never saved answer keys. Source/prompts/raw errors are not logged. Account export now includes this private table as the **15th** owner-scoped, paginated, all-or-nothing dataset; Auth-user deletion cascades drafts and tombstones.

**Deployment plan (not performed):** review/apply `supabase/migrations/20261020_lesson_generation_ran.sql` after prior migrations on an explicitly authorized target, refresh the PostgREST schema cache, verify service-role-only functions/grants and redeploy. Missing storage produces an actionable error, never a monolithic fallback. Studio and Teaching declare Node runtime / `maxDuration = 90`. Hosting plan, proxy, platform and database budgets may differ; independently verify they permit a 60-second operation plus auth/save overhead. No new environment settings, provider/reasoning overrides, models, dependencies or key changes.

**Original handover evidence (not acceptance; see blocked-QA repair above):** serial 11-file focused gate **152 passed, 0 failed/skipped**; scoped ESLint, direct `tsc --noEmit --incremental false` and diff check passed. A preceding fully parallel run failed with **150 passes / 2 V8 OOM worker failures**; it is not a pass. Network-blocked real mounted Chromium/action/PGlite flows covered separate calls, pause/close/reload, retained start failures, explicit retry, lost start/part/finalize responses, keyboard/status focus and 320px/1440px layouts. Seven original handover synthetic screenshots were inspected under `C:\Users\SOLUSER\AppData\Local\Temp\forge-generation-20261020-xxr0VD`. These historical focused passes did not establish full regression or reservation-time authorization acceptance.

## Latest decision — 20 October 2026, user-approved OpenRouter compatibility

The user explicitly approved “Please use the same setting as note.py” after being informed that both request-level privacy restrictions would be removed. The shared client now **omits `provider` entirely** (including `data_collection`, `zdr`, `require_parameters`) and **omits `reasoning` entirely**. One configured model uses singular `model`; only explicitly configured multiple free models use ordered `models`. The request **no longer enforces ZDR or `data_collection: deny`**; account/provider policies still apply and their effective defaults are unknown. This is not retention/training certification or a production-success claim. Free-only catalog validation, adult/admin eligibility and strict lesson schema remain.

This bounded decision supersedes earlier strict-request-policy/disabled-reasoning assertions below, not their dated evidence or independent activity QA. Intentional differences from translation `note.py`: token counting still includes **all outgoing message-content Unicode code points**, not raw note text; one whole-operation deadline is stronger than an HTTP client's per-phase timeout (originally **30000 ms**; the saved-generation change above retains that default and explicitly allows **60000 ms** for lesson parts). No caller token-budget APIs, translation retry loop or prompt handling were copied. Vercel requires a redeploy to activate this code; `.env.prod` is not automatically used by Vercel. No env files were modified and no live retry/probe or deployment was performed. The narrow authoring-test assertion follow-up passed the then-current single four-file local gate **77/77**, plus scoped ESLint, direct TypeScript and diff checks; the prior **75 passed / 2 failed** stale-assertion attempt remains recorded in its tracker entry. Independent review and production results remain pending.

## Current coordination — 20 October 2026 - lesson creation repair

**Independent bounded LOCAL acceptance only; live creation remains unverified.** Forge Implementer delivered the manual-validation, eligibility-error and uncertain-save/AI acknowledgement recovery repairs; Forge QA independently accepted them on **20 October, 09:34–09:36 HKT**: **232 tests passed**, with lint, typecheck and build exit 0. Manual creation remains independent of AI access/provider availability; canonical content, authorization and privacy rules are unchanged. Coordinator reconciled documentation only. The original connected failure/root cause remains unestablished: this is not a claim that live generation or all creation failures are fixed, nor release/project completion. Whole-project and associated tasks remain **Open/Partial**. Connected checks need a confirmed intended disposable nonproduction Supabase target/app origin and authorization, with separate permission for any quota-consuming AI probe. See the [20 October tracker handover](IMPLEMENTATION_TRACKER.md#current-coordination--20-october-2026---lesson-creation-repair) for ownership, six delivered files, independent local evidence and pending gates; the 15 October entries below remain historical.

### 20 October follow-up — activity-step blank lines (independently accepted LOCAL)

After the first repair, the user reported `Please check activity.steps.1: Too small: expected string to have >=1 characters.` An offline real-editor regression reproduced that exact blank-second-step error. Activity entry now retains raw typing/newlines while preview, submitted steps and dirty/saved comparisons consistently ignore blank lines and surrounding whitespace. Field-associated guidance/focus requires **3–6 real ordered steps, each ≤120 characters**; no missing content is invented or meaningful steps truncated. Server validation and the provider JSON schema remain unchanged, as do the six earlier repairs.

Original implementer evidence (preserved provenance): corrected red authoring run **17 passed / 2 failed** (regression + parent), immediate green **19/19**, expanded authoring **24/24**, final `node --experimental-strip-types --test tests/manual-authoring.test.mjs tests/learning.test.mjs` **31/31**. Scoped ESLint, direct `tsc --noEmit --incremental false` and diff whitespace checks passed. Keyboard/focus, retained input, preview/save order and same-ID updates passed at 320px/1440px; the implementer inspected six activity screenshots.

**Fresh independent QA, 20 October, 10:11–10:13 HKT:** the same focused command passed **31/31**, followed serially by `npm test` **246/246**, `npm run lint`, `npm run typecheck` and `npm run build` (all exit 0; **23/23** static-generation work items); final `git diff --check` passed. These are new results, not the earlier **232-pass** packet. Blank/whitespace/CRLF formatting, Enter/caret, 320px/1440px keyboard/focus, canonical preview/submission/synthetic persistence, retained failed-save text, normalized dirty baselines, same-ID/version-2 saves, invalid-step no-write behavior, direct tampering, authorization and uncertain-save no-replay passed. The server/provider schema retains **3–6 items, 1–120 characters**.

QA inspected **six final-run activity screenshots** (12 across two runs) under `C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-activity-20261020-qa-final\evidence\screenshots\forge-manual-qa01-jjfOHy`. Windows/Node **25.2.1**, existing dependencies, an OS-environment allowlist and offline controls were used in a **125-file env-free snapshot**; source/config/test hashes remained unchanged through the final run. A first passing run was repeated after unrelated comment/documentation drift; external Git-status drift is recorded separately, not attributed to QA. Only these two docs were edited by QA; owned snapshot/scratch cleanup was verified and evidence retained. No environment-file reads/imports, installs, connected services/suites, live AI/quota calls, migrations, commits or deployment by QA. **Bounded offline component acceptance only:** deployed styling/routing/action transport, actual database persistence, screenreader and all connected/release gates remain unverified/open. See the tracker follow-up for commands, fingerprints and evidence.

## Current coordination — 15 October 2026, 03/18 + 08 integration

**Independent bounded LOCAL QA accepted at 15:07 HK; not release or whole-project acceptance.** Forge Implementer delivered onboarding/local diagnostic, the coupled profile/email repairs (03/13/18/20) and browser-harness integration; the disjoint curriculum writer delivered canonical curriculum/metadata and manual-authoring repairs (08/14). With all source frozen, Forge QA independently verified the integrated local packet and owns this final documentation-only evidence update. The project owner still approves pedagogy/content and release.

- Coordinator reports the stable combined **13-file focused run: 134 passed, 0 failed/skipped**, with direct `tsc`, scoped lint and diff checks passing. The initial onboarding packet's 33-pass/one-startup-failure result is superseded: the curriculum writer repaired leaf-module imports within ownership, without adding an account-test loader workaround. These are implementer/integration results, **not independent acceptance**.
- Independent **preimplementation** QA at **14:17:48.940 HK** passed **168 tests and lint** over 102 fingerprinted files (`935b1f3fa1586827c85fe8401c3a98ff26037fe952cd30ef60e468c1098ab235`). This remains baseline evidence, distinct from the fresh acceptance below. The separate historical Task25 repair already had independent local 168-test acceptance; its connected gates remain open.
- The earlier harness/docs handoff ran `node --check` on both harnesses, scoped ESLint, and **22 isolated synthetic helper contracts** using the real registry/schema and UI/database adapters. Independent QA subsequently inspected the bounded onboarding/schema/metadata adaptations without executing either connected harness.
- **Final independent gates, 15:06:14.580–15:07:19.543 HK:** one serialized run each of `npm test` (**224 passed, 0 failed/cancelled/skipped**), `npm run lint`, `npm run typecheck` and `npm run build`; all exit 0. Next.js 16.3.5 Turbopack completed **23/23** static-generation work items; onboarding/diagnostic routes are dynamic. Earlier independent **47/47** targeted repair tests were not redundantly rerun as a separate subset.
- The first full attempt was **223/224**, stopped before lint/typecheck/build because the old eligibility fixture omitted the new profile revision/auth/CAS contract. The sole subsequent change, `tests/eligibility.test.mjs`, adapts that fixture and adds owner/revision/matching-ID assertions while preserving age/minor/no-grant assertions. **Resolved test adaptation, not an application regression or policy relaxation.**

The five reproduced profile issues are locally repaired: operational/auth/uncertain email-change handling with retained address and no automatic replay; retained actual File/removal/text state after failed saves; failed/missing profile loads cannot expose saveable defaults or be masked by success-query text; 320px file-control wrapping and keyboard/focus behavior; and mutation denial for returned auth errors even when a user is present. Shared revisions also protect profile choices from stale diagnostic/onboarding tabs. The actual manual-editor regression changed from **two inserts** to **one insert followed by a same-ID update to version 2**.

**Repair closure:** the earlier independent **33 targeted + 103 curriculum/account** runs verified the original five profile contracts and onboarding role/scoring/owner/state checks, then exposed QA-FOCUS-01/02 and QA-MANUAL-01. The focus writer's four red keyboard cases and **18/18** repaired UI result remain implementer evidence. Independent **47/47**, followed by the final **224/224**, now close all three findings locally: Cancel retake focuses the persistent saved-result heading, Cancel picture change focuses the chooser, and both work without mutations at **320×844 and 1440×1000**. Manual creation distinguishes definite rejection from ambiguous acknowledgement: thrown/returned-error/missing-data/malformed-ID post-insert variants retain the draft, leave one row and block another create. Private catalog recovery opens separately; published recovery uses the permission-gated teaching library. Canonical existing-ID reconciliation and the original same-ID/version-2 save remain passing. The persistent curriculum render-synchronization harness repair also passes without weakening assertions.

**Reproducibility and safety:** snapshot captured **15:05:50.662 HK**, 125 files from `src/`, `tests/`, `scripts/`, `supabase/` and seven named root package/config files; SHA-256 `b46b50503e3865dc5188576836f7c5c07cd82d6cfac530e2670350c98a39cf89`. Repository/copy inputs stayed unchanged; fingerprint comparison confirmed only the eligibility fixture changed from the previous attempt. Windows, Node **25.2.1**, invoked bundled npm **11.6.2**, TypeScript **5.9.3**, ESLint **9.39.5**, Playwright **1.63.0**, Chromium **153.0.8010.12**. Existing dependencies and an OS-environment allowlist were used; no environment-file reads/copies, credentials, installs, remote services, connected suites, migration application or deployment. Generated files stayed in the owned snapshot, which was removed with absence verified. The final run retained **49 synthetic screenshots; 17 were opened and inspected**, including all four cancellation-focus views and manual uncertainty at mobile/desktop. Two full-page profile captures contain viewport-transition/fixed-header artifacts and are not settled-layout approval. Exact commands/timings, evidence paths and limits are in the tracker's final independent local QA entry.

**The whole project and 03/08/18/25 remain Open/Open-Partial:** local starting-point setup and metadata do not establish genuine tailoring, reviewed curriculum/resources or connected acceptance. Reviewed progress (09/12), targeted AI revisions (14/16), actual tailoring (18), required legacy PPT/student slide assistance (19), 4D/reflections (22), private planner (23), embedded coding (24), and all provider/connected/owner/release gates remain open. Historical logs below retain their original evidence dates.

## Approved delivery scope (15 October 2026)

**Historical scope decision:** the **22 October** prototype-first matrix above now governs demo priorities and explicit deferrals. The original requirements below are not thereby completed; retain them as unmet/deferred where applicable.

Target: 31 October 2026, focused on university learners and instructors. This remains a supervised Hong Kong course demonstration with the existing 13+ signup policy, not an approved public launch. The project owner performs final review and owns the course submission. The 15 October owner-confirmed scope supersedes conflicting September SDLC-only limits and deferrals, not the existing safeguards.

### Approved target — bounded implementation status

**Interview simulator update — 2 November 2026 (latest explicit approval):** `/interviews` and existing private histories are retained; navigation/setup now say **Interview simulator**. Choose technical/problem-solving, project discussion, teamwork/behavioural or an existing SDLC/agent/product focus and difficulty. Prompts request original programmer questions and situational followups, one at a time, accepting coursework/hypothetical experience without requesting identifying details. No per-answer coaching/grading: final formative strengths, improvement areas, technical reasoning, problem solving, communication and a next step follow answer eight. All eight learner answers fit the final 12,000-character context; earlier question excerpts may be shortened. Early finish makes no new inference and invents no feedback. Old saved replies are not rewritten.

Optional **English (en-US) browser dictation** supersedes the earlier voice deferral **only for this bounded input feature**. Eligible recorded adults with administrator AI access must opt in to the browser-vendor speech-processing disclosure before Start requests the microphone. Support and accuracy vary; audio may leave the device via the browser vendor. No cloud polyfill, TTS, video, audio storage or paid service was added. Stop → review/edit the separate unsaved preview → Insert or Discard → review the editable answer → explicitly Send. Typing is always the fallback; insertion never truncates an over-limit draft or auto-sends. Capture aborts on lifecycle/management boundaries; a global recognizer cannot change owners before its native end event. If the browser never delivers end, typing remains available; reload the page to recover dictation. Existing owner/history/delete/export/cascade, 8-answer/1,200-character/1,600-character limits, leases/retries/idempotency/uncertain-save handling and shared free-only 15/day AI policy remain.

**Migration pending, not remotely applied:** after existing migrations (including `20261015_interviews_ran.sql`), review/apply **`supabase/migrations/20261102_interview_simulator.sql`** only to an explicitly authorized target before enabling the three new focus values. It adds those choices to the topic constraint without rewriting histories, RPCs or grants. Old topic keys remain valid; `_ran` filenames do not prove application.

**Local writer verification, 2 November:** `node --experimental-strip-types --test --test-concurrency=1 tests/interview-dictation.test.mjs tests/interviews.test.mjs tests/interviews-ui.test.mjs` (focused 44/44 before the added revoked-grant regression; final expanded actions/dictation 26/26); complete inspected offline suite with an allowlisted child environment (`node --experimental-strip-types --test --test-concurrency=1 tests/*.test.mjs`) **370/370**; `npm run lint`, direct `tsc --noEmit --incremental false`, `git diff --check`, and `node scripts/check-interview-build.mjs` passed. The build helper copies an env-file-free workspace and allowlists the child environment before Next typegen/TypeScript/webpack build. Dependencies: `react-speech-recognition` **4.0.1**, `@types/react-speech-recognition` **3.9.6**, tested with React **19.1.0** / Next **16.3.5**. Offline Chromium/PGlite exercise actual components/actions/library with synthetic native speech/provider events. 320/1440 dictation screenshots were captured and opened (temporary `forge-interview-simulator-eiMhnW`); no overflow. Independent QA requested. No real microphone/manual vendor test, connected migration/auth/provider acceptance, deployment or release certification.

- Role-appropriate first-login background/goals onboarding and a separate explained local diagnostic with explicit adoption/override/retake are implemented locally; self-report never grants instructor rights. Connected acceptance and owner pedagogical review remain open.
- Explicit lesson audience, difficulty, outcomes and prerequisites with filtering, plus canonical SDLC, AI coding-agent and software-development soft/product families, are implemented locally. Reviewed demonstration content and learning/tool resources remain open.
- Genuinely tailored explanations, examples and practice, not merely reordered recommendations. AI-assisted targeted instructor revisions require preview, accept/reject and versioning.
- Clear reviewed vs attended vs passed progress states; activities and reflections applying AI fluency 4D: Delegation, Description, Discernment and Diligence; daily reflections.
- A **private project planner** (goals → suggested stack/structure → editable milestones/tasks/progress) and a **student slide assistant** (authorized course material or personal uploads → source-referenced summary, key terms, glossary and beginner explanations; private by default).
- **Embedded coding (24):** beginner-friendly, initially **JavaScript and Python**, as confirmed on **15 October 2026 at 11:20 HK**; TypeScript/other languages are not required. Runtime/execution isolation and resource controls still need design/feasibility before implementation. Outbound links do not replace embedded coding.
- **Real-time interviews (25): text interviews with optional bounded browser dictation approved 2 November**, superseding the earlier text-only/voice deferral only as described above; no video or spoken interviewer. Persistence was approved in principle at 11:20 HK; the **15 October 11:26 HK decision approved private owner history, deletion, export/account cascade and retention until deletion**. Bounded local implementation is present at `/interviews`; migration application and connected acceptance remain open. Generic lesson-coach chat remains session-only with no persisted history.

**Interview transcript policy — APPROVED, 15 October 11:26 HK:** private learner-owner history/list/reopen/continue, explicit finish and individual deletion; retain until interview or account deletion; include transcripts in account export and Auth-user FK cascade. No automatic administrator, instructor, reviewer or peer access. History/read/finish/delete/export require authentication and ownership, not an active AI grant. Each new inference/retry additionally uses the existing adult/trusted-grant gate and unchanged free-only strict-privacy AI client. This approval does not certify live persistence, provider retention or deployment readiness.

Retained structure: **one standalone lesson per mini-course; no multi-lesson containers**. No community is required: no peer showcases/sharing, human Q&A, instructor news/community feed, comments or community notifications. Campus retrieval, lecture-video ingestion/alignment, rich advanced media/real-time voice/video, and broader games/simulations are not newly approved; basic tailored practice and 4D activities are core.

Beyond the approved private interview transcript policy, this 15 October scope decision did not authorize other conversation/recording storage, new services, public hosting/deployment, paid endpoints, privacy-filter relaxation or third-party analytics/training use. Its strict request-policy requirement is now superseded only by the explicit 20 October shared-client compatibility approval above. Free-only AI, minor/unknown-age external-AI denial, administrator-approved recorded-adult AI access, admin-granted instructor rights, owner-scoped publishing/reporting, explicit enrollment, optional paths, quiz/certificate rules and no persisted coach history/original upload retention all remain. Required legacy PPT import is still open. See the [current scope record](IMPLEMENTATION_TRACKER.md#current-approved-scope---15-october-2026), [current overview](IMPLEMENTATION_TRACKER.md#current-overview) and tasks 03/08/09/12/14–16/18/19/22–25 for owners, acceptance and dependencies. Approval is not feature completion or live verification.

### Existing implementation and limits

- Administrators use `/admin/accounts` to search accounts by email, grant/revoke instructor rights, and approve/revoke external AI access for recorded adults. Administrator accounts cannot be demoted by this interface.
- Instructors use `/teaching` to create, publish and edit their own lessons, select existing verified learners by email filter for enrollment, and view only their own published-lesson reports. Administrators retain global public-lesson control. Existing self-enrollment and private-draft isolation remain.
- First dashboard entry sends incomplete accounts to `/onboarding`; later edits and `/diagnostic` are linked from `/profile`. Completion/background and the latest diagnostic summary are separate from the chosen `learning_level`. Current trusted instructors/admins receive instructor questions; reviewers and other accounts receive learner questions. No self-reported privilege grants, invented historical completion/ages, raw answer history or new diagnostic AI payloads.
- The six-question local diagnostic uses draft rubric `draft-2026-10-v1`: 0–1 New, 2–3 Foundation, 4–5 Intermediate, 6 Advanced. Retaking never changes the chosen level; adoption/override is explicit. Owner pedagogical review is still required. Recovery/profile/export/deletion remain reachable when setup is incomplete or unavailable.
- `/paths` provides optional, explainable local recommendations across the three canonical families and an explicit AI path action. Paths never enroll learners, and generated paths are session-only. Only coarse learning preferences and course metadata are sent to AI, not account identifiers, raw profile goals, grades or answer keys. This is not genuine lesson-content tailoring.
- Teaching imports target an editable private draft and quiz; successful end-to-end AI generation remains unverified. Searchable PDF and PPTX text extraction is implemented; originals are not saved. Limits: 4 MiB, 60 pages/slides, and 20,000 extracted characters for generation. Scanned/image-only PDFs require OCR outside this workflow. Legacy binary `.ppt` remains an unmet requirement and is rejected explicitly; no supported serverless conversion dependency has been verified.
- Authoring, generation, coaching and paths now share the canonical curriculum registry: **Software Development Life Cycle**, **AI Coding-Agent Skills**, and **Software Development Soft and Product Skills**. New lesson writes require version-1 `content.metadata` with topic, audience, difficulty, 1–8 outcomes and 0–8 prerequisites. Audience expresses suitability, not access permission. Legacy aliases are read through the registry; absent/invalid legacy metadata is **Not specified**, never inferred beginner/everyone/no-prerequisites. No curriculum DDL/backfill was added. Older writers can strip JSON metadata on rollback; freeze/review writes before reverting. Schema/prompt alignment does not prove semantic quality; owner-reviewed content/resources remain required.
- External AI is denied to minors and unknown-age accounts. Recorded adults additionally require a trusted administrator AI-access grant. This is a technical gate, not independent age verification or proof of legal consent.

Previously recorded connected blockers (not rechecked by these packets): the database lacked `profiles.age`; the resume table passed an empty-read check, but service-role grants and full resume behavior still needed verification. The new onboarding/diagnostic migration is also required for profile editing. No migration was remotely applied in these packets; connected applied status remains unverified regardless of filename suffix. Live free-model probes returned 429 and 404 under the unchanged privacy restrictions; successful generation remains unverified. Production encryption-at-rest configuration, backups, retention and Hong Kong/provider eligibility have not been certified.

## Existing learning workflows

- Authenticated catalog search, explicit self-enrollment, saved lessons and real progress records. No assigned learners or invented progress.
- Standalone private AI-generated or manually authored lessons (one lesson per mini-course), with 4-6 short slides, an ordering activity and exactly 10 four-option quiz questions; live AI success remains blocked as noted above.
- Server-side grading: 6/10 passes; retries are unlimited. Attendance records reaching the final quiz, independently of submission or passing.
- Optional explicit slide-review acknowledgement is stored per owner/lesson/version, separately from attendance and saved quiz passes; no historical inference and no new quiz gate.
- Downloadable, printable HTML certificates for every passing attempt. Private Self-Learning and Public Published Lesson certificates retain the lesson version and visibility at achievement time.
- Structured editing and optimistic version checks. Learners edit their own private lessons; instructors publish/edit their own public lessons and administrators manage public lessons globally.
- Private drafts are invisible to other accounts, including administrators, until the owner explicitly submits them for publication review.
- Administrators grant per-published-lesson report access to registered reviewers. Reports contain public participation and submitted quiz answers, never coach conversations or private attempts.
- Session-only contextual AI coaching, with no server-side conversation storage.
- Verified-email authentication, password recovery, profile image validation/resizing, verified email-change requests, paginated JSON export and password-confirmed account deletion.
- Optional three-family recommendations and AI learning paths, plus instructor-selected enrollment of existing verified learners. No roster-file uploads, cohorts or notifications.

## Run locally

```bash
npm install
npm run dev
```

Use Node.js 22.18+ (or Node.js 24 LTS). Configure the variables listed in [.env.example](.env.example) in your local environment. Never expose the service-role or OpenRouter keys through `NEXT_PUBLIC_` variables. The existing `OPEN_ROUTER_API_KEY` spelling is accepted as an alias for `OPENROUTER_API_KEY`.

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SITE_URL` are required for authenticated access. Set the site URL to the canonical deployment origin (no path, query or credentials); use HTTPS except for local loopback development. Set `NEXT_PUBLIC_SITE_URL` to your deployed HTTPS origin in Vercel's environment variables; keep `.env.local` pointed at your local server. `.env.prod` is not loaded automatically by Next.js or Vercel. Misconfigured protected pages return a retryable 503 screen, and APIs return a 503 JSON error. The setup diagnostic checks these settings without printing their values.

Only after separate target/operation authorization, review actual application status and
apply any outstanding files in order in the Supabase SQL editor (not performed here):

1. [supabase/schema.sql](supabase/schema.sql), only for a new database. Do not rerun it over an existing installation.
2. [supabase/migrations/20260923_learning_ran.sql](supabase/migrations/20260923_learning_ran.sql).
3. [supabase/migrations/20260924_review_privacy_ran.sql](supabase/migrations/20260924_review_privacy_ran.sql).
4. [supabase/migrations/20260925_coach_ran.sql](supabase/migrations/20260925_coach_ran.sql).
5. [supabase/migrations/20260926_record_integrity_ran.sql](supabase/migrations/20260926_record_integrity_ran.sql).
6. [supabase/migrations/20260927_resume_ran.sql](supabase/migrations/20260927_resume_ran.sql).
7. [supabase/migrations/20260928_profile_limits_ran.sql](supabase/migrations/20260928_profile_limits_ran.sql).
8. [supabase/migrations/20260929_age_eligibility_ran.sql](supabase/migrations/20260929_age_eligibility_ran.sql).
9. [supabase/migrations/20260930_resume_grant_ran.sql](supabase/migrations/20260930_resume_grant_ran.sql).
10. [supabase/migrations/20261015_interviews_ran.sql](supabase/migrations/20261015_interviews_ran.sql).
11. [supabase/migrations/20261015_onboarding_diagnostic_ran.sql](supabase/migrations/20261015_onboarding_diagnostic_ran.sql).
12. [supabase/migrations/20261020_lesson_generation_ran.sql](supabase/migrations/20261020_lesson_generation_ran.sql).
13. [supabase/migrations/20261021_progress_evidence_ran.sql](supabase/migrations/20261021_progress_evidence_ran.sql) — progress evidence; connected application/acceptance unverified.
14. [supabase/migrations/20261022_daily_reflections_ran.sql](supabase/migrations/20261022_daily_reflections_ran.sql) — daily reflections; **application unverified by this work**, connected target authorization/acceptance pending.

These are the current filenames; `_ran` is a filename suffix, **not evidence of applied status**. User/external renames are preserved; this work did not rename or apply migrations, and application is unverified. Historical dated filenames remain history, not current operator paths. Interviews require their migration; saved lesson generation and **account exports** require the lesson-generation migration (15th export table) and exports now additionally require daily reflections (16th). Missing migration/access fails the entire export rather than silently omitting private records. Setup diagnostics check generation/progress/reflection columns with zero-row projections, not connected transactional behavior or generation RPC permissions.

The progress-evidence migration is required for new review/attendance writes and current-version quiz attendance checks. It adds no export table: enrollment `*` exports include the new version-keyed field automatically once applied. Before enabling these writers on an authorized target, refresh schema cache and verify service-role RPC/table grants and browser-role denial. Existing setup diagnostics do not verify this RPC. Do not infer applied status or backfill review/attendance from old enrollment, bookmarks or saved places.

The onboarding/diagnostic migration adds nullable `onboarding_completed_at`, `onboarding_background`, `diagnostic_summary`, and integer `learning_setup_revision` (initially 0) to `profiles`, with bounded JSON checks, protected setup writes and a revision trigger. It is required for **dashboard onboarding, diagnostic actions and ordinary profile editing**. Both browser harness scopes require this schema and numeric-age eligibility. It makes no historical completion/background/age backfill; existing unknown-age rows may still fail prior age constraints until explicitly reviewed. `profiles.*` owner export includes the fields and the existing Auth-user cascade removes them. Application of this migration is unverified by this work; local PGlite checks are not deployment evidence.

After authorization, compare actual target status and apply only outstanding migrations in order. Never rerun the base schema on an existing database. The 25 September resume-table observation is historical; current table/service-role-grant application and behavior are unverified by this work. Age/profile checks use `NOT VALID` to preserve historical rows during upgrades, but apply to new writes. Existing ages are deliberately left unknown, not inferred from an age range; review legacy profiles and record their ages before validating constraints. Numeric age 13-120 is required for new signup/profile writes. Source changes alone do not create tables. Old prototype records remain available in exports but are not converted to new lesson results or certificates.

When the owner later authorizes the target and these **connected read/probe scopes**,
verify configuration (commands shown for future use; not run in this local slice):

```bash
npm run check:setup
npm run check:setup -- --ai
```

Both commands load local configuration and perform remote database **zero-row column
reads**, including `forge_lesson_generations`, `forge_enrollments.progress_evidence` and
`forge_reflections`; neither reads learner records or mutates/applies schema. The first
checks public/DB/key/model configuration but makes **zero AI requests**. Invalid arguments
are rejected before environment loading or client/network creation.

With `--ai`, successful configuration/column checks allow the **actual shared client**
to verify all selected free IDs/zero pricing with one catalog GET, then make **one**
quota-consuming completion POST. The actual configured helper supplies the default and
ordered fallbacks/aliases; no hardcoded setup model, provider/reasoning overrides, duplicate
catalog validation, per-model POST loop or paid/unverified fallback. Shared deadlines,
content-based token budget, bounded bodies, abort/redirect handling and sanitized diagnostics
are retained. The strict tiny `{ok:true}` output is validated locally; false, wrong,
malformed or extra keys fail. No keys, raw URLs/settings, prompts or response content are
printed; failure reports use fixed text/status metadata (shared-client allowlisted
model IDs and diagnostic UUIDs may appear). Failed checks exit nonzero.

A column/probe pass does **not** prove service/browser grants, RPCs, schema cache,
request-limit behavior, concurrency, account/provider eligibility, full lesson generation
or pedagogical quality. Those require separate authorized verification, not this check.

Open [http://localhost:3000](http://localhost:3000).

### Authentication setup

Passwords are never stored in this repository or the `profiles` table. Supabase Auth stores a one-way password hash in its protected authentication schema.

In **Supabase → Authentication → URL Configuration**:

- Set the Site URL to `http://localhost:3000` for local development.
- Add `http://localhost:3000/auth/confirm` as a redirect URL.
- For Vercel, set the Supabase Site URL to the deployed HTTPS origin, add its `/auth/confirm` URL as a redirect URL, and set `NEXT_PUBLIC_SITE_URL` to that same origin in Vercel's environment variables. Supabase email templates using `{{ .SiteURL }}` depend on that Site URL setting.

After signup, verify the email before logging in. If login reports an unverified email, use **Resend verification**. Existing accounts can also use **Forgot password** without registering again.

Successful password reset requests global sign-out before returning to login. Ordinary **Log out** also uses global scope, revoking refresh sessions across devices rather than only this browser. Already issued access tokens can remain valid until their configured expiry; this is not an immediate access-token revocation guarantee. Provider or cookie-cleanup failures show retry guidance, and a confirmed password update followed by failed logout is reported separately so users know to use the new password. Live multi-session revocation and browser-cookie behavior still require verification on the approved disposable target.

Keep email confirmations and secure email-change confirmation enabled in Supabase. Configure production SMTP. Signup requires a whole-number age of at least 13; under-13 guardian self-attestation has been removed. Profile ages remain self-reported, and minors cannot access external AI under the current demo policy.

### Troubleshooting production signup

The signup server action emits structured JSON to the hosting platform's **server/runtime logs**, not the browser console. Once a deployment includes this change, open **Vercel → project → Logs**, select the production deployment and attempt time, and search `auth_signup_`. Include Info and Warning levels as well as Error.

Each attempt emits `auth_signup_started` followed by one terminal event:

- `auth_signup_validation_failed` (Warning): `invalid_fields` contains field names only; no Auth request was sent.
- `auth_signup_failed` (Error): `stage` distinguishes `configuration` (callback configuration), `client` (server client/cookies), and `provider` (Supabase signup). `failure_type` distinguishes a returned provider error from a thrown exception.
- `auth_signup_completed` (Info): Supabase returned without error and the existing verification redirect follows. This does not prove inbox delivery or that an account is new; Supabase may obscure duplicate-account responses.

Search the fresh random `diagnostic_id` to group an attempt. `elapsed_ms` measures time since action entry. Failures include an allowlisted `error_code`, bounded numeric `http_status`, and a fixed `reason`: `database`, `email_delivery`, `network`, or `unknown`. Unrecognized codes/statuses become `null`. Reasons are diagnostic hints from SDK errors, not verified root causes.

Illustrative failure (not a production observation):

```json
{"event":"auth_signup_failed","diagnostic_id":"7e2fe4ea-b7be-49d6-aef6-086ef5ae5311","stage":"provider","elapsed_ms":382,"failure_type":"returned","error_code":"unexpected_failure","http_status":500,"reason":"database"}
```

Use the stage/code/category to narrow the next checks:

- `configuration`: check the production `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SITE_URL` settings. Missing or malformed values prevent signup.
- `database`: inspect Supabase Auth/Postgres logs around the same time, especially the new-user profile trigger and required migrations.
- `email_delivery` or `over_email_send_rate_limit`: inspect Supabase Auth/SMTP configuration and email limits.
- `signup_disabled`, `email_provider_disabled`, or `captcha_failed`: review Supabase signup/provider/CAPTCHA settings.
- `network`, timeouts, or 5xx statuses: check service availability and hosting-to-Supabase connectivity.
- No `auth_signup_started`: verify the deployment contains this code and inspect hosting request errors; middleware/configuration, routing or server-action transport failures can happen before the action runs.

Logs omit submitted names, emails, ages, passwords, tokens, user IDs, environment values, raw errors/messages/stacks and provider response bodies. Diagnostic IDs remain server-side; public error messages and signup behavior are unchanged. Restrict hosting/Supabase log access and configure retention separately. Do not share raw Supabase logs containing account information.

## Administrator setup

Use a trusted Supabase administrator session or Admin API to set `app_metadata.role` to `admin` for an explicitly approved registered account. Do not use `user_metadata` or a browser-controlled role field. No existing account has been promoted automatically; browser tests create and then delete a temporary administrator.

Create or review a submitted lesson in the studio, then select the review-and-publish checkbox. The administration page grants quiz-report access using a registered user's UUID and can revoke existing grants. This grants report access, not learner assignment.

After bootstrap, use Account maintenance to grant an instructor role; never expose the service key to a browser. Instructors can manage only their own lessons and reports. Teaching > Manage learners supports email-filtered selection of up to 50 verified learner accounts per action; duplicate enrollment preserves existing progress. No account is created and no invitation email is sent by this operation. Instructor directory searches require at least three email characters and return only minimal account labels, not profiles or AI eligibility.

## AI availability and privacy

Only explicit `provider/model:free` IDs verified against the zero-price OpenRouter catalog are accepted. The default `OPENROUTER_MODEL` is `nvidia/nemotron-3-ultra-550b-a55b:free`, with no default fallback; model/fallback environment overrides and the existing key alias remain supported. Missing, invalid or nonzero-priced catalog entries fail closed before authenticated inference. There is no paid fallback. A single selected ID is sent as `model`; optional fallbacks remain a comma-separated priority list (up to ten total models), sent as ordered `models` only when multiple IDs remain after deduplication. Requests send **no `provider` or `reasoning` overrides**: ZDR, data-collection denial and reasoning-disabled behavior are not enforced by the request. Account/provider policies still apply; fallback cannot bypass account quotas. Lesson generation retains strict `response_format` JSON schema. Catalog validation, inference and response-body reads share one **30-second default / 60-second maximum deadline**; lesson parts explicitly choose 60 seconds, coaching/interviews remain at 30 seconds (smaller injectable test deadlines are allowed). For lesson, coaching and interview requests alike, `max_tokens = min(16384, max(256, 3 * len(text)))`, interpreting `text` as all outgoing message contents concatenated without separators: count Unicode code points like Python `len`, not UTF-16 units or graphemes; roles and schema JSON are excluded. This intentionally differs from translation's raw-note-only count. Provider failures never save a fabricated lesson. Manually authored lessons do not require AI. This configuration is not live availability verification.

`npm run check:ai` checks the public catalog and account quota without inference. `npm run check:ai -- --probe=structured` makes one synthetic structured request using the same shared free-only client as the application (now without provider/reasoning overrides); `--probe=text` tests unstructured coaching availability. These are connected operations requiring separate authorization; none were run for this change. No credentials, prompts or output content are printed. The 25 September text and structured probes returned 429 and 404 respectively; no working endpoint has been established. Earlier probe results below are historical, not current guarantees.

### Production troubleshooting logs — 20 October 2026 (local implementation; independent QA pending)

The shared server client emits **one `console.error` JSON record per failed completion**, including configuration/catalog failures. It emits no success payload logs. After an authorized redeploy containing this code, open **Vercel → project → Logs**, select the relevant deployment/production environment and time window, filter runtime **Error** logs, and search `openrouter_completion_failed`. Search `diagnostic_id` to correlate that one operation; this fresh random UUID contains no account/request data. The ID is also available as `OpenRouterError.diagnosticId`, **not appended to public messages or exposed by new UI/action changes**. Status and retry fields are preserved. The 404/503 public message now says “No free AI endpoint currently meets the configured model, request and account settings. Please try later or contact the administrator.” It does not assert required request privacy settings or diagnose a particular cause.

Illustrative sanitized event (not a production observation):

```json
{
  "event": "openrouter_completion_failed",
  "diagnostic_id": "4c590bb0-09e4-46c5-978a-264762dc2b5e",
  "stage": "inference_body",
  "http_status": 503,
  "provider_code": null,
  "elapsed_ms": 182,
  "timed_out": false,
  "retry_after_seconds": null,
  "models": ["nvidia/nemotron-3-ultra-550b-a55b:free"],
  "output_mode": "json_schema",
  "provider": null,
  "reasoning_enabled": null,
  "reason": "upstream_unknown",
  "error_body_state": "malformed_json"
}
```

- `stage`: `config`, `catalog_fetch`, `catalog_body`, `catalog_validation`, `inference_fetch`, `inference_body`, `output_validation`. `http_status` is the actual response status (or `null` before receipt); `provider_code` is a separate embedded safe integer (absolute value ≤999999), including HTTP-200 error envelopes. `elapsed_ms` is monotonic elapsed time, not a content size. `retry_after_seconds` accepts numeric seconds only, capped at 3600 in logs (otherwise `null`); existing public retry behavior is unchanged. Arbitrary headers, including request IDs, are not logged.
- `models` contains only the fully syntax- and zero-price-catalog-validated configured free-ID list (up to ten IDs, each ≤200 characters), never raw invalid or unknown configuration; it is empty until catalog verification succeeds. This diagnostic list remains an array even when the request uses singular `model` and does **not** assert live availability. `output_mode` is `text` or `json_schema`. `provider: null` and `reasoning_enabled: null` mean **not sent / no request override**, not false, reasoning disabled, or privacy guaranteed; effective account/provider defaults are unknown.
- Closed `reason` values: `missing_key`, `invalid_model_config`, `invalid_timeout`, `catalog_http_error`, `catalog_malformed_json`, `catalog_invalid`, `catalog_unverified`, `upstream_unknown`, `no_endpoints`, `data_policy`, `zdr`, `unsupported_required_parameters`, `model_unavailable`, `rate_limit`, `malformed_json`, `invalid_response`, `refused_output`, `truncated_output`, `empty_output`, `body_too_large`, `timeout`, `transport_error`. Policy/parameter/availability hints come only from recognized phrases in the top-level upstream error message, never HTTP 404/503 alone. They are **untrusted diagnostic hints, not proof**; unknown text remains `upstream_unknown`. Catalog HTTP errors retain `catalog_http_error` rather than guessing an inference cause.
- `error_body_state`: `not_read`, `reading` (still pending at deadline), `json`, `empty`, `malformed_json`, `too_large`, `unreadable`. Each response is read at most once through a fixed-capacity byte buffer: **16 KiB for non-OK errors, 1 MiB for HTTP-OK completions (including embedded errors), 2 MiB for the catalog**. Only the first 4096 characters of an error message are examined for hints, never emitted. Parsing and diagnostics use the existing single operation deadline, without retries or additional requests. A known non-OK public error/status survives a diagnostic read failure/timeout. Late abort-ignoring work cannot start inference after a catalog timeout or emit duplicate logs; cancellation is best effort and cannot force a noncompliant transport to settle. Limits bound client-retained input bytes, not a transport's own allocations or parsed-object overhead.

No prompts/messages/schema/content, content sizes, learner/account IDs, API keys/environment values, raw exceptions/stacks, upstream messages/metadata/bodies or arbitrary provider names appear in these records. Eligibility denials before the client and downstream application-level lesson validation are outside this completion logger. Emission requires a working platform log sink; if it throws, the original sanitized failure is still returned rather than replaced or retried.

Inspect the now-omitted request overrides **separately** from OpenRouter key/account data-policy settings; `zdr` and `data_policy` remain valid diagnostic hints because account/provider settings can still restrict routing. Also distinguish structured-output incompatibility from transient model/endpoint availability and quota failures. A zero-price catalog entry does **not** guarantee a compatible live endpoint. The approved omission does not authorize paid fallback, arbitrary models, account-policy changes or further policy relaxation. Both code changes **and Vercel environment changes require a new deployment** to take effect. No deployment or probe was performed for this compatibility implementation. Coordinator supplied a prior production HTTP 404/text-mode `zdr` diagnostic; that observation does not establish success with the new code, and connected success remains **unverified**. Independent QA is requested for this bounded packet; historical activity QA is not acceptance of these changes.

### Historical strict-policy probes (request settings superseded on 20 October 2026)

At the time of these earlier probes, application and setup-probe requests explicitly set `reasoning: { enabled: false }` and strict provider filters. A successful standalone request using `deepseek/deepseek-v4-flash-0731` was not an equivalent availability test: that model has nonzero pricing, and the supplied standalone request omitted the then-required application privacy filters and structured-output requirement. Free-only usage was reconfirmed; the paid model was not enabled or called by those checks. The following observations are historical, not new probes or evidence for the compatibility change.

The supplied key authenticated successfully. Synthetic inference probes did **not** complete: the Qwen free endpoint returned 429 and other tested free endpoints returned 404 under the privacy policy. A working free endpoint still needs to be verified; do not assume the default model is currently available. Free-model availability, limits and upstream terms change.

With reasoning disabled, the then-latest Qwen probe still returned HTTP 429, and a temporary `liquid/lfm-2.5-2.6b:free` probe returned HTTP 404 under the same required settings. The temporary probe did not change the configured model. These statuses alone do not identify the exact quota or provider restriction.

### Current eligibility and data protection

Application limits are **5 new saved lesson starts** (including material imports) and **15 shared text-AI requests (coach plus interviews)** per account per UTC database day. Starting atomically claims quota even if later inference fails; resuming/replaying parts does not claim another start. Each stage instead has three bounded explicit attempts, and provider quotas still apply to every call. Failed coach/interview calls consume their shared text request. Quiz retries are never rate-limited by these counters. Provider-wide free quotas may be lower than aggregate user demand.

**Deployment gate:** before exposing AI to minors or deploying in any target region, review OpenRouter account eligibility, the selected upstream provider's age/region terms, consent requirements and data-processing arrangements. A safe-language prompt and a checkbox do not establish legal eligibility. Do not weaken the privacy policy or switch to a paid endpoint without approval. No production eligibility review has been completed.

For existing workflows, the provider receives a chosen objective and explicit curriculum selection, consented extracted teaching text, or lesson slides and recent coach exchanges. AI paths send only derived coarse preferences and course metadata. Account identifiers, raw profile fields, grades and quiz answer keys are not sent. Onboarding backgrounds and diagnostic answers/summaries add no provider payload fields; the diagnostic is local. Users must not enter personal data in free text or uploads. Provider retention must be independently confirmed; the app does not persist lesson-coach history or original uploaded teaching files. Interview persistence is locally implemented under the approved 11:26 policy. Interview context uses only a reviewed topic description, chosen level, phase/answer count and bounded canonical saved text; no account/interview/request IDs, raw profiles, grades or answer keys are added. Rate counters contain no prompt text and old counters are removed on the next AI request.

New learning tables deny direct `anon` and `authenticated` access. All reads and writes use authenticated server operations with explicit ownership/reviewer checks; the service key is server-only. The answer key is omitted from the lesson player's initial props. Review feedback is revealed only after a saved submission.

Existing learning records remain until account deletion. Approved private interview transcripts remain until individual interview or account deletion. Deleting an author removes their lessons and enrollment links, but other learners retain certificate/result snapshots. Deleting a learner removes their own records. Database backups and hosting/provider operational logs require separate retention configuration; the application cannot promise immediate erasure from those systems. Avatars are decoded and resized to 160px JPEGs in the private profile row, without a public storage bucket.

## Verification

### T25-QA-01 local repair — 15 October 2026

**Task25 remains Open. Independent QA has not rerun this repair; the initial QA failure below is preserved.** Changed only `src/components/interview-history.tsx`, narrowly extended `tests/interviews-ui.test.mjs`, and added README/tracker evidence. No action/helper/schema/provider changes; QA's server tests and original pagination regression assertions remain intact.

Confirmed creation now fetches the canonical latest metadata page through the existing list action and replaces rows, continuation cursor and latest/older selection together. It no longer prepends/truncates against an old cursor. The UI explains that creation returns to latest history. If that refresh returns an error or loses transport, the previous page/cursor remain unchanged, **Open new interview** remains available, and the notice explicitly distinguishes confirmed creation from failed history refresh. A synchronous in-flight guard prevents duplicate submits and overlapping create/history requests. Lost creation acknowledgements still require explicit reload; creation is never automatically replayed.

Actual local repair checks (Windows / Node.js v25.2.1; synthetic offline fixtures):

| Command | Result |
| --- | --- |
| `node --experimental-strip-types --test tests/interviews-ui.test.mjs tests/interviews.test.mjs` | Final **36 passed, 0 failed/skipped**: 19 UI and 17 server tests, including parent tests |
| `node node_modules/eslint/bin/eslint.js src/components/interview-history.tsx tests/interviews-ui.test.mjs` | Passed, exit 0 |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | Passed, exit 0; no Next type generation/environment loading |

Added **10 UI subtests**: latest-page creation with 18/20/41 retained rows (including 20→21 and three-page traversal); creation on older short/full/intermediate pages with 21/40/41 retained rows; returned/thrown post-create refresh failure preserving the prior page/boundary and open link; deferred create-refresh/older-load overlap and same-tick duplicate submits; returned/thrown lost creation acknowledgement with explicit recovery and no replay. The original 21→22 regression is unchanged. Traversals compare every saved ID exactly once, enforce the page cap and reject invented short-page continuation.

Baseline reproduced **24 passed / 2 failed** (one product defect plus parent); the component-only repair passed **26/26**. An added race test initially selected the shell logout form (**34 passed / 2 failed**); correcting only its form selector produced the final **36/36**. Existing Node module-type warnings are non-fatal. Final Chromium reported **0 network attempts / 0 page errors**; overflow checks passed at 1440×900, 390×844, 320×844 and 844×390. Retained **28 synthetic screenshots** at `C:\Users\SOLUSER\AppData\Local\Temp\forge-task25-qa-o0VBhA`; the implementer inspected success and refresh-failure history at desktop/320px (four images), not an independent visual acceptance. Only this repair's three intermediate capture directories were removed; original QA evidence was preserved.

**Handoff:** request independent QA to rerun local gates and the retained/extended regressions. Full suite, Next typegen/build and connected checks were not rerun in this repair. No agents, installs, environment-file reads, services, remote operations, migrations, commits or deployment. Existing connected routing/auth transport, Postgres concurrency/grants, export/cascade and provider/privacy gates remain open.

### Independent Task25 QA — 15 October 2026

**Task25 remains Open; local acceptance is not certified.** Independent QA reproduced a history-pagination defect in `src/components/interview-history.tsx:43`: with 21 retained interviews, create another on the first page, then select **Older interviews**. Prepending/truncating the displayed rows leaves the old cursor, skipping the displaced record (21 of 22 reachable). **Reload latest history** recovers it; storage was not deleted. A failing actual-component regression is retained in `tests/interviews-ui.test.mjs`. Implementer repair requested: reconcile the displayed page and cursor together after confirmed creation, including creation on older/full pages, without automatically replaying creation.

Actual Windows / Node.js **v25.2.1**, npm **11.19.1** QA results:

| Command / scope | Result |
| --- | --- |
| `node --experimental-strip-types --test tests/interviews.test.mjs` | **17 passed, 0 failed/skipped**; strengthened all-six-action auth-failure coverage |
| `node --experimental-strip-types --test tests/interviews-ui.test.mjs` | Final **7 passed, 2 failed, 0 skipped**; pagination subtest plus its parent are the two failures |
| `npm test` | Final **156 passed, 2 failed, 0 skipped** / 158 total; same single product defect |
| `npm run lint` | Passed, including final test-only changes |
| `npm run typecheck`, then `npm run build` | Both passed in a secret-free temporary source/config copy using existing dependencies; default Next.js **16.3.5 Turbopack**, TypeScript and **21/21 static-generation work items** completed |

QA changed only the two interview test files and this README/tracker evidence, not application code, migrations or manifests. Existing auth/deletion, 14-table paginated export (including interview later-page failures), private-owner/role denial, eligibility, quota/replay/race/recovery and privacy-client regressions passed locally. Protected routes and setup diagnostics were source-reviewed, not connected-tested.

Network-blocked actual-component Chromium **153.0.8010.12** recorded **0 network attempts and 0 page errors**. QA independently inspected **24 screenshots**: history, pending, failed/retry, connection loss, finished and deletion confirmation at **1440×900, 390×844, 320×844 and 844×390**. Notices, transcripts and controls wrapped without horizontal overflow; focus indicators were visible. Long selected topic text clips within native narrow selects (non-blocking visual limitation). Keyboard recovery retained the unsaved draft; retry, finish, delete/cancel and mobile navigation focus checks passed. Evidence: `C:\Users\SOLUSER\AppData\Local\Temp\forge-task25-qa-Lvz9Jt` (`<state>-<width>x<height>.png`).

Temporary build copy/wrapper and intermediate/duplicate screenshots were removed; test browser contexts and in-memory databases closed. No installs, workspace environment-file reads/edits, remote Supabase/AI/mail operations, server deployment or migration application. Git was unavailable: no diff/commit verification claim. Real routing/action transport, multi-session Postgres locking, migration/grants/RPCs, connected cascade/export, provider feedback and retention remain open; prior age/grant/free-provider blockers were not re-probed. Task24 and broader Group A scope are not completed by this QA. See the tracker for detailed repair and verification boundaries. The implementer's earlier evidence below is preserved as history.

### Task25 local implementation evidence — 15 October 2026

Dedicated `/interviews` history/create and `/interviews/[id]` reopen/continue/finish/delete are implemented locally. Each interview is one bounded typed row. A transaction saves learner text and claims the existing shared quota before inference; expected revisions, request replay checks, a database-time 75-second lease and per-attempt token guard conditional finalization (never an upsert). Explicit retry preserves the saved answer. Finish/delete invalidate pending replies. Creation is empty and is never automatically retried after an uncertain acknowledgement. Notices distinguish failed reservation, saved request without reply, unconfirmed final save, and connection loss; only confirmed canonical text is displayed, without HTML/Markdown execution.

Limits: 8 learner answers plus one opening; 1–1,200 learner characters; 1–1,600 reply characters; 128 KiB transcript JSON; 12,000 total provider-message characters; then-existing 600-token text ceiling (superseded on 20 October by the shared content-based budget in [AI availability and privacy](#ai-availability-and-privacy)); at most 3 explicit attempts per turn; one pending turn per owner; 100 retained interviews; stable metadata-only history pages of 20. Delete an old interview to free capacity—there is no automatic transcript expiry. An expired pending interview must be explicitly retried, finished or deleted before starting another. Successful eighth-answer feedback completes practice; early finish makes no extra AI request and retains existing feedback without inventing a summary or awarding a grade/certificate/hiring decision.

Implementer checks on Windows / Node.js **v25.2.1**:

```powershell
node --experimental-strip-types --test tests/interviews.test.mjs tests/interviews-ui.test.mjs tests/account.test.mjs tests/database.test.mjs tests/eligibility.test.mjs tests/openrouter.test.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

Combined result: **87 passed, 0 failed, 0 skipped**. Scoped ESLint also passed; the exact file-scoped command is recorded in the tracker. Tests execute actual actions/helpers with mocked auth/provider, PGlite migrations/permissions/state constraints, owner and cross-role denials, revoked/minor/unknown eligibility, quota/replay/concurrency/expiry, rollback and uncertain-save paths, finish/delete/account-cascade races, context caps, and 14-table all-or-nothing paginated export including later-page and missing-migration failures. Network-blocked mounted Chromium at 390×844 covers create/history/reopen/continue/retry/finish/delete, pending/save-notice focus, mobile navigation and keyboard newline behavior, text-only rendering and late responses. Zero network attempts/page errors; a synthetic screenshot was captured in memory, **not independently visually reviewed**. Earlier failed fixture/constraint/UI-harness checks were repaired and rerun; Node's existing module-type warning remains non-fatal.

**Open gates:** Task25 stays **Open** for independent QA and connected acceptance. This was one local writer, no agents, environment-file loading, installs, server, remote schema changes, provider/inbox calls, E2E fixtures, commit or deployment. Git was unavailable. Direct `tsc` deliberately avoided the `npm run typecheck` wrapper's Next environment-loading type generation; full suite/build/type generation and independent visual review were not run in this packet. PGlite contention tests are serialized by its local engine; real multi-session Postgres locking, PostgREST/RPC/grants, hosting timeout behavior, real account cascade/export, and an eligible free-provider interview remain unverified. Migration not applied; existing connected blockers were not rechecked. Request independent QA to run local gates serialized, then separately authorize a disposable connected target. Task24 has an isolated guest/WASM runtime direction only; no JavaScript/Python runner capability was implemented or verified. Other Group A scope remains pending.

`npm test` includes offline component tests mounted in real Chromium. Install the Playwright browser beforehand with `npx playwright install chromium` (Linux CI uses `npx playwright install --with-deps chromium`); a missing browser fails the tests rather than skipping them. These synthetic fixtures need no Supabase configuration or AI access. The opt-in authenticated browser suites below remain separate and write to the configured Supabase project.

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Unit/database tests cover pass thresholds, malformed submissions, safe redirects, complete pagination, migration execution in isolated PostgreSQL-compatible PGlite, direct-access denial, request quotas and certificate retention.

The focused auth checks run with `node --experimental-strip-types --test tests/auth.test.mjs`. They cover reset/global-logout ordering, returned/thrown provider failures, strict cookie cleanup, read-only cookie tolerance, recovery focus/pending/retry, conflicting query notices and responsive error layouts. They mock provider calls and mount the real form in network-blocked Chromium; screenshots contain synthetic data and go to an OS temporary directory printed by the test. They do not establish live session revocation or email delivery.

9 October local auth continuation: 90 total tests and typecheck passed. A React prop-immutability lint issue was repaired, lint then passed, the final 20 focused auth checks passed again, and the production build passed including TypeScript. The full 90 were not rerun after that small lint repair. These Windows/Node.js 25.2.1 results are separate from hosted CI, independent QA and connected browser acceptance.

9 October subsequent team verification (Coordinator-supplied independent Forge QA report): no substantive defect found; bounded LOCAL acceptance passed on Windows/Node.js v25.2.1 win32/x64. The focused account suite passed 41 tests and `npm test` passed 131, both with zero failures/skips; lint, typecheck and build passed, including TypeScript and 20 static pages. QA visually inspected all 8 network-blocked actual-component/CSS deletion-fallback and cleanup-notice scenarios in Chromium 153.0.8010.12 across desktop, mobile and landscape; interaction/layout checks passed with zero network attempts/page errors. Offline actual-handler/action tests are not live HTTP, Supabase/provider/session, schema/grant, cascade/snapshot/retention, hosted Node.js 24 or full accessibility proof. Task 05 remains Open; this documentation update did not rerun QA. Detailed evidence and retained temporary screenshot locations are in [IMPLEMENTATION_TRACKER.md](IMPLEMENTATION_TRACKER.md).

GitHub Actions runs these tests, lint, type checking and a production build on pushes and pull requests using Node.js 24 LTS. The workflow requires no application secrets and does not run live database checks, AI probes or the database-writing browser suite.

25 September verification: 60 local tests passed, along with lint, typecheck and production build. `npm run test:instructors` passed 18 live workflow stages, including admin role changes, instructor ownership, real publication, directory filtering, duplicate enrollment preservation, report isolation, and stale-form denials after revocation. It also checks 1440/390/320px layout and mobile navigation; all four temporary accounts were deleted. This test defaults to a local server at `http://127.0.0.1:3126` and supports `E2E_BASE_URL`. Like the existing E2E suite it writes to the configured Supabase project: use only the authorized disposable development environment. It makes no AI calls or email sends.

### Authenticated browser tests

With the local dev server running and a migrated development Supabase project configured:

```bash
npx playwright install chromium
npm run test:e2e
```

This opt-in command writes to the configured Supabase project: it creates three temporary, email-confirmed accounts (including one administrator), one initially unconfirmed signup account, and temporary lessons/results. It exercises real login and server actions, changes only a temporary account's password, and deletes its accounts and associated fixtures in cleanup. It never changes existing accounts. Use a development project, not a production database. Generated credentials and verification tokens remain in process memory and are omitted from test output; screenshots contain only test data and are written to a temporary directory printed on completion. Callback requests carry tokens in their query strings, so application/proxy access logs must be treated as sensitive and query values redacted in production. If cleanup fails, the command reports the temporary account ID for manual removal. The browser tests use `NEXT_PUBLIC_SITE_URL` from the local environment; `E2E_BASE_URL` must match it when selecting another localhost port. Non-loopback application URLs are rejected. The command is separate from `npm test` and makes no AI requests or email sends.

`E2E_SCOPE=authoring` skips the full resume/profile/export workflow, **not onboarding or its schema prerequisites**. Both scopes complete first-login onboarding through the real UI, including newly confirmed signup accounts; no completion marker is seeded. Profile checks use the saved revision, and manual/instructor fixtures resolve the testing alias through the curriculum registry and write canonical metadata. The instructor harness also updates background through the trusted-instructor UI after the administrator grant, and fills required import metadata before testing stale-role denial. Existing permission, quiz/version and temporary-account cleanup checks are retained. These harness integrations have syntax/lint/synthetic-helper evidence only; connected execution is still pending.

For a server on port 3107, set `NEXT_PUBLIC_SITE_URL=http://localhost:3107` when starting the server and run this in PowerShell only after authorizing the disposable database: `$env:E2E_SCOPE='authoring'; $env:NEXT_PUBLIC_SITE_URL='http://localhost:3107'; $env:E2E_BASE_URL=$env:NEXT_PUBLIC_SITE_URL; npm run test:e2e`. Set `E2E_BROWSER` to `firefox` or `webkit` for those Playwright browsers (default: Chromium). The full suite additionally requires the resume/grant migrations. `npm run test:instructors` also writes temporary database fixtures and requires separate connected authorization.

Historical connected evidence, before the resume migration and before the current onboarding/metadata changes: manual creation, consecutive editor saves, private isolation (including administrators before review submission), self-enrollment, bookmark persistence, desktop/mobile lesson layout and navigation, ordering practice, attendance without submission, 5/10 failure, 6/10 pass and retries, private/public certificates, cross-account certificate denial, publication snapshot preservation, stale quiz rejection, reviewer grant/revocation, exclusion of private attempts from reports, and learner-scoped export. All temporary test accounts were removed in that run; this is not acceptance of the integrated harness.

Also verified through real forms: profile-field persistence, image upload and conversion to 160x160 JPEG, displayed image loading, rejection of invalid and oversized uploads without changing saved data, picture removal, wrong-password deletion rejection, successful password-confirmed author/learner deletion, session invalidation, and retention of another learner's certificate after author deletion. The test keeps generated passwords in memory and deletes only its own temporary accounts.

Auth link handling is also verified with Supabase Admin API-generated links: rejection of invalid tokens and unauthenticated password updates, unverified-login rejection, signup confirmation/session creation, same-origin redirect enforcement, single-use signup/recovery links, password-rule validation, recovery through the real reset form, old-password rejection, and new-password login. Missing credentials, unsupported verification types, ambiguous token/code combinations and invalid PKCE codes are rejected. Successful and rejected redirects carry no-store and no-referrer headers. Successful PKCE code exchange remains unverified; successful confirmation and recovery tests use the `token_hash` branch.

Still unverified end to end: successful AI generation/coaching (the latest synthetic probe returned HTTP 429), signup/reset/resend email requests and inbox delivery, PKCE email callbacks, and verified email-address changes. Mail flows need a controlled test inbox; generating links without sending mail does not verify SMTP, templates, or delivery. Provider eligibility and retention review remain deployment gates.

Before deployment, verify with separate learner, reviewer and administrator accounts: private isolation, enrollment, attendance without submission, failed/passing/retried quizzes, stale quiz versions, certificates, explicit review submission, report permissions, email confirmation/recovery, profile uploads, export and deletion. Check mobile and desktop layouts. Certificate files are printable HTML, not digitally signed credentials or accreditation.

## Deploy to Vercel

Import the repository using the Next.js defaults, configure all environment variables, apply migrations, and set the deployed origin in Supabase Authentication URL Configuration. Teaching extraction plus inference declares a 90-second route budget; confirm the selected Vercel plan/runtime supports it. PDF.js is externalized and its worker included in tracing, but deployed parsing and function memory limits still require staging verification. Complete provider eligibility, restricted-demo access, data protection and end-to-end gates before inviting learners. Deployment is not authorized by the current implementation approval.

## Final independent T25-QA-01 verification — 15 October 2026

**Governing QA reconciliation: T25-QA-01 is fixed and independently verified; bounded LOCAL acceptance passes. Task25 remains Open for connected/release gates.** This final follow-up supersedes the earlier statements that independent QA has not rerun the repair or that local acceptance is blocked/not certified. Those dated initial-failure and implementer-handoff entries remain historical evidence, not the current QA disposition.

Sole test/build runner; no subagents. Windows, Node.js **v25.2.1**, npm **11.19.1**, Chromium **153.0.8010.12**. Inspected the changed component/assertions and test/script side effects. All commands below ran serially in a secret-free temporary copy: named source/config/test/schema files only, existing dependencies hardlinked, OS-variable allowlist, telemetry disabled. No environment-file reads/copies/edits, installs, manifest changes, dev server or connected commands. Next-generated files stayed in the copy.

| Executed command | Final result |
| --- | --- |
| `node --experimental-strip-types --test tests/interviews-ui.test.mjs tests/interviews.test.mjs` | **36 passed, 0 failed/skipped**, exit 0; 19 UI + 17 server, including parents |
| `npm test` | **168 passed, 0 failed/skipped**, exit 0 |
| `npm run lint` | Passed, exit 0 |
| `npm run typecheck` | Next route type generation and `tsc --noEmit --incremental false` passed, exit 0 |
| `npm run build` | Default Next.js **16.3.5 Turbopack**, compilation and TypeScript passed; **21/21** static-generation work items, exit 0; both interview routes dynamic |

Exact-once reachability passed for latest-page creation with 18/20/21/41 retained rows and older-page creation with 21/40/41. Deferred requests preserve the old page until canonical rows/cursor/mode move together; duplicate submits and overlapping history requests are excluded. Returned/thrown refresh failures retain the old page/boundary and keyboard-openable **Open new interview**, with truthful confirmed-save versus refresh-failure status. Returned/thrown lost creation acknowledgements stay uncertain until explicit reload, without automatic replay or a false unsaved claim. Original pending/retry/transport recovery/finish/delete regressions and negative owner/role/auth/eligibility, local grants, export/cascade and privacy-client tests passed.

A temporary, external in-memory extension of the unchanged UI harness added independent Tab/Enter/Space, status focus, explicit recovery and link-opening assertions at **1440×900 and 320×844**: **20 passed, 0 failed/skipped** including the retained UI tests and parent. Initial supplemental launch failed before mounting because the temporary runner passed a Windows path to `--import`; converting only that runner argument to a `file://` URL fixed the invocation. No application or repository-test repair was needed. Focused, full-suite and supplemental interview runs each recorded **0 network attempts / 0 page errors**.

**Fresh visual inspection:** all **12** `independent-*.png` images were opened and inspected in `C:\Users\SOLUSER\AppData\Local\Temp\forge-task25-qa-zWczdA`: create success, pending history refresh, returned/thrown refresh failure and returned/thrown uncertain creation, each at desktop/320px. Notices, page labels, new-interview links and focus outlines wrap without overlapping controls; overflow assertions passed. The directory retains **40 synthetic images** total; the other 28 were captured, not newly claimed as visually inspected. Original four-size keyboard/overflow assertions also reran. The earlier **24-image** independent review at `forge-task25-qa-Lvz9Jt` remains preserved historical evidence, not a fresh inspection claim.

Only README/tracker QA evidence was appended in the repository. A SHA-256 snapshot of **102 source/config/test/schema/script files** was unchanged across both isolated executions; no Git diff claim. Both owned temporary copies and two QA scripts were removed with absence verified; duplicate current-run interview/auth capture directories were removed, retained evidence and prior work preserved. Browser contexts and in-memory databases closed through harness cleanup; no remote fixtures or cleanup failures.

**Untested/open, not passes:** the new migration is unapplied; connected grants/RPC/PostgREST, real multi-session concurrency, authenticated routing/action transport/live rights, owner export/account cascade, live eligible free-provider behavior, provider/backup/log retention and deployment/privacy acceptance. No setup/AI probes, E2E/instructor suites, Supabase/mail calls, migration applies, commits or deployment ran. Task24 coding runtime and broader Group A requirements remain open, not implemented by this repair or QA.