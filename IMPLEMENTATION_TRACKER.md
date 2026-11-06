# Implementation Tracker

Last reviewed: 2026-11-06

## 6 November 2026 — independent NARROW follow-up: repaired QA-AI-01 and exact UI gaps

**Bounded local gates passed; QA-AI-01 resolved in independent offline evidence.
Coordinator owns acceptance.** The initial QA's 24/24 and subsequent 44 passes/
4 failures, and implementer's RED/GREEN/72-group evidence below remain historical;
none is adopted as a fresh result here. This is not a repeat broad audit, production
release decision, live-provider check, or age/consent/legal certification.

### Ownership, safety and inspection

Only `tests/presentation-ai-ui.test.mjs` and new README/tracker entries were edited.
`tests/interviews.test.mjs` was inspected/run, not edited: no new product defect
required another RED. Actual action diff preserves pre-reserve checks and captures
the original owner; new authorization checks occur before finalize and after its
await, including lost acknowledgements. Retained original three denial/leak cases
and their added recovery assertions are present. Recovery notices describe the
original approved account, reload and explicit retry after the 75-second lease.

Windows, Node 25.2.1, installed offline Chromium 153.0.8010.12, real React/Fabric,
synthetic UUID/text fixtures and in-memory PGlite only. Existing `offline-run.mjs`
starts a sanitized child without application configuration; `offline-network.mjs`
rejects Node fetch/socket/http/tls. Browser contexts are offline, service workers
blocked; only synthetic `https://forge.test/` is fulfilled in memory, no server.
Provider/action boundaries are mocks, not live API requests or external quota.
PGlite loads local schema/migrations into disposable memory, never hosted data.
No environment files, remote/connected tests, provider probe, install, nested
agent, commit, deploy, build, full suite or typecheck. Skills loaded from the
existing repository `.github/skills` fallback; requested sibling paths absent.

### Reproducible commands (repository root, executed in this order)

```powershell
# C1: retained/strengthened race and recovery FIRST
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern='interview post-inference authorization' tests\interviews.test.mjs
# C2: one selected interview/UI/shared gate group, not all 72
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern='network-blocked mounted interview UI|interviews: actual actions|demo ages|age bands|external AI requires|editable metadata|server AI guard|admin grants|signup validates|profile saves|real coach' --test-skip-pattern='new focus keys|create, opening|strict client|another learner|parallel attempts|finish and delete|eight answers|metadata-only|simultaneous reserve|account cascade|invalid reservation|RLS|continue, finish|individual delete|delete while|creating on a full|create from latest|create while browsing|confirmed create|in-flight create|lost creation' tests\interviews.test.mjs tests\interviews-ui.test.mjs tests\eligibility.test.mjs tests\ai-access-actions.test.mjs
# C3: new exact UI cases; three iterations below
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern='exact core' tests\presentation-ai-ui.test.mjs
# C4: scoped test lint
node tests\offline-run.mjs node_modules\eslint\bin\eslint.js tests\presentation-ai-ui.test.mjs
# C5: whitespace, also repeated after final documentation
& 'C:\Program Files\Microsoft Visual Studio\18\Community\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd\git.exe' --no-pager diff --check -- tests/presentation-ai-ui.test.mjs README.md IMPLEMENTATION_TRACKER.md
# C6: smallest relevant AI regression selection plus mocked action policy
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern='exact core|Generate recovery|mounted AI review/apply|duplicate generation|font draft flush|Apply rechecks|real action gates|late session/rights' tests\presentation-ai-ui.test.mjs tests\presentation-ai.test.mjs
```

| Execution | Actual result |
| --- | --- |
| C1, product/interview tests untouched | **23/23 pass**, exit0, 8075.0865ms |
| C2, selected existing checks | **22/22 pass**, exit0, 11697.6054ms |
| C3 iteration1 | **0 pass/1 failed file**, exit1, 661.178ms; test TS import could not resolve extensionless `./presentation`; no browser cases executed |
| C3 iteration2, existing transpiling schema harness reused | **4/6 pass, 2 fail**, exit1, 74912.9672ms; native slide locator timed out at test line155; its accessible name includes thumbnail label |
| C3 iteration3, locator corrected and native mobile Slides summary opened | **6/6 pass**, exit0, 14548.3042ms |
| C4 | **exit0**, no errors/warnings |
| C5 before documentation | **exit0** |
| C6, includes the six new cases again | **14/14 pass**, exit0, 39715.5322ms |
| C5 after final documentation; final protected-file and cleanup checks | **exit0**, 224/224 protected fingerprints unchanged; no owned Node/Chromium remaining |

All functional runs report zero cancelled/skipped/todo. Counts include Node parent
tests where applicable; six UI cases are repeated in C6, not six additional unique
passes. Intermediate failures were test harness/locator defects, corrected only in
the owned test; assertions and application behavior were not weakened. No product
failure remains reproducible in these bounded gates; no product fix was performed.
No independent type/build pass is claimed from the implementer's historical runs.

### Verified acceptance and recovery

- C1: delayed inference under revoked grant/lost session/switched approved owner
  returns only `denied`/`auth`, no captured row, no persisted/returned provider text,
  **zero finalize RPCs**, exactly one original-owner inference/quota and zero
  changed-owner quota. Pending original request/revision/token/lease is retained.
  Reload/replay/busy retry/expiry read do not infer or charge. Only explicit
  original-approved-owner retry expires the attempt and charges one new inference;
  exact replay of that retry is free. Lease advancement is synthetic DB time
  manipulation, not a 75-second wall-clock sleep or cleanup claim.
- C1: provider failure plus late grant/session/owner changes, auth-with-error and
  thrown auth fail closed, without fallback or success-shaped denial.
  Delayed finalize across saved reply, saved failure and lost acknowledgement
  suppresses responses after auth changes. One legitimate preauthorized finalize
  may already have committed: storage is **not** incorrectly asserted empty or
  rolled back. Original owner explicitly reloads confirmed storage; failed-turn
  retry is bounded and separately charged.
- C2: six interview action leaves cover initial auth/spoof denial, approved minors/
  missing profile positives without profile reads, shared quota before inference,
  failed/invalid provider output and explicit bounded retry, DB-expired finalize
  `stale`, and reserve/save uncertainty without unconfirmed text. Four mounted
  interview UI leaves cover private create/open, pending vs saved, native keyboard
  submit/newline, explicit retry/reload and lost-transport draft preservation at
  desktop/narrow widths. Eight eligibility/admin/signup/profile tests and two
  coach tests cover trusted boolean approval, tampering, admin consent review/
  revoke and owner-switch denial. Numeric **13+ signup/profile** rules and
  **13–17/18–24 operational age bands** remain separate from AI permission.
- New six persistent exact UI cases: BOTH 1440x1000 and 320x850 open the real
  assistant, explicitly select actual teaching text, CHECK CONSENT FIRST, then
  native `pressSequentially` instruction typing. No formatting/scope/consent
  reconfirmation follows typing. Idle Generate is enabled; native click and native
  Tab/Enter each produce exactly one schema-valid mocked request/patch and focused
  Before/After Review. No JS click, force flag, disabled-attribute edit or injected
  Fabric selection is used by these new cases. Review leaves canvas unchanged
  and cannot save. Missing instruction/consent clicks give specific focused errors,
  zero calls. A genuinely empty NEW slide gives the specific no-text error via
  native Tab/Enter, zero calls; Escape restores trigger focus, choose an actual
  text-containing slide outside the modal, reopen, consent/type/Tab/Enter recovers
  to exactly one call and focused review. This uses the approved new-slide branch;
  no fresh exact empty-imported-preview recovery is claimed.
- C6: existing prompt-first flows, selection/formatting reconfirmation, duplicate
  and stale payload/epoch denial, Discard/Close, Apply locks, one atomic undoable
  edit, rich styles, real Fabric pixels, Undo/Redo and manual PGlite Save/reopen.
  Mocked real presentation server contracts positively generate/apply for approved
  ages13/17/missing age, reject untrusted/spoofed/false/string grants and missing
  consent, enforce quota/permissions/version and suppress late revoked/owner
  output. Mounted/source copy says administrator approval regardless of age;
  profile/auth retain13+ account copy, admin consent review remains explicit.
  No active adult-only AI gate was found in these inspected paths.

### Sanitized visual evidence actually opened

Final C6 artifacts, under `C:\Users\SOLUSER\AppData\Local\Temp\`:

| Directory | Files opened |
| --- | --- |
| `forge-ai-exact-1440-2g1YyY` | `enabled.png`, `review.png` |
| `forge-ai-exact-320-3gVb63` | `enabled.png`, `review.png` |
| `forge-ai-exact-empty-1440-ZEvEYj` | `no-text.png`, `recovered-review.png` |
| `forge-ai-exact-empty-320-dPXPic` | `no-text.png`, `recovered-review.png` |
| `forge-presentation-ai-WJuBOr` | `1440-applied.png`, `320-review.png` |

These ten images show readable desktop/mobile consent/policy, enabled Generate,
focused no-text error, Before/After recovery and actual applied canvas text without
horizontal overflow in tested layouts. Scrollable modal images intentionally show
the relevant lower section rather than falsely claiming every control fits at once.
Eight earlier green C3 images were also opened; earlier failed-iteration artifacts
remain outside Git as history. Selected interview artifacts remain at
`forge-task25-qa-iTdvBX`; no new visual inspection of those images is claimed.

### Preservation, cleanup and untested requirements

Before/after path+content SHA256 over **224 protected files** (src, other tests,
docs, supabase/schema/migrations including `_ran`, scripts, repository instructions
and non-environment root files; excludes the three owned files):
`5dbd1a15c151fa9c7ad9233dd514baa8a163bc5b05883b10b8cc8b0a805a5d61`.
All **115 source files** aggregate:
`646b5a0df372d1b7d2f49ed910b8263d15fba01d04746cdbf019907c87574611`.
Both aggregates unchanged. Interview action:
`b26340ed738717c7fcb38ed7a1f64cf59d8b937d8c109cecd100a94c4a3be6ec`;
retained interview test:
`6eab250d3b18c8f607be439c18f570cb372ec701b7369b88d419a21d1895bdcf`.
Owned UI test changed from
`82c56aafcb80a414cd233d644c1cb006168b134f10ec1c7cd614ff27f6f40098`
to `fb1ca7a73a0a3812f0f48efced67568094c28c2b81bcffeafdaf4f5eaaef22d4`.
Existing source/test/docs/migration dirt preserved; documentation only prepended.

PGlite closes in test cleanup; browser contexts/browser close in `finally`, including
failed UI iterations. Passing browser assertions report zero attempted network
requests and zero page errors. No detached helper/server was started. Process
inventory after C6 shows **zero Node and zero newly owned Chromium**, only the
pre-existing unrelated Chrome tree (root PID15408), untouched. No PGlite process/
database remains; in-memory instances lived in the completed Node runners. Skill
search helper was explicitly stopped after finding repository fallback files.
Screenshots deliberately retained in disposable temp directories, not Git; no
fixture deletion or quota refund/cleanup RPC is claimed.

**Untested, separately from passes:** hosted auth/grant/RPC/quota atomicity after
the final server check; live free-provider availability/effective policy/retention;
actual remote data, deployment, paid/region/provider age/consent/legal terms.
No 72/254/full-suite rerun, build, direct tsc or production release certification.
The approved empty-NEW-slide alternative was tested; empty imported-preview exact
outside-modal keyboard recovery is not separately claimed. Stop after these
bounded gates; coordinator decides user-feature local acceptance.

## 6 November 2026 — bounded implementer repair QA-AI-01; independent QA pending

**Repair delivered for separate independent QA; coordinator retains acceptance.**
This is local writer evidence, not closure of the retained independent blocker or
a release certificate. Prior source, tests, documentation and QA records remain
intact. Latest approval-only AI policy applies; no 18+ gate was added, and signup/
profile/database 13–120 whole-number age validation is unchanged.

### Scope, hypothesis and repair

Owned only `src/app/interviews/actions.ts`, `tests/interviews.test.mjs`,
`src/lib/interviews.ts` (two recovery notices only), and new entries in README/
this tracker. Initial tree had 22 modified tracked files and one untracked test.
Sibling skill files were absent and broad fallback searches timed out; loaded the
existing `.github/skills/forge-delivery/SKILL.md` and `forge-verification/SKILL.md`.
Git was not on PATH; used installed Git Desktop 3.6.10 without installation.
Inspected the actual auth/approval/action/RPC modules, existing SQL lease/finalize
contracts and retained RED before editing. No SQL or global-policy file changed.

Falsifiable hypothesis: the captured pre-inference user alone permits late reply
writes/releases. Fresh current-auth identity and trusted approval checks before
finalize must block the three observed late changes, and the same checks after
finalize must withhold results when authorization changes during that await.
Focused check selected and run unchanged first: the exact retained post-inference
authorization test-name command below.

- Capture the original owner ID as a string, preserving pre-reserve auth/approval.
- Immediately after inference/parsing, re-read `currentUser`, compare owner ID,
  and run fresh `requireAiAccess`. Missing/error/thrown auth returns `auth`;
  changed owner or revoked grant returns `denied`; no captured row is returned.
- On pre-save denial, do **not** call finalize or any cleanup RPC. The original
  reservation stays pending with null assistant under its existing 75-second
  lease. No fallback, extra quota, AI call, implicit retry or rollback.
- Repeat fresh identity/approval checks after finalize, even if its acknowledgement
  is lost. A legitimately authorized pre-write may persist, but post-write denial
  never releases the saved row. Stable auth retains `saved_failed`, `save_unknown`,
  `stale` and confirmed-success behavior. No unrelated replay/lifecycle change.
- Auth/denied notices explain returning with the original approved account,
  reloading confirmed storage and explicitly retrying a pending turn after lease.

### Exact execution evidence (root; sanitized offline Node only)

```powershell
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern='interview post-inference authorization' tests\interviews.test.mjs
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests\interviews.test.mjs tests\interviews-ui.test.mjs tests\eligibility.test.mjs tests\ai-access-actions.test.mjs
node tests\offline-run.mjs node_modules\eslint\bin\eslint.js src\app\interviews\actions.ts src\lib\interviews.ts tests\interviews.test.mjs
node tests\offline-run.mjs node_modules\typescript\bin\tsc --noEmit --incremental false
& 'C:\Users\SOLUSER\AppData\Local\GitHubDesktop\app-3.6.10\resources\app\git\cmd\git.exe' --no-pager diff --check -- src/app/interviews/actions.ts tests/interviews.test.mjs src/lib/interviews.ts README.md IMPLEMENTATION_TRACKER.md
```

| Execution, in order | Actual result |
| --- | --- |
| Exact narrow command, retained RED unchanged, before action edit | **0/4 pass**, exit1; 11362.5014ms; three leaks plus failed parent |
| Same narrow command, smallest action repair, retained RED unchanged | **4/4 pass**, exit0; 5149.1458ms |
| Same command after strengthened tests/recovery notices | **4/23 pass**, exit1; 8723.3825ms; 14 new leaves failed fixture setup plus 5 failed parents |
| Same command after correcting the two new fixture INSERTs | **23/23 pass**, exit0; 6786.2779ms |
| Requested four-file covering group | **72/72 pass**, exit0; 25345.6559ms |
| Scoped ESLint | **exit0**, no errors/warnings |
| Direct offline TypeScript, no Next typegen/build | **exit0** |
| Scoped whitespace before and after documentation | **exit0** |

All functional executions: zero cancelled/skipped/todo. The intermediate failure
was missing numeric signup age in the newly added fixture INSERTs: the unchanged
database trigger correctly rejected accounts without ages. Corrected fixtures
use age17 original owner and age13 other owner; no product-policy relaxation.
The original three strengthened RED leaves passed in that failed iteration.

### Retained and added coverage

The original independent RED name and output-leak assertions are retained; current
approval-only tests are unchanged. Each delayed provider case proves exactly one
inference/one original-owner quota claim, no changed-owner quota, no finalize RPC,
no persisted/released provider text or returned row, and meaningful pending state
with the original request/token/revision. Original-owner reload/exact replay/busy
retry and DB-lease expiry cost no extra inference/quota; only explicit retry
expires the original attempt and claims one new attempt. Retry replay is free.

Added real-action/provider failure cases cover revoked approval, session loss,
switched approved owner, auth errors with a user and thrown auth failures: no
fallback or success-shaped `saved_failed` denial. Nested delayed-finalize cases
cover all three identity/approval changes across confirmed reply, persisted null-
provider failure, and lost acknowledgement; no row release/cleanup rollback.
Original-owner reload confirms legitimate saved state; explicit failed-turn retry
retains bounded attempt outcomes.

All **18 existing interview contract leaves** plus parent pass, including quota,
ownership, revision/replay, lease/stale, failed/invalid output, uncertain saves,
finish/delete/cascade and RLS. All **18 mounted UI leaves** plus parent pass,
including history paging, failure/explicit retry, transport recovery, keyboard,
desktop/mobile and late-response handling. Eligibility and actual admin/coach
action tests pass, including approved minor/unknown age without profile queries.
No full 254-group or global suite was run.

### Preservation, cleanup and remaining gates

Initial and post-test SHA256 comparison: **19/19 protected dirty source/test files**
unchanged, including the untracked `tests/ai-access-actions.test.mjs`;
**17/17 migration hashes** unchanged, including all `_ran` files. Existing policy
edits and independent RED were extended, not removed/replaced. Only the five owned
files were edited. Prior documentation was preserved below these new entries.

PGlite databases close through test cleanup; Chromium 153.0.8010.12 contexts/browser
close through cleanup. UI reported **zero network attempts and zero page errors**.
No server or detached helper was started; owned PowerShell sessions completed.
Synthetic screenshots remain outside Git at
`C:\Users\SOLUSER\AppData\Local\Temp\forge-task25-qa-oDw2r3`.
Actually opened `failed-retry-320x844.png` and `pending-1440x900.png`; did not
independently inspect all 28 generated images or claim new mounted auth-race QA.

**Independent QA requested:** rerun the narrow retained/strengthened cases and
covering group, review pending lease recovery and both auth gates; coordinator
decides acceptance. Hosted auth/approval changes after the final server-side check
cannot be globally atomic without a separate DB-policy change. Live provider,
hosted RPC/auth/quota races, deployment and release remain unverified. No
environment-file reads, provider/remote/connected tests, installs, commits,
build/deploy or nested agents were used.

## 6 November 2026 — independent bounded functional QA: interview authorization RED

**Acceptance blocked; coordinator owns acceptance and bounded implementer assignment.**
Latest explicit approval-only AI policy applies irrespective of profile age, including
missing age. No adult/minor/unknown-age gate was restored. This current execution
supersedes earlier pass-only QA conclusions, not their historical records.

### Safety, initial state and ownership

Windows; actual Node **25.2.1**, offline Chromium **153.0.8010.12**. Requested sibling
skill paths were absent; loaded existing `.github/skills` equivalents. Bare `git`
failed before test execution; used installed
`C:\Users\SOLUSER\AppData\Local\GitHubDesktop\app-3.6.10\resources\app\git\cmd\git.exe`.
Initial status: 22 modified tracked files plus existing untracked
`tests/ai-access-actions.test.mjs`. Captured SHA256 for every dirty file and all
17 migrations before execution. HEAD observed during cleanup:
`745f59b43786aca9201ffdc998a1c355e22926fe`.
No reset, checkout, product fix, migration edit or connected test execution.

Inspected existing harnesses before running: `tests/offline-run.mjs` passes only
OS environment and preloads `offline-network.mjs`, denying HTTP/HTTPS/TLS/socket/
fetch outside explicit synthetic mocks. No application environment loader/file
reads. Chromium contexts are offline, block service workers, abort unexpected
requests and fulfill synthetic documents in memory. PGlite databases are disposable
memory; real migrations/actions execute locally. No server, real provider/network,
remote SQL, installs, build, deployment, commit or delegation.

Owned additions only: the narrow post-inference regression at
`tests/interviews.test.mjs:119–159` and this entry/README evidence. Existing policy
edits in that test were preserved. Added test SHA256:
`FFE7629AEF010A34A67B53A2A1CC1935D2C19F80C0BDB1BD7C823D250A68D908`.

### Actual commands and results (repository root; no output redirection)

```powershell
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests\eligibility.test.mjs tests\ai-access-actions.test.mjs tests\presentation-ai.test.mjs tests\presentation-ai-ui.test.mjs
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern='interviews:|interview post-inference|server action gates AI|actual paths page|mounted optional paths|approved minor/unknown|current auth/trusted|import extraction/start|reservation recheck|DB leases/revisions|free models preserve|paid IDs|every selected free|text and structured requests use singular|text and structured fallback requests|quota and provider failures' tests\interviews.test.mjs tests\lesson-generation.test.mjs tests\recommendations.test.mjs tests\learning-path-ui.test.mjs tests\openrouter.test.mjs
node tests\offline-run.mjs --experimental-strip-types node_modules\eslint\bin\eslint.js tests\interviews.test.mjs
node tests\offline-run.mjs --version
```

| Independent execution | Actual result |
| --- | --- |
| First focused group, before owned test addition | **24/24 pass**, exit0; 41109.3521ms |
| Selected actual-feature group including retained RED | **44/48 pass**, exit1; 49487.9479ms |
| Owned test ESLint | **exit0**, no warnings/errors |
| Node version via offline runner | **v25.2.1**, exit0 |
| Existing Git `--no-pager diff --check` | **exit0** before and after evidence edits |

Both functional runs: zero cancelled/skipped/todo. Only one failing functional
iteration; no test retry, product edit or attempted GREEN fix. The 48-result run
counts nested parents: three RED leaf cases plus their failed parent = four failures.
Existing interview action group (18 children + parent), staged/import selection
(8), path action group (8 children + parent), paths page/mount (2), and free-provider
selection (6) passed. No 254-group/full-suite rerun. Prior typecheck/scoped product
lint/build results are historical, not independent reruns.

### Passes — observed bounded coverage, not blanket acceptance

- Trusted boolean-only helper/guard/admin/coach/presentation/interview/path checks
  accept approved 13/17/18/120/null/undefined and reject spoofed/editable/string
  grants. Guard/admin/coach/presentation/interview fixtures forbid profile
  authorization queries. Real admin consent review, actor/target/self/role/account
  protections, metadata merge/revoke, signup/profile integer bounds and SQL age
  validation/no signup grant pass.
- Mounted 1440px consent-first native instruction typing retains the checkbox and
  enabled idle Generate. Formatting resets with visible explanation; missing
  consent sends zero requests; reconfirmed native Tab/Enter sends one request.
  320px invalid instruction then native click recovery sends one further request.
  Prompt-first flows, empty/current/new/no-selected-slide validation and choosing
  existing teaching text recover without invented targets or invalid dispatch.
- Shared-text change invalidates late generation/Apply; Discard/Close/unmount,
  stale history and font drafts reject stale work. Save/upload/export/uncertain
  Apply locks retain content/reasons. Expected atomic Apply preserves its success
  notice, makes one history commit, renders actual canvas pixels/text, preserves
  rich styles, supports Undo/Redo and real PGlite manual Save/reopen.
- Staged generation accepts approved minor/missing profiles; pre/post inference
  session/trusted approval/import role, reservation, replay/version/ownership,
  consented teaching import and explicit pending recovery pass. Real path action/
  route and mounted focus/transport/stale-owner recovery pass. Existing interview
  ownership/quota/replay/failure/expiry/cascade protections pass.
- Selected actual free-client tests retain explicit zero pricing, paid-model
  rejection, singular defaults/ordered fallbacks, omitted provider/reasoning
  overrides and sanitized quota/provider failures.
- Operational `src` scan found no obsolete 18+ AI authorization/copy. Remaining
  age `<18` is an age-band derivation; fictional lesson distractor text is not an
  authorization policy. SQL age hits are signup/profile bounds/bands, not AI gates.

### Blocking defect QA-AI-01 — interview output escapes changed authorization

**Reproduction is persistent, using actual auth/guard/interview action/SQL modules.**
Approved owner (age17) starts one real turn against in-memory PGlite; synthetic
provider completion waits. Replace the current-auth fixture with (1) same owner,
trusted grant false, (2) no user, or (3) different approved owner (age13). Release
one valid synthetic reply. All three cases return `code: "ok"` and the reply is
both in the returned interview and stored turns. Exactly one inference and one
original-owner quota claim occurred; no retry. Expected: changed authorization
denies finalization/output release, with no provider reply persisted/released.

`src/app/interviews/actions.ts:45–71` checks current user/approval only before
reservation, then at lines65–69 calls the provider and finalizes using captured
`user.id` without fresh session/approval/identity checks. `interviewRpc` verifies
the captured owner's result but does not reauthenticate. This is a product defect,
not an old age-gate expectation. Existing 18 interview subtests did not cover it.
**Escalated to coordinator for bounded implementer; RED retained, no source fix.**
Stop condition met: concrete local acceptance blocker reproduced.

Standalone reproduction command (documented for implementer; not an additional QA run):

```powershell
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern='interview post-inference authorization' tests\interviews.test.mjs
```

### Screenshots, cleanup and separately untested requirements

Actually opened all 11 generated sanitized images (synthetic text only), retained
outside Git under `C:\Users\SOLUSER\AppData\Local\Temp\`:

- `forge-ai-generate-recovery-j525cn`: `1440-enabled.png`, `320-validation.png`,
  `320-enabled.png`.
- `forge-presentation-ai-KVtAnh`: `1440-review.png`, `1440-applied.png`,
  `320-review.png`, `320-input.png`.
- `forge-path-PttA1m`: `error-320.png`, `local-320.png`, `pending-320.png`,
  `success-1440.png`.

Opened images show checked desktop consent/enabled Generate, mobile actionable
validation/enabled recovery, review/formatting disclosure, actual applied canvas
text and path pending/error/local-only/success states. No real learner data.
Sanitized failing-run output was retained by the tool at
`C:\Users\SOLUSER\AppData\Local\Temp\1793934005193-copilot-tool-output-25404-839a6ed4-bd4f-4bc2-abc3-a67337609694.txt`.
Browser/context cleanup and PGlite close hooks completed even for RED; no cleanup
error. Process inspection found **0** remaining offline-runner/Playwright processes.
Programmatic SHA256 comparison verified all **37 protected fingerprints**
(20 other dirty source/test files + all 17 migrations) unchanged; migration
inventory remains 17. Only the named test addition and documentation differ from
the starting dirty work.

**Not established, separate from passes:** the exact uninterrupted consent-first
typing→Generate sequence at both sizes (existing desktop test reconfirms after a
formatting change; mobile uses prompt-first recovery); native Tab/Enter recovery
on specifically empty imported previews/missing selection; exhaustive per-feature
age/grant cross-product and mounted interview page availability; standalone
onboarding/browser signup and unchanged core font/UI suites beyond the AI-linked
regressions executed. No further tests added/executed after the confirmed blocker.
These are remaining acceptance assertions, not passes or inferred product defects.
Deployed auth/quota races, live free-provider availability/defaults/retention,
legal/provider age/region/consent terms and deployment remain unverified.
**No release certification or acceptance sign-off.**

## 6 November 2026 — approved AI policy replacement and mounted Generate repair

**Implementation handoff; coordinator retains scope/acceptance ownership; separate
independent QA requested. Not release certification.** Latest explicit user approval
replaces historical adult/minor/unknown-age external-AI restrictions with trusted
administrator approval ONLY, regardless of profile age or missing age. Earlier
reports and passes below are preserved as historical records and do not validate
this new policy. No coordinator task/todo records were edited.

### Inspection, hypothesis and causal evidence

Requested `../skills/forge-delivery/SKILL.md` and verification sibling paths were
absent; read the existing `.github/skills` equivalents without editing them.
Read package, README/tracker, actual modal/editor/assistant, request/scope schemas,
server guards, actions and offline harnesses. Bare `git` was unavailable; initial
status using existing GitHub Desktop Git was **clean**. Preserved all existing
implementation/editor/CSS/harness work and all 17 `_ran` migration names/content.
A broad Git-location probe was stopped; no application helper/server was started.

Falsifiable hypothesis: consent-first typing calls `invalidate()` on each keystroke,
clears consent and disables Generate; prompt-first existing tests mask this.
Retained **RED: 0/5 passed**, then **GREEN: 5/5**, proved the mounted consent-first
checkbox became unchecked before repair and remains checked afterward. Empty
textbox was already clickable but gave a poorer error; empty/missing slide scopes
were silently disabled. Generate now validates idle submissions with focused,
specific instruction/scope/consent errors; no invalid/no-text request is dispatched.
The actual modal is not a form-submit blocker. Editor preparation reads live
history, flushes canvas/font drafts and validates its snapshot; these guards,
refs, fingerprints, epochs, atomic Apply and manual-save behavior remain intact.
Instruction edits preserve consent; changed scope/formatting/shared text explicitly
invalidate it. Exact expected Apply payload preserves its success notice, whereas
manual text/undo changes invalidate stale pending work.

Policy RED checks proved the old predicate/profile lookup rejected approved
minor/unknown-age users. Predicate now takes trusted user only; guard no longer
imports or reads the profile database. Boolean grants alone authorize; editable
metadata/string grants fail. Administrator actions retain authentication, actor/
target protection, explicit consent review, role validation and merged metadata.
Whole-number 13–120 signup/profile/onboarding/database rules are untouched.

Trace: coach `app/learning/actions.ts`; paths action/page; interview actions and
both pages; staged generation helpers/actions; teaching import; presentation
generation/Apply actions all use `requireAiAccess` with trusted current auth.
Branch-specific enrollment/author/instructor/owner/version and pre/post-inference
checks remain. Presentation standard denial prefix handling is unchanged.
Coach's post-inference check previously accepted a *different approved owner*:
retained focused test **1/2 passed RED**, then **2/2 GREEN** after adding a same-owner
check before output release. No extra inference/quota operation is added.
Bounded scripts scan found no standalone age-dependent AI authorization. SQL age
hits are profile/signup bounds and bands, not AI authorization: **no new SQL**.

### Exact owned changes

Source (12):
`src/lib/eligibility.ts`, `src/lib/ai-eligibility-server.ts`,
`src/lib/interviews.ts`, `src/lib/lesson-generation-server.ts`,
`src/app/admin/accounts/actions.ts`, `src/app/learning/actions.ts`,
`src/app/paths/actions.ts`, `src/components/presentation-ai-assistant.tsx`,
`src/components/account-maintenance.tsx`, `src/components/profile-form.tsx`,
`src/components/auth-form.tsx`, `src/components/learning-path.tsx`.
The additional auth-form copy was an actual obsolete AI-policy surface.
Presentation editor/canvas, provider client, CSS and harnesses are unchanged.

Tests (9):
`tests/eligibility.test.mjs`, new `tests/ai-access-actions.test.mjs`,
`tests/presentation-ai.test.mjs`, `tests/presentation-ai-ui.test.mjs`,
`tests/lesson-generation.test.mjs`, `tests/interviews.test.mjs`,
`tests/recommendations.test.mjs`, `tests/learning-path-ui.test.mjs`,
`tests/instructor-e2e.mjs` (**source edit only; NEVER executed**).
Docs: `README.md`, `IMPLEMENTATION_TRACKER.md` (this entry).

Coverage accepts trusted approved 13/17/18/120/null/undefined, denies unapproved/
string/editable-metadata spoof, forbids authorization profile queries and keeps
signup/profile/database rejection and signup-no-grant checks. Admin tests cover
consent review, forged nonadmin, admin/self targets, invalid/missing targets/roles,
metadata merge and revoke. Real coach/path/interview/presentation/staged/import
helpers retain quota, consent, ownership, reservation/replay, role, stale/revoked
session and Apply protections. Mounted button tests cover both input orders,
formatting/scope/shared-text changes, blank/missing instructions, empty textbox/
new slide/shape-only scopes and imported previews, native Tab/Enter, 320px click recovery,
pending and uncertain-save locks; each valid submission dispatches exactly once.

### Local commands and actual results

Windows / existing Node 25.2.1. All Node child processes used `tests/offline-run.mjs`
(OS-only environment, no application env loading; HTTP/TLS/socket/fetch forbidden).
Offline Chromium uses blocked routes/service workers; PGlite is disposable memory.
No connected tests, provider calls, remote operations, installs or commits.
All commands below ran from the repository root (no output redirection):

```powershell
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern='Generate recovery|external AI requires only|editable metadata|server AI guard' tests\presentation-ai-ui.test.mjs tests\eligibility.test.mjs
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests\eligibility.test.mjs tests\presentation-ai.test.mjs tests\presentation-ai-ui.test.mjs tests\lesson-generation.test.mjs tests\interviews.test.mjs
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern='mounted AI review|duplicate generation|transient zero|approved minor|current auth' tests\presentation-ai-ui.test.mjs tests\lesson-generation.test.mjs
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern='mounted AI review|duplicate generation|transient zero' tests\presentation-ai-ui.test.mjs
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests\eligibility.test.mjs tests\recommendations.test.mjs tests\learning-path-ui.test.mjs
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests\ai-access-actions.test.mjs
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern='import extraction' tests\lesson-generation.test.mjs
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests\eligibility.test.mjs tests\ai-access-actions.test.mjs tests\account.test.mjs tests\auth.test.mjs tests\profile.test.mjs tests\profile-ui.test.mjs tests\presentation-ai.test.mjs tests\presentation-ai-ui.test.mjs tests\lesson-generation.test.mjs tests\lesson-generation-ui.test.mjs tests\interviews.test.mjs tests\interviews-ui.test.mjs tests\recommendations.test.mjs tests\learning-path-ui.test.mjs tests\presentation-model.test.mjs tests\presentation-font-layout.test.mjs tests\presentation-ui.test.mjs tests\presentation-layout.test.mjs tests\presentation-upload.test.mjs tests\openrouter.test.mjs
node tests\offline-run.mjs --experimental-strip-types node_modules\typescript\bin\tsc --noEmit --incremental false
node tests\offline-run.mjs --experimental-strip-types node_modules\eslint\bin\eslint.js src/lib/eligibility.ts src/lib/ai-eligibility-server.ts src/lib/interviews.ts src/lib/lesson-generation-server.ts src/app/admin/accounts/actions.ts src/app/learning/actions.ts src/app/paths/actions.ts src/components/presentation-ai-assistant.tsx src/components/account-maintenance.tsx src/components/profile-form.tsx src/components/auth-form.tsx src/components/learning-path.tsx tests/eligibility.test.mjs tests/ai-access-actions.test.mjs tests/presentation-ai.test.mjs tests/presentation-ai-ui.test.mjs tests/lesson-generation.test.mjs tests/interviews.test.mjs tests/recommendations.test.mjs tests/learning-path-ui.test.mjs tests/instructor-e2e.mjs
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern='Generate recovery' tests\presentation-ai-ui.test.mjs
node tests\offline-run.mjs --experimental-strip-types node_modules\eslint\bin\eslint.js tests/presentation-ai-ui.test.mjs tests/recommendations.test.mjs
& 'C:\Users\SOLUSER\AppData\Local\GitHubDesktop\app-3.6.10\resources\app\git\cmd\git.exe' --no-pager diff --check
```

| Run (commands above; repeated checks noted) | Actual result |
| --- | --- |
| New button/policy pattern, before / immediately after repair | **0/5 RED exit1 / 5/5 GREEN exit0** |
| First five-file affected group | **49/53 exit1**: quota-exhausted acceptance fixture, duplicate `status` locator, own Apply success overwritten, old stale-result expectation |
| Focused Apply/stale/quota iteration | **2/5 exit1**: quota fixed; own Apply payload effect still overwrote success; indiscriminate apply-pending skip suppressed manual undo invalidation |
| Exact Apply-payload fix, focused mounted checks | **3/3 exit0** |
| Approval/admin/path API/page group | **32/32 exit0** |
| Coach new regression before / after same-owner repair | **1/2 RED exit1 / 2/2 GREEN exit0** |
| Actual teaching-import acceptance without age/profile dependency | **1/1 exit0** |
| Final 20-file bounded group | **254/254 exit0**, 207191.6375ms; zero skipped/cancelled |
| Direct offline TypeScript | **exit0** |
| Scoped ESLint first / after unused fixture variable removal | **exit0, 1 warning / exit0, clean** |
| Final screenshot framing-only adjustment (scroll mobile Generate into view); focused recovery / test ESLint | **2/2 exit0 / exit0, clean** |
| Whitespace check | **exit0** |

No full-suite retry or Next build: no changed client/server import boundary requiring
packaging verification (shared server guard loses a dependency; existing assistant
uses its already shared pure patch helper). Historical build results are not new
evidence. The final group includes free-only/provider-default regressions, account/
profile/auth controls, staged/interview/path UI and core presentation/font/layout/
upload history/manual-save checks because these are the directly affected branches.

### Examined screenshots, cleanup and residual gaps

Actually opened all three final-run files in
`C:\Users\SOLUSER\AppData\Local\Temp\forge-ai-generate-recovery-smzGgk`:
`1440-enabled.png`, `320-validation.png`, `320-enabled.png`.
Desktop shows consent checked after typing and green enabled Generate; mobile
shows the focused actionable instruction error and normal click recovery with
consent checked. Same three images from the first GREEN run
`forge-ai-generate-recovery-KUJ5P1` were also opened. Native Tab/Enter and mobile
click assertions used no force-click or disabled-attribute changes. Existing
duplicate/pending checks remain. Screenshot directories are retained outside Git.
The final evidence-framing rerun scrolled the enabled mobile Generate button into
view before capturing; actually opened
`C:\Users\SOLUSER\AppData\Local\Temp\forge-ai-generate-recovery-eW0nga\320-enabled.png`,
which clearly shows the full green Generate button and checked consent together.
Browsers/contexts and PGlite close in harness `finally`/test cleanup; no application
server, remote database or provider helper was started.

No migration filename/content changed (`git diff` has no `supabase` changes).
Effective provider defaults/retention, free endpoint availability, hosted auth/
quota concurrency and deployment are unverified. Approved policy replacement is
not legal/provider age/region eligibility certification; no production review
or release/deployment was performed. No credentials/environment contents read.
**Request independent QA of both policy authorization and mounted editor recovery.**

## 6 November 2026 — independent AI Slide Assistant v1 QA evidence

**Owner: independent QA; coordinator owns acceptance and implementer owns defects.
Bounded local verification, not a release certification or broad audit.**
Read current implementation/README/tracker, repository QA instructions and
delivery/security/verification skills (requested sibling paths absent). Latest
20 October provider/default policy was preserved; no provider/reasoning override
or ZDR enforcement was added. No product/test/harness changes, migrations,
environment-file reads, provider/remote services, connected e2e/database writes,
installs, deployment, commit or build rerun.

### Safety, commands and actual results

Windows / existing Node **v25.2.1** (`C:\Program Files\nodejs\node.exe`).
Inspected `offline-run.mjs`, `offline-network.mjs` and imported harnesses before
execution: OS-only child environment, denied Node HTTP/TLS/socket/fetch,
offline Chromium with blocked service workers/routes, in-memory PGlite with
synthetic users. Local migrations execute only inside disposable PGlite.
No application server or helper service was started.

All commands ran from `C:\Ken\PolyU\COMP5241\Project\COMP5241-Project`.
The following are the actual PowerShell commands, in execution order:

```powershell
& 'C:\Program Files\nodejs\node.exe' tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests\presentation-ai.test.mjs tests\presentation-ai-ui.test.mjs
& 'C:\Program Files\nodejs\node.exe' tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests\presentation-font-layout.test.mjs tests\presentation-ui.test.mjs tests\presentation-layout.test.mjs tests\presentation-upload.test.mjs
& 'C:\Program Files\nodejs\node.exe' tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern='free models preserve|paid IDs|every selected free|text and structured requests|text and structured fallback|malformed, empty, refused and incomplete|external AI requires an adult|editable metadata cannot|server AI guard' tests\openrouter.test.mjs tests\eligibility.test.mjs
```

| Independent execution | Actual outcome |
| --- | --- |
| Focused AI pair, first | **11/11**, exit0, 28088.0615ms |
| Unchanged canvas/font/UI/upload group | **22/22**, exit0, 74341.5631ms |
| Selected unchanged free/default-provider/eligibility contracts | **9/9**, exit0, 1118.708ms |
| Additional inline contract probes below | **2/2**, exit0, 231.985ms |
| Additional inline mounted mobile probe below | **1/1**, exit0, 4235.9562ms |
| Total | **45 passed, 0 failed, 0 skipped/cancelled** |

No whole-72/full-suite rerun. No retained test additions: the missing assertions
were checked through the non-retained inline probes below and all passed.
Scoped ESLint/direct tsc were not rerun because only evidence documentation
changed; prior implementer build/type/lint results are historical, not new QA runs.

### Gates closed locally

* Real mounted 1440px and 320px editor: selected textbox/current slide/explicit
  multislide reference; no implicit all-slide selection; consent and formatting
  initially unchecked. Visible plain-text before/after, explanation and optional
  size/alignment review. Tab/Shift+Tab/Escape/Close focus return and keyboard
  Enter/Space Generate/Discard/Apply/Undo/Redo/Save.
* Real Fabric text/runs and lower-canvas dark pixels, finite viewport and
  zero-sized-host recovery, not merely action success. Exactly one changed AI
  history commit. Undo/Redo restore actual canvas content. No save before manual
  Save; real action/in-memory PGlite rows match saved rich runs, reopen renders
  applied text. Mobile probe applies explicit slides 1+2 of 3, preserves slide 3,
  shape/layout/quiz and rich bold/italic/underline/font/color, changing only
  permitted font size/alignment. Imported preview and saved-editor access covered.
* Pending manual edit/undo, pending input/new request, Discard/Close/unmount and
  delayed authorization epochs reject stale work; duplicate Generate/Apply
  produces only one operation. Save/export/upload/uncertain-save locks deny AI.
  Initial/final font draft flush and real overflow denial preserve original
  teaching text and character range; unchanged font/UI regressions cover
  IME, fractional resize, responsive publication, export and failure recovery.
* Real server AI functions with injected profile/lesson/quota/completion
  dependencies: authentication, recorded adult eligibility, trusted approval,
  owner/instructor/admin permissions, saved version, consent/key/quota denial;
  invalid requests do not invoke completion. Delayed provider rechecks identity,
  age/approval/edit rights/version before release; Apply independently rechecks
  session/adult/approval/owner/visibility/version, with no additional quota or
  completion. Database fixture allows only profile reads and shared quota RPC,
  never lesson writes. Exact provider user-message object equals instruction,
  allowFormatting and minimized reference (optional size/alignment only).
* Strict empty/no-op/unknown/duplicate/out-of-scope/run-index/style/oversize/
  truncated JSON rejection, original unchanged; inclusive 2,000 instruction/
  20,000 selected-text/10,000 textbox bounds without clipping. Candidate schema
  and actual fit validation precede the single commit. Unchanged free-only
  zero-price catalog and omitted provider/reasoning policy checks pass.
  Server-only import boundary was source-traced; no deployed bundle claim.

### Examined evidence and cleanup

Actually opened the following generated image files during this QA run:

* `C:\Users\SOLUSER\AppData\Local\Temp\forge-presentation-ai-Ei4vuY\1440-applied.png`
* `C:\Users\SOLUSER\AppData\Local\Temp\forge-presentation-ai-Ei4vuY\320-input.png`
* `C:\Users\SOLUSER\AppData\Local\Temp\forge-presentation-ai-Ei4vuY\320-review.png`
* `C:\Users\SOLUSER\AppData\Local\Temp\forge-presentation-layout-fY4spC\workspace-1366.png`
* `C:\Users\SOLUSER\AppData\Local\Temp\forge-upload-followup-yiONA5\upload-1366.png`
* `C:\Users\SOLUSER\AppData\Local\Temp\forge-ai-independent-q062Qq\320-multislide-applied.png`

Desktop image shows applied text with retained bold/Courier run and fitted
ribbon/canvas. Mobile input/review shows wrapping controls, before/after/style
diffs and Apply; cropped mobile canvas shows both applied textboxes and untouched
shape. These are synthetic local screenshots, not live-provider evidence.
Screenshot directories intentionally retained outside the repository.
Contexts/browsers/PGlite close in `finally`; inline mobile run explicitly logged
closure. All five QA test sessions completed exit0, no running owned helper.
No cleanup failure or unrelated process termination.

### Protected dirty-work verification

Initial Git status: dirty README/tracker/CSS/editor/canvas/browser harness and
pre-existing `tests/lesson-authoring-limits.test.mjs`; new untracked AI source/
tests. Final SHA256 comparison: **11/11 unchanged** below; **17/17 migration
filenames/content unchanged**, including existing
`20261106090000_lesson_authoring_limits_ran.sql`. No rename/status correction.
Six selected unchanged regression files still match Git (font/UI/layout/upload/
OpenRouter/eligibility). Git used existing GitHub Desktop executable
`C:\Users\SOLUSER\AppData\Local\GitHubDesktop\app-3.6.10\resources\app\git\cmd\git.exe`.
QA changed only new evidence sections in README/tracker.

| Protected file | Unchanged SHA256 |
| --- | --- |
| `src/lib/presentation-ai.ts` | `E40556541533E4BFD24525FE1BEA2B9408FBAC16674BE34C60BE930446EBFEBA` |
| `src/lib/presentation-ai-server.ts` | `C2FE34D47A6F87130646665CDE8C24FD1E3732DE6C9AB82A0FADCE3CD5EB1A03` |
| `src/app/presentation/ai-actions.ts` | `B477D38E705E15465312E61E8CD02F60A0D0D6CF6B5117DD3B2A8D800916EA1A` |
| `src/components/presentation-ai-assistant.tsx` | `DF3E81A5651655B3BCD1A45EAA8D201981DE89998C34DDB71B8D794EE9D95C43` |
| `src/components/presentation-editor.tsx` | `F127EB190409C36257D86124B0318610ED1E42C151E2C7C1F658DD5F701968D3` |
| `src/components/presentation-canvas.tsx` | `C2C7B6FC05839F07DF52CE2B84C3B996DF42302565F9534FD705DCE960CE5515` |
| `src/app/globals.css` | `13FEEB78D771E3C7CD109684054A868EC650061CF3D18654379FB592A93499A4` |
| `tests/presentation-browser-harness.mjs` | `59B9B184DB60C9DD03D576FADE0291DD0A57749E11F1BBCEAA5F4C047E38C6C2` |
| `tests/lesson-authoring-limits.test.mjs` | `2ABA1B1C907894811F62C1B8EA05B3C665D03DE4AEEDE25195E169428C2F7E35` |
| `tests/presentation-ai.test.mjs` | `E7AC5CBFB6ADC1EDD1013C82129E7258F3F37185BA5EF34C52B3C2B7ABEC1F2C` |
| `tests/presentation-ai-ui.test.mjs` | `7CAFB77F3F33DFB2511A3DA3361A95FF530967452C2DDAB45FC14203D90EA5B8` |

### Defects and open gates (separate from passes)

**Reproducible product defects: none found in this bounded execution.** No
failing regression retained or product fix requested.
**Untested:** live model rewrite/summarize/translate/example/explanation quality,
availability and actual provider defaults/retention; real hosted auth/quota/
permission/version races and migration prerequisites; deployed bundles/browsers,
Linux CI and release readiness. Offline mocks establish the contract, not live
model adherence. Discard/upstream cancellation and quota refund are not promised.
No new SQL expected; existing profile/eligibility/shared-quota prerequisites
remain deployment responsibilities. Coordinator may close these local gates
without treating this as live/deployment/release certification.

<details>
<summary>Exact non-retained inline acceptance probe commands (reproduction)</summary>

These use existing test-fixture transpilation/dependency injection in memory;
test registration from the fixture file is disabled, not product behavior.
No files are created except screenshots in the UI probe.

```powershell
@'
import test from 'node:test';
import assert from 'node:assert/strict';
import {z} from 'zod';
import * as h from './tests/slide-authoring-harness.mjs';
import {OpenRouterError} from './src/lib/openrouter-client.ts';
const mod={exports:{}};
const deps={'node:test':()=>{},'node:assert/strict':assert,zod:{z},'./slide-authoring-harness.mjs':h,'../src/lib/openrouter-client.ts':{OpenRouterError}};
new Function('require','module','exports',h.transpile('./presentation-ai.test.mjs')+';module.exports.serverFixture=serverFixture;')(name=>{assert.ok(Object.hasOwn(deps,name),name);return deps[name];},mod,mod.exports);
const {ai,fixture,serverFixture}=mod.exports;
process.env.OPENROUTER_API_KEY='offline-fixture';
test('QA exact provider payload, strict no-op/IDs and inclusive text boundaries',async()=>{
  for(const allowFormatting of [false,true]){
    const f=serverFixture();f.request.allowFormatting=allowFormatting;
    f.request.reference=ai.minimizedReference(f.author.document,f.scope,allowFormatting);
    assert.ok((await f.server.generateAiSuggestions(f.request)).patch);
    assert.deepEqual(JSON.parse(f.s.calls[0].messages[1].content),{instruction:f.request.instruction,allowFormatting,reference:f.request.reference});
    assert.equal(f.s.calls.length,1);assert.equal(f.s.claims,1);
  }
  const f=fixture(),before=structuredClone(f.author);
  for(const changes of [
    [{...f.patch.changes[0],runs:[{paragraph:0,run:0,text:f.box.paragraphs[0].runs[0].text}]}],
    [{...f.patch.changes[0],textboxId:crypto.randomUUID()}],
    [{...f.patch.changes[0],runs:[{paragraph:99,run:0,text:'bad'}]}],
    [{...f.patch.changes[0],runs:[{paragraph:0,run:0,text:'',bold:true}]}],
  ])assert.throws(()=>ai.applyAiPatch(f.author.document,f.request,{...f.patch,changes}));
  assert.deepEqual(f.author,before);
  f.box.paragraphs[0].runs=[{...h.presentation.defaultRun,text:'x'.repeat(10000)}];
  f.first.elements.push(h.presentation.newText('y'.repeat(10000)));
  const scope={kind:'slide',slideId:f.first.id};
  const request={...f.request,scope,instruction:'i'.repeat(2000),reference:ai.minimizedReference(f.author.document,scope,false)};
  assert.equal(ai.aiRequestSchema.safeParse(request).success,true);
  f.first.elements.push(h.presentation.newText('z'));
  assert.equal(ai.aiRequestSchema.safeParse({...request,reference:ai.minimizedReference(f.author.document,scope,false)}).success,false);
});
test('QA Apply rechecks revoked adult/approval/owner/version/session and malformed binding without quota or completion',async()=>{
  for(const mutate of [
    f=>{f.s.user=null;},f=>{f.s.age=17;},f=>{f.s.age=null;},
    f=>{f.s.user.app_metadata.ai_access=false;},
    f=>{f.s.user.app_metadata={};f.s.user.user_metadata={ai_access:true,role:'admin'};},
    f=>{f.s.lessonOwner=crypto.randomUUID();},f=>{f.s.editable=false;},
    f=>{f.s.version=2;},f=>{f.s.visibility='public';},f=>{f.s.user.id=crypto.randomUUID();},
  ]){
    const f=serverFixture();f.request.lessonId=crypto.randomUUID();f.request.version=1;
    const generated=await f.server.generateAiSuggestions(f.request);assert.ok(generated.patch);
    mutate(f);assert.ok((await f.server.checkAiApply(generated.binding)).error);
    assert.equal(f.s.calls.length,1);assert.equal(f.s.claims,1);
  }
  const f=serverFixture();
  for(const binding of [{},{requestId:f.request.requestId,sourceToken:f.request.sourceToken,userId:f.s.user.id,lessonId:crypto.randomUUID()},
    {requestId:f.request.requestId,sourceToken:f.request.sourceToken,userId:f.s.user.id,extra:true}])assert.ok((await f.server.checkAiApply(binding)).error);
  assert.equal(f.s.calls.length,0);assert.equal(f.s.claims,0);
});
'@ | & 'C:\Program Files\nodejs\node.exe' tests\offline-run.mjs --experimental-strip-types --input-type=module
```

```powershell
@'
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {harness,presentation as model} from './tests/slide-authoring-harness.mjs';
import {mountPresentation} from './tests/presentation-browser-harness.mjs';
test('QA 320px keyboard current/new-request/multislide Apply pixels, atomic UndoRedo, manual PGlite Save/reopen',async()=>{
  const h=await harness(),browser=await chromium.launch(),context=await browser.newContext({offline:true,serviceWorkers:'block',viewport:{width:320,height:900}});
  const page=await context.newPage(),errors=[],network=[],calls=[],saves=[];
  let release,gate;
  try{
    await context.route('**/*',r=>{network.push(r.request().url());return r.abort();});
    page.on('pageerror',e=>errors.push(e.message));
    await page.exposeFunction('images',()=>({error:'Not used'}));
    await page.exposeFunction('persist',async(name,entries)=>{saves.push(entries);const form=new FormData();for(const [k,v]of entries)form.set(k,v);return h.actions[name]({},form);});
    await page.exposeFunction('presentationAi',async(kind,request)=>{
      calls.push({kind,request});if(kind==='authorize')return {};
      if(gate)await gate;
      return {binding:{requestId:request.requestId,sourceToken:request.sourceToken,userId:h.owner},patch:{explanation:'Clear teaching example.',changes:request.reference.map(e=>({slideId:e.slideId,textboxId:e.id,runs:[{paragraph:0,run:0,text:'Clear SDLC '}],...(request.allowFormatting?{fontSize:18,align:'center'}:{})}))}};
    });
    const initial=model.blankPresentation();initial.title='Offline independent AI QA';
    const first=initial.document.slides[0];first.title='First';
    const rich=model.newText('Complex SDLC ');rich.paragraphs[0].runs.push({...model.defaultRun,text:'requirements',bold:true,italic:true,underline:true,font:'Courier New',color:'#123456',size:24});
    const other=model.newText('Second explanation');other.y=260;
    first.elements=[rich,other,{id:crypto.randomUUID(),type:'shape',shape:'rect',x:800,y:10,w:30,h:30,rotation:0,fill:'#123456',stroke:'#123456',strokeWidth:0}];
    const second=model.newSlide();second.title='Second';second.elements=[model.newText('Second slide explanation')];
    const third=model.newSlide();third.title='Unselected';third.elements=[model.newText('Do not change this')];
    initial.document.slides.push(second,third);
    initial.quiz=Array.from({length:3},(_,i)=>({prompt:`Question ${i}`,options:['A','B','C','D'],correct:0}));
    await mountPresentation(page,{initial});await page.waitForFunction(()=>editCanvas.getObjects().length===3);
    const aiButton=page.getByRole('button',{name:'AI Slide Assistant',exact:true});
    await aiButton.focus();await page.keyboard.press('Enter');await expect(page.getByLabel('Suggestion scope')).toHaveValue('slide');
    await page.getByLabel('Instruction',{exact:true}).fill('Explain with an educational example.');
    await page.getByLabel('I consent',{exact:false}).focus();await page.keyboard.press('Space');
    gate=new Promise(resolve=>{release=resolve;});
    await page.getByRole('button',{name:'Generate suggestions',exact:true}).focus();await page.keyboard.press('Enter');
    await page.getByLabel('Instruction',{exact:true}).fill('Rewrite the current slide.');release();gate=null;
    await expect(page.getByRole('button',{name:'Generate suggestions',exact:true})).toBeDisabled();
    await expect(page.getByRole('region',{name:'AI suggestions'})).toHaveCount(0);
    assert.equal(calls[0].request.reference.length,2);
    await page.getByLabel('I consent',{exact:false}).focus();await page.keyboard.press('Space');
    await page.getByRole('button',{name:'Generate suggestions',exact:true}).focus();await page.keyboard.press('Enter');
    await expect(page.getByRole('region',{name:'AI suggestions'})).toBeFocused();
    assert.equal(calls[1].request.instruction,'Rewrite the current slide.');
    await page.getByRole('button',{name:'Discard',exact:true}).focus();await page.keyboard.press('Enter');
    await page.getByLabel('Suggestion scope').selectOption('slides');
    assert.equal(await page.getByRole('checkbox').filter({visible:true}).count(),5);
    assert.equal(await page.getByLabel('1. First').isChecked(),false);assert.equal(await page.getByLabel('2. Second').isChecked(),false);assert.equal(await page.getByLabel('3. Unselected').isChecked(),false);
    for(const label of ['1. First','2. Second','Allow simple','I consent']){await page.getByLabel(label,{exact:false}).focus();await page.keyboard.press('Space');}
    await page.getByRole('button',{name:'Generate suggestions',exact:true}).focus();await page.keyboard.press('Enter');
    await expect(page.getByRole('region',{name:'AI suggestions'})).toBeFocused();
    const request=calls.at(-1).request;assert.deepEqual(request.scope.slideIds,[first.id,second.id]);assert.equal(request.reference.length,3);assert.doesNotMatch(JSON.stringify(request.reference),/Do not change|Question|asset|fill/);
    await page.evaluate(()=>{
      const History=presentationModules('@/lib/presentation').PresentationHistory,original=History.prototype.commit;
      window.qaAiEdits=[];History.prototype.commit=function(next,...args){if(JSON.stringify(next)!==JSON.stringify(this.value))qaAiEdits.push({before:structuredClone(this.value),after:structuredClone(next)});return original.call(this,next,...args);};
    });
    await page.getByRole('button',{name:'Apply',exact:true}).focus();await page.keyboard.press('Enter');
    await expect(page.getByRole('status')).toContainText('one undoable edit');await page.keyboard.press('Escape');await expect(aiButton).toBeFocused();
    await page.waitForFunction(()=>editCanvas.getObjects().filter(o=>o.type==='textbox').every(o=>o.text.startsWith('Clear SDLC ')));
    const edits=await page.evaluate(()=>qaAiEdits);assert.equal(edits.length,1);const {before,after}=edits[0];
    assert.deepEqual(after.quiz,before.quiz);assert.deepEqual(after.document.slides[2],before.document.slides[2]);assert.deepEqual(after.document.slides[0].elements[2],before.document.slides[0].elements[2]);
    for(let si=0;si<2;si++)for(let ei=0;ei<before.document.slides[si].elements.length;ei++){
      const b=before.document.slides[si].elements[ei],a=after.document.slides[si].elements[ei];if(b.type!=='text')continue;
      const expected=structuredClone(b);expected.paragraphs[0].runs[0].text='Clear SDLC ';expected.align='center';for(const p of expected.paragraphs)for(const r of p.runs)r.size=18;assert.deepEqual(a,expected);
    }
    assert.equal(saves.length,0);
    await page.waitForFunction(()=>{const c=editCanvas.lowerCanvasEl,p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<p.length;i+=4)if(p[i]<90&&p[i+1]<90&&p[i+2]<90&&p[i+3]>200)n++;return n>20&&editCanvas.viewportTransform.every(Number.isFinite);});
    const artifacts=await mkdtemp(join(tmpdir(),'forge-ai-independent-'));await page.locator('.presentation-surface.presentation-editable').screenshot({path:join(artifacts,'320-multislide-applied.png')});console.log('Independent AI screenshots:',artifacts);
    await page.getByRole('button',{name:'Undo',exact:true}).focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>editCanvas.getObjects()[0].text==='Complex SDLC requirements');
    await page.getByRole('button',{name:'Redo',exact:true}).focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>editCanvas.getObjects()[0].text==='Clear SDLC requirements');
    await page.getByRole('button',{name:'Save',exact:true}).focus();await page.keyboard.press('Enter');await page.getByRole('status').filter({hasText:'Version 1'}).waitFor();
    const {rows}=await h.db.query('select id,version,content from forge_lessons');assert.equal(rows.length,1);assert.equal(saves.length,1);assert.equal(rows[0].version,1);
    const stored=JSON.parse(new Map(saves[0]).get('content'));assert.deepEqual(rows[0].content.slides,stored.document.slides);assert.deepEqual(stored.quiz,initial.quiz);
    const styled=stored.document.slides[0].elements[0].paragraphs[0].runs[1];for(const key of ['bold','italic','underline','font','color'])assert.equal(styled[key],rich.paragraphs[0].runs[1][key]);assert.equal(styled.size,18);
    await page.evaluate(()=>presentationRoot.unmount());await mountPresentation(page,{initial:stored,lessonId:rows[0].id,version:1});await page.waitForFunction(()=>editCanvas.getObjects()[0].text==='Clear SDLC requirements');
    assert.equal(calls.filter(c=>c.kind==='authorize').length,1);assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
  }finally{release?.();await context.close();await browser.close();await h.db.close();console.log('Independent browser/context/PGlite closed');}
});
'@ | & 'C:\Program Files\nodejs\node.exe' tests\offline-run.mjs --experimental-strip-types --input-type=module
```

</details>

## 6 November 2026 — approved AI Slide Assistant v1 implementation

**Owner: implementer; parent coordinator retains requirements/handover and acceptance.
Independent Forge QA requested, not self-certified release.**
Initial Git status showed only pre-existing `tests/lesson-authoring-limits.test.mjs`
changes. Those changes, all migrations and historical documentation entries
remain untouched. Git was accessed through existing GitHub Desktop Git.
Sibling skills were absent; repository delivery/security/verification skills
and implementer instructions were loaded. Latest approved 20 October provider
policy takes precedence over historical privacy wording: no provider/reasoning
overrides, no enforced ZDR/data-collection denial, effective defaults unknown.

### Hypotheses, changes and boundaries

Inspected controlling editor/history/flush/modal, presentation schemas, real
Fabric layout, server authorization/eligibility, permissions, free-only client,
package scripts and offline harnesses before editing. First falsifiable
hypothesis: ID/run-targeted patches can retain rich formatting and add exactly
one undoable AI edit while source fingerprints reject concurrent changes.
Smallest first check: minimized-reference/rich-run/history unit test, **1/1**.

* Separate AI dialog content reuses existing modal, keyboard/focus-return and
  responsive conventions. Selected text defaults when a real textbox is selected;
  otherwise current slide. Multislide selection starts empty and shows labels/
  counts. Instruction, formatting permission and consent are explicit; consent
  and formatting start unchecked. All changed runs and optional styles appear
  before Apply as safe text; explanation is never rendered as HTML.
* Strict requests allow at most 2,000 instruction characters, 20,000 selected
  text characters, 100 textboxes, 2,000 runs, 30 slides and 100,000 serialized
  characters. Oversized/empty scopes reject, without clipping/skipping/batching.
  Provider payload contains only instruction, allowFormatting and minimized
  text/IDs (sizes/alignment only when allowed). No title/audience/quiz/answer keys/
  accounts/originals/images/asset IDs/URLs/alt text/shapes/unrelated slides.
* Strict JSON-schema patches target existing slide/textbox and paragraph/run
  indices, preserving all other rich styles/properties. Only textbox-wide
  fontSize 8–120 and left/center/right alignment are optionally allowlisted.
  Empty/no-op, unknown/duplicate/out-of-scope IDs/indices/properties, changed
  paragraph boundaries, oversized text/output and malformed JSON reject.
* Server-only action authenticates, checks recorded adult age and trusted
  `app_metadata.ai_access`, consent and structure, and saved-lesson edit access/
  version before quota/provider. Existing `forge_claim_coach_request` claims one
  shared 15/day request; no lesson/storage writes. Identity/eligibility/edit rights/
  version are rechecked before releasing results and again on Apply (no new quota
  claim). Existing owner/instructor/admin permissions are reused unchanged.
* Existing free-only client retains explicit zero-price catalog validation,
  configured primary/fallback ordering and its finite deadline. No retries or
  provider configuration changes were added. Missing key/quota/authorization/
  provider/schema errors are standard safe `{error}` results; no teaching logs.
* Mount identity, history revision, acknowledged saved ID/version and full
  targeted text/style/layout fingerprints reject stale edits, undo/redo and
  replaced drafts. Close/unmount/new request/input changes/Discard invalidate
  local epochs; duplicate Generate/Apply use synchronous refs.
* Apply flushes actual canvas/font drafts, rereads history, rechecks source,
  authorizes the original user and validates the candidate with
  `presentationSchema` and real `validateTextLayout` before one ungrouped commit.
  A final flush/check catches drafts entered during asynchronous validation.
  Measurement fitting does not expand v1 geometry; existing manual Save
  normalization remains unchanged. Generate/Apply never saves/refreshes.
* **Necessary tightly coupled additional file:** `presentation-canvas.tsx`.
  Examined post-Apply pixels exposed a persistent blank canvas despite correct
  `.text`: viewport translations were **NaN**. Falsifiable second hypothesis:
  transient zero host dimensions make Fabric `setZoom` invert a singular matrix.
  The raster check failed twice before repair (30s/5s), proving this was not just
  screenshot readiness. Resize now ignores nonpositive dimensions and directly
  sets the fit-only viewport matrix. A zero-sized-host regression and actual
  dark text pixels verify recovery. No canvas storage/geometry contract changes.
* Six bounded AI CSS rules provide wrapping/min-width/result-focus only.
  Compact visible “AI assistant” retains full accessible name/title; the longer
  label caused real ribbon/canvas layout regression and was reduced, not hidden.

Changed files: new `src/lib/presentation-ai.ts`,
`src/lib/presentation-ai-server.ts`, `src/app/presentation/ai-actions.ts`,
`src/components/presentation-ai-assistant.tsx`,
`tests/presentation-ai.test.mjs`, `tests/presentation-ai-ui.test.mjs`;
updated `src/components/presentation-editor.tsx`,
`src/components/presentation-canvas.tsx`, `src/app/globals.css`,
`tests/presentation-browser-harness.mjs` (new module map/delegates only), README
and this tracker. Existing presentation schema, other actions/harness behavior,
OpenRouter configuration, coach wording and coordinator task statuses unchanged.

### Commands and actual local evidence

Windows / Node **v25.2.1**, existing offline Chromium/Fabric/React and PGlite.
All Node tools used the OS-only, network-denying runner; no environment loader.
Let `N = node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1`.

| Command/check, in execution order | Actual outcome |
| --- | --- |
| `N tests\presentation-ai.test.mjs`, first helper then expanded action checks | 1/1 then 4/4, exit0 |
| `N tests\presentation-ai-ui.test.mjs`, initial iterations | 0/2 then 1/2, exit1: instruction textarea label drift, pre-Generate normalization made an assumed empty undo stack false, multislide fixture returned a no-op |
| Same after explicit label, one-commit instrumentation and meaningful fixture | 2/2, exit0 |
| Initial scoped ESLint | Exit1: render-time ref writes and cleanup warning; corrected to synchronous operation/ack refs outside render |
| Expanded focused pair (same two files) | 6/6, 9/9 and later 10/10, exit0 |
| Initial full targeted group below | 68 passed / 2 failed, exit1: longer AI utility created an extra ribbon row and canvas widths below unchanged desktop/upload assertions |
| `N tests\presentation-layout.test.mjs tests\presentation-upload.test.mjs` after compact label | Exit0, both original regression files passed unchanged |
| Group below after label / after final draft flush | 70/70 then 71/71, exit0; object-level evidence was not yet sufficient for raster visibility |
| Final-flush test addition iteration | 12 passed / 1 failed / 1 cancelled, exit1: accidental nested fixture placement; corrected independent test and completed export lock gate, then 10/10 exit0 |
| `N --test-name-pattern="mounted AI review" tests\presentation-ai-ui.test.mjs`, pixel check and diagnostic | Two 0/1 exit1 runs: persistent blank raster, actual viewport `[zoom,0,0,zoom,NaN,NaN]`; no teaching/document corruption |
| Focused pair after bounded viewport repair | 10/11 exit1: new host locator matched thumbnails too; narrowed to editable host |
| `N --test-name-pattern="mounted AI review\|transient zero" tests\presentation-ai-ui.test.mjs` | 2/2, exit0 |
| FINAL focused pair | **11/11, exit0**, 29394.2704ms; no skips/cancellations |
| FINAL targeted group below | **72/72, exit0**, 118846.1696ms; no skips/cancellations |
| FINAL scoped ESLint and direct offline TypeScript below | Exit0, no diagnostics |
| Environment-free packaging build below (also passed earlier snapshots) | Exit0: typegen, tsc and webpack build; final compile 16.3s, all 25 static pages generated |
| Desktop Git `--no-pager diff --check` | Exit0; final owned build snapshot absent and zero remaining Node processes |

```powershell
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests\presentation-ai.test.mjs tests\presentation-ai-ui.test.mjs tests\presentation-ui.test.mjs tests\presentation-upload.test.mjs tests\presentation-font-layout.test.mjs tests\presentation-model.test.mjs tests\presentation-layout.test.mjs tests\presentation-integration.test.mjs tests\openrouter.test.mjs tests\eligibility.test.mjs
node tests\offline-run.mjs node_modules\eslint\bin\eslint.js src/lib/presentation-ai.ts src/lib/presentation-ai-server.ts src/app/presentation/ai-actions.ts src/components/presentation-ai-assistant.tsx src/components/presentation-editor.tsx src/components/presentation-canvas.tsx tests/presentation-ai.test.mjs tests/presentation-ai-ui.test.mjs tests/presentation-browser-harness.mjs
node tests\offline-run.mjs node_modules\typescript\bin\tsc --noEmit --incremental false
node tests\offline-run.mjs tests\offline-build.mjs --presentation-gate
```

Contract coverage includes current/selected/multislide scopes, rich-run preservation,
unique/allowlisted patches, actual serialized/run/text bounds, unapproved/minor/
unknown-age/user_metadata spoof denial, owner/public edit denial, permitted admin/
instructor cases, late session/rights/version denial, consent/quota/missing-key
failures, malformed/truncated JSON and safe provider errors. Invalid requests
never reach completion; mocked database allows only profile reads and quota RPC,
not lesson writes. Existing free-only/omitted-provider-policy regressions pass.

Mounted coverage includes before/after/style explanation, duplicate submits,
one changed AI history commit, undo/redo, actual manually saved rich styles and
PGlite reopen, imported preview access, pending edit + undo staleness, Close/
Discard/unmount late results, save/upload/export/uncertain locks, overflow retaining
the textbox/character range, font-draft flushing including the gated final-layout
race, accessible notices/results, Tab/Shift+Tab/Escape/Close focus return and
320px inputs/list/results/buttons without horizontal overflow.

**Actually examined final screenshots:**
`C:\Users\SOLUSER\AppData\Local\Temp\forge-presentation-ai-92is7M\`
`1440-applied.png`, `320-input.png`, `320-review.png`; and
`C:\Users\SOLUSER\AppData\Local\Temp\forge-presentation-layout-sIQIIF\workspace-1366.png`.
They show rendered applied text with rich bold/Courier text, reachable mobile
input/results/style controls and desktop ribbon/canvas fit. Earlier blank
`forge-presentation-ai-mDIX43\1440-applied.png` was examined and is superseded,
not claimed as valid visual evidence. Screenshots remain in owned temporary
artifact directories for independent QA; no repository binaries added.
Owned contexts/browsers and PGlite close in finally. Final disposable build
snapshot/junction `forge-slide-build-EFgKJn` was removed and explicitly checked
absent; unrelated existing Chrome processes were not terminated.

**Remaining gaps/prerequisites:** live OpenRouter availability/model adherence,
real hosted authentication/quota/rights races, provider retention/defaults and
deployed-browser/OS behavior remain unverified. Existing profile/eligibility and
`forge_claim_coach_request` migrations are prerequisites; **no new SQL needed**.
Configuration names only: `OPENROUTER_API_KEY` or `OPEN_ROUTER_API_KEY`,
`OPENROUTER_MODEL`, `OPENROUTER_FALLBACK_MODELS`. No env/credential files read,
remote/provider calls, connected SQL writes, installs, deployment or commits.
Request independent Forge QA of the scoped files/flows above; coordinator owns
acceptance. No full-suite or release certification.

## 6 November 2026 — bounded removal of retired author/import limits

**Owner: implementer; coordinator owns traceability/handover and acceptance. Independent QA requested.**
Initial status was clean using existing GitHub Desktop Git (not on PATH).
Requested sibling skill paths were absent; loaded repository
`.github/skills/forge-{delivery,security,verification}/SKILL.md` and implementer
instructions. No environment files were read. Historical entries below retain
their original evidence; their 3–6/400/2,400 author/import limits are superseded.

### Hypothesis, changes and scope

Before edits inspected author/stored schemas, real import actions/parser, current
presentation adapter/editor, resume actions/player/route, both controlling SQL
migrations and offline harness/tests. Falsifiable hypothesis: retired legacy
limits independently reject content representable by the existing presentation
capacity, and <=5 resume readers/writers reject expanded author positions.
Chosen first check was the real upload action regression; it failed specifically
with the old **“Slide import requires 3–6 source slides”** error.

* Author/stored legacy slides now 1–30; bodies retain exact text up to the existing
  10,000-character textbox ceiling and retain nonempty/control-character safety.
  Standard/AI schema remains 4–6/400/ten quiz questions. Existing optional-quiz
  rules, default draft, styles, authorization and privacy remain.
* PPTX keeps source boundaries/order, including one/two slides, without blank
  padding. Text splits into 400-character chunks for small imports and grows only
  enough to fit 60,000 characters into 30 slides. Nothing is clipped/discarded.
  Short lessons use three meaningful fallback activity steps, not blank slides.
* Legacy presentation bodies use one literal run containing their newlines,
  avoiding accidental >100-paragraph rejection while keeping that existing
  presentation safety ceiling. Shared 30/10,000 constants do not change native
  capacity. Canvas-fit validation and presentation document/parser limits remain.
* Legacy editor can add past six, remove down to one and type >400 characters.
  Upload copy states current bounds and required canvas-fit adjustment.
* Resume writers/readers/player restore use expanded slide-template bounds only,
  retaining standard <=5 and actual slide-count checks. **Necessary coupled file
  outside the main list:** lesson route reader, otherwise saved index6+ is lost
  on reopen. **Necessary coupled test:** presentation-integration replaces its
  obsolete legacy-30 rejection with preserved standard rejection, and tests the
  real legacy-seven route restoring index6.
* New additive SQL updates **forge_legacy_lesson_content_valid**, not the wrapper;
  only legacy slides-template resume changes. Existing rows, presentation
  geometry/assets/privileges and standard behavior are retained. CHECK guidance
  now includes the new migration after both prerequisites. No `_ran` edits.

Changed files: `src/lib/{slide-lesson,learning,resume,presentation}.ts`,
`src/components/{create-lesson,learning-controls}.tsx`,
`src/app/learning/actions.ts`,
`src/app/courses/[slug]/lessons/[lesson]/page.tsx`,
`tests/{teaching-material,slide-authoring,slide-authoring-ui,slide-acceptance,presentation-integration}.test.mjs`,
new `tests/lesson-authoring-limits.test.mjs`,
new `supabase/migrations/20261106090000_lesson_authoring_limits.sql`,
README and this tracker. No harness, dependencies or configuration changes.

### Commands and actual outcomes

All Node commands use the existing OS-only/network-denying runner.
Let `N = node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1`.
No skips/cancellations in these runs.

| Command (in execution order) | Actual result |
| --- | --- |
| `N --test-name-pattern="template upload" tests\teaching-material.test.mjs` before source change | RED 0/1, exit1, old 3–6 error |
| Same command immediately after import/schema change | GREEN 1/1, exit0 |
| `N tests\slide-authoring.test.mjs tests\slide-acceptance.test.mjs tests\resume.test.mjs` first iteration | 6 passed/11 failed, exit1: unnecessary new player runtime import absent from offline module maps |
| Same command after removing that unnecessary dependency (retain explicit template/count validation) | 17/17, exit0 |
| `N tests\slide-authoring-ui.test.mjs` original flows | 1/1, exit0 |
| `N tests\lesson-authoring-limits.test.mjs` first two iterations | 2/3 each, exit1: synthetic user omitted required age, then fixture appended two-digit index past 10,000 |
| Same after fixture corrections | 3/3, exit0; later new-cap migration-guidance addition also 3/3, exit0 |
| `N tests\slide-authoring-ui.test.mjs` expanded keyboard/save/reopen flows | 1/1, exit0 |
| `N --test-name-pattern="template upload" tests\teaching-material.test.mjs` attempted long PDF fixture | 0/1, exit1: actual PDF extraction 488, not 60,000 (text positioned off-page); fixture was invalid evidence |
| `N tests\teaching-material.test.mjs tests\lesson-authoring-limits.test.mjs tests\presentation-storage.test.mjs` with initial PPTX near-ceiling fixture | 19/20, exit1: parser correctly counts raw paragraph/separator newlines, rejecting fixture above existing per-unit ceiling |
| `N --test-name-pattern="template upload" tests\teaching-material.test.mjs` corrected raw-boundary fixture | 1/1, exit0 |
| `N tests\presentation-integration.test.mjs tests\presentation-model.test.mjs tests\presentation-compatibility.test.mjs` | 4/4, exit0 |
| FINAL grouped command below | **44/44, exit0, 61203.6013ms** |
| `node tests\offline-run.mjs node_modules\typescript\bin\tsc --noEmit --incremental false` FINAL | Exit0, no diagnostics; no typegen/build/env loader |
| Scoped ESLint command below FINAL | Exit0, no diagnostics |
| Existing Desktop Git `--no-pager diff --check` FINAL | Exit0; explicit cleanup probe found zero Node processes |

```powershell
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests\teaching-material.test.mjs tests\slide-authoring.test.mjs tests\slide-authoring-ui.test.mjs tests\slide-acceptance.test.mjs tests\lesson-authoring-limits.test.mjs tests\resume.test.mjs tests\presentation-storage.test.mjs tests\presentation-integration.test.mjs tests\presentation-model.test.mjs tests\presentation-upload.test.mjs tests\presentation-compatibility.test.mjs
node tests\offline-run.mjs node_modules\eslint\bin\eslint.js src/lib/slide-lesson.ts src/lib/learning.ts src/lib/resume.ts src/lib/presentation.ts src/components/create-lesson.tsx src/components/learning-controls.tsx src/app/learning/actions.ts 'src/app/courses/[slug]/lessons/[lesson]/page.tsx' tests/teaching-material.test.mjs tests/slide-authoring.test.mjs tests/slide-acceptance.test.mjs tests/slide-authoring-ui.test.mjs tests/lesson-authoring-limits.test.mjs tests/presentation-integration.test.mjs
```

Coverage: actual upload actions accept1/2/7 PPTX and10,000 bodies, reject31/
10,001/image-only/mode tampering; 2,401 and >12,000 total file text preserve
exact normalized content/order. The corrected real PPTX uses the entire **60,000
raw parser budget**, producing **59,995** extracted characters (existing newline
normalization); helper/schema checks independently preserve exactly **60,000**
and newline-heavy text within30 slides. Real legacy1/2/7/30 create/update/read,
short activity fallback, index6+/29 resume and invalid actual-count denial pass.
New SQL alone after all earlier prerequisites reproduces23514 before adjustment,
applies twice, preserves row/function/ACL snapshots and rejects malformed/empty/
31/10,001/standard-expanded positions. Existing privacy/quiz/permissions and
native wrapper geometry/assets/grants tests remain; historical presentation SQL
replay still passes its separate storage-policy test.

Mounted offline Chromium153.0.8010.12 verifies keyboard add7/remove1, >400 body,
legacy index6 restore, real presentation preview→save→Studio reopen→version2 for
seven ordered slides and2,401 fitting characters, and retained uncertain/stale
upload behavior. Existing portal tests cover320/1366/1440/1910/1920 widths.
Opened the expanded320 screenshots: canvas text and controls visible, saved
notice present, no horizontal overflow; no forced overflow-save shortcuts.

### Unapplied SQL, cleanup and handoff limits

SQL is **provided only**, not applied remotely or marked `_ran`. Prerequisites:
base schema and all earlier migrations in order, particularly
`20261105093000_slide_authoring_ran.sql` then
`20261105140000_presentations_ran.sql`. Remote execution/schema cache/target
verification requires separately authorized handling; do not reapply the old
slide-authoring migration over the presentation wrapper.

PGlite/browser/context cleanup runs in `finally`; no server/helper remains.
The broad exploratory filesystem search was stopped by its tool session ID.
Final synthetic screenshots remain in OS Temp `forge-slide-authoring-KkLht7`
and `forge-upload-followup-3vgkVT`; earlier iteration screenshots also retained.
No remote services, environment contents, production settings, installs, connected
e2e, full suite, deployment or commit. Local Windows/Node25.2.1 evidence is not
Ubuntu/Node24 CI or release certification. Request independent focused QA of
these changes and SQL prerequisite order; coordinator owns acceptance/handover.
Earlier unrelated full-suite/manual-authoring/CI blockers are not resolved by
this bounded packet.

## 5 November 2026 — new fractional-resize CI failure: bounded publication repair

**Owner: implementer; coordinator owns traceability/acceptance. Independent Ubuntu/Node 24 QA requested.**
Initial Git status/owned diffs were clean; retained pristine-draft product and
responsive matchMedia test repairs are preserved. Only
`tests/presentation-font-layout.test.mjs`, README and this tracker changed.
Loaded repository `.github/skills/forge-{delivery,verification}/SKILL.md`
because the requested sibling files are absent. Git was absent from PATH
(initial command exit 1, baseline did not run there); used existing GitHub
Desktop Git without setup. No environment files were read.

### Evidence and change

Inspected the complete test, FontSizeInput's `[value]` draft effect, synchronous
canvas capture/commit, redraw/history, harness and repository web-first assertion
conventions before editing. Hypothesis: the input snapshot precedes React
publication even though Fabric has already baked the exact fractional size.
Chosen check: unchanged narrow baseline, then an in-memory controlled schedule
on the original test, not a production scale change or repeated blind runs.

The baseline passed on Windows. The first MessageChannel-only diagnostic did
not hold the active scheduler transport and also passed; its same-stack trace
already showed canonical/DOM divergence. Holding the **actual scheduler host
callback** then failed the unchanged original line-314 assertion exactly:
`24 !== 26.9628`. Immediately after capture, Fabric font **26.9628**, captured
run **26.9628**, scaleY **1**, visible input **"24"**. This proves an admissible
publication/read race matching the failure, not the uncontrolled Ubuntu order
or which render/effect phase Linux delayed. FontSizeInput's own effect adds a
publication hop; delaying root work is sufficient to reproduce the symptom.

* `fontSizePublished` uses bounded Playwright `toHaveValue` for the **exact**
  expected string (or empty Mixed), replacing attachment-only readiness.
  Selection callers identify restored sizes, Mixed or the fixture's default
  run size. No font rounding/tolerance, sleeps, action retries or forced events.
* Resize immediately asserts canonical font `24*1.12345` and both scales `1`,
  independently of UI readiness. Width/height publication is checked against
  canonical geometry using the existing two-decimal geometry convention.
  Coupled noninitial range/font-effect and Undo/Redo paths wait for exact
  canonical history state and exact published height/font before snapshots.
* New regression gates only the real scheduler callback in this mount's
  in-memory module source, restoring the shared source in `finally`. It proves
  canonical `26.9628`/scales `1` with visible `24`, completes an attachment
  query, and checks that publication readiness is still pending. Explicit
  callback release publishes the exact value without scaling again.
  Its initial single-round-trip probe passed with the old helper and therefore
  was insufficient; the completed-attachment barrier made it RED before repair.
* Original invalid drafts/Mixed, untouched-focused regressions, responsive gate,
  120-before-Tab/8-after-Tab, native spinner, history/geometry, exact saved
  coordinates, font 48 and full two-save payload equality remain. No production,
  harness, configuration, dependency, schema, action, CSS or migration edits.

### Commands and actual outcomes

All Node invocations used the existing OS-only/network-denying runner. Let
`N = node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1`.
No test skips/cancellations in these runs.

| Command/scope | Result |
| --- | --- |
| `N --test-name-pattern="mounted fractional" tests\presentation-font-layout.test.mjs` (unchanged) | 1/1, exit 0; 3420.9691ms |
| Two transient stdin diagnostics: `node tests\offline-run.mjs --experimental-strip-types --test-name-pattern="mounted fractional" --input-type=module -` | MessageChannel probe 1/1, exit 0; real host gate 0/1, exit 1, exact original 24/26.9628 RED |
| `N --test-name-pattern="font inspector waits" tests\presentation-font-layout.test.mjs` before repair | Initial inadequate probe 1/1, exit 0; attachment barrier 0/1, exit 1 (“an attached stale font field is not publication readiness”) |
| `N --test-name-pattern="mounted fractional\|font inspector waits\|noninitial character\|font field accepts\|mobile properties waits\|untouched focused" tests\presentation-font-layout.test.mjs` | Immediate GREEN 7/7, exit 0; 17996.9512ms |
| `N tests\presentation-font-layout.test.mjs tests\presentation-ui.test.mjs` (first group) | 16 passed / 1 failed, exit 1; new helper assumed 24 for a fixture explicitly using defaultRun size 28 |
| `N --test-name-pattern="temporary validation locks" tests\presentation-font-layout.test.mjs` after caller expectation correction | 1/1, exit 0; 4738.5763ms |
| `N tests\presentation-font-layout.test.mjs tests\presentation-ui.test.mjs` (FINAL group) | **17/17, exit 0; 54511.2317ms** |
| `node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 "tests/*.test.mjs"` (once) | **413 passed / 2 failed, exit 1; 313760.0884ms** |
| `node tests\offline-run.mjs node_modules\eslint\bin\eslint.js tests\presentation-font-layout.test.mjs` | Exit 0, no diagnostics |
| `git --no-pager diff --check -- tests/presentation-font-layout.test.mjs README.md IMPLEMENTATION_TRACKER.md` (existing Git absolute path) | Exit 0 |

Before the full glob, classified all 47 matching files/imported harnesses:
pure/static contracts, mocked service/AI clients, offline routed Chromium and
in-memory PGlite. Setup's env loader is mocked; teaching-material's local
server-only subprocess inherits the offline guard. Connected `e2e.mjs` and
`instructor-e2e.mjs` are outside the glob and were not invoked.
The full run's two failure counts are **one subtest plus its failed parent**:
`manual-authoring.test.mjs:441` 320px activity formatting/create flow, timeout
at line 469 awaiting status “Lesson created.”; parent “mounted real studio:
manual creation, same-ID editing and retained uncertain-save contracts”.
All font tests/prior repairs passed in the full run. This remains an
out-of-scope blocker, not diagnosed or repaired here; no rerun to conceal it.

### Cleanup and handoff limits

Existing browser/context and PGlite `finally` cleanup ran on passing and failing
paths. The regression releases the callback and awaits its publication promise
in `finally`; per-mount sources are restored. Stdin diagnostics left no source
files; no helper/server was started. No Node test process or Playwright browser
remains; unrelated user Chrome processes were not touched. Synthetic screenshot
artifacts from existing tests remain in OS Temp; no new visual approval claimed.
Only JS tests/docs changed, so source types/build were not run.

Local runtime is Windows/Node **25.2.1**; `wsl --list --quiet` found no installed
distribution, Docker is unavailable, no Node 24 runtime was found in the
inspected installation. No download/setup, connected check, remote write,
commit or deployment. Request independent original-narrow/grouped
**Ubuntu/Node 24 QA**, plus separate ownership/triage for the manual-authoring
failure. Controlled matching scheduler evidence and local passes are **not**
Linux CI observation, a full-suite pass or self-certified release approval.

## 5 November 2026 — remaining CI Tab/8 failure: proven responsive readiness hole

**Owner: implementer; coordinator owns traceability/acceptance. Independent Ubuntu/Node 24 QA requested.**
The previous pristine-draft repair remains valid but **did not resolve CI**:
the new reported failure was original line 432, actual `[120,120]`, expected
`[8,8]`, “blur alone must confirm the inclusive minimum”. This is distinct from
the earlier stale-24 writer. Initial owned diffs/status were clean. Only
`tests/presentation-font-layout.test.mjs`, README and this tracker changed.

### Hypothesis, causal evidence and bounded repair

Before editing, inspected FontSizeInput, responsive `resizePanels`, canvas
style/commit/redraw handling, browser harness and the complete failing flow.
Falsifiable hypothesis: viewport completion precedes matchMedia delivery; the
test reads stale desktop `.open=true`, skips reopening, then the delayed callback
closes Properties between native focus and typing. Chose native/React/panel/
canvas tracing in the **original complete flow**, not another draft-writer fix.

The unchanged required baseline passed on Windows. An in-memory trace also
passed: responsive closure occurred before the conditional read/reopen, then
native input/onChange `8` and dirty blur/flush applied `[8,8]`.

A second in-memory run held the real change callback and delivered it in a
microtask immediately after native font focus. All original interactions and
assertions were untouched. **Exact original RED**, line 432:
`[120,120] !== [8,8]`, with the same assertion message. Relevant milliseconds
from that browser's performance clock:

| Time | Event / observed state |
| --- | --- |
| 2045.6 | Real mobile notification queued; Properties still open; canonical `[120,120]` |
| 2073.8 | Range `[5,7)` publishes value 120; canvas object identity remains stable |
| 2095.2 | Native font focus; input `"120"` |
| 2096.5–2096.8 | Deliver actual resizePanels callback (`matches=false`); Properties closes |
| 2102.7–2103.0 | Native blur to BODY; flush draft `"120"`, changed=false, focused=false |
| Afterwards | No font native input/onChange `8`; canonical `[120,120]`; original Tab assertion fails |

This establishes a **harness responsive ordering defect matching the reported
failure**, not proof of the uncontrolled Ubuntu event order. There is no evidence
here for changing dirty draft refs, font bounds, canvas source identity or
product lifecycle. The unmodified Linux failure itself remains independently
unobserved.

* `openMobileProperties` now waits for `.presentation-properties.open===false`
  after desktop→320px resize, then uses the existing normal summary click.
  Observable state synchronization only: no sleep, retry, forced click, Enter,
  synthetic blur, generic Tab handler or canonical/expected-value adjustment.
* Original range, denied actions, width/move saves, paragraph preservation,
  pre-Tab 120, post-Tab 8, native pointer spinner 9/Tab, ArrowDown 8/Tab,
  version-3 saved sizes and geometry/height assertions remain intact.
  Added native activeElement and typed `"8"` assertions strengthen diagnostics.
* New regression holds the actual matchMedia listener notification. An ordered
  browser round trip proves the helper cannot finish while stale desktop-open
  state remains. The test explicitly delivers the callback, reopens normally,
  types `8`, verifies canonical 120 before real Tab and 8 afterward, and verifies
  the surrounding 24-point runs. No React/native focus/input/blur is mocked.
  It failed with the old one-shot helper, then passed immediately with the wait.
* Prior untouched-focused Tab/Save regressions and FontSizeInput product repair
  are preserved. No TS, browser harness, CSS, model, config, action, dependency
  or migration changes.

### Commands and actual results

All Node invocations below used the existing OS-only/network-denying runner;
no environment file/loader, remote operation, nested agent, install or server.
Repository `.github/skills/forge-{delivery,verification}/SKILL.md` were loaded
because the requested sibling skills do not exist. Initial `git` PATH lookup
failed (exit 1); found and used existing GitHub Desktop Git, without setup.
Local runtime probe: Windows `win32`, Node `v25.2.1`. `wsl --list --quiet`
returned no distributions; no Docker command exists. No Linux setup attempted.

```powershell
# Original unchanged baseline: 1/1, exit 0, 5096.1502ms.
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern="QA: noninitial" tests\presentation-font-layout.test.mjs

# Two transient stdin diagnostic invocations with this exact Node argv:
# (1) original flow trace: 1/1, exit 0, 3215.0785ms;
# (2) delayed actual callback at native focus: 0/1, exit 1, 3019.5451ms,
#     exact original line-432 blur/8 failure above.
# Payloads patched only imported in-memory transpiled sources, attached console
# tracing and imported the original test; no diagnostic source file retained.
node tests\offline-run.mjs --experimental-strip-types --test-name-pattern="QA: noninitial" --input-type=module -

# Permanent ordering regression, old one-shot helper:
# 0/1, exit 1, 3108.9698ms; "an old desktop-open panel is not mobile readiness".
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern="mobile properties waits" tests\presentation-font-layout.test.mjs

# Immediate GREEN after adding observable wait: 4/4, exit 0, 10055.3947ms.
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern="QA: noninitial|mobile properties waits|untouched focused" tests\presentation-font-layout.test.mjs

# After adding native focus/typed-draft assertions: 2/2, exit 0, 6311.6582ms.
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern="QA: noninitial|mobile properties waits" tests\presentation-font-layout.test.mjs

# FINAL grouped check: 16/16, exit 0, 65460.5063ms.
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests\presentation-font-layout.test.mjs tests\presentation-ui.test.mjs

# Both exit 0, no diagnostics. Components unchanged, checked as controlling code.
node tests\offline-run.mjs node_modules\eslint\bin\eslint.js src\components\presentation-editor.tsx src\components\presentation-canvas.tsx
node tests\offline-run.mjs node_modules\typescript\bin\tsc --noEmit --incremental false
```

All test runs had zero skips/cancellations. Scoped `git --no-pager diff --check`
passed for all six owned paths. Browser contexts/browsers and PGlite use existing
`finally` cleanup, including failed diagnostic/regression runs. The new gate is
released and its opening promise awaited in `finally`; context disposal removes
the test-only matchMedia wrapper. Transient tool trace file removed; stdin
instrumentation left no source files or helper processes. Existing tests retain
only synthetic screenshots in OS Temp; no new visual acceptance is claimed.
Final grouped screenshot roots include `forge-font-layout-y8Bqm1`,
`forge-font-errors-IIbMM1`, `forge-font-qa-9Kgsjx`, `forge-presentation-P3vuUY`.

**Handoff / limitation:** run the original narrow command and grouped pair
independently on Ubuntu/Node 24. A matching deterministic event-order failure
and green bounded repair are implementation evidence, **not CI/release
certification**. No full suite/build, connected tests, deployment or remote
operation. Historical entries below are preserved, not reclassified as Linux
passes.

## 5 November 2026 — CI font-range investigation: confirmed stale-draft product repair

**Owner: implementer; coordinator owns traceability/acceptance. Independent Linux QA requested.**
Initial Git status and owned-file diffs were clean. Loaded repository
`.github/skills/forge-{delivery,verification}/SKILL.md` because sibling skills
were absent. No environment files were opened; all Node checks used the existing
OS-only/network-denying runner. No nested agents or remote operations.

### Diagnosis and bounded change

The original reported Linux failure did **not** reproduce unchanged on Windows:
four narrow runs passed, as did the original grouped 13-test suite. In-memory
font-flush/redraw tracing and one 6× browser CPU-throttled narrow run also passed.
Those traces do not establish the exact Linux interleaving or implicate
`drawSlide`/source identity as the corrupting writer.

Falsifiable hypothesis before the repair: publishing a new range while the font
field retains focus leaves its untouched draft stale; subsequent blur or Save
applies that old size. Deterministic regressions confirmed this independently
for Tab and Save: **[120,120] became [24,24] without any field edit**.
`FontSizeInput` suppressed all focused style synchronization and its `flush`
only exempted an untouched *empty mixed* field, not untouched numeric fields.
Thus this is a demonstrated **product lifecycle defect**, not evidence that
the expected 120 or user interactions should be weakened or retried.

* `src/components/presentation-editor.tsx`: pristine drafts follow style
  publication even while focused; `flush` formats only a user-edited draft.
  Existing dirty-input, validation, Enter/blur and native spinner behavior stays.
* `tests/presentation-font-layout.test.mjs`: two deterministic tests publish a
  120-point CJK range while an untouched 24-point input retains native focus.
  An observable Font select value confirms publication before real Tab/Save.
  They verify canonical sizes and saved paragraphs. Additional dirty-8 coverage
  verifies style republication cannot snap back typing or commit before Tab.
  Original QA assertions/typing/spinner interactions are preserved; an added
  second-save assertion checks all character styles against the first save.
* Only these two files and README/tracker changed. Canvas, browser harness,
  adapter, actions/models/export, CSS, configuration and dependencies did not.

### Commands and actual evidence

From repository cwd; every test had zero skips/cancellations:

```powershell
# Before product edits: 1/1, exit 0, 6624.7177ms; three further bounded
# unchanged runs also 1/1, exit 0. In-memory diagnostics: 1/1 each,
# including CPU throttling; no diagnostic source files retained.
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern="QA: noninitial" tests\presentation-font-layout.test.mjs

# Deterministic RED: first single regression 0/1, exit 1, 3594.0048ms.
# Split into independent Tab/Save cases: 0/2, exit 1, 6291.5589ms.
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern="untouched focused" tests\presentation-font-layout.test.mjs

# Immediate GREEN after repair: 3/3, exit 0, 8178.6715ms.
# After strengthening saved-style/dirty-typing coverage: 3/3,
# exit 0, 7942.7487ms.
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern="QA: noninitial|untouched focused" tests\presentation-font-layout.test.mjs

# Unchanged baseline: 13/13, exit 0, 59305.882ms.
# FINAL: 15/15, exit 0, 57705.4806ms.
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests\presentation-font-layout.test.mjs tests\presentation-ui.test.mjs

# Both exit 0, no diagnostics:
node tests\offline-run.mjs node_modules\eslint\bin\eslint.js src\components\presentation-canvas.tsx src\components\presentation-editor.tsx
node tests\offline-run.mjs node_modules\typescript\bin\tsc --noEmit --incremental false
```

Scoped `git --no-pager diff --check` passed for all six authorized source/test/doc
paths. Browser contexts/browsers and PGlite close in existing `finally` blocks;
in-memory diagnostic runs used the same fixture cleanup. No server/helper
remains. Existing tests retained synthetic screenshots under OS Temp; no new
visual acceptance is claimed for this nonvisual change.

**Remaining limit / QA handoff:** no Linux runtime was available here, so the
exact original GitHub Actions scheduling remains unverified. Run the original
narrow command and grouped pair independently on Linux; distinguish this
confirmed stale-draft writer from any further race if failure persists.
No full npm suite, build, connected tests, installs, schema work or deployment.
Existing PowerPoint/empty-paragraph limitations remain. This is implementation
evidence, **not release approval**; historical reports below are unchanged.

## 5 November 2026 — surgical denied Save/Export range repair (implementation)

**Owner: implementer; independent narrow QA requested, coordinator owns acceptance.**
Scope was only the retained selection/editing defect following the font fix.
No nested agents or release certification.

### Cause, repair and owned inventory

Falsifiable hypothesis before editing: the disabled effect calls Fabric
`exitEditing()`, whose implementation assigns `selectionEnd=selectionStart`.
The original retained probe reproduced Save and Export **[5,7), editing:true →
[5,5), editing:false**; preview retained the range.

* `src/components/presentation-canvas.tsx`: suspend Fabric's native textarea
  with `disabled` during the existing action lock instead of exiting editing.
  The actual editing session, styles, range or collapsed caret remain intact.
  Pointer/target/group-selection locks remain; unlocking never calls focus.
  Unknown-save locks keep the textarea disabled indefinitely. No new async
  recovery callback or stale/unmount path was introduced.
* `src/components/presentation-editor.tsx`: clear the quiet canvas-error marker
  when Save/Export starts. Otherwise their preflight flush can mark the same
  eventual validation error quiet and suppress accessible notice focus.
  Save/version/private/unknown-outcome handling and live guards are unchanged.
* `tests/presentation-font-layout.test.mjs`: append two focused tests only.
  The original file through its final assertion is byte-identical:
  SHA256 `3C07AD2E3044249514A136511051A0A345822654565A59E66A3AA3C5D6EA1501`.
  The first new test gates real validation for both actions, attempts native
  input while disabled, verifies notice focus/range/editing and identical
  rendered text, then changes only the original range to 18 without reselection.
  Full runs/fonts/marks, undo/redo and saved paragraphs agree; other characters
  remain unchanged. The second gates synthetic action responses and checks
  actual text/styles/transforms during pending, collapsed caret, multiselect
  and persistent unknown-outcome locking.
* `README.md`, `IMPLEMENTATION_TRACKER.md`: current implementation evidence;
  historical implementation/QA entries are preserved.

No model, export, layout, dependencies, schema, action, migration or tagged
`*_ran` file changed. All pre-existing dirty files were preserved, including
the library/font/UI work. Before/after protected inventory: **201 files** in
src/tests/supabase/scripts/.github and root source/config/docs, excluding the
five owned files; aggregate SHA256
`62FDF89A43C3C7C5F9681762413A46BBC56B3DF5B3C1EF4129C33948324340DB`.

### Commands and actual results

All Node invocations used the existing OS-only/network-denying runner from
repository cwd. The sibling skills were absent; loaded repository
`.github/skills/forge-{delivery,verification}/SKILL.md`. Before tests, a stdin
assertion probe verified the OS-only child environment and synchronous denial
of fetch/HTTP/HTTPS/net/TLS/Socket.connect. Its first command had PowerShell
quoting errors; the second needed Windows-injected `LOGONSERVER` added to the
OS identity allowlist; the corrected probe passed. No config values printed.

```powershell
# RED before editing: 0 pass / 1 fail, exit 1, 4716.8458ms.
# GREEN immediately after canvas repair: 1/1, exit 0, 4923.0378ms.
# Retained assertions unchanged.
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern="QA: noninitial" tests\presentation-font-layout.test.mjs

# New probes initially 0/2, exit 1, 5534.6796ms:
# one fixture adapter-input error; one real quiet-error focus interaction.
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern="temporary validation|pending requests lock" tests\presentation-font-layout.test.mjs

# After fixture correction + quiet-marker coordination: 3/3,
# exit 0, 10480.982ms.
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern="QA: noninitial|temporary validation|pending requests lock" tests\presentation-font-layout.test.mjs

# First grouped pass: 13/13, exit 0, 55405.0946ms.
# Added rendered-pixel equality to the new range test only.
# Immediate focused check: 1/1, exit 0, 5546.3239ms.
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern="temporary validation" tests\presentation-font-layout.test.mjs

# FINAL grouped check: 13/13, exit 0, 59846.918ms.
# Original 11 plus two new tests; no failures/skips/cancellations.
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests\presentation-font-layout.test.mjs tests\presentation-ui.test.mjs

# Both exit 0; no warnings/diagnostics.
node tests\offline-run.mjs node_modules\eslint\bin\eslint.js src\components\presentation-canvas.tsx src\components\presentation-editor.tsx
node tests\offline-run.mjs node_modules\typescript\bin\tsc --noEmit --incremental false
```

Final original QA output for Save, Export and preview was exactly
`{start:5,end:7,editing:true,text:"Lead 中文 tail",sizes:[120,120]}`.
No denied-action writes/downloads/dialogs. Existing grouped checks still cover
24→48→12, CJK/Mixed/empty text, reserved height, real negative bounds,
scale-once geometry, real save/PGlite reopen, native OOXML, IME, guarded saves,
foreign-owner denial and unknown acknowledgement. These are bounded regression
results, not a renewed broad permissions/release audit.

### Visual evidence, safety, cleanup and remaining limits

Opened grouped-run `forge-font-qa-7tOXNZ\denied-range.png` and
`recovered-mobile-size8.png`, plus `forge-font-layout-G9PVwe\after.png`, under
`C:\Users\SOLUSER\AppData\Local\Temp\`. Full-page canvas captures were inconsistent,
so were not used to certify text rendering. Additional stdin-only offline
diagnostic probes compared object geometry and pixels across denial; the first
two used PowerShell-lossy literal CJK, then the encoding-safe `\u4e2d\u6587`
fixture confirmed unchanged coordinates/pixels. A final assertion probe
verified identical lower-canvas PNGs after both actions, exit 0, and captured
the settled viewport. Actually opened:
`C:\Users\SOLUSER\AppData\Local\Temp\forge-selection-lock-ftGW8E\denied-export-viewport.png`.
Text/range, overflow notice and size control are visible there. Pixel equality
is also persisted in the new regression. Screenshot scheduling was not redesigned.

All fixtures were synthetic. Chromium contexts were offline, service workers
blocked, unexpected routes aborted; harness HTML/image routes were in-memory.
PGlite was disposable memory only; existing tests closed it in `finally`.
Browsers/contexts and gated promises were released in `finally`; process check
found **0 Playwright Chromium processes**. No helper/service remains; synthetic
screenshots retained. Owned-file `git diff --check` passed.

No environment files/setup loader, server, remote Supabase/storage/provider,
connected tests, installs, external migration operation, commit, full suite,
Next build/typegen or deployment. Direct TypeScript was run as listed above.
Native desktop PowerPoint/font substitution and empty-paragraph caret formatting
remain unverified prior limitations. No implementation blocker remains for this
bounded repair; independent QA should rerun the retained failed-range probe and
font file. This entry is implementation evidence, **not independent acceptance**.

## 5 November 2026 — independent bounded font/height acceptance: selection defect open

**QA only; coordinator owns acceptance.** Independently verified the original
24→48 input and fitting-stale-height fixes against current sources. The
unchanged requested pair passed **9/9**. Added only two essential focused probes;
final same-pair invocation is **10 passed / 1 failed, 11 distinct tests**, no
skips/cancellations. **Not unconditional acceptance or global release approval.**
Implementer evidence below remains historical, not independent QA evidence.

### Safety and ownership

Requested sibling skills were absent; loaded repository
`.github/skills/forge-{delivery,security,verification}/SKILL.md`. Read current
README/tracker, package, both requested tests, browser/authoring harnesses and
offline runner/preload before execution. Existing Node v25.2.1, Chromium,
Fabric and disposable in-memory PGlite only. No nested agents, environment-file
reads, setup loader, server, remote service, connected e2e/instructor tests,
dependency installation, migration operation, build/types/full suite, commit
or deployment.

Before application tests, a stdin assertion probe through
`node tests\offline-run.mjs --input-type=module -` verified the OS-only child
environment and synchronous pre-I/O denial of fetch, HTTP, HTTPS, net, TLS and
Socket.connect. Its first attempt rejected five Windows-injected OS identity
keys; the corrected allowlist passed, exit 0. No application configuration
values were printed. Browser contexts were offline, service workers blocked,
unexpected routes aborted; `https://forge.test/` and synthetic image routes were
fulfilled in memory. PGlite schema/SQL execution was confined to its disposable
memory database; nothing was applied to an external database.

### Commands and exact accounting

All commands below ran from repository cwd through the existing network-denying
runner. No full suite, build, typecheck or lint was added to this bounded retest.

```powershell
# Before QA additions: 9/9 passed, exit 0, 43018.1429ms.
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests\presentation-font-layout.test.mjs tests\presentation-ui.test.mjs

# Two added probes: 1 pass / 1 fail, exit 1, 10968.7966ms.
# After deferring the SAME selection assertion until recovery checks finish:
# 1 pass / 1 fail, exit 1, 11245.9543ms.
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern="QA:" tests\presentation-font-layout.test.mjs

# Pointer-spinner addition initially hit CSS padding, not the native arrow:
# 0 pass / 1 fail, exit 1, 4824.7034ms (test-coordinate error).
# Corrected hit target subtracts computed paddingRight, without changing bounds
# or assertions: spinner/recovery pass; retained selection assertion fails.
# 0 pass / 1 fail, exit 1, 4648.0911ms.
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern="QA: noninitial" tests\presentation-font-layout.test.mjs

# FINAL current QA source: 10 pass / 1 fail, exit 1, 53614.7051ms.
# Original six font tests, three UI tests and new stale-PGlite test all pass.
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests\presentation-font-layout.test.mjs tests\presentation-ui.test.mjs
```

Iterations are not additional distinct passes. The failing test deliberately
executes and asserts denial/recovery/minimum/spinner checks before its final
unchanged selection equality assertion, so that one defect does not hide them.

### Independently verified passes

* Trusted keyboard clear/sequential **24→48→12**, Enter, ArrowUp→13/blur;
  actual Fabric sizes, saved payload, real learning action/PGlite readback,
  reopen and native `sz="1300"` agree. Invalid blank/7/121 retain drafts,
  leave actual size unchanged and prevent writes.
* Noninitial CJK range **[5,7)** 18→48, Mixed object value, unselected runs,
  Arial/Times New Roman/Courier New, marks, empty paragraph and original
  newlines survive. Undo/redo restores size **and height**. Empty text retains
  saved 42/Courier New without invented text; native empty shape/size checked.
* Fitting stale height draws an actual Fabric textbox. Added real-action
  save/PGlite reopen/native OOXML fixture: text length 64, font **24**,
  width **210**, required height **121.49759999999996**, saved height **121.50**,
  rotation **7°**, position **(80,70)**. Reopened Fabric equals pre-save fitted
  geometry/content. Native 24pt runs, 420000 rotation, translated origin,
  EMU width/height and complete concatenated text agree; no picture fallback.
  Foreign-owner direct `updateLesson` returns **You cannot edit this lesson.**,
  with no write and unchanged database content.
* Canonical-width ±.01 wrap threshold yields **2 vs 1 lines**; required height
  is contained after rounding. Native editable soft breaks equal browser wraps.
  Fractional resize bakes scale once, then font 48 is actually 48; two saves
  have identical payloads. Width/rotation and larger reserved height survive;
  only required growth increases height.
* Real bottom and rotated overflow denied. New range-120 case produced **zero
  writes/downloads/dialogs** during denial; text and 120pt styles survive.
  Size reduction recovers in the original regression. Independently, widening
  **150→800** at y=370 recovers/save; narrowing recreates overflow and moving
  **y=370→70** recovers/save. At 320px, sequential typed **8** confirms by Tab
  blur only; actual range sizes are 8. Trusted pointer click on the native
  spinner gives **9**, ArrowDown/blur returns 8. Saved selected range is 8,
  surrounding runs remain 24, reserved height **373.18** remains intact.
* Existing related UI tests pass: IME, history, guarded/deduplicated saves,
  unknown acknowledgement lock, native PPTX, synthetic image failure/recovery,
  retained drafts and 320px keyboard workflow. This is not a fresh broad
  permissions or responsive-polish audit.

### Reproducible product defect — coordinator/implementer follow-up

**Open: denied Save/export collapses a character range.** Fixture: `"Lead 中文
tail"`, font 24, x=60, y=370, w=150, initial h=1 (fitted in memory). Enter
Fabric editing, select characters **[5,7)**, confirm size 120 to produce genuine
overflow, then click Save or Export editable PPTX.

Expected: no write/export and the same `[5,7)` editing selection available for
range-only correction. Actual for **both** actions:
`{start:5,end:5,editing:false,text:"Lead 中文 tail",sizes:[120,120]}`.
Fullscreen preview denial instead retains `{start:5,end:7,editing:true}`.
Repeated independently in the narrow probes and final grouped invocation.

Cause localized to `src/components/presentation-canvas.tsx:142–149`, especially
**line 145**, which calls `exitEditing()` under the disabled/action lock.
Save sets pending at `presentation-editor.tsx:225`; export sets uploading at
line 252. Object selection survives, but **character-range** selection does
not. Text is not lost and no forbidden write/export occurs; the user must
reselect before range-only correction. Otherwise formatting uses the
whole-textbox branch at `presentation-canvas.tsx:100–102` (source-derived impact).

Retained failing regression:
`tests/presentation-font-layout.test.mjs:382`, final equality at line 453.
No product repair attempted. Coordinator/implementer must decide/resolve this
acceptance gap; the original visible fontsize/stale-height fix itself passes.

### Opened evidence, preservation and cleanup

Actually opened these fresh final-run files (synthetic fixtures only):

* `C:\Users\SOLUSER\AppData\Local\Temp\forge-font-layout-hIPj9A\before.png`
* `C:\Users\SOLUSER\AppData\Local\Temp\forge-font-layout-hIPj9A\after.png`
* `C:\Users\SOLUSER\AppData\Local\Temp\forge-font-errors-yIyN42\overflow.png`
* `C:\Users\SOLUSER\AppData\Local\Temp\forge-font-qa-EFDFzk\recovered-mobile-size8.png`

These show 24 before/13 after saved export, the genuine clipped-bottom error,
and visible unobscured mobile size-8 control/native arrows. Also opened baseline
`forge-font-layout-VGr5oE\{before,after}.png`,
`forge-font-errors-6dCbdg\{invalid-size,overflow}.png`,
`forge-presentation-9tfL4T\editor320.png` and intermediate
`forge-font-qa-cnuAj3\{denied-range,recovered-mobile-size8}.png` under the same
Temp root. Other generated files are not claimed visually inspected.

Initial working tree already contained four modified product files and the
modified UI test, plus README/tracker and the untracked font test. QA changed **only**
`tests/presentation-font-layout.test.mjs` (two appended tests), README and this
tracker. All **191 other protected files** under src/tests/supabase plus seven
root manifests/config/type files have identical before/after SHA-256 inventory:
`851df1368a3c6240e076a8cf0b7c5d83a94b5ad31d1f3c2dc41b88709e552132`.
Inventory is sorted relative slash paths, then SHA256 of each
`path + NUL + SHA256(contents) + LF`. Original six-test prefix is unchanged
modulo LF normalization: restoring CRLF gives original SHA-256
`0c9fca3405deb17d83d6f632eb66153a1779e5164a886499176a3c468e5fed3f`.
Final font test SHA-256:
`3c07ad2e3044249514a136511051a0a345822654565a59e66a3aa3c5d6ea1501`.
Existing UI test, product/config/schema and historical `*_ran` files preserved.
Scoped Git whitespace check passed; no full source diff/reread was performed.

All test/browser contexts and browsers closed; PGlite closed in finally,
including failed assertions. All QA command sessions completed; no server or
helper remains. Synthetic screenshots retained as evidence; no remote fixture
or storage cleanup was needed, and no cleanup failure was reported.

**Not verified:** full native PowerPoint desktop fidelity/font substitution,
post-edit native reflow, PptxGenJS empty-paragraph caret font family, actual
mobile hardware/IME, remote database RLS/storage/provider behavior, other
permissions or global release requirements. No content was added to conceal
empty-text export limitations. Screenshot evidence is not a native-PPTX proxy.

## 5 November 2026 — bounded presentation font/height functional fix (QA requested)

**Ownership:** implementation only; ParentCoordinator retains planning and
acceptance. No nested agents or release certification. Initial Git working tree
was clean; prior polished sources preserved. Sibling skills were absent; loaded
repository `.github/skills/forge-{delivery,verification,security}/SKILL.md`,
README/tracker, package, controlling editor/canvas/model/adapter/export/view and
the current browser/authoring/offline harnesses before edits.

### Reproduction, causes and chosen contract

Added `tests/presentation-font-layout.test.mjs` and ran it against unchanged
product sources through the OS-only network-denying runner. **0/2 passed**:

* Actual keyboard clear + sequential `48` left `24`, not `48`. The controlled
  field discarded blank/first-digit states, then rebound to the first run.
* A textbox containing `"Wrapped 中文 text ".repeat(9)`, width 210, height 1,
  at (60,70), rendered **0 objects**, although its measured text fits the slide.
  Fabric ignored canonical `h` and measured intrinsic text height, while draw
  and save/export rejected the stale stored height outright. Plain replacement
  and numeric width edits did not update that height.

The falsifiable hypothesis was that input draft rejection and stale layout,
not containment of the textbox rectangle alone, caused the report. Fresh
Fabric measurements also demonstrate **real** bottom/rotated overflow, so those
cases are not treated as false positives.

**Height policy:** canonical `h` is a minimum reserved height. The one Fabric
textbox factory measures the required height at the canonical width; fitting
edits grow `h` with ceiling-to-two-decimals, preserve larger reserved space,
and show that space in the canvas outline. Font shrinking does not implicitly
discard it. Explicit Height may shrink spare space, but not below required
text. Font/text/width edits commit height with content in the same history
change. Legacy fitting stale heights recover in memory and remain unsaved until
explicit save. Required geometry that cannot fit, including rotated corners,
keeps text/style input editable with an error; save/export/preview are blocked.
No font reduction, dropped text, invisible-character or raster fallback.

Capture measures **after** rounding width, bakes transforms back to scale 1, and
reconstructs from that same width/font size. Repeated capture/save no longer
multiplies the reserved height or leaves a scale that multiplies the next font
edit. Empty paragraphs use their object/paragraph style rather than default 28.
Canvas capture uses schema-normalized data to avoid key-order-only dirty saves.
Rejected transform restoration now handles promise rejection explicitly.

Font size has a local string draft, Enter/blur confirmation, native number-key
stepping and explicit 8–120 validation without focus stealing. Invalid drafts
also block save/export/preview. Selection font/size are read from Fabric;
nonuniform selections report Mixed. Formatting stays grapheme/range-specific.
Save/export/preview flush the canvas first. Save/export lock no longer discards
the selection, so a failed action can be corrected immediately.

Native PPTX uses the validated fitting geometry and the **same Fabric visual
lines**, exported as editable soft breaks with line-height 1.16 and automatic
native rewrapping disabled. Original paragraph breaks remain paragraphs.
This intentionally preserves current browser wrapping, not automatic reflow
after later edits in desktop PowerPoint.

### Exact changed files

* `src/lib/presentation-fabric.ts` — shared measurement/minimum-height policy,
  recoverable draw, capture/scale/roundtrip and empty styles, export visual lines.
* `src/components/presentation-canvas.tsx` — measured commits, selection style,
  restore rejection handling, retained selection under action locks.
* `src/components/presentation-editor.tsx` — editable font-size draft/Mixed/error
  control, inspector measurement, action flush/validation and normalized save.
* `src/lib/presentation-export.ts` — normalized geometry and editable measured wraps.
* `tests/presentation-font-layout.test.mjs` — six focused real-browser regressions.
* `tests/presentation-ui.test.mjs` — replace the old `h=1`-alone rejection with a
  **real required-text bottom overflow** (`y=535,h=1,rotation=0`). Fitting stale
  `h=1` recovery has separate new coverage; missing-image failure still passes.
* `README.md`, `IMPLEMENTATION_TRACKER.md` — current behavior/evidence only.

No model schema, global layout/CSS, upload, actions, authorization, AI, assets,
dependency/configuration or historical `*_ran` file changed.

### Commands, results and iterations

All commands ran from repository cwd; existing Node/Chromium/PGlite only.

```powershell
# Initial reproduction: 0/2 passed, 2 expected failures, exit 1, 14056.688ms.
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests\presentation-font-layout.test.mjs

# Grouped current-source related checks: 18/19 passed, exit 1, 228364.4184ms.
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests\presentation-font-layout.test.mjs tests\presentation-ui.test.mjs tests\presentation-layout.test.mjs tests\presentation-model.test.mjs tests\presentation-upload.test.mjs tests\presentation-workspace-qa.test.mjs tests\presentation-compatibility.test.mjs

# Final six focused regressions: 6/6 passed, no skips/cancellations, exit 0.
# 135349.9785ms; same product source as grouped run.
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests\presentation-font-layout.test.mjs

# Direct TypeScript and scoped ESLint: passed, exit 0.
node tests\offline-run.mjs node_modules\typescript\bin\tsc --noEmit --incremental false
node tests\offline-run.mjs node_modules\eslint\bin\eslint.js src\components\presentation-editor.tsx src\components\presentation-canvas.tsx src\lib\presentation-fabric.ts src\lib\presentation-export.ts tests\presentation-font-layout.test.mjs tests\presentation-ui.test.mjs
```

**Result accounting:** all **13 existing related tests passed** in the grouped
run. Its one failure was an additional new assertion that an entirely empty
native textbox would contain a Courier New run. Inspection showed PptxGenJS
emits only `endParaRPr sz="4200"`, not a run/family, for empty text. The focused
test now verifies the retained saved family/size and native empty shape/size
with **no invented text**; this library limitation is explicitly retained below,
not represented as repaired. Final **6/6 new tests pass**; no product source
changed after the grouped run. These are 19 distinct checked tests, not a claimed
single 19/19 final invocation.

Other intermediate checks caught and fixed: TypeScript optional selection size;
lint ref writes during render; error text accidentally changing the field's
accessible name; action locks clearing selection; key-order-only dirty state;
and repeated transform capture. A separate native-wrap red check showed **0
soft breaks vs 4 required** before export was fixed. One fractional-coordinate
fixture used a binary `.005` tie and was changed to an unambiguous `.006`;
rounding behavior was not loosened.

Measured coverage includes sequential **24→48→12**, ArrowUp→13/blur, invalid
blank/7/121 retention with no writes, noninitial CJK range 18→48 preserving
unselected Arial/Times/Courier/marks/newlines, Mixed state, empty object 42,
reserved Height/movement, plain replacement/width recovery, fitting stale vs
real bottom/rotated overflow, exact width boundary (2 lines vs 1), fractional
uniform resize, repeated capture/save and font+height undo/redo. Actual Fabric
sizes/heights are asserted. Real learning actions save into disposable PGlite;
readback/reload retains size 13 and text. Downloaded native OOXML proves 13/48
point runs, CJK/styles, canonical EMU geometry, three original paragraphs
including the blank one, measured soft breaks and line-height percentage.
Missing image still blocks native export. Existing dialogs/320px keyboard,
responsive widths, upload placement/disclosure and scope isolation passed.

### Safety, screenshots, cleanup and remaining limits

A stdin-only probe through `tests/offline-run.mjs` confirmed application
configuration absent and fetch/socket/HTTP/HTTPS denied synchronously before
I/O. Browser contexts used offline mode, blocked service workers and aborted
unexpected requests; all final error/request assertions were empty. Synthetic
page content was fulfilled in memory, not served by a dev server.

Actually opened final `before.png` / `after.png` in
`C:\Users\SOLUSER\AppData\Local\Temp\forge-font-layout-DFoeUs\` and
`invalid-size.png` / `overflow.png` in
`C:\Users\SOLUSER\AppData\Local\Temp\forge-font-errors-RZXvRo\`.
Size 13/selection and saved state are visible; invalid 121 and the genuine
overflow error do not overlap the properties. Also opened the original red
before screenshot. Browser contexts/browsers and PGlite close in `finally`;
synthetic screenshots are retained for independent QA. No helper/server remains.
Whitespace diff check passed using the installed Visual Studio Git binary.

**Independent QA requested, not release approval.** No environment/secrets,
remote DB/storage/provider/quota, connected e2e/instructor suite, server startup,
install, migration, full suite/build, deployment or commit was used. Native
PowerPoint/font substitution and subsequent desktop text reflow are unverified.
PptxGenJS does not fully represent **empty-paragraph caret formatting** in native
OOXML; saved editor styles remain intact, and no content is inserted to fake it.
Coordinator should assess that known export boundary separately from the fixed
font input/stale-height failure.

## 5 November 2026 — independent narrow upload-placement retest (passed)

**Scope/ownership:** one fresh bounded post-fix QA, no nested agents, product
edits or broader review. Coordinator retains final acceptance ownership.
Independently reran only the requested workspace/upload test files together;
the implementer's 11-test/lint/types claims were not rerun or adopted here.
**4 distinct tests passed, zero failed/skipped/cancelled. Bounded upload UI
acceptance clear; no current product defect reproduced. Not release approval.**

### Safety, preservation and fixtures

Requested sibling skills were absent; loaded repository
`.github/skills/forge-{delivery,security,verification}/SKILL.md`. Read latest
README/tracker, package, both scoped tests, offline runner/network preload and
their shared browser/authoring harnesses. Inspected only upload focus/disclosure
source lines needed to assess that acceptance gap.

Recorded initial Git status (11 modified tracked files and three untracked test
files); preserved all existing dirty work. Git was not on PATH, so used the
existing explicit Git executable below. No environment/secret file was opened.
Before execution, a stdin probe through `tests/offline-run.mjs` confirmed an
OS-only environment and synchronous denial of fetch, socket, HTTP and HTTPS
before I/O. Two initial **probe-only** failures were corrected without changing
the runner: Windows injects six additional OS identity keys, and denied fetch
throws synchronously rather than returning a rejected promise. Final probe
passed, exit 0; these are not application-test failures.

Browser contexts used `offline:true`, `serviceWorkers:"block"` and aborting
unexpected routes; the synthetic `https://forge.test/` page was fulfilled in
memory. Original uploader/editor/Fabric/CSS ran in the existing portal harness
with Tailwind preflight and reserved 242px sidebar/66px topbar. Extraction and
save transport were synthetic. No PGlite instance was needed or created.

SHA-256 inventory before/after execution: **191 identical protected files**
under `src`, `tests`, `supabase`, plus seven root manifest/config/type files.
Inventory
uses sorted slash-normalized relative paths and, for each file,
`path + NUL + SHA256(contents) + LF`, then SHA256 of the concatenation:
`014f88cf767ab26cc0f2081b18ac5dcfd1451c2137ff3cbffdfb09f6c2ed101b`.
Specific preserved fingerprints:

* `tests/presentation-workspace-qa.test.mjs`:
  `D5B149498DD2C31CEC47081D357F810B6831EC69B4D2A707B552062768E37A30`
* `tests/presentation-upload.test.mjs`:
  `A75BD39EE68D9DF4DDD2630FA2610546000E5A07B5F5204A04651D0AD9B14CFB`
* `supabase/migrations/20261105140000_presentations_ran.sql`:
  `9860874031055A45F99B7316AAD1EEE38B60EE9DF2B80D6CB1DF119B2B236B08`

No selector, bound, measurement, skip or assertion was changed. No new test file
was necessary. Only this tracker and README were edited by this QA.

### Exact execution and independent results

Repository cwd, existing Node on PATH:

```powershell
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests\presentation-workspace-qa.test.mjs tests\presentation-upload.test.mjs
# 4/4 passed; fail/skipped/cancelled/todo 0; exit 0; 27230.6723ms.
```

The two workspace tests passed unchanged, including the formerly failing
initial-upload primary-action assertion and foreign/missing edit-route denials.
The two new upload tests passed: initial layout/action hit tests and disclosure/
failure recovery/retention/lock behavior. All asserted browser errors and
unexpected requests were empty.

CSS pixels; initial geometry measured with **scrollY=0**, not after scrolling:

| Upload viewport | Editor width; bottom | Canvas width×height; y–bottom | Add slide y–bottom | Page horizontal overflow |
| --- | --- | --- | --- | --- |
| 1366×768 | 1092; 766 | 549.328125×309; 355.25–664.25 | 332–368 | No |
| 1440×900 | 1166; 898 | 712×400.5; 375.5–776 | 332–368 | No |
| 1910×1080 | 1636; 1078 | 1104×621; 355.25–976.25 | 332–368 | No |
| 1920×1080 | 1646; 1078 | 1104×621; 355.25–976.25 | 332–368 | No |
| 320×900 | 300; 1021.625 | 266×149.625; 659.5–809.125 | 562–602 after keyboard opening Slides | No |

Historical independent 1366 failure (not rerun against old source in this task):
Add slide y=756.59375–792.59375; canvas y=779.84375–1088.84375.
Now Add slide y=332–368 and canvas y=355.25–664.25, fully initially visible.
Desktop Save/Save and publish, Undo/Redo, Add text/Add slide, preview/export,
settings/Quiz/Help and Change file passed viewport bounds and center hit tests.
All measured canvases passed 16:9 tolerance. At 320, collapsed and expanded
importer fit; focused/scrolled controls remained reachable without horizontal
overflow, not a requirement to show every panel at once.

Meaningful retention/failure guards passed: opening/closing preserves edited
title and serialized canvas objects without extra extraction or save; file/mode
are retained. Actual mode/file changes invalidate the old preview. Returned
extraction error and thrown transport error keep the file and permit retry.
Duplicate same-tick submissions produce one extraction; a late input event
invalidates the pending epoch and its resolved result cannot resurrect a preview.
Pending save disables Change file/File and rejects a forged hidden-form submit
without another extraction. Unknown outcome retains edited title and leaves
Change file/Save disabled, with exactly one persist invocation.

**Additional narrow keyboard evidence, not extra node:test counts:** ran a
stdin-only ESM probe, invocation
`node tests\offline-run.mjs --input-type=module -` (PowerShell single-quoted
here-string piped to stdin), exit 0, **two viewport workflows passed**.
Reused the same `mountPresentation`/module mappings and synthetic extraction;
no files or harness changes. This closes a specific gap: the existing mobile
test explicitly focuses File, rather than asserting natural Tab traversal.
Repro at 1366×768 and 320×900: preview `keyboard.pptx`; assert automatic Lesson
title focus; edit title; Shift+Tab reaches Change file; Enter expands and focus
remains on the now-labelled, enabled Close importer. Tab reaches selected import
mode, then retained File, then Preview slides. Three Shift+Tabs return to Close
importer; Enter closes; Tab reaches the unchanged edited title. Assert no
horizontal overflow and no page errors/unexpected requests. Both passed.
This tests only upload focus, not a rerun of already accepted editor keyflows.

### Artifacts actually opened, cleanup and untested requirements

Fresh captured **and actually opened**:

* `C:\Users\SOLUSER\AppData\Local\Temp\forge-upload-followup-Dd4Okz\upload-1366.png`
* `C:\Users\SOLUSER\AppData\Local\Temp\forge-upload-followup-Dd4Okz\upload-320.png`
* `C:\Users\SOLUSER\AppData\Local\Temp\forge-upload-followup-Dd4Okz\importer-expanded-320.png`

Desktop visibly shows compact source context, focused title, tools and whole
canvas. Mobile shows wrapped source context, reachable tools and whole canvas;
expanded form shows readable radios/File/Preview and retained edited title.
Same directory also contains 1440/1910/1920 captures, **not opened in this task**.
Unchanged workspace QA captures:
`C:\Users\SOLUSER\AppData\Local\Temp\forge-workspace-qa-3s3AjM\`
(not opened; no redundant screenshot matrix).

Both test files close contexts/Chromium in finally; the supplemental probe also
confirmed finally cleanup. All started commands completed; process inspection
found no remaining Playwright-profile Chromium. No helper/server was started.
Synthetic screenshots remain outside Git; no database/storage fixtures to remove.
Final whitespace/preservation check:

```powershell
& 'C:\Users\SOLUSER\AppData\Local\GitHubDesktop\app-3.6.10\resources\app\git\cmd\git.exe' --no-pager diff --check
# Passed, exit 0 (recorded after documentation edits).
```

**Failures/escalation:** none reproduced in the scoped product behavior; earlier
open-upload-defect entries below are historical and superseded by this retest.
**Not tested:** full suite/build/lint/types, broad manual-editor polish, real
file parsing/server action transport, connected permissions/DB/storage/provider/
quotas, target-applied migration state, native desktop PowerPoint or release
certification. No environment loader, connected e2e/instructor test, installation,
migration operation, deployment or commit. These remain separate external gates.

## 5 November 2026 — narrow upload-placement fix (independent re-QA requested)

**Owner/scope:** local UI implementer; coordinator owns acceptance. One reproduced
usability defect only, not a feature restart or release certification. Preserved
the prior dirty product/user/QA work. Requested sibling skills were absent; loaded
repository `.github/skills/forge-{delivery,verification,security}/SKILL.md`.
No nested agents. Inspected Git status, controlling uploader/Studio/CSS, latest
QA evidence and nearby harnesses before editing.

### Root cause and delivered change

Falsifiable hypothesis: the still-expanded importer plus duplicate upload
headings displaces the fixed-height polished editor; replacing that space with a
compact success bar should restore desktop canvas/actions without shrinking the
manual editor. First ran the exact independent QA test **before edits**: **1 pass,
1 fail**, 14.0941119s, exit 1. At 1366×768, scrollY=0, editor y=554.59375,
Add slide y=756.59375–792.59375, canvas y=779.84375–1088.84375. The retained
Add-slide assertion failed, matching independent QA.

Successful extraction now hides (does not unmount/reset) the importer and shows
Imported file / filename / mode / Change file. The bar replaces the duplicate
portal upload heading only while a preview exists. Its 36px desktop row retains
the existing editor height and canvas scale. No forced page scrolling or smaller
canvas workaround. Opening/closing the disclosure does not reimport, save, delete
or reset content. Its visible warning explains that an actual file/mode change
replaces the preview. Existing invalidation, epoch guard, extraction error/retry,
same-tick guard and save-lock callbacks remain. Change file is disabled while
saving/uploading or after an unknown save outcome. A wrapper **inside Suspense**
focuses Lesson title once the lazy editor is actually mounted; no focus remains
on the hidden Preview slides button. Scoped radio sizing keeps the expanded
320px form readable rather than allowing full-width radio inputs.

**Exact six-file inventory for this follow-up:**

* `src/components/create-lesson.tsx` — compact retained importer/disclosure,
  filename context, successful-mount focus.
* `src/app/globals.css` — upload-only success heading/bar, focus/radios/mobile
  styling; existing polished-editor rules unchanged.
* `tests/presentation-upload.test.mjs` — two new focused offline browser tests.
* `tests/slide-authoring-ui.test.mjs` — use Change file before the two existing
  file/mode changes; settle Fabric's responsive resize for two animation frames
  before the existing mobile overflow assertion; add failure geometry diagnostics.
  Existing save/review/version/content assertions retained.
* `README.md`, `IMPLEMENTATION_TRACKER.md` — current fix/repro/evidence/handoff.

Did not edit `tests/presentation-workspace-qa.test.mjs` or weaken/skip its original
assertions. No changes to Studio route logic, presentation editor/canvas modules,
library/schema/assets/actions/account/AI, migrations (including the tagged
`20261105140000_presentations_ran.sql`), policies, dependencies or configuration.

### Exact commands and results (repository cwd)

Every Node invocation used the existing OS-only environment/network-denial runner.
Chromium contexts were offline, service workers blocked, unexpected routes aborted.
Extraction in new tests is synthetic; original JSX/lazy editor/Fabric/CSS runs
inside the existing actual-size portal harness with Tailwind preflight. Existing
authoring/editor tests use their local in-memory PGlite and real save actions.

```powershell
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests\presentation-workspace-qa.test.mjs
# Before edits: 1/2 pass, 1 reproduced product failure; exit 1, 14.0941119s.
# Immediately after product fix: 2/2 pass; exit 0, 12.7066444s.

node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests\presentation-workspace-qa.test.mjs tests\presentation-upload.test.mjs tests\slide-authoring-ui.test.mjs tests\presentation-layout.test.mjs tests\presentation-ui.test.mjs
# Final: 11/11 pass, 0 fail/skipped/cancelled; exit 0, 107.3589726s.

node tests\offline-run.mjs node_modules\eslint\bin\eslint.js src\components\create-lesson.tsx tests\presentation-upload.test.mjs tests\slide-authoring-ui.test.mjs
# Passed, no diagnostics.
node tests\offline-run.mjs node_modules\typescript\bin\tsc --noEmit --incremental false
# Passed, no diagnostics; no Next typegen/environment loader.
& 'C:\Users\SOLUSER\AppData\Local\GitHubDesktop\app-3.6.10\resources\app\git\cmd\git.exe' --no-pager diff --check
# Passed.
```

Iterations, not additional distinct passes: first five-file grouped run was
10/11 (123.8122678s); existing upload test measured immediately after switching
to 320px and failed its overflow assertion. Added bounds diagnostics; its
standalone rerun passed unchanged geometry assertions, **1/1**, 15.7680547s:
`node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests\slide-authoring-ui.test.mjs`.
Added the same two-animation-frame layout settling used by the layout harness
after viewport resize, not a scroll reset or wait-for-a-passing-overflow condition.
Also improved scoped radio sizing after actually opening the expanded screenshot.
The final grouped execution above passed all 11. Scoped lint/direct TS both
passed before and after the final code changes. No full suite or build.

### Final measured upload geometry and visual assessment

CSS pixels; desktop actual shell reserves sidebar242/topbar66. All initial
measurements below have **scrollY=0**, no horizontal overflow and 16:9 canvas.

| Viewport | Editor x,y; width×height; bottom | Canvas x,y; width×height; bottom |
| --- | --- | --- |
| 1366×768 | 258,130; 1092×636; 766 | 483.328125,355.25; 549.328125×309; 664.25 |
| 1440×900 | 258,130; 1166×768; 898 | 439,375.5; 712×400.5; 776 |
| 1910×1080 | 258,130; 1636×948; 1078 | 478,355.25; 1104×621; 976.25 |
| 1920×1080 | 258,130; 1646×948; 1078 | 483,355.25; 1104×621; 976.25 |
| 320×900 | 10,150; 300×871.625; 1021.625 | 27,659.5; 266×149.625; 809.125 |

Desktop primary controls passed viewport bounds **and center hit tests**, including
disabled Undo/Redo bounds. Exact 1366 control rectangles (x,y,width,height):

| Control | Rectangle |
| --- | --- |
| Change file | 1260.421875,82,89.578125,36 |
| Save | 1180.671875,155,47.171875,40 |
| Save and publish | 1235.84375,155,114.15625,40 |
| Undo / Redo | 271,218,51.84375,36 / 330.84375,218,49.9375,36 |
| Add text | 413.78125,218,68.8125,36 |
| Add slide | 269,332,130,36 |
| Fullscreen preview | 717.234375,218,122.125,36 |
| Export editable PPTX | 847.359375,218,136.46875,36 |
| Lesson settings | 1121.8125,218,104.828125,36 |
| Quiz / Help | 1234.640625,218,46.78125,36 / 1289.421875,218,47.578125,36 |

The other three desktop sizes have the same control y/height ranges: Change
file82–118, saves155–195, ribbon218–254, Add slide332–368. Their complete
rectangles are emitted by the new test on rerun. At 320, import bar is
x10,y72,w300,h66. Save x10,y227,w47.171875,h40; Save and publish
x65.171875,y227,w114.15625,h40; Add text x21,y340,w68.8125,h40; preview
x21,y390,w122.125,h40; export x151.125,y390,w136.46875,h40. Add slide after
keyboard-opening Slides is x21,y562,w60.640625,h40. Focus and ordinary scrolling
keep mobile controls reachable without horizontal overflow; mobile is not
required to display every panel simultaneously.

Manual layout is unchanged: at 1366/1440/1920 editor y122.59375, widths
1092/1166/1646; canvas widths549.328125/712/1104; workspace bottoms
758.59375/890.59375/1070.59375. Existing layout/dialog/enlarged-control,
IME/format/history, image, unknown-save, real save/review/version assertions passed.
New coverage also checks success title focus, importer/file/mode retention,
no autosave/reimport on disclosure, file/mode invalidation, returned/transport
extraction failures and retry, same-tick extraction guard, late-event epoch
rejection, hidden-form submit save guard and unknown-save content/lock retention.

Final screenshots **captured and actually opened**:
`C:\Users\SOLUSER\AppData\Local\Temp\forge-upload-followup-JdiEEs\`
`upload-1366.png`, `upload-320.png`, `importer-expanded-320.png`.
Desktop shows full canvas, all primary controls and clear source/change entry.
Mobile shows wrapped source context, separate tool targets and full canvas;
expanded form radios/file/Preview are readable and reachable. Same directory
also has 1440/1910/1920 captures. Final unchanged-QA captures:
`C:\Users\SOLUSER\AppData\Local\Temp\forge-workspace-qa-FLM6gF\`.

**Cleanup/gaps:** browser contexts/Chromium and existing test PGlite close in
finally; no helper/server remains running. Synthetic screenshots retained outside
Git. No secrets/environment files, remote service/provider/storage, setup loader,
migration, connected e2e/instructor test, installation, commit or deployment.
This proves bounded offline UI behavior, not real upload parser/server transport,
connected authorization or native PowerPoint fidelity. **Independent QA should
rerun the retained workspace test plus narrow upload regression; coordinator
acceptance remains open.** Earlier independent open-defect entry follows as
historical evidence, not the current implementer's result.

## 5 November 2026 — independent bounded workspace UI QA (upload defect open)

**Result/owner:** coordinator retains acceptance; implementer owns product fixes.
**Nine distinct bounded tests: eight passing, one failing in final executions.**
No release approval. No nested agents or product changes. Existing dirty work
was preserved. The seven existing browser tests were adequate for manual-editor
flows; added only `tests/presentation-workspace-qa.test.mjs` for two missing
checks: actual Studio route width isolation and actual upload-to-editor placement.

### Safety and exact independent execution

Requested sibling skills did not exist; read repository
`.github/skills/forge-{delivery,security,verification}/SKILL.md`, latest README/
tracker entries, package, layout/UI/acceptance tests and browser/offline harnesses
before choosing checks. All Node commands used `tests/offline-run.mjs` (OS-only
environment, network-denial preload). No environment/secret files or dotenv/Next
environment loader. Pre-execution stdin assertion probe confirmed no application
configuration keys and denied fetch, socket and HTTPS requests. Browser contexts
were offline, service workers blocked, unexpected routes aborted; synthetic page
and image routes were fulfilled in memory. PGlite was used only by the existing
real-save UI flow. New route checks mock leaf editors/data; new upload check runs
the original UploadLessonPage and real presentation editor with mocked extraction,
not a real PPTX parser or server action transport.

From repository cwd:

```powershell
node tests/offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests/presentation-layout.test.mjs tests/presentation-ui.test.mjs
# 6/6 passed; 56.4898784s; exit 0.
node tests/offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern="independent mounted draft" tests/presentation-acceptance.test.mjs
# 1/1 selected test passed; 11.4610408s; exit 0.
node tests/offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests/presentation-workspace-qa.test.mjs
# Final: 1/2 passed, 1 product failure; 18.2285106s; exit 1.
node tests/offline-run.mjs node_modules/eslint/bin/eslint.js tests/presentation-workspace-qa.test.mjs
# Final: passed, no diagnostics; exit 0.
& 'C:\Users\SOLUSER\AppData\Local\GitHubDesktop\app-3.6.10\resources\app\git\cmd\git.exe' --no-pager diff --check
```

Iterations, not additional distinct passes: first new-test execution was 1/2,
with a QA harness error (`Unexpected browser dependency ./learning`), 8.288224s.
Corrected the new test's missing module source to transpile actual learning.ts;
no product/assertion change. Second execution was 1/2 with the product failure
below, 14.7942204s. New-test lint initially found an unnamed marker component;
named it `Marker`. Final same two tests again reproduced the product failure.
No assertion was weakened or skipped. No full suite, build, types or product
lint rerun. Filtered acceptance execution did not run its two non-browser tests.

### Passing geometry, actions, responsive and keyboard evidence

Actual CSS-pixel measurements from this QA run, with Tailwind preflight and the
242px-reserved sidebar/66px desktop topbar, not an isolated viewport:

| Viewport | Inner editor width | Actual Fabric canvas width × height | Horizontal page overflow |
| --- | ---: | ---: | --- |
| 1440×900 | 1166 | 712 × 400.5 | No |
| 1366×768 | 1092 | 549.328125 × 309 | No |
| 1920×1080 | 1646 | 1104 × 621 | No |
| 1024×768 | 750 | 716 × 402.75 | No |
| 768×1024 | 736 | 702 × 394.875 | No |
| 320×900 | 300 | 266 × 149.625 | No |
| 683×384 | 651 | 616.875 × 347 | No |

Manual desktop workspace bottoms 890.594/758.594/1070.594px fit their initial
viewports. Save, Save and publish, Undo/Redo (disabled where history unavailable),
Add text, Add slide, preview, export, settings, Quiz and Help passed initial
viewport bounds and center hit tests. Ribbon gaps >=6px; Shapes and Insert
PNG/JPEG visibly grouped alongside Add text. No overlap/truncation observed in
the opened screenshots. All measured canvases retained 16:9. Thumbnail scrolling
did not move Add slide; inspector overflow stayed independently bounded.

At 1024/768/320 and 683, panels began collapsed, properties opened by keyboard,
and Add slide was reachable after opening Slides; no horizontal page overflow.
Desktop dialog checks used Enter, Tab/Shift+Tab (12 steps per dialog), Escape
and trigger-focus restoration for Lesson settings, Quiz and Help. Actual hidden
file-input focus produced the upload-label focus indicator; keyboard Shapes
insertion returned focus. Mobile checks included keyboard Add text/content,
outline Space selection, settings/quiz input reachability and Escape/restore.
20px editor/control checks passed at 1366 and 320, including centered settings,
third quiz question and no modal horizontal overflow. This is enlarged text,
**not native browser zoom**. Not an exhaustive Tab traversal of every action at
every size.

Existing focused flows passed: real Fabric CJK composition, selected-character
formatting with history, numeric X/rotation, multi-selection/stacking, zoom-aware
real mouse dragging and keyboard undo/redo, image insertion/replacement/undo,
pending-upload/save interlocks, private save and review-request version handling,
uncertain-save lock, fullscreen-denial feedback, cleanup-failure feedback, current
unsaved text/shape/image native PPTX toolbar OOXML and missing-image cancellation.
Quiz validation blocked persistence and focused feedback; metadata/quiz history
and modal feedback focus passed. These are local fixtures, not connected claims.

New actual-Studio branch test passed at 1440 and 1920: manual, upload,
presentation edit and legacy-slide edit receive the wide modifier and page widths
1198/1678px; history and standard edit stay 850px. An unmodified other-portal
CSS control stays 1180px at 1920. Actual page function rejected foreign-owner and
missing edits using local synthetic data and real permission helper. Leaf editors
were placeholders in this branch test; it is not full-app navigation or a remote
authorization audit.

### Reproduced product defect — upload form buries desktop workspace

**Escalation to coordinator/implementer; UI acceptance remains open.**
Repro: desktop viewport 1366×768, open `/studio?upload=1`, select a supported file,
choose Preview slides, then inspect the resulting editor without page scrolling.
Offline reproduction uses synthetic successful extraction (three valid legacy
slides), actual UploadLessonPage/lazy presentation editor and the same controlling
portal wrapper/CSS. `scrollY=0` throughout. Run the new QA test command above.

* Editor: x=258, y=554.59375, width=1092, height=636, bottom=1190.59375.
* **Add slide**: x=269, y=756.59375, width=130, height=36; bottom=792.59375
  exceeds viewport bottom768. Canvas y=779.84375, width=549.328125, height=309:
  no canvas pixels in the initial viewport.
* At 1440×900 editor/canvas widths still pass1166/712, but canvas extends from
  y=800.09375 to1200.59375. At 1920×1080 widths1646/1104 pass and primary buttons
  fit, but canvas extends from755.84375 to1376.84375. Thus wide geometry alone
  does not prevent uploaded-editor page scrolling.
* Same failing Add-slide bounds reproduced in both post-harness-correction runs.
  No browser errors or unexpected network attempts occurred.

Relevant product locations: `src/components/create-lesson.tsx:52-65` retains the
full uploader immediately above the newly mounted editor;
`src/app/studio/page.tsx:25-27,53` widens this route but does not compact that
content; `src/app/globals.css:382` assumes the manual editor's top offset for
viewport height (and `:36` adds upload-section spacing).
Minimal recommendation: authorized implementer should compact/collapse the
importer after successful preview with a clearly reachable change/re-import
control, preserve invalidation/retry/save-lock semantics, and fit the workspace
to its actual remaining viewport height. Do not mask overflow or merely weaken
the test. Changes to create-lesson.tsx require coordinator ownership approval;
QA did not edit it. Retest the retained failing assertion after the fix.

### Actually opened screenshots

All paths below are this independent run, not prior implementer artifacts:

* `C:\Users\SOLUSER\AppData\Local\Temp\forge-presentation-layout-SiS0sa\`:
  `workspace-1440.png`, `workspace-1366.png`, `workspace-1920.png`,
  `workspace-768.png`, `workspace-320.png` (five opened).
* `C:\Users\SOLUSER\AppData\Local\Temp\forge-presentation-accessibility-Y3IsAm\`:
  `text20px-1366.png`, `settings320-text20px.png` (both opened).
* First product-failure run:
  `C:\Users\SOLUSER\AppData\Local\Temp\forge-workspace-qa-iDKqtT\`:
  `upload-1366.png`, `upload-1440.png` (both opened).
* Final reproduction:
  `C:\Users\SOLUSER\AppData\Local\Temp\forge-workspace-qa-MkgMHP\`:
  `upload-1366.png`, `upload-1920.png` (both opened).

Eleven screenshots actually opened. Other captured screenshots, including
layout1024/683, UI `forge-presentation-lqy66H` and toolbar
`forge-independent-presentation-gx1SYo`, are not claimed as opened.

### Preservation, cleanup and untested requirements

Initial/final SHA-256 aggregate match for **189 pre-existing files**, sorted path
plus NUL plus file bytes: all src/, supabase/, existing tests/, package/lock,
Next/TS/ESLint/PostCSS configuration and next-env.d.ts:
`5c25693212b6f65b44f9b3e98816588bc826dd67594855f72111ea62497b5fa6`.
The new QA test is excluded from that comparison. Specifically protected
`supabase/migrations/20261105140000_presentations_ran.sql` SHA-256:
`9860874031055a45f99b7316aad1eee38b60ee9df2b80d6cb1df119b2b236b08`.
Initial dirty inventory: these two docs, four product UI files, three existing
presentation test/harness files and untracked presentation-layout.test.mjs.
QA changed only README, tracker and the new QA test; no dependency/config/source/
SQL changes.

All QA commands completed. Browser contexts/Chromium and existing UI-test PGlite
closed in finally, including failing test iterations. No cleanup failure
reported; temporary synthetic screenshots retained intentionally; browser-managed
downloads not promoted to repository files. No server, watcher or detached helper
started. No remote DB/storage/migration, real provider/quota, connected e2e/
instructor suite, install, deployment or commit.

**Separate unverified gates:** native browser zoom, Safari/Firefox/touch hardware,
live Next routing/real upload parsing and transport, connected permissions and
remote persistence, full saved-document close/reopen roundtrip in this QA turn,
exhaustive keyboard traversal at every breakpoint, mobile upload-specific
placement, and native desktop PowerPoint fidelity. Prior evidence is not adopted
as an independent pass. This is local UI acceptance with the upload defect open,
not global release or PowerPoint fidelity certification.

## 5 November 2026 — focused presentation visual/usability implementation

**Ownership:** approved local UI implementation only; coordinator retains
planning/acceptance. No delegation. Initial Git working tree was clean; existing
implementation was continued, not replaced. Requested sibling skills were absent;
read repository `.github/skills/forge-delivery/SKILL.md` and
`.github/skills/forge-verification/SKILL.md`, package, documentation and controlling
editor/canvas/studio/shell CSS and browser fixtures.

### Delivered changes (exact inventory)

* `src/app/studio/page.tsx`: explicit `presentation-studio` modifier for manual,
  slide-template edit and upload pages. History and standard editors stay bounded.
* `src/app/globals.css`: remove the unconditional 850px `!important` cap;
  presentation-only wide, compact heading; document/save bar, grouped ribbon,
  consistent warm/green panels, 152px slide rail and 244px inspector; bounded
  independent scrolling; responsive native disclosures and centered utility
  dialogs. No navigation redesign, body overflow hiding or control scaling.
* `src/components/presentation-editor.tsx`: visible title/save state/primary
  actions; compact accessible image chooser; fixed slide management above
  thumbnails; contextual styles plus persistent position/size and alignment/layer
  disclosures; initially collapsed outline; named Lesson settings, Quiz and Help
  dialogs. Modal keyboard cycling, Escape, trigger focus return and focused
  validation/cleanup feedback. Original history, mutations, save intent/version/
  uncertain-result interlocks, image actions and export implementation retained.
* `src/components/presentation-canvas.tsx`: fit the minimum available width/height
  with one Fabric zoom, maintaining logical 960×540 coordinates and pointer mapping.
* `tests/presentation-browser-harness.mjs`: realistic sidebar/workspace/topbar/
  heading wrapper and the installed Tailwind preflight in its base layer. All
  browser content remains synthetic/in-memory; no server or connected app.
* `tests/presentation-ui.test.mjs`: open new named disclosures/settings as needed;
  existing CJK/history/image/save/export assertions retained.
* `tests/presentation-acceptance.test.mjs`: open outline/layers; drag relative to
  the actual centered canvas, not its larger fitting host. Assertions retained.
* New `tests/presentation-layout.test.mjs`: three focused grouped tests for real
  containing-block geometry, initial action visibility/hit testing/gaps, screenshot
  pixels, independent rail scrolling, responsive disclosures, dialog keyboard/
  focus, metadata and quiz history/validation, hidden file-input focus, shape
  keyboard insertion, enlarged controls and 320px dialogs.
* `README.md` and this tracker: actual usage and verification evidence.

### Hypothesis, checks and iterations

**Falsifiable hypothesis:** removing only the presentation containing-block cap,
  with compact fixed-width side panels and fit-height stage, yields a canvas
  >=600px at 1440×900 and >=540px at 1366×768 without hiding primary actions.
  Focused check: mounted offline Chromium geometry in the real 242px-reserved
  portal structure, plus the existing UI regression flow.

Baseline UI tests passed **3/3 (21.969s)**. First restructured UI run failed
  **0/3**: CSS grid's intrinsic 960px canvas overflow intercepted inspector clicks.
  Explicit zero-minimum grid tracks fixed it. Subsequent **2/3** runs exposed
  disclosure remount/toggle state loss after canvas selection restoration; explicit
  state/click toggling fixed it. UI then passed **3/3**.

Opened screenshots exposed thumbnail overflow through native details' anonymous
  content box; measured available panel height now bounds the actual scroll
  region. New dialog checks exposed native Tab cycling through browser chrome;
  explicit boundary cycling and notice-focus handling now keep focus in the modal.
  New-test Font/Audience exact-label lookups were corrected to their accessible
  combobox roles, without removing assertions.

Added screenshot-pixel checks and a paint settle after scrolling, because an
  early capture showed stale canvas painting immediately after panel/scroll
  changes; no screenshot-only style or forced canvas redraw was introduced.
  Adding actual Tailwind preflight exposed a genuine **535px** height-fit width at
  1366×768, below the unchanged 540px check. Reduced stage/main padding by 2px each,
  giving **549.328px**. Final screenshot review also caught reset-removed modal
  centering and an enlarged Close label wrapping; explicit margins/max-width and
  a nonshrinking Close button fixed both. Final focused mobile recheck passed1/1,
  followed by the complete final9/9 below.

### Exact final commands and results (repository cwd)

All Node execution used `tests/offline-run.mjs`: scrubbed OS-only environment,
  network-denial preload, no application environment loader or secret files.

```powershell
# Initial baseline:
node tests/offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests/presentation-ui.test.mjs
# Focused iteration checks:
node tests/offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests/presentation-layout.test.mjs
node tests/offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern="enlarged editor" tests/presentation-layout.test.mjs
# Final complete focused matrix:
node tests/offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests/presentation-layout.test.mjs tests/presentation-ui.test.mjs tests/presentation-acceptance.test.mjs
# Final static checks (separate invocations through the same safe runner):
node tests/offline-run.mjs node_modules/typescript/bin/tsc --noEmit --incremental false
node tests/offline-run.mjs node_modules/eslint/bin/eslint.js src/components/presentation-editor.tsx src/components/presentation-canvas.tsx src/app/studio/page.tsx tests/presentation-browser-harness.mjs tests/presentation-ui.test.mjs tests/presentation-acceptance.test.mjs tests/presentation-layout.test.mjs
& 'C:\Users\SOLUSER\AppData\Local\GitHubDesktop\app-3.6.10\resources\app\git\cmd\git.exe' --no-pager diff --check
```

Final matrix: **9/9 passed**, 83.541s, zero failures/skips/cancellations, exit0.
  These are nine distinct tests, not accumulated reruns. Includes actual Fabric
  IME/CJK and character formatting/history; multiselect/stacking and real mouse
  drag with zoom; image replacement/undo; private save/review/version/unknown-save
  locks; quiz validation/focus/history; native text/shape/image PPTX download and
  missing-image cancellation; fullscreen denial and cleanup failure feedback;
  existing local model/authorization/action/SQL acceptance.
  Direct TypeScript passed; scoped ESLint on **7 code/test files** passed, no
  diagnostics. Git whitespace check passed. No full suite, Next typegen or build
  was run for this UI-only change.

### Final measured geometry and visual evidence

Widths are rendered CSS pixels, not viewport width claims. Editor is the inner
  `.presentation-editor`; canvas is Fabric's actual `.canvas-container`.

| Viewport | Editor width | Canvas width × height | Desktop primary actions initially visible |
| --- | ---: | ---: | --- |
| 1440×900 | 1166 | 712 × 400.5 | Yes |
| 1366×768 | 1092 | 549.328 × 309 | Yes |
| 1920×1080 | 1646 | 1104 × 621 | Yes |
| 1024×768 | 750 | 716 × 402.75 | Responsive panels; page scroll allowed |
| 768×1024 | 736 | 702 × 394.875 | Responsive panels; page scroll allowed |
| 320×900 | 300 | 266 × 149.625 | Save/tools above stage; panels collapsed |
| 683×384 | 651 | 616.875 × 347 | Reduced-viewport reflow; page scroll allowed |

Desktop reserved sidebar =242px, canvas/stage/workspace stay within bounds.
  Workspace bottoms: 890.594/758.594/1070.594px respectively, inside each desktop
  viewport. Save, Save and publish, editable export, preview, Undo/Redo, Add text,
  Add slide, settings, Quiz and Help passed initial viewport bounds and center
  hit tests; ribbon gaps >=6px (configured8px). Shapes and image insertion remain
  alongside Add text. No horizontal document overflow at any measured size;
  all canvases remain16:9. The 683×384 case is a reduced-layout-viewport proxy,
  **not a claim of real browser-zoom testing**. Separate20px-control checks passed,
  including mobile settings/quiz input reachability and focus restoration.

**Actually opened nine final screenshots**, not just captured:

* `C:\Users\SOLUSER\AppData\Local\Temp\forge-presentation-layout-tqo454\workspace-1440.png`
* Same directory: `workspace-1366.png`, `workspace-1920.png`,
  `workspace-1024.png`, `workspace-768.png`, `workspace-320.png`, `workspace-683.png`.
* `C:\Users\SOLUSER\AppData\Local\Temp\forge-presentation-accessibility-cPi5gb\text20px-1366.png`
* Same directory: `settings320-text20px.png`.

Other final test captures (not claimed as opened):
  `C:\Users\SOLUSER\AppData\Local\Temp\forge-presentation-PFzwdb\` and
  `C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-presentation-vZb70F\`.

**Cleanup/boundaries:** browser contexts/Chromium and all PGlite databases closed
  in finally; downloads remained temporary; screenshot artifacts intentionally
  retained for QA. No long-running helper, server startup, dependency install,
  package change, SQL/schema/policy/action change, remote Supabase/storage/
  migration, provider call, connected e2e/instructor suite, deployment or commit.

**Independent QA requested:** bounded final desktop/mobile geometry and key
  flows, including real-app upload-to-editor placement and standard-editor width
  isolation. Offline fixture reproduces controlling shell CSS, not a live Next
  page/real account or upload transport. Native browser zoom, Safari/Firefox,
  native desktop PowerPoint fidelity and connected service transport remain
  unverified. No blocker to the approved local implementation; no release
  certification or coordinator acceptance is asserted.

## 5 November 2026 — independent bounded presentation acceptance (QA)

**Ownership/result:** coordinator owns acceptance. Independently executed **12
distinct focused/grouped tests: 9 existing + 3 QA-added, all passing in their
final runs**, not the full suite/build. Implementer's 391/391, lint/typecheck/build
claims above/below remain prior implementation evidence, not QA reruns. No
product defect reproduced; no product editing or implementer fix request needed.
Only added `tests/presentation-acceptance.test.mjs` and updated existing README
and tracker. No existing test assertion was weakened or existing test changed.

### Safety and source preservation

Read repository delivery/security/verification skills, README, recovery entry,
nearby presentation/slide/account harnesses and actual migration privileges.
Requested sibling skill paths were absent; used `.github/skills/` equivalents.
Node execution used `tests/offline-run.mjs`: OS-only environment, network-denial
preload, no environment files or actual Next environment loader. A separate
assertion command confirmed application configuration absent and fetch, sockets
and HTTPS calls denied. Only synthetic users/content, in-memory PGlite and
offline Chromium; service workers blocked, unexpected routes aborted, synthetic
document/image routes fulfilled in memory. No remote Supabase/storage/migration,
provider/quota use, connected e2e/instructor suite, server startup, deployment,
installation, full build/suite or commit.

Initial and final SHA-256 aggregate match for **187 existing files**: sorted
paths plus NUL plus file bytes, covering all `src/`, `supabase/`, existing `tests/`
(excluding QA's new test), package/lock, Next/TS/ESLint/PostCSS configuration and
`next-env.d.ts`:
`6c89178e6ea8a564a67828eb27b701e858622707569beb93f8e4cfa71009f1c4`.
This includes all pre-existing dirty application/migration/manifest/config files
and historical `_ran` migrations. Initial/final Git status used installed
`C:\Users\SOLUSER\AppData\Local\github-copilot-git-2.56.0-2\cmd\git.exe`
because Git was not on PATH. Only the new QA test was added to the initial
changed-path inventory; both documentation files were already dirty.

### Exact commands and results (repository cwd)

```powershell
node tests/offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests/presentation-model.test.mjs tests/presentation-images.test.mjs tests/presentation-assets.test.mjs tests/presentation-storage.test.mjs tests/presentation-integration.test.mjs tests/presentation-ui.test.mjs
node tests/offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests/presentation-acceptance.test.mjs
node tests/offline-run.mjs node_modules/eslint/bin/eslint.js tests/presentation-acceptance.test.mjs
node tests/offline-run.mjs --input-type=module -e "import assert from 'node:assert/strict'; import net from 'node:net'; import https from 'node:https'; assert.equal(Object.keys(process.env).filter(k=>/SUPABASE|OPENROUTER|NEXT_PUBLIC|DATABASE_URL|API_KEY/.test(k)).length,0); await assert.rejects(async()=>fetch('https://synthetic.invalid'),/network forbidden/); assert.throws(()=>net.connect(443,'synthetic.invalid'),/network forbidden/); assert.throws(()=>https.get('https://synthetic.invalid'),/network forbidden/); console.log('PASS: application configuration absent; fetch/socket/HTTPS denied');"
& 'C:\Users\SOLUSER\AppData\Local\github-copilot-git-2.56.0-2\cmd\git.exe' --no-pager diff --check
```

| Independent gate | Actual result |
| --- | --- |
| Existing six-file focused matrix | 9/9 passed; 29.886s; zero failures/skips/cancellations; exit0 |
| QA-added final three grouped tests | 3/3 passed; 43.417s; zero failures/skips/cancellations; exit0 |
| New-test-only ESLint | exit0, no diagnostics |
| Configuration/network assertion | exit0, configuration absent; three network APIs denied |
| Git diff whitespace check | exit0 |

**QA-only failures/corrections, not hidden product passes:** the first added-test
run was 2/3 (40.748s). Its browser flow tried Bring to front after undo/redo had
intentionally cleared selection; corrected the test to reselect. Intermediate
browser-only command below was 0/1 (6.227s): stack assertion mistook the textbox's
own `prst="rect"` for the actual shape. Replaced that selector with parsed OOXML
`spTree` object classification and exact native shape geometry checks. No
application change or weakened product requirement. First corrected complete run
passed3/3 in13.080s. Final3/3 above reran every added test after also strengthening
foreign-update denial and a well-formed stale-version save that attempts to
remove current image references; the confirmed row remains byte-for-byte equal.

```powershell
node tests/offline-run.mjs --experimental-strip-types --test --test-concurrency=1 --test-name-pattern="independent mounted draft" tests/presentation-acceptance.test.mjs
```

### Actual acceptance coverage

* **Boundaries/persistence:** actual create actions and SQL accept exactly 1 and
  30 slides with 100 objects; JSON/schema/stored-author roundtrip is exact. Zero
  or 31 slides/101 objects fail both actions and direct SQL (23514), with no
  clipping or partial rejected writes. Presentation quiz 0/3/10 accepted, 1/2/11
  rejected. Actual `generateLesson` with synthetic completion accepts 4/6 slides
  with ten questions; rejects 3/7 slides and 0/3/9/11 questions. Legacy conversion
  preserves title/body/style and does not change the stored legacy row.
* **Mounted native editor:** actual React19/Fabric6 component, hidden-textarea
  Chromium CJK composition, selected CJK font/size/color/bold, paragraph
  preservation, numeric rotation/position, slide CRUD/reorder, ActiveSelection,
  actual mouse drag and Shift+Arrow/Ctrl+Z/Y history. Image insertion/replacement
  aspect ratio and undo, delayed upload/save interlock, rotated-edge duplication,
  same-tick repeat-save protection, private review save and unknown-save lock
  passed. Fullscreen denial stays usable in a dialog and restores trigger focus;
  cleanup transport failure gives visible feedback.
* **Actual toolbar export:** current unsaved styled Chinese text + shape +
  embedded PNG, with no save request, yields separate native OOXML text/shape/
  image objects, styled runs, rotation, translated positions/extents and changed
  back-to-front order. Quiz sentinel absent. Missing asset via synthetic 404
  cancels the real export button and causes no second/partial download. Pixel
  sampling also checks canonical shape position on the real canvas, not source
  strings. This is native OOXML evidence, not PowerPoint desktop fidelity.
* **Private assets/security:** new probes load real `learning-server` access
  helpers (not the simpler harness access stub), asset helpers, image actions,
  lesson actions and image GET route over PGlite/in-memory blobs. Owner allowed;
  foreign/anonymous denied; forged `user_metadata.role` denied without blob
  access; private unsubmitted admin denied; submitted reviewer allowed;
  immediately revoked reviewer denied; authenticated enrolled/public read
  allowed, learner upload denied. Draft/lesson/asset substitutions denied.
  Stale-version denial and changing to another lesson cannot detach/authorize
  the original asset; draftless reopened image save advances version.
* **Failure recovery/SQL:** metadata stripping/signature/dimension rejection,
  pending/upload/ready-ack failures, active reservation retention, expired upload
  denial, failed blob cleanup retaining deleting rows, retry cleanup, saved-image
  expiry/discard retention and GC resurrection denial passed. Real profile
  deletion action invokes actual owner cleanup SQL/blob helper before synthetic
  auth deletion; failed cleanup prevents auth deletion, retry removes owner
  blobs/rows and leaves foreign assets intact. Real auth cascade is not tested.
  Anon/authenticated direct table read/update/delete and RPC calls get42501;
  service-role cleanup execute grant is present. Existing storage test reapplies
  the actual migration with a simulated Storage schema and broad permissive
  policy: private bucket plus restrictive authenticated read/insert denial.
  These are **local** grants/policy results, never target RLS configuration.
* **Responsive/accessibility:** mounted320/1440 has no horizontal page overflow,
  16:9 surfaces, wrapping controls, literal accessible outline, keyboard activation
  and checkbox focus. Screenshots visually inspected as below. Not a complete
  accessibility audit or a real mobile device/OS-IME qualification.

### Artifacts, cleanup and explicitly open requirements

Actually opened all six synthetic full-page PNGs (the last pair is the final run):

* `C:\Users\SOLUSER\AppData\Local\Temp\forge-presentation-WILFoA\editor1440.png`
* `C:\Users\SOLUSER\AppData\Local\Temp\forge-presentation-WILFoA\editor320.png`
* `C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-presentation-LoEosO\native1440.png`
* `C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-presentation-LoEosO\native320.png`
* `C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-presentation-CNgH53\native1440.png`
* `C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-presentation-CNgH53\native320.png`

Screenshots remain outside Git as sanitized component evidence; PPTX inspected
in memory, no desktop file was opened. Browsers/contexts/databases closed in
`finally`, no cleanup error; all owned bounded commands completed. Empty temp
directories from the two failed QA browser attempts were removed; six screenshots
retained intentionally. No running service or persistent database was created.

**Untested/external, not passes:** connected Supabase grants/RLS/action transport
and races, actual target migration/bucket/cache state and cleanup scheduling;
real auth/storage/account-deletion cascades; native PowerPoint desktop fonts,
CJK wrapping/line spacing/editing fidelity. Target state remains unknown: the
`_ran` suffix is not application evidence. No full routed Next CSS/packaging
rerun, exhaustive keyboard command matrix, real mobile device or native OS IME
qualification. Harness CSS strips the Tailwind import. High-fidelity PPTX import
remains approved deferred work. No overall release certification.

## 5 November 2026 — presentation recovery and finishing (implementation, not acceptance)

**Scope/ownership:** recovered the substantial existing partial presentation
implementation; no restart, reset, nested agent or unrelated feature work.
Application/schema/tests/manifests and existing README/tracker only. Coordinator
owns acceptance; request independent QA after this implementation handover.
Sibling forge skills were absent; loaded repository `.github/skills/forge-delivery`
and `forge-verification` equivalents. PowerShell/Node execution was verified.
Git was absent from PATH; used installed
`C:\Users\SOLUSER\AppData\Local\github-copilot-git-2.56.0-2\cmd\git.exe`
for noninteractive status. All pre-existing dirty changes were preserved.

**Recovered deliverable:** canonical versioned 960×540 JSON; 1–30 slides,
100 objects/slide; React19/Fabric6 on-canvas rich text/IME, shapes, private raster
images; thumbnails, collapsible panels, accessible outline/properties, transforms,
keyboard controls, unified history, preview and native editable browser PPTX.
Studio/upload adapters, learner/review rendering, long-slide resume, private
save/review/version protections, image lifecycle, account export/deletion and
bounded plain-text coaching are integrated. Standard/AI contracts remain strict.
Legacy documents are converted locally on authoring and upgraded only by explicit
save. Text-only PDF/DOCX/PPTX import is retained, not replaced with a layout importer.
High-fidelity PPTX and binary PPT import are deferred, not claimed delivered.

### Recovery changes and falsifiable checks

1. **Compatibility before editing:** hypothesized installed packages and the
   canonical model were executable. Offline model + real React/Fabric/Chromium IME
   and native OOXML gate passed **2/2**. Installed Node25.2.1, React19.1.0,
   Fabric6.7.1, PptxGenJS4.0.1, Next16.3.5; JSZip3.10.2 was already installed.
2. Initial assets/images/storage/integration/UI matrix: **4/5**. Mounted UI timed
   out after IME Undo→Redo. A separate actual-canvas probe showed the model had
   redone text while the canvas still displayed the undone text. Hypothesis:
   stale emission marker suppressed external redraw. Consuming that marker on
   every synchronization fixed it; mounted flow passed immediately.
3. New actual-action regression reproduced reopening an image lesson failing
   save without a new upload-draft ID. Asset validation now accepts only
   lesson-authorized existing assets in that case, still rejects draftless new
   lesson reuse and retains server dimension/status/isolation checks. The
   PGlite/action/blob-route test passed immediately after the fix.
4. Strengthening the integration test to call **real `coachReply`**, rather than
   a successful stub, reproduced rejection of 30 canonical text-only slides.
   Added a separate presentation reference branch, not a relaxed standard/AI
   lesson schema. Per-reference 24,000 serialized-character bound and per-slide
   10,000-character body bound are enforced; images/asset refs and answer keys
   are absent from completion input (literal image alt descriptions are text).
   Actual adapter + all28 existing AI contract tests passed **29/29**.
5. New rotated-edge duplication regression failed: the normal +12 offset moved
   a corner beyond the slide. Duplication now uses the offset only if valid,
   otherwise overlaps the original without invalidating the document.
6. Fullscreen denial now visibly explains dialog fallback; cleanup transport
   rejection reports an unconfirmed outcome instead of an unhandled promise.
   Regression coverage includes both. Constraint feedback names both actual
   prerequisite/presentation migrations. One intermediate wording broke the
   existing actionable `apply <filename>` contract test; wording was corrected,
   no assertion weakened; slide-authoring **3/3** passed again.
7. Added current-unsaved-draft toolbar PPTX download verification, native rotated
   position/stack OOXML assertions, selected-range CJK fonts/size/color across
   paragraphs, real ActiveSelection movement, delayed upload/save lock,
   aspect-changing replacement/undo, image-ratio and 50-entry-history bounds.
   The initial Font exact-label selector was a test error (option text contributes
   to its label); changed to the actual accessible combobox role. Browser **3/3**
   then passed. Same-tick duplicate-upload/save probe observed **1 upload, 0 writes**.
8. Declared already-installed JSZip3.10.2 directly in devDependencies and root
   lock entry; checked agreement with installed/locked version. No install or
   registry contact. Preserved webpack scripts, narrow browser-only PptxGenJS
   node-scheme shim, 4.4MB action limit and TS extension support: isolated browser
   packaging build/typecheck proves they work with the recovered dependencies.

### Exact recovered file inventory (includes prior dirty presentation work)

New application files:
`src/lib/presentation.ts`, `presentation-fabric.ts`, `presentation-export.ts`,
`presentation-images.ts`, `presentation-assets-server.ts`,
`presentation-node-disabled.ts`;
`src/components/presentation-editor.tsx`, `presentation-canvas.tsx`,
`presentation-view.tsx`;
`src/app/presentation/actions.ts`;
`src/app/api/presentation/assets/[id]/route.ts`.
New schema: `supabase/migrations/20261105140000_presentations.sql`.

Modified integrations:
`src/app/api/account/export/route.ts`,
`src/app/courses/[slug]/lessons/[lesson]/page.tsx`,
`src/app/globals.css`, `src/app/learning/actions.ts`,
`src/app/profile/actions.ts`, `src/app/studio/page.tsx`,
`src/components/create-lesson.tsx`, `learning-controls.tsx`, `lesson-preview.tsx`,
`src/lib/learning.ts`, `resume.ts`, `slide-lesson.ts`, `openrouter.ts`.
Configuration/manifests: `next.config.ts`, `tsconfig.json`, `package.json`,
`package-lock.json`. Documentation: existing `README.md` and this tracker.

New tests/harnesses under `tests/`:
`presentation-model.test.mjs`, `presentation-compatibility.test.mjs`,
`presentation-storage.test.mjs`, `presentation-integration.test.mjs`,
`presentation-assets.test.mjs`, `presentation-images.test.mjs`,
`presentation-ui.test.mjs`, `presentation-browser-harness.mjs`,
`presentation-packaging.tsx`.
Recovered modified tests/harnesses:
`account.test.mjs`, `curriculum-ui.test.mjs`, `learning-path-ui.test.mjs`,
`lesson-generation-harness.mjs`, `lesson-generation-ui.test.mjs`,
`manual-authoring.test.mjs`, `offline-build.mjs`, `onboarding.test.mjs`,
`resume.test.mjs`, `slide-authoring-harness.mjs`, `slide-authoring-ui.test.mjs`,
`slide-authoring.test.mjs`.

This recovery turn surgically changed only canvas synchronization, editor
duplication/fallback/error handling, asset save validation, real coach integration
and constraint guidance, the JSZip manifest/lock root entries, four presentation
test files and these two documents. Other recovered changes remain intact.
No historical `_ran` migration was edited.

### Verification environment and reproducible commands

All Node verification used `tests/offline-run.mjs`: OS-only child environment,
fixed Node/Windows PATH and network denial; no `.env*`, setup/dotenv loader,
remote services, provider/quota use, server startup, connected e2e/instructor
suite, target migration, deployment or commit. A fresh stdin assertion probe
confirmed absent application configuration and denied fetch/socket connections.
Chromium contexts are offline, service workers blocked, external routes aborted;
synthetic HTTPS document/image routes are fulfilled in memory, not by a server.
Actual SQL/actions use local in-memory PGlite; browser action bridges and blob
storage are synthetic. Browsers/contexts/databases close in `finally`.

Commands from repository cwd:

```powershell
node tests/offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests/presentation-model.test.mjs tests/presentation-compatibility.test.mjs tests/presentation-images.test.mjs tests/presentation-assets.test.mjs tests/presentation-storage.test.mjs tests/presentation-integration.test.mjs tests/presentation-ui.test.mjs tests/slide-authoring.test.mjs
node tests/offline-run.mjs --experimental-strip-types --test --test-concurrency=1 "tests/*.test.mjs"
node tests/offline-run.mjs tests/offline-build.mjs --presentation-gate
node tests/offline-run.mjs node_modules/eslint/bin/eslint.js next.config.ts src/lib/presentation.ts src/lib/presentation-fabric.ts src/lib/presentation-export.ts src/lib/presentation-images.ts src/lib/presentation-assets-server.ts src/lib/presentation-node-disabled.ts src/components/presentation-editor.tsx src/components/presentation-canvas.tsx src/components/presentation-view.tsx src/app/presentation/actions.ts "src/app/api/presentation/assets/[id]/route.ts" src/app/learning/actions.ts src/lib/openrouter.ts src/lib/learning.ts src/lib/resume.ts src/lib/slide-lesson.ts src/app/studio/page.tsx src/components/create-lesson.tsx src/components/learning-controls.tsx src/components/lesson-preview.tsx "src/app/courses/[slug]/lessons/[lesson]/page.tsx" src/app/api/account/export/route.ts src/app/profile/actions.ts tests/presentation-*.mjs tests/presentation-packaging.tsx tests/offline-build.mjs tests/account.test.mjs tests/curriculum-ui.test.mjs tests/learning-path-ui.test.mjs tests/lesson-generation-harness.mjs tests/lesson-generation-ui.test.mjs tests/manual-authoring.test.mjs tests/onboarding.test.mjs tests/resume.test.mjs tests/slide-authoring-harness.mjs tests/slide-authoring-ui.test.mjs tests/slide-authoring.test.mjs
```

Earlier broad sweep: **388/388**, 552.81s; it began before the final test additions,
so is not a frozen-final-suite claim. Latest focused matrix: presentation **10/10**,
plus slide-authoring **3/3** after the guidance correction; mounted browser
position/stack/replacement additions **3/3**, 18.65s. Final scoped ESLint exited0.
Isolated typegen→`tsc --noEmit --incremental false`→`next build --webpack` with
the temporary presentation packaging route passed twice; snapshots/junctions
were removed in `finally`.

**Final frozen results (fresh runs after all source/test changes):**

| Gate | Actual result |
| --- | --- |
| Full serial offline suite, exact command above | **391/391 passed**,430.22s;0 failures,skips,cancellations;exit0 |
| Scoped ESLint, exact target list above | exit0,no diagnostics |
| Isolated typegen | pass |
| Isolated `tsc --noEmit --incremental false` | exit0 |
| Isolated `next build --webpack` with presentation packaging route | exit0;compiled43s;25 pages generated |
| OS-only configuration/network assertion probe | pass;configuration absent,fetch/socket calls denied |
| Installed Git `--no-pager diff --check` | exit0 |
| Final owned build snapshot/junction cleanup | confirmed removed:`C:\Users\SOLUSER\AppData\Local\Temp\forge-slide-build-8FjIFv` |

Final full-suite coverage includes all10 presentation tests, existing legacy/
standard/AI contracts, account export/deletion and broader learner/studio
regressions. Only documentation changed after this frozen run. No cleanup error
was reported; bounded verification sessions completed, no service was started.

Screenshots actually opened at320/1440:
`C:\Users\SOLUSER\AppData\Local\Temp\forge-presentation-TSSIZR\editor320.png`
and `editor1440.png`. Literal outline, keyboard focus and no horizontal overflow
were checked. Screenshots are retained outside Git; they are synthetic component
evidence, not a full routed/browser or accessibility acceptance.

### Target setup, retention and acceptance gates

No target-applied state was read or changed. Workspace has
`20261105093000_slide_authoring_ran.sql`, not the former non-`_ran` filename in
older entries; the suffix proves **nothing** about a connected target.
After separate authorization, verify/back up target and prerequisites, apply the
additive `20261105140000_presentations.sql`, verify the **private**
`forge-presentation-images` bucket (PNG only,4MiB) and restrictive browser-denial
policies, service-role functions/tables, refresh PostgREST schema cache and deploy
matching app code. On systems without Storage schema the migration deliberately
skips bucket/policy provisioning. PGlite tests cover both paths and reapplication,
not actual Supabase Storage configuration or real Next action transport/races.

Images: signed PNG/JPEG safe decode,8,000px/side,16MP,4MiB input/output,
sanitized metadata-free PNG; no original name/URL/SVG.64MiB/draft,10 active
drafts/account,7-day staged retention. Undo references remain until explicit
discard/expiry; saved references are excluded from GC. GC claims block racing
resurrection and failed blob removal retains retry metadata. No scheduled
remote cleanup job was created: owner/admin cleanup UI exists; operator scheduling
is a target setup requirement. Account export includes canonical JSON/asset
metadata but excludes binaries (download owned PPTX for embedded images);
password-confirmed deletion stops before auth deletion when blob cleanup fails.

**Independent QA requested:** verify real connected author/upload/read permissions,
repeat/conflict/uncertain saves and review/approval/learner round trip; target
bucket grants/cache and orphan cleanup; desktop PowerPoint editability, fonts,
CJK wrapping/line spacing, native positions/rotation/stack and image rendering.
Fonts are not embedded; no pixel-perfect/native-desktop fidelity acceptance is
claimed. Rollback needs coordinated JSON/resume/data/application/storage
restoration or conversion; do not blindly restore legacy checks or delete the
bucket over new saved references. No rollback was executed or certified.
No known local functional blocker remains from the reproduced defects; external
gates and deferred high-fidelity/binary import remain openly unverified.

## 5 November 2026 — independent bounded lesson-authoring acceptance (LOCAL)

**Owner/scope:** independent QA, no delegation. Read the current implementation
entry, README, migration and focused action/component/test logic; sibling skills
were absent, so loaded all three repository `.github\skills\forge-*` equivalents.
The implementer's **378/378**, TypeScript/lint/build results below are prior
implementation evidence, not independent reruns. This is bounded acceptance, not
another full audit/build or overall feature-complete/release approval.

**Safety established before execution:** existing Windows Node25.2.1, installed
PGlite and Chromium153.0.8010.12 only; no install. Inspected/reused
`tests\offline-run.mjs` and `tests\offline-network.mjs`: OS-only child environment,
fixed Node/Windows PATH and network denial, no actual dotenv/Next setup loader.
Separate stdin probe confirmed absent application configuration and denied fetch/net
connections. Browser contexts are offline, service workers blocked, all routes
aborted; mounted components use synthetic action bridges, not a server.
In-memory PGlite only, synthetic users/content, all instances/contexts closed in
`finally`. The real access-helper probe supplies synthetic configuration to a stub
client factory and deletes it in `finally`; it never contacts Supabase.
No `.env*` read, remote service, provider/quota, connected test:e2e/test:instructors,
target migration, server startup, commit or deployment.

**QA-owned exact inventory:** new `tests\slide-acceptance.test.mjs`; additive
assertions in `tests\slide-authoring.test.mjs` and
`tests\slide-authoring-ui.test.mjs`; this entry and the README verification entry.
No application, SQL, CSS, harness/runner, dependency or configuration modification.
The existing **19 application files + one new migration + 13 test/harness files +
README/tracker** implementation inventory is unchanged, with the one new QA test
bringing test/harness inventory to14. Full application paths remain in the
implementation entry immediately below.

**Commands and actual results** (repository cwd; each Node command prefixed with
`node tests\offline-run.mjs`):

| Command after offline-run prefix | Independent result |
| --- | --- |
| `--experimental-strip-types --test --test-concurrency=1 tests\slide-acceptance.test.mjs tests\slide-authoring.test.mjs tests\slide-authoring-ui.test.mjs tests\teaching-material.test.mjs tests\learning.test.mjs` | **28/29**, 55.20s; only failure was QA-added exact-label Audience selector at UI test102 (option text participates in its label), not application failure |
| `--experimental-strip-types --test --test-concurrency=1 tests\slide-authoring-ui.test.mjs` | **1/1**, 12.64s after using actual accessible combobox role; all browser assertions passed, zero page errors/network requests |
| `node_modules\eslint\bin\eslint.js tests\slide-acceptance.test.mjs tests\slide-authoring.test.mjs tests\slide-authoring-ui.test.mjs` | Exit0 after final test changes |
| `-` with stdin `assert` probe for absent Supabase config and denied fetch/net | Pass; first `-e` version failed PowerShell argument quoting, replaced by stdin; no product failure |
| Explicit installed `git.exe --no-pager diff --check` | Exit0 |

Thus **29 distinct focused tests now pass across these commands**, not a claimed
single29/29 run. No failures/skips/cancellations remain in the final browser rerun;
the other28 were not needlessly rerun. No full suite, direct TS or build rerun was
needed for JS-test/document-only edits.

**Verified passes / concrete coverage:**

* Old unchanged `20260923_learning_ran.sql` reproduces **23514 /
  `forge_lessons_content_check`** on synthetic three-slide/no-quiz insert.
  New migration in local PGlite accepts slide quiz0/3 and standard10; direct SQL
  rejects slide1/2, standard9, missing/NULL/wrong-type JSON, invalid slide arrays,
  mismatched answer/question counts and scores above totals. SQL NULL also denied.
  Reapplication preserves complete lesson/attempt/resume snapshots, including the
  original migration's malformed historical lesson; standard snapshot defaults10
  remain intact. anon/authenticated table reads denied. NOT VALID is deliberate.
* Actual create/update actions keep every author role private with review requested,
  even instructor/admin `publish=on`; plain Save clears review/published timestamp.
  Nonadmin approval, stale-version approval, foreign edits and template bypass denied.
  Added probe runs **real `learning-server.ts`** access/current-user checks with
  actual actions: private foreign draft denied even to admin before review,
  trusted versus forged role, explicit review-only access, revoked session/user plus
  auth error, and unauthenticated writes denied. `/studio` and `/admin` revalidated.
* Actual action/DB and mounted player show **2/3 (67%) pass**, **1/3 (33%) fail**,
  saved answer totals/resume3, reports/progress/dashboard/certificate totals, failing
  and foreign certificate denial. Independent standard actions persist **5/10 fail,
  6/10 pass**. No-quiz player has no practice/quiz/certificate and rejects quiz saves.
* Real mounted author at320/1440: blank fields, Audience/Difficulty persistence,
  preview computed color/size/alignment/background, keyboard Previous/Next and
  optional quiz toggle (three fields); incomplete quiz/blank save focus errors with
  no writes. Same-tick guard, same-route confirmed versions1–5, retained input and
  uncertain-save lock/focus pass. Unknown-create actual-action replay adds no write.
* Real mounted upload: file replacement, extraction failure/retry and mode switch
  remove old preview; keyboard Save and publish persists private review. Parser/
  actual extraction-action tests separately verify real PPTX relationship order,
  slide boundaries, no silent seventh/overlong/blank-slide discard, text2401
  rejection and1201-character long-token preservation, signatures and archive limits.
  Mounted upload extraction is stubbed; this is **not deployed multipart acceptance**.
* Actual route renderers: owner-filtered history above steps on main Create only;
  no history on blank/manual/upload or dashboard; no URL-selected ready-made draft.
  Teaching keeps published roster/enrollment controls rather than private history.

**Visual evidence actually opened:** all under
`C:\Users\SOLUSER\AppData\Local\Temp\forge-slide-authoring-AwlPYg\`:
`manual320.png`, `manual1440.png`, `player1440.png`, `upload320.png`,
`upload-review320.png`. UI harness now explicitly sets1440 (previous filename alone
did not establish that width). Images are synthetic and retained outside Git.
Forms/text wrap without horizontal overflow at320; keyboard focus/error/success
spot-checks passed. Existing global CSS with Tailwind import removed and adapters
is used; these are component checks, not full routed-browser or accessibility approval.

**Product defects:** none reproduced in this bounded scope. The selector and shell
quoting failures above were QA test/probe failures, not weakened product assertions.

**Preservation/cleanup:** initial status had27 modified tracked files and8 untracked
implementation files; all preserved, only the QA test added. Baseline protected
176-file aggregate (src/supabase/tests/scripts/.github + manifest/config/type files)
was `8345d3c49e5472e80cdbd1d8781c8685171eef9b541eb6c25478f5f5bbed8519`;
final aggregate matches when excluding the new test and normalizing the two
intentionally strengthened test hashes to baseline. Thus all174 other protected
files, including all application/migration/harness/runner work, are byte-identical.
Historical `_ran`, manifests/config/type files have no Git diff; Next dependency
still exists. Owned command sessions completed; browser/PGlite finally cleanup
reported no error and process check found no Playwright Chromium helper.
No server/build snapshot was created; existing `.next`/dependencies untouched.

**Open, NOT passes / coordinator handover:**

1. Exact additive migration:
   `supabase\migrations\20261105093000_slide_authoring.sql`.
   **Target Supabase application NOT RUN.** After separate target approval, confirm
   prerequisites/current schema, back up schema/data/grants, apply through authorized
   migration workflow without editing `_ran`, refresh PostgREST schema cache, and
   deploy matching application code. Then verify target grants/cache and connected
   create/update/review/resume/report flows. File existence/local PGlite is not
   target application. Historical malformed-row audit/constraint VALIDATE needs
   separate authorization.
2. Migration has a transaction for application failure, but post-commit rollback
   is **NOT tested**. Restoring old10 checks over new short attempts/lessons can
   fail; use coordinated forward repair or a reviewed application/data restore.
   Do not blindly drop new snapshot columns or tighten historical data checks.
3. Deployed action/multipart transport, races, admin approval integration and PDF
   worker packaging remain **UNVERIFIED**; prior linked-dependency packaging probe
   was inconclusive. No local server/build/remote operation was authorized here.
4. Binary **PPT/DOC**, original layout/fonts/images/full-format fidelity and original
   file retention remain **UNFULFILLED**. Ordered PPTX/text-only import does not
   satisfy them. Current explicit limits are4MiB/text2400/PPTX3–6 ×400 characters.
   Full accessibility, content-owner approval and overall feature completion are
   not claimed.

## 5 November 2026 — single Create lesson/manual/upload trace (local implementation; QA requested)

**Owner/scope:** local application/schema/tests by the assigned implementation owner;
Coordinator retains acceptance/handover. Baseline Git status was clean (Git required
its explicit installed executable; bare `git` was not on PATH). Existing work,
all prior `_ran` migration names and unrelated account/reflection/OpenRouter code
are unchanged. No dependency/manifest change, install, environment-file read, actual
dotenv/setup loader, connected service/test, provider call, remote migration, commit
or deployment. Existing Node25.2.1, installed dependencies, Chromium153.0.8010.12 and
in-memory PGlite only. Sibling skills were absent; repository equivalents were read.

**Falsifiable hypothesis / root cause:** the application admitted slides with zero
or three questions, but the original SQL CHECK required exactly ten. PGlite reproduced
code **23514 / constraint `forge_lessons_content_check`** from the unchanged
`20260923_learning_ran.sql`. The initial strict AI schema test also failed (`3 !== 4`).
Separating stored slide validation from the plain `.shape`/JSON-schema AI object,
plus an additive migration, repairs those mismatches. Standard AI remains 4–6 slides,
exactly ten questions. Slides remain bounded at 3–6 slides, quiz absent or 3–10.

**Delivered boundaries:** owner-only history queries/rendering only on main Create;
blank manual and separate upload; no ready-made starter selected by URL. Dashboard
creation history removed; teaching becomes a published roster selector while keeping
enrollment management and existing AI teaching import. Four styles persist and render
in preview/player. Slides skip manufactured practice. No-quiz lessons have no quiz
or certificate; 2/3 passes and 1/3 fails across saved attempts, resume, reports, progress,
dashboard and owner-only certificate download. Answer keys remain server-side until
the learner submits. All slide authors, including trusted instructors/admins, save
privately or request review; forged publish/template flags cannot publish. A separate
admin-only approval action checks the saved version/request. Plain Save clears review
and publication timestamp. Studio/admin caches are revalidated on creation.

Same-tick/ref guards block duplicate saves. Acknowledged IDs/versions survive repeated
saves and actual Studio refreshes, with focused success feedback; ambiguous creation
or update acknowledgements lock replay and retain input. Upload file/mode changes,
failed extraction and transport errors cannot leave an old preview saveable.
PPTX units now come from the existing safe parser's real presentation relationships,
not blank paragraphs. Text cannot silently disappear through regex splitting,
six-block slicing, 100/400-character clipping or the old 20k extraction truncation.

**Migration:** new `supabase\migrations\20261105093000_slide_authoring.sql` only.
Keeps standard ten-answer snapshots, adds explicit snapshot template/count fields for
slide attempts/resume, bounds scores by saved totals, and rejects NULL/wrong-type/count
loopholes. `NOT VALID` preserves historical rows (including old malformed rows) while
enforcing future writes/updates; no rows/policies/table grants are deleted or replaced.
PGlite checks existing lesson/attempt/resume retention, repeated migration execution,
browser-role denial, malformed JSON structures/answer arrays and actual action inserts.
Remote application is **NOT RUN**; historical cleanup/constraint validation needs
separate authorization. Action CHECK failures return static, actionable migration/cache
guidance, never raw database diagnostics.

**Exact application inventory (relative Windows paths):**

* `src\app\studio\page.tsx`, `src\app\learning\actions.ts`,
  `src\app\teaching\actions.ts`, `src\app\teaching\page.tsx`,
  `src\app\dashboard\page.tsx`, `src\app\progress\page.tsx`,
  `src\app\reports\page.tsx`, `src\app\courses\[slug]\page.tsx`,
  `src\app\courses\[slug]\lessons\[lesson]\page.tsx`,
  `src\app\api\certificates\[id]\route.ts`.
* `src\components\create-lesson.tsx`, `src\components\learning-controls.tsx`,
  `src\components\lesson-preview.tsx`.
* `src\lib\learning.ts`, `src\lib\slide-lesson.ts`, `src\lib\resume.ts`,
  `src\lib\reporting.ts`, `src\lib\learning-server.ts`,
  `src\lib\teaching-material.ts`.
* New tests/harnesses: `tests\slide-authoring.test.mjs`,
  `tests\slide-authoring-ui.test.mjs`, `tests\slide-authoring-harness.mjs`,
  `tests\offline-run.mjs`, `tests\offline-network.mjs`,
  `tests\offline-build.mjs`, `tests\offline-build-guard.mjs`.
  Adapted focused regressions: `tests\manual-authoring.test.mjs`,
  `tests\curriculum-ui.test.mjs`, `tests\lesson-generation-harness.mjs`,
  `tests\progress.test.mjs`, `tests\resume.test.mjs`,
  `tests\teaching-material.test.mjs`. Retained legacy fixture/editor coverage;
  obsolete starter-default route assertions now test the current blank Create contract.
* This tracker, README and the one new migration above; no CSS/config/dependency edits.

**Commands and actual results:** all Node commands below use the `tests\offline-run.mjs`
prefix (OS-only allowlist, fixed Windows/Node PATH, inherited network denial).
The runner suppresses only Node's deferred MODULE_TYPELESS_PACKAGE_JSON warning,
which otherwise collides with an existing test's JSON-only diagnostic interception.

| Command after `node tests\offline-run.mjs` | Actual evidence |
| --- | --- |
| `--experimental-strip-types --test --test-concurrency=1 tests\learning.test.mjs tests\slide-authoring.test.mjs` | Baseline **7/8**, AI schema red; old SQL failure reproduced. After split, **8/8** |
| `--experimental-strip-types --test --test-concurrency=1 tests\slide-authoring.test.mjs` | Final **3/3**: actual actions, old/new SQL, owner/history/report/certificate renderers |
| `--experimental-strip-types --test --test-concurrency=1 tests\slide-authoring.test.mjs tests\slide-authoring-ui.test.mjs` | Expanded **4/4**: malformed SQL attempts/resume, no-quiz and 3-question saves; actual Studio refresh/current versions; duplicate/uncertain saves; four styles/player; 2/3 pass, 1/3 fail; upload stale/error recovery and 320px wrapping |
| `--experimental-strip-types --test --test-concurrency=1 tests\teaching-material.test.mjs tests\slide-authoring.test.mjs` | **19/19**, including real ordered PPTX boundaries, mode tampering, explicit bounds, long-token preservation and retained parser security/signature limits |
| `--experimental-strip-types --test --test-concurrency=1 "tests/*.test.mjs"` | First expanded gate **377/379**: outdated curriculum harness import + deferred Node warning interception. Repaired harness/runner; full serial **378/378** (324.18s), then strengthened final rerun **378/378** (342.54s), zero failures/skips/cancellations |
| `node_modules\typescript\bin\tsc --noEmit --incremental false` | Exit0, no Next env loader/typegen in repository |
| `node_modules\eslint\bin\eslint.js` plus the owned application/test paths above | Exit0; unused imports found in first pass were removed |
| `tests\offline-build.mjs` | Final allowlisted env-file-free snapshot: sequential `next typegen` → direct TypeScript → `next build --webpack` passed, exit0. No app server. `forge-slide-build-Ag2VIS` snapshot/junction removed in `finally` |
| Explicit installed `git.exe --no-pager diff --check` | Exit0 |

Other intermediate reds were local implementation/test corrections, not hidden passes:
the runner's first Windows absolute `--import` path needed a `file://` URI;
stacked Zod minimum initially retained four slides; one misplaced parser export failed
syntax/TypeScript; mounted selectors needed accessible roles for populated textareas
and a CSS-module adapter; PGlite timestamps needed PostgREST-shaped serialization and
resume fixtures needed isolation. Legacy success wording was retained; a known-rejection
fixture now uses definite23514 rather than an ambiguous error object. All were rerun.

**Build-probe limitation:** an additional worker-file trace assertion failed after a
successful build in the linked-dependency snapshot. A speculative explicit import of
the existing PDF worker did not resolve it; it and that assertion were removed.
Dependencies live outside that snapshot's tracing root, so this is not reliable proof
of a deployment defect or of correct worker packaging. No production config was changed.
Target `/studio` PDF worker packaging remains an independent QA check, not a local
release claim.

**Visual/cleanup evidence:** synthetic manual320 and player1440 images were actually
opened at `C:\Users\SOLUSER\AppData\Local\Temp\forge-slide-authoring-4Hi9js`;
the later strengthened run's upload320 was also opened at
`C:\Users\SOLUSER\AppData\Local\Temp\forge-slide-authoring-YIYX8x`.
Final manual320/player1440/upload320 images were also opened at
`C:\Users\SOLUSER\AppData\Local\Temp\forge-slide-authoring-KkNIrd`.
Browser contexts/processes and PGlite instances close in `finally`; all owned build
snapshots unlink their dependency junction before recursive deletion. Screenshot
artifacts are retained in Temp for QA, not checked into Git. Repository dependencies
and existing `.next` artifacts are not rebuilt/removed. No detached helper/server.
Final filesystem checks confirm `forge-slide-build-Ag2VIS` absent and installed
`node_modules\next\package.json` intact; protected `_ran`/manifest/config/type files
have no Git diff, and final whitespace check exits0.

**Outstanding / acceptance:** binary PPT/DOC and original-layout/full-format import
remain unsupported, explicitly shown before upload. No OCR, original-file persistence,
external converter or AI fallback was added. Technical limits:4MiB files, text≤2,400
characters; PPTX slide mode3–6 slides with1–400 text characters per slide. Blank padded
text slides must be authored before saving. Coordinator should request independent QA
of the frozen local trace, then separately authorize target migration/cache/transport,
admin approval, deployed PDF packaging and accessibility/owner content review.
This is not connected acceptance, deployment or release certification.

## 3 November 2026 - Hide Daily 4D reflections for all users (LOCAL PASS)

**Owner/request:** assistant implementation of the owner's explicit request to hide
Daily 4D reflections from all users. This supersedes historical reflection-demo
requirements; unrelated lesson content, approval gates and deferred scope are unchanged.
Local source/test/documentation edits only; no deployment, environment-file reads,
remote database changes, migrations, provider calls or data deletion.

**Dependencies/deliverable:** traced the shared learner shell, reflection page, all
five server actions, existing offline harness and account export. Removed the shared
navigation item, set `dailyReflectionsEnabled = false`, return not found at the page,
and return the existing explicit `unavailable` result at every action before auth or
data access. Existing owner-scoped export and account deletion remain unchanged.

**Acceptance/hypothesis:** the hidden feature cannot be reached through desktop/mobile
navigation or the actual page/action entry points by learners, instructors or admins.
Offline actual-route/action tests also cover anonymous users, forged inputs, zero
auth/service/query calls and an unchanged seeded reflection row. Existing enabled-mode
CRUD/page/UI tests opt in only inside the synthetic harness to preserve regression
coverage of retained implementation. No production opt-in was added.

**Fresh verification:** Windows, existing Node/dependencies, offline Chromium
153.0.8010.12 and in-memory PGlite; no app server or connected service:

| Command | Actual result |
| --- | --- |
| `node --experimental-strip-types --test --test-concurrency=1 --test-name-pattern="daily reflections" tests\reflections.test.mjs tests\reflections-ui.test.mjs` | **2/2 passed** after correcting the new test's profile-link selector; mobile keyboard open/Tab/Escape, role-specific remaining links and 320/1440 layouts covered |
| `node --experimental-strip-types --test --test-concurrency=1 tests\reflections.test.mjs tests\reflections-ui.test.mjs tests\account.test.mjs tests\reports-ui.test.mjs tests\interviews-ui.test.mjs` | **83/83 passed**, exit 0; retained reflection CRUD/UI, account export/deletion and shared-shell reports/interviews regressions |
| `node node_modules\eslint\bin\eslint.js src\components\learner-shell.tsx src\lib\reflections.ts src\app\reflections\page.tsx src\app\reflections\actions.ts tests\reflections.test.mjs tests\reflections-ui.test.mjs` | Exit 0 |
| `node node_modules\typescript\bin\tsc --noEmit --incremental false` | Exit 0 |

Navigation screenshots are synthetic, not connected acceptance. The initial mobile
capture occurred mid-transition; the new test now waits for the drawer's left edge
to reach zero before assertions/capture. No full-suite or Next build claim.
Independent QA and deployment verification are requested; this is not release approval.

## 22 October 2026 — signup production diagnostics (LOCAL PASS; production cause unverified)

**Owner/request:** assistant implementation for the owner's report that production registration fails. Local changes only; no production access, deployment, environment-file reads, provider requests or database changes. Existing scope/approval gates remain unchanged.

**Dependencies/deliverable:** traced the signup action, public configuration, Supabase server client and existing synthetic auth/eligibility harnesses. Added structured server-console start/terminal events with fresh per-attempt diagnostic IDs, elapsed time and validation/configuration/client/provider stages. Failed attempts retain allowlisted Auth codes, bounded HTTP statuses and fixed database/email/network/unknown categories; returned and thrown failures are distinguished. README includes Vercel filtering and next-check guidance.

**Acceptance:** no submitted personal details, credentials, provider bodies, raw error messages/stacks or environment values are serialized. Unknown codes/statuses are omitted as `null`. Validation still blocks Auth calls; provider payload, sanitized public failures, 13+ rules and verification redirect are preserved. Callback configuration is checked before constructing the server client, allowing configuration failures to be identified separately. A failing log sink does not block registration. Completion means an error-free SDK result, not verified inbox delivery or a guaranteed new account.

**Fresh verification:** Windows / existing Node v25.2.1 and dependencies, OS-only child environments, VM-injected synthetic Auth/config/logs, offline Chromium and in-memory PGlite:

| Command | Actual result |
| --- | --- |
| `node --experimental-strip-types --test --test-concurrency=1 --test-name-pattern=signup tests\auth.test.mjs tests\eligibility.test.mjs` | **23/23 passed**, zero failures/skips |
| `node --experimental-strip-types --test --test-concurrency=1 tests\auth.test.mjs tests\eligibility.test.mjs tests\public-config.test.mjs` | **52/52 passed**, zero failures/skips; includes offline mounted auth UI and DB eligibility checks |
| `node node_modules\eslint\bin\eslint.js src\app\auth\actions.ts tests\auth.test.mjs tests\eligibility.test.mjs` | Exit 0, no diagnostics |
| `node node_modules\typescript\bin\tsc --noEmit --incremental false` | Exit 0, no diagnostics; no Next environment loader/typegen |
| `git --no-pager diff --check` (explicit installed Git executable) | Exit 0 |

Tests cover validation-only logs, successful signup, returned/thrown provider failures, SMTP/database hints, rate limiting, disabled signup, weak passwords, network errors, malicious/unrecognized diagnostic fields, configuration/client exceptions, correlation separation, response redaction and failed log sinks. Node emitted existing typeless-package performance warnings only. No full suite or Next build run. Production root cause remains **UNVERIFIED** until an authorized deployment includes this code and a real attempt is correlated with hosting/Supabase logs; no live signup, SMTP or trigger repair is claimed.

## 22 October 2026 — independent frozen paths + ONE fresh full integration gate: LOCAL PASS

**Decision/scope:** no substantive functional/privacy/reliability defect reproduced.
Independent QA read the complete six-file packet, actual currentUser/database/visibleLessons,
requireAiAccess/isAiEligible, canonical recommendations and shared-client contracts, and
nearby harnesses. Curriculum UI diff is exactly the two auth I/O-boundary additions.
Required sibling skills were absent; loaded existing `.github/skills` equivalents.
No agents, application/test/script/CSS/SQL/manifest repairs, assertion weakening or timeout
changes. Prior dirty work, all six writer hashes below, `_ran` filenames (application
UNVERIFIED), shared20Oct no-overrides policy/current free model and six deferrals preserved.
QA repository edits are **only README.md and this tracker**.

**Safety established before execution:** existing Node25.2.1, offline Chromium153.0.8010.12,
in-memory PGlite and installed dependencies only. Inspected package/tests and prior safe
runner/guard/snapshot pattern; new temp-only runner uses the same OS-only allowlist/fixed
Windows+Node PATH and inherited `NODE_OPTIONS` fetch/http/https/socket/TLS denial, including
child processes. No actual `.env*` opened/copied/imported, app setting inherited or actual
environment loader run. Setup tests adapt the loader inside a synthetic VM only.
Browser synthetic document is locally fulfilled; unexpected requests aborted/service workers
blocked, zero unexpected requests/page errors asserted. No Supabase/catalog/provider/SMTP/
quota/model probe, setup CLI, connected e2e/instructor suite, account read, server, install,
migration, commit or deployment. Actual local code is exercised with framework/I/O adapters,
not fabricated live-provider evidence.

From repository root, aliases:
`$node='C:\Program Files\nodejs\node.exe'`;
`$qa='C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-path22-20261022-QA'`;
`$gate="$qa\gate.mjs"`;
`$git='C:\Users\SOLUSER\AppData\Local\github-copilot-git-2.53.0-4\cmd\git.exe'`.
The gate creates the OS-only guarded child, captures bounded console summaries and retains
synthetic-only transcripts/command metadata; it refuses a duplicate command-label execution.

| Exact fresh invocation / child command | Independent result |
| --- | --- |
| `& $node $gate probe` → `node --test --test-concurrency=1 "$qa\path-probe.cjs"` | **1/1**, seven scenarios, exit0, wall0.919s; before the full suite |
| `& $node $gate test` → `node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" test` | Standard package script `node --experimental-strip-types --test --test-concurrency=1 tests/*.test.mjs`: **340/340**,31 files,0 failed/cancelled/skipped/todo, exit0; Node168.685173s/wall169.221s. **ONE run, no full rerun** |
| `& $node $gate lint` → `node node_modules/eslint/bin/eslint.js src/app/paths/actions.ts src/app/paths/page.tsx src/components/learning-path.tsx tests/recommendations.test.mjs tests/learning-path-ui.test.mjs tests/curriculum-ui.test.mjs` | Exit0,8.526s, no diagnostics |
| `& $node $gate tsc` → `node node_modules/typescript/bin/tsc --noEmit --incremental false` | Exit0,6.928s; direct repo check only |
| `& $node $gate snapshot` → snapshot-only `node node_modules/next/dist/bin/next typegen` | Exit0,.924s |
| Same serialized snapshot gate: `node node_modules/typescript/bin/tsc --noEmit --incremental false` | Exit0,4.636s |
| Same serialized snapshot gate: `node node_modules/next/dist/bin/next build --webpack` | **Exit0**,31.988s; Next16.3.5 webpack, compile/types/static generation/traces complete;24 static-page tasks; accumulated paths/reports/reflections/studio/teaching routes included |
| `& $node "$qa\cleanup.mjs"`; `& $node $gate verify`; `& $git --no-pager diff --check` | Owned snapshot removed after unlinking junction; source/Next freeze identical; whitespace exit0 |

**Independent path findings:** temp probe loads the actual action/auth/eligibility/
recommendation helpers and pauses a real Promise at the provider I/O boundary. Entry
user+error produces only auth, zero service/quota/provider calls. While pending, replacing
the User object with same-owner grant=false rejects the entire path, leaves the original
grant true, and performs no post-failure catalog/attempt reads. Changed owner, expired auth
or returned user+error cause only fresh auth after inference, no further service reads.
One now-noncurriculum candidate rejects the entire two-item result; a next valid request
recovers. Payload excludes fixture profile text/email/user/course IDs. This does **not**
claim atomic external-call revocation: already-started inference may consume allowance.

Fresh full-suite actual-action tests additionally cover minors/unknown/ungranted adults,
invalid selections/consent/no candidates, quota/profile/catalog/passed/provider failures,
fresh same-owner success, malicious IDs and post-inference age/title/metadata/visibility/
passed invalidation without partial acceptance, persistence or enrollment. Actual page
rejects user+autherror before privileged reads and changes its client key for owner/coarse
preferences. Native SSR and mounted actual client cover sharing controls, local-only
recommendations, same-tick duplicate-submit guard/no queued replay, explicit Enter retry,
transport/returned errors with retained selections and focus, success focus, whole stale
path discard, pending-context/late-old-owner completion and no inference on reload/props.
Existing desktop/mobile native keyboard workflows also pass in the full suite. The earlier
legacy manual-authoring timeout did **not** recur; no diagnostic rerun or timeout increase.

**Fresh images ACTUALLY opened:** all paths are under
`C:\Users\SOLUSER\AppData\Local\Temp\`:
- `forge-path-Wf8zty\pending-320.png`, `error-320.png`, `success-1440.png`, `local-320.png`.
- `forge-reports-bPDFLY\reports-320.png`, `reports-1440.png`.
- `forge-reflections-20261022-am0imy\unconfirmed-create-320.png`, `validation-focus-1440.png`.
- `forge-manual-qa01-KuSGnw\starter-review-sdlc-small-change-320.png`.
Consent/quota-uncertainty/retained input text wraps, local access remains visible, result/
native detail focus is visible, report long IDs wrap and statuses are textual. Visual
contrast/readability spot-check only, no computed contrast-ratio/full WCAG/screen-reader
approval. Path mounts use actual client/CSS with framework icon/link/action adapters,
not a connected full-shell screenshot. Other full-suite images were captured, not all opened.

**Freeze/evidence/cleanup:** `$qa\freeze.json` fingerprints **2,244 entries**, including
src/tests/scripts/schema/config/manifests/showcase and existing repository `.next`; existing
links recorded, not traversed. Aggregate SHA256 before/after:
`6c87c3cceb27b4530f7098e4e4ea7240751430f0077816fbeb10fcf5f70ee4ba`.
All six packet SHA256s match the writer table below. Snapshot physically copied selected
src/config only, no env files; sole dependency junction referenced existing repo modules.
`snapshot-final-hashes.json` retains362 snapshot file hashes; aggregate:
`4c477a03f6d3a809244451183f34a516ed2f3de74d25397f7b3675d328f8c3dc`.
Retained `$qa\{path-independent-probe,npm-test,packet-eslint,repo-direct-tsc,snapshot-typegen,snapshot-direct-tsc,snapshot-build}.{txt,json}`,
runner/guard/repro, hashes and `cleanup.json`; images retained above. Initial freeze helper
refused an existing generated Next link before tests; temp helper was corrected to record
link identity without traversal, not an application/test failure. Owned snapshot and
junction gone, repository node_modules/Next files intact; test teardown closes owned
browsers/contexts/PGlite. No connected fixture/service or cleanup failure.

**Remaining work / limits:** selected local code now has a fresh integration checkpoint;
next critical step is planned shared-screen acceptance, not adding deferred features or
requesting login now. Still **THREE connected DEMO FLOWS** (core author/learner/quiz/
certificates/reports; private4D CRUD/export/delete; one genuine eligible free-AI generation)
**plus TWO non-flow approval packages** (owner curriculum/reflection/source-fact/answer-key/
pedagogy review; final rehearsal/accessibility/submission) = existing **FIVE workstreams**.
All three locally implemented, connected acceptance pending; optional paths are not a
fourth flow. Owner-approved10–12-minute TARGET unchanged, rehearsal NOT RUN/duration
UNMEASURED;31Oct supervised HK13+ and six deferrals unchanged. Actual Next action transport,
Postgres races/atomicity, target schema/grants/cache/app version and genuine provider truth
remain untested. Future login alone does not authorize writes/AI; target/action scope
approval still required. Coordinator owns final acceptance, not whole-demo/production/
academic certification. `PROJECT_SHOWCASE.md:57–60` needs writer synchronization of the
writer-only/QA-requested/no-fresh-suite wording; read-only here, not a functional blocker.
Earlier305/report37+6/reference61/diagnostic40+41 and writer59/22 remain dated history.

## 22 October 2026 — existing optional paths: bounded reliability repair / frozen writer handoff

**Owner/scope:** approved optional-maintenance slice only, `src/app/paths/{actions.ts,page.tsx}`,
`src/components/learning-path.tsx`, existing recommendations tests, new path UI tests,
curriculum UI I/O mapping and these three status documents. No other source/CSS/helper/
policy/schema/dependency/package edits. Initial worktree already contained report/setup
source, tests and documentation changes; preserved, including user migration `_ran`
renames (application UNVERIFIED). Applicable delivery/security/verification skills were
found under `.github/skills`; requested sibling skill paths were absent. Git absent on
PATH; used existing bundled Git. No agents.

**Current count/decision reconciliation:** **THREE connected DEMO FLOWS** (core
author/learner/quiz/certificates/**reports**; private daily4D CRUD/export/delete; one genuine
eligible free-AI generation) **plus TWO non-flow gates** (owner review of three lesson
sources/keys/pedagogy; final rehearsal/accessibility/submission approval) = old **FIVE
workstreams**. All three flows have local implementations, actual connected acceptance
PENDING. Optional paths add no fourth required flow/module/reactivated scope. Six deferrals
unchanged: coding runner, binary PPT, student slide assistant, planner, genuine tailoring,
targeted AI revisions. Deadline31Oct, supervised HK13+. Owner14:04 approves10–12-minute
TARGET; rehearsal NOT RUN/duration UNMEASURED.09:54 local-first/shared-screen-later remains;
no login request now. Reports37/37+6/6 and diagnostic40/40+41 are previously accepted bounded
LOCAL evidence; showcase current sync is done. QA-pending statements below are dated
history, not current status. Earlier305/build/reference61 are not fresh all-app acceptance.

**Falsifiable hypothesis and RED before repair:** original `requireUser` ignores a returned
auth error if user exists; both eligibility checks reuse the same User snapshot. The
existing post-request test changed age, not a replacement trusted-user grant. Actual
`currentUser` rejects error/no-user; actual eligibility reads fresh profile age plus the
supplied user's trusted grant. Added synthetic getUser-boundary regressions: initial
user+error and replacement object with same ID/grant=false after completion. Original
action accepted both. Initial red recommendations run:16 pass,3 failures (two failed
subtests plus parent), exit1. Actual page/client red:0/2, exit1; page failed to reject
user+error, transport rejection produced no alert (existing5000ms assertion timeout).
No timeout changed, manual retry hack or canned permission answer used.

**Repair:** action catches auth/operational failures with fixed feedback/no path, refreshes
trusted identity before privileged entry reads and once after inference, requires same
owner before further catalog/passed reads, then uses actual fresh grant/profile age.
Exactly two auth calls on success; no speculative extra refreshes. Fresh acceptance
revalidates visibility, canonical title/topic/metadata and new passes. No atomic lock
across external requests is claimed. Page independently rejects user+autherror/missing
user before profile/catalog reads, preserving login redirect/config/failed-load UX.
Client key is owner ID plus bounded coarse preferences, not full catalog JSON.

Client uses synchronous submit ref plus controlled topic/goal/sharing, explicit-only
retry, sanitized transport rejection (possible allowance use/no automatic retry),
error/result focus and canonical `validatePathResponse` reuse. Entire stale result is
discarded on catalog/passed/title/metadata/selection/owner/preferences/eligibility change;
context revision/unmount guard rejects late completions. No automatic inference on
mount/props/reload. Local recommendations always remain; no enrollment/durable path,
new quota/table/write, provider field, model/budget/fallback or20Oct policy change.
Existing report CSS was untouched.

**Harness boundaries/safety:** actual auth/eligibility/recommendation helpers/action and
actual page/client, synthetic auth/Supabase/provider I/O only. Recommendations loader
now executes real `currentUser`, `database` and `visibleLessons` with synthetic module
environment and real eligibility policy. Curriculum UI change is **only** a new
`@/lib/supabase/server.createClient().auth.getUser()` boundary mapping consumed by the
actual paths page; no original assertions weakened. Browser offline/service workers
blocked; all unexpected requests aborted. Actual mounted React uses existing installed
Chromium153.0.8010.12,320/1440 and unchanged5000ms assertions. Existing eligibility/
curriculum tests use disposable local in-memory PGlite only. OS-only child allowlist:
SystemRoot,WINDIR,COMSPEC,TEMP,TMP,OS,PATHEXT,USERPROFILE,LOCALAPPDATA,APPDATA,
PROCESSOR_ARCHITECTURE,NUMBER_OF_PROCESSORS; fixed Windows/Node PATH. Existing safe
runner/network guard were read before reuse. No app settings inherited/read/copied;
no `.env*`, provider/catalog/Supabase/SMTP/quota, setup/check-ai/e2e/instructor run,
server/install/migration/commit/deploy. Only synthetic fixture strings in output.

Command aliases from repo root:
`$node='C:\Program Files\nodejs\node.exe'`;
`$qa='C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-task22-QA22c719'`;
`$safe="$qa\safe-run.mjs"`; `$guard="$qa\network-guard.cjs"`;
`$git='C:\Users\SOLUSER\AppData\Local\github-copilot-git-2.53.0-4\cmd\git.exe'`.
Aliases describe exact commands; no environment loader/Next startup.

| Command (all local) | Actual writer result |
| --- | --- |
| `& $node $safe --require $guard --experimental-strip-types --test --test-concurrency=1 tests/recommendations.test.mjs` | RED16 pass/3 fail, exit1,1.224s; after action repair GREEN19/19, exit0,1.113s |
| `& $node $safe --require $guard --experimental-strip-types --test --test-concurrency=1 tests/learning-path-ui.test.mjs` | RED0/2, exit1,8.644s; auth-page rejection and transport feedback reproduced |
| `& $node $safe --require $guard --experimental-strip-types --test --test-concurrency=1 tests/learning-path-ui.test.mjs tests/recommendations.test.mjs` | After page/client repair21/21, exit0,6.344s |
| `& $node $safe --require $guard --experimental-strip-types --test --test-concurrency=1 tests/recommendations.test.mjs tests/learning-path-ui.test.mjs` | Expanded real DB/service-error boundaries22/22, exit0,5.888s; final extra age/title/metadata/keyboard/reload coverage22/22, exit0,6.056s |
| `& $node $safe --require $guard --experimental-strip-types --test --test-concurrency=1 tests/recommendations.test.mjs tests/learning-path-ui.test.mjs tests/curriculum-ui.test.mjs tests/eligibility.test.mjs tests/openrouter.test.mjs` | Requested serial combo59/59,0 failures/skips/cancellations, exit0; Node21.942940s/wall22.059s; before final test-only extensions above |
| `& $node $safe node_modules/eslint/bin/eslint.js src/app/paths/actions.ts src/app/paths/page.tsx src/components/learning-path.tsx tests/recommendations.test.mjs tests/learning-path-ui.test.mjs tests/curriculum-ui.test.mjs` | Initial exit0,10.655s; final post-extension exit0,4.460s, no diagnostics |
| `& $node $safe node_modules/typescript/bin/tsc --noEmit --incremental false` | Exit0,7.437s; direct only, no Next typegen/build/env loader |
| `& $git --no-pager diff --check` | Exit0 before and after status docs; separate new UI test trailing-whitespace/conflict-marker check passed |

**Coverage:** entry user+error/expired/config; replaced fresh grant/owner/session/autherror/
auth throw; ages12/13/17/unknown/no grant; fresh same-owner success/two auth reads;
invalid topic/no consent/profile/age/quota/no candidates => zero inference; actual catalog/
passed read failures before/after, post age failure and provider/transport errors => no
accepted/stale/partial path or raw details. Only existing quota RPC is writable; table
adapters support reads, no enrollment/persistence methods. Payload still excludes profile
text, IDs, grades and private extra fields. Pure validator rejects malicious output and
metadata/title/visibility/new-pass changes. Browser checks duplicate same-tick submits
do not queue another call, explicit Enter retry, returned-error recovery/focus/retained
inputs, success-heading focus, all changed contexts, pending late completion, actual-page
new-owner keyed unmount and reload/remount/prop changes without automatic inference.
No unexpected browser requests/page errors; no horizontal overflow320/1440.

**Images captured/opened:** initial green `forge-path-EuEBzN` pending-320,error-320,
success-1440,local-320 were opened. Final extended run images retained under
`C:\Users\SOLUSER\AppData\Local\Temp\forge-path-lc99zD\` with the same four filenames
(`.png`), opened for final inspection. Representative pending/error/success/local only,
not full WCAG/screenreader approval. Earlier red artifact `forge-path-l5bTaE` and green
WQORnd/MJwl1r artifacts are historical, not independent QA. Focus/assertion results are
actual browser checks, not inferred from images.

**Frozen source/test SHA256 (before status-doc edits):**

| File | SHA256 |
| --- | --- |
| `src/app/paths/actions.ts` | `8a0a661feacbd8e568c52ed74461363103f8d96dabf7e55ea1af5eb1ac354f97` |
| `src/app/paths/page.tsx` | `3e8f21b9ee1a86a7551ad21795798ed936ee5148eab525c074dcd7cd08da407a` |
| `src/components/learning-path.tsx` | `c2b4675665290dcc2019b1b0e4b581130ba8a8a80f1c2b55f616492ad81d13cb` |
| `tests/recommendations.test.mjs` | `827f3fe9640bcbee6d482dfa842493722b0c4c2d7ad0a3769d2b0304c65e1e01` |
| `tests/learning-path-ui.test.mjs` | `f51fc6be19fe7525e55bd4d0fe6db78a44a0818ba5cc789487b11326a1b19953` |
| `tests/curriculum-ui.test.mjs` | `4d1e4cdb69caeb87c57d2d5f9c4b8a701e178e0aba1b76cc2fecaaceb2c8426b` |

**Cleanup/open gates:** owned browser contexts/browsers and local fixture handles closed
through test teardown; bounded processes exited, no services or connected fixtures.
No cleanup failure. Non-failing Node typeless-package warnings remain unchanged.
Post-documentation SHA256 recheck matched all six frozen source/test hashes above.
**Independent integration QA requested after this freeze:** one fresh full serial suite
and isolated environment-free Next build, plus independent review of this bounded repair.
No full suite/build was run here. Actual Next transport, connected schema/grants/races,
genuine AI/provider truth, owner sources/keys/pedagogy, broader accessibility and final
rehearsal/submission remain unverified/open. Coordinator owns final acceptance; no
self-certified release, atomic Postgres/grant guarantee or production claim.

*The checkpoints below are dated history. Current reports/showcase reconciliation and
remaining-flow count are as above.*

## 22 October 2026 — independent Task09/12 reports: bounded LOCAL PASS

**Disposition:** no substantive defect reproduced in the frozen functional/report/privacy/
role slice; Coordinator retains final acceptance. This is not a vulnerability audit,
whole-project certification or connected acceptance. Read the report packet, original
HEAD report boundary, nearby actual auth/roles/canonical evidence/player/actions, schema
constraints and existing harnesses before execution. Required skills resolved to existing
`.github/skills` after supplied sibling paths were absent. Git absent on PATH; used the
existing absolute bundled Git. No source/test/script/CSS/SQL or assertion/timeout edits.
Earlier dirty diagnostic/starter/reflection/reference work and `_ran` filenames preserved.

**Safety/environment:** repository cwd, existing Node25.2.1, Chromium153.0.8010.12 and
in-memory PGlite. Inspected existing `$qa\safe-run.mjs` and `network-guard.cjs` unchanged;
OS-only child allowlist/PATH as recorded in the writer entry below. No actual app settings
inherited, environment files read/imported/copied or environment loader executed.
Report/auth/permissions/evidence/shell are actual modules; only I/O/framework boundaries
are synthetic. Browser contexts offline, service workers blocked, requests aborted;
zero browser requests/page errors. Report adapters are read-only; existing progress tests
write only disposable in-memory PGlite fixtures, never actual Supabase.

Aliases from repository root: `$node = 'C:\Program Files\nodejs\node.exe'`;
`$qa = 'C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-task22-QA22c719'`;
`$safe = "$qa\safe-run.mjs"`; `$guard = "$qa\network-guard.cjs"`;
`$git = 'C:\Users\SOLUSER\AppData\Local\github-copilot-git-2.53.0-4\cmd\git.exe'`.

| Exact fresh command | Independent result |
| --- | --- |
| `& $node $safe --require $guard --experimental-strip-types --test --test-concurrency=1 tests/reports.test.mjs tests/reports-ui.test.mjs tests/progress.test.mjs tests/learning.test.mjs` | **37/37**,0 failed/cancelled/skipped/todo, exit0; Node17.004869s, wall17.125s |
| `& $node $safe node_modules/eslint/bin/eslint.js src/app/reports/page.tsx src/lib/reporting.ts tests/reports.test.mjs tests/reports-ui.test.mjs tests/instructor-e2e.mjs` | Exit0,5.861s, no diagnostics |
| `& $node $safe node_modules/typescript/bin/tsc --noEmit --incremental false` | Exit0,6.044s; direct only, no Next/typegen/build/env loader |
| `& $node $safe --check tests/instructor-e2e.mjs` | Parse-only exit0,.107s; connected instructor suite **NOT EXECUTED** |
| `& $node $safe --require $guard --experimental-strip-types --test --test-concurrency=1 "$qa\reports-supplement.cjs"` | Initial five functional cases5/5; after adding genuine Tab-driven native details/UUID case, final **6/6**,0 failed/cancelled/skipped/todo, exit0; Node4.072622s, wall4.163s |
| `& $git --no-pager diff --check -- src/app/reports/page.tsx src/app/globals.css tests/instructor-e2e.mjs README.md IMPLEMENTATION_TRACKER.md PROJECT_SHOWCASE.md` | Exit0; explicit new reporting/helper-test whitespace/conflict-marker/final-newline checks also pass |

**What passed:** fresh user+autherror denies before service creation; trusted instructor
ownership/admin published/reviewer-grant scoping; forged metadata/parameters add nothing;
next-request role/grant revocation and unpublishing remove data. Required public-kind and
authorized-ID filters, no private/reflection/transcript/directory reads and no private
sentinels in actual rendered HTML. All four report datasets paginate1051 rows with stable
orders; failures at0/500/1000 reject the whole report, not empty grants or partial success.
Strict required columns/types/versions/evidence/result validation uses a sanitized fixed
error and normal boundary. Canonical learner-route/player key-stripping/progress contract
passes unchanged; answer keys appear only in authorized public report snapshots.

Supplement reuses the existing actual-route harness without importing its tests or
duplicating business helpers. Independently asserts: empty authorized IDs cause **zero
attempt/enrollment reads**; an ordinary reviewer's grant on page3 works and late failure/
revocation fail closed; instructor grants cannot widen ownership; next valid request
recovers after denial/corruption.13 additional wrong-type/evidence/result cases fail closed.
Saved5 remains5 even with all-correct saved answers (no regrading); private membership and
removed learners' public snapshots remain history, outside current counts; repeated current
passes count one roster learner. Legacy timestamp is unknown-version; review/attendance/pass
remain independent, not a funnel. No grading/certificate/retention inference or side effects.

**Fresh images actually opened:** `C:\Users\SOLUSER\AppData\Local\Temp\forge-reports-uX5mJf\reports-320.png`
and `reports-1440.png` (fresh independent execution of mounted actual shell/report harness);
`$qa\reports-keyboard-320.png` and `reports-keyboard-1440.png` (independent actual native SSR
HTML, genuine Tab traversal to Version1 detail, Enter/Space, next-summary focus, UUID
wrapping). Current-version/current-roster/all-version headings, non-color-only statuses,
long ID wrapping, saved scores/selected/correct details and visible focus inspected.
No horizontal overflow at320/1440. Earlier writer B8yDXr images are not reused as independent
evidence. Progress artifacts `forge-progress-20261021-A3N69f` retained, not visually approved.

**Evidence/freeze/cleanup:** tool transcripts314/315/317/318/319; sanitized commands/results/
image hashes retained in `$qa\reports-verification-summary.json`, supplemental cases and
146-file source/test/script/SQL inventory in `$qa\reports-independent-results.json`.
All six individual writer hashes in the table below matched before execution and after
QA/docs;146-file inventory captured before QA doc edits remains unchanged afterward.
Only README/tracker edited; showcase remains read-only. Owned contexts/browsers/PGlite
closed, bounded processes exited, no service started or connected fixture created;
no cleanup failure. Existing user browser untouched. Non-failing typeless-package warnings
are not new product failures; historical writer red regressions/order failure remain below.

**Read-only showcase handoff:** current reports-QA-open statements (lines30,314,362,383
at inspection) need writer/Coordinator synchronization to this bounded independent LOCAL
pass while preserving all connected gates; QA did not silently edit the showcase.

**Untested/open, separately from passes:** no full suite/Next build, actual Next transport,
target schema/cache/grants, connected persistence/publication/revocation races or atomic
multi-query guarantee; no provider/catalog/SMTP/quota, login, server/install, migration,
commit/deploy or agents.20Oct provider policy/AI code unchanged. Coordinator already
accepted diagnostic40/40+41 native probes; earlier305/build/reference61 remain dated,
not fresh reports-wide acceptance. Exactly FIVE selected-demo workstreams stay OPEN:
connected core; owner review of three lessons/sources; genuine eligible free-AI showcase;
connected private4D lifecycle; demo package/rehearsal/accessibility/submission approval.
Not five unbuilt modules; shared prerequisites are not a sixth. Six deferrals unchanged.
Owner14:04 approved10–12-minute TARGET; actual rehearsal NOT RUN/duration UNMEASURED.
Deadline31Oct, supervised HK13+ prototype; no paid-service/privacy/source-review relaxation.

## 22 October 2026 — 14:04 owner-approved continuation; Task09/12 reports LOCAL writer handover

**Current decision reconciliation (dated logs below preserved):** owner explicitly
**APPROVED the 10–12 minute TARGET walkthrough** at14:04 and continued local development.
Actual rehearsal **NOT RUN**; duration **UNMEASURED**. Coordinator already directly
verified showcase's corrected former line289 against actual `updateLesson:132–145` and
accepted the diagnostic LOCAL packet (**40/40 + 41 native probes**). Original version
wording finding is **closed**; that reconciliation required no diagnostic/application
source change. Earlier pending-Coordinator/assumption statements below are historical.
The explicit20Oct provider policy controls; AI/default/model/request code is untouched.

**Scope/ownership:** sole writer, no agents. Loaded delivery/security/verification skills
from existing `.github/skills` after supplied sibling paths were absent. Inspected status,
owned diffs, complete report route, actual auth/permissions, canonical evidence/player/
progress consumers, migration definition and nearby test conventions before implementation.
Preserved prior uncommitted setup/docs work and user `_ran` filenames. Changed only:
`src/app/reports/page.tsx`, new `src/lib/reporting.ts`, tightly scoped report CSS in
`src/app/globals.css`, new `tests/reports.test.mjs` and `tests/reports-ui.test.mjs`,
label-only `tests/instructor-e2e.mjs`, README/tracker/showcase. **No ownership exceptions.**
No global auth/helper, learner/actions/certificates/export/grants/schema/package changes.

**Falsifiable hypothesis / red behavior:** old reports reads only lesson id/title and
unversioned attendance, mixes historical results, and `requireUser` accepts user+autherror.
Actual-route SSR/fresh-auth tests initially **0/2**, missing current-version label and
missing expected rejection. Chosen fix is local fresh `getUser` with both error/no-user
denial before service creation (login redirect; existing configuration boundary preserved),
not a global `requireUser` refactor. Tests execute actual `currentUser` contract and actual
trusted permission helpers; only auth/Supabase I/O and framework boundaries are synthetic.

### Persistent behavior / Task09 + Task12

- New small typed leaf validates complete grant/lesson/enrollment/public-attempt datasets
  with Zod, reuses actual `lessonProgress` (and its `versionEvidence`) rather than duplicating
  evidence semantics. No backfill, regrade, writes or provider. New-data parse/query errors
  are sanitized as **Reports are unavailable**, reaching the standard error boundary.
- Report sections name **Current lesson version**, **CURRENT PUBLIC ENROLLMENT ROSTER**:
  per-learner review acknowledgement / final-quiz reach / public saved pass, each explicitly
  recorded or “no record.” Denominator is current public enrollment only; repeats count once.
  Only same learner+lesson+current version public saved6–10/10 passes. Five/old/private do not.
  Review is optional; no inference from visits/bookmarks/enrollment/failed or passing quizzes.
  Legacy unversioned attendance never becomes current-version evidence. Independent counts,
  not a funnel or comprehension proof; pass without ack can show no review/no attendance.
- **Public attempt history (all versions)** retains all authorized public attempts, saved
  titles/questions/answers/scores, version labels, old fails/passes/retries and removed
  enrollees. Removed enrollees are excluded only from current-roster counts; each passing
  attempt/certificate remains independent. No retention/grade/certificate change.
- Published lessons only: trusted instructors owned only; admins all published; ordinary
  reviewers explicit fresh `forge_reviewers` lesson grants only. Forged metadata/query
  parameters add nothing; next-request role/grant revocation/unpublishing removes content.
  Private/unsubmitted lessons and private enrollments/attempts excluded; no reflection/
  transcript queries or new profile directory. Existing display name reads current user only.
- All four report datasets use checked500-row pagination/stable ordering, tested with1051
  each and first/500/1000-offset failures. No quiet1000 cap, partial counts or failure-as-no-
  grants. Ordering is applied once on the reused lesson builder. **No atomic cross-query
  snapshot guarantee**: multi-session publication/revocation races and transport remain open.
- Responsive scoped non-color-only status text, wrapping IDs and native keyboard details
  retain the actual learner shell. Existing connected instructor suite expectations now
  distinguish seeded legacy attendance (0 current attendance) from current saved pass.
  That suite was **NOT EXECUTED**; only parse/lint checked.

### Actual local commands / results / iterations

Repository cwd; existing Windows Node25.2.1, Chromium153.0.8010.12/PGlite. `$node` =
`C:\Program Files\nodejs\node.exe`; `$safe` =
`C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-task22-QA22c719\safe-run.mjs`;
`$git` = `C:\Users\SOLUSER\AppData\Local\github-copilot-git-2.53.0-4\cmd\git.exe`.
Inspected existing launcher, no edit: child allowlist only
`SystemRoot,WINDIR,COMSPEC,TEMP,TMP,OS,PATHEXT,USERPROFILE,LOCALAPPDATA,APPDATA,PROCESSOR_ARCHITECTURE,NUMBER_OF_PROCESSORS`
and OS/Node PATH. No application settings inherited or environment loader invoked.

| Command (`& $node $safe ...`) | Actual result |
| --- | --- |
| `--experimental-strip-types --test --test-concurrency=1 tests/reports-ui.test.mjs` initial two regressions | **0/2** intended red: user+error reached DB and no current-version label |
| Same immediately after smallest implementation | **2/2** |
| `--experimental-strip-types --test --test-concurrency=1 tests/reports.test.mjs tests/reports-ui.test.mjs` expanded checks | **10/11**; pagination ordering assertion exposed repeated `.order` on reused lesson builder |
| `--experimental-strip-types --test --test-concurrency=1 --test-name-pattern='every report query paginates' tests/reports-ui.test.mjs` after applying order once | **1/1** |
| `--experimental-strip-types --test --test-concurrency=1 tests/reports.test.mjs tests/reports-ui.test.mjs tests/progress.test.mjs tests/learning.test.mjs` first combined | **37/37**, Node18.102s; includes existing actual instructor-permissions offline contract in learning tests, no standalone instructor offline test exists |
| `--experimental-strip-types --test --test-concurrency=1 --test-name-pattern='offline mounted actual shell' tests/reports-ui.test.mjs` after screenshot stabilization | **1/1**; waited for responsive inert state, finished CSS transitions, captured from page top; no app repair |
| Same four-file combined packet, final frozen code/tests | **37/37**,0 failed/cancelled/skipped/todo; Node**18.273s**, wall**18.370s**, exit0 |
| `node_modules/eslint/bin/eslint.js src/app/reports/page.tsx src/lib/reporting.ts tests/reports.test.mjs tests/reports-ui.test.mjs tests/instructor-e2e.mjs` | Final exit0,6.286s; earlier scoped run also passed |
| `node_modules/typescript/bin/tsc --noEmit --incremental false` | Final exit0,8.294s; direct only, no Next env-loading/typegen/build |
| `--check tests/instructor-e2e.mjs` | Parse-only exit0,.140s; no connected suite execution |

Tests exercise real report SSR and actual shared auth/permission/evidence contracts, not
canned authorization answers. Report I/O is a filtering/paginating synthetic Supabase
adapter; existing progress tests use only in-memory PGlite with actual migrations/actions.
Browser contexts offline, service workers blocked, every request aborted; zero requests/
page errors. Covered reviewed-only, quiz-without-submit,5 fail,6 pass/retry, old/legacy
unknown, private/removed records, forged roles and next-request revocation; missing
version/evidence/malformed rows and standard unavailable boundary; long IDs/text and
Tab/Enter/Space/native historical details plus mobile Escape/focus at320/1440.

**Images actually opened:** first combined `forge-reports-cfObpZ/reports-{320,1440}.png`
showed a screenshot-time sidebar transition/sticky position; test-only stabilization above.
Final `C:\Users\SOLUSER\AppData\Local\Temp\forge-reports-B8yDXr\reports-320.png` and
`reports-1440.png` opened, settled shell, current roster/status wrapping and focused expanded
Version1 saved detail visible. These are synthetic writer evidence, not independent visual
approval. Final existing progress test artifacts:
`C:\Users\SOLUSER\AppData\Local\Temp\forge-progress-20261021-Oi2maj` (not opened here).
Earlier local synthetic report folders `forge-reports-gBt2Zx`, `forge-reports-Fs3Muk` and
progress `forge-progress-20261021-rKGZOf` retained as test artifacts, not acceptance.
Browsers/contexts and PGlite closed by test cleanup; no connected fixtures were created.

**Source/test freeze before independent QA request:** six files, SHA-256 below. A first
inline Node `-e` hash probe failed because Windows stripped string quotes; no file changed.
Used PowerShell `Get-FileHash -Algorithm SHA256` instead (metadata-only), then rechecked
after documentation. Git is not on PATH; absolute bundled git used. No test assertion,
timeout or authorization behavior was weakened to pass.

| Frozen path | SHA-256 |
| --- | --- |
| `src/app/reports/page.tsx` | `89cfe0791a000d8c0e810ac0e515cd4dfda5658d68d8e574f38a58fc0f5f9ec1` |
| `src/lib/reporting.ts` | `a824ceb5b1edf3ae6d111a490cb62d1907ab45ba46f437cb1d98575e9ebc16df` |
| `src/app/globals.css` | `4ebdcd5f084ed9320b36d724aa6dbea21009d167fe2670d7c47cf0bf4f092604` |
| `tests/reports.test.mjs` | `98e50336ad6cbbda7e95d3ae63238dd1e97cc82da528bbfafaae4a496b340189` |
| `tests/reports-ui.test.mjs` | `730902992e24ee3d6bf47c3bcb3cd69f1f6e35ac9acc6f3adc206d3c4f76c606` |
| `tests/instructor-e2e.mjs` | `f934eeddc5e1ad1648e0b2ddb1ea38a623e9e7c830af479d021c1c11fc3499f3` |

**Validation/handoff:** owned `git --no-pager diff --check` and explicit new-file
whitespace/final-newline checks; source freeze rechecked after docs. Independent focused
reports QA is requested against this frozen slice, **not self-certified release**.
Coordinator owns acceptance; owner retains final content/submission approval.

**Still open:** exactly FIVE selected-demo workstreams: connected core; owner review of
three canonical-family lessons; one genuine eligible free-AI showcase; connected daily4D
reflection lifecycle; demo package/rehearsal/accessibility/submission approval. These are
not five unbuilt modules; common target/schema/version/operation prerequisites are not a
sixth. Six deferrals unchanged: coding runner, binary PPT, student slide assistant, planner,
genuine tailoring, targeted AI revisions. Deadline31Oct, supervised HK13+, not public
release. Earlier305/Next webpack build and61 reference tests remain dated local baselines,
not reports acceptance. `_ran` migration filenames preserved, application **UNVERIFIED**;
no actual schema query. No `.env` read/import/copy, remote/catalog/provider/SMTP, install,
server, connected e2e/accounts, full suite/build, migration application, deployment/commit
or nested agents. Shared-screen/login/connected-later sequencing remains; no target question.

*Earlier checkpoints below are dated history, including superseded acceptance requests.*

## 22 October 2026 — independent diagnostic implementation PASS; narrow documentation correction

**Scope/owner:** documentation-only follow-up after independent diagnostic QA; owned
paths are `PROJECT_SHOWCASE.md`, `README.md`, `IMPLEMENTATION_TRACKER.md`. Source,
tests, scripts, assertions and timeouts are frozen. No agents or connected operations.
Coordinator owns LOCAL-packet acceptance; owner retains academic/content/submission review.

**Retained independent evidence:** **40/40** setup/OpenRouter/public-config tests and
**41 synthetic native-ESM actual-CLI/shared-client boundary/recovery cases passed**;
scoped lint, direct TypeScript, parse-only syntax, whitespace and doc-link/route checks
also passed. Evidence: `C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-setup-20261022`
(`verification-summary.json`, `native-cli-results.json`, before/after fingerprints).
These are the independent run's results, not fresh code checks in this follow-up.

**Historical initial independent disposition: BLOCKED (documentation only).**
Finding `SETUP-QA-DOC-01` identified showcase line289's “same ID/version” wording;
diagnostic implementation passed and QA edited nothing. Independent QA instrumentation
attempts remain separate from product results: asynchronous `--import` guards let a
Node warning collide with the existing JSON-only `console.error` mock (initial40/41,
file-level failure). A synchronous `--require` offline guard resolved this with warnings
visible and all assertions retained, yielding40/40. The temporary native adapter first
failed to parse; its extra brace was corrected before all41 cases passed. No repository
source/test repair was involved.

**Inspected source / falsifiable hypothesis:** `updateLesson` in
`src/app/learning/actions.ts:139,143` updates the existing ID, writes
`expectedVersion + 1` and returns that version. Replacing only the rehearsal's version
claim should resolve the sole doc blocker without behavior changes. **Correction made:**
“next save updates the same lesson ID and advances its version, not a duplicate starter.”
README/tracker record the independent evidence; historical timestamps/gallery are retained.

**Focused follow-up validation:** inspect the exact corrected sentence; run
`git --no-pager diff --check -- PROJECT_SHOWCASE.md README.md IMPLEMENTATION_TRACKER.md`;
rehash the frozen files using sorted relative UTF-8 path + NUL + raw bytes + NUL.
Pre-edit hashes match the supplied setup/test aggregate
`2821d5d4888e1fd7fde7bffa10ab232fcbde36f516b5555a631e4cbed0ab0c76`
and other141-file aggregate
`c1bbe9d54313d08d54a0dc71bb679942b556ca69b5195a0c74f0da000c8930c9`.
No fresh test/lint/tsc/syntax/full-suite/build checks are needed or run for wording only;
no `.env` contents read or actual environment loader, network/provider/quota,
server/install, connected test/rehearsal, migration, commit or deploy executed.

**Acceptance still pending:** Coordinator will directly verify this exact documentation
correction before accepting the LOCAL packet; this is not a self-certified release.
Current shared-model default and explicit20Oct request policy are unchanged.
Suggested10–12 minutes remains an unmeasured assumption pending owner confirmation.
Exactly five open demo workstreams and six deferrals below remain unchanged, including
owner lesson/source review, authorized connected core/reflections, genuine eligible AI
proof and demo/rehearsal/accessibility/submission gates.

*The initial writer checkpoint below is retained as history, including its QA request.*

## 22 October 2026, 12:10 continuation — diagnostic alignment / showcase rehearsal preparation (writer LOCAL; independent QA requested)

**Actor/action scope:** sole local writer, no nested agents. User22Oct12:10 continuation
and the assigned diagnostic/documentation slice only; Coordinator owns planning/acceptance.
Owner09:54 defers shared-screen login/connected work. No credentials/target login requested.
Loaded repository-local delivery/verification/security skills after sibling paths were
absent; explicit20Oct shared-client no-overrides policy supersedes historical strict ZDR
wording, without authorizing another policy change.

**Inspected before editing:** existing setup/check-ai scripts, full shared OpenRouter
client, actual public-config helper, package scripts and nearby VM/real-client tests;
generation migration/row helpers and progress/reflection fields. Then inspected actual
Studio/editor/player/catalog/teaching/reports/progress/reflections/profile/export/generation
UI and actions before writing the runbook. No `.env*` contents, real learner rows, grants
ledger or remote/provider metadata read.

**Falsifiable hypothesis / focused red check:** old setup can pass an old schema without
saved generation/progress fields, and its handbuilt AI request is not an app-availability
proxy. Added `tests/setup.test.mjs`, executing the **actual CLI plus full actual transpiled
shared client/configured helper/public-config module** in isolated VM contexts. Only
synthetic process/console/nextEnv/Supabase/fetch boundaries are supplied; no completion or
business-helper answers are stubbed, no host application environment is inherited.
Smallest selector first fails on absent `progress_evidence` and one handbuilt request
instead of the expected catalog+completion pair.

**Persistent changes (only assigned five paths):**

- `scripts/check-setup.mjs`: validates CLI before environment load; fixed sanitized
  environment-loader failure; retains public/service/key checks and zero-row DB reads.
  Adds full required saved-generation projection and progress field; retains reflections.
  Actual `configuredFreeModels`/`completion` supplies current default, aliases, ordered
  free models, catalog verification and shared deadline/token/body/abort/redirect/log
  behavior. No duplicated provider request/tuning, paid fallback, manual model-call loop
  or app/client/default change. Probe uses strict Zod `{ok:true}`, fails false/wrong/
  malformed/extra output without printing content. All failed configuration/DB checks
  block inference; default flag-false path makes zero AI requests.
- `tests/setup.test.mjs`: nine focused tests covering invalid CLI with zero env/DB/network,
  normal zero-AI metadata mode, actual default/override/key-alias/ordered-model request
  shapes (one GET+one POST, no provider/reasoning overrides), verified zero pricing,
  paid/unverified/key/config failure before completion, HTTP429/404/401 without retries,
  strict probe output, every required generation/reflection column plus progress,
  infrastructure exceptions and sentinel non-disclosure in captured CLI stdout/stderr.
- `PROJECT_SHOWCASE.md`: current22Oct features/status, three review-ready (not reviewed)
  starters, reviewed/attended/passed semantics, private daily4D reflections, clickable
  **unverified** HTTPS resources. Existing seven20Oct gallery images/captions remain
  explicitly historical; no new image/recording claim. Added actual-route/button
  rehearsal with expected observations, all connected steps **NOT RUN**, exact actor/
  target/schema/version/scope prerequisites, manual fallback vs genuine AI distinction,
  optional explicit staged recovery/private finalization and exact-owned-fixture cleanup.
  Suggested10–12 minutes is an **ASSUMPTION**, not measured/owner-confirmed.
- README and this tracker: operating side effects, current migration paths/status,
  evidence/limits and QA handoff. No new planning file/framework/feature. `check-ai` unchanged.

### Fresh local commands, results and iterations

Windows / existing Node25.2.1; no installs. Exact aliases used from repository root:
`$node = 'C:\Program Files\nodejs\node.exe'`;
`$safe = 'C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-task22-QA22c719\safe-run.mjs'`;
`$git = 'C:\Users\SOLUSER\AppData\Local\github-copilot-git-2.53.0-4\cmd\git.exe'`.
Existing safe launcher was inspected, not edited. It spawns with OS-only
`SystemRoot,WINDIR,COMSPEC,TEMP,TMP,OS,PATHEXT,USERPROFILE,LOCALAPPDATA,APPDATA,PROCESSOR_ARCHITECTURE,NUMBER_OF_PROCESSORS`
and fixed PATH `C:\Windows\System32;C:\Windows;C:\Program Files\nodejs`, no application secrets.
All HTTP/DB/env-loader behavior below is synthetic; no real service creation or `.env` load.

| Exact command / check | Actual result |
| --- | --- |
| `& $node $safe --experimental-strip-types --test --test-concurrency=1 --test-name-pattern='setup default\|setup --ai uses' tests/setup.test.mjs` | First0/2 failed due to the test's nextEnv default-import adapter (not product evidence). Fixed adapter only; rerun **0/2**, exit1, correctly exposes missing progress field and missing shared-client catalog request. Production edit followed only after those reds |
| `& $node $safe --experimental-strip-types --test --test-concurrency=1 tests/setup.test.mjs` | Immediately after diagnostic alignment **9/9**, exit0; Node0.953s/wall1.032s |
| `& $node $safe --experimental-strip-types --test --test-concurrency=1 --test-name-pattern='infrastructure exceptions' tests/setup.test.mjs` | Added loader-throw case exposes uncaught environment-load exception: **0/1**, exit1. The runner displayed a deliberately synthetic sentinel/stack, no real setting. Minimal fixed-message loader catch added; subsequent final packet covers this case |
| `& $node $safe --experimental-strip-types --test --test-concurrency=1 tests/setup.test.mjs tests/openrouter.test.mjs tests/public-config.test.mjs` | **40/40**,0 failed/cancelled/skipped/todo, exit0; Node1.991s/wall2.068s. Setup9 + existing real-client28 + public-config3. No full suite |
| `& $node $safe node_modules/eslint/bin/eslint.js scripts/check-setup.mjs tests/setup.test.mjs` | Exit0,5.851s |
| `& $node $safe node_modules/typescript/bin/tsc --noEmit --incremental false` | Exit0,6.030s; direct compiler only, no Next env loader/typegen/build. CLI integration is additionally exercised by actual-module runtime tests, not a claim that tsc checks all `.mjs` |
| `& $node $safe --check scripts/check-setup.mjs`; `& $node $safe --check tests/setup.test.mjs` | Parse-only, both exit0 (0.094s/0.098s), no script execution |
| `& $git --no-pager diff --check -- scripts/check-setup.mjs README.md IMPLEMENTATION_TRACKER.md PROJECT_SHOWCASE.md`; `& $git --no-pager diff --no-index --check -- NUL tests/setup.test.mjs` | No whitespace diagnostics; tracked exit0, untracked exit1 means new-file difference. Explicit trailing-whitespace/new-file newline check passes. An initial extra scan incorrectly required a final newline on existing setup: exit1; HEAD also has none, preserved. New test has final newline |

Two exploration-only command issues were not code failures: Git absent on PATH (resolved
with installed absolute Git), and a broad UI-label Python print hit Windows cp1252 Unicode
encoding (rerun bounded UTF-8 reads). No network or connected command was used to diagnose.
Existing non-failing Node typeless-package warnings remain; no package change.

### Freeze, cleanup and independent acceptance handoff

Owned implementation aggregate SHA256 (sorted relative UTF-8 path + NUL + raw bytes + NUL):
**`2821d5d4888e1fd7fde7bffa10ab232fcbde36f516b5555a631e4cbed0ab0c76`**.
Individual setup **`d3459d78652878aa20841165e56c30d44837f55280dd1a07a3512f3ed6a7f5d2`**;
test **`a7c53f4428cf2b2cf36769e7ec9c8210e20d5131f07720724f61b5b6bb7bed60`**.
All141 other files under `src`, `tests`, `scripts`, `supabase` retain
**`c1bbe9d54313d08d54a0dc71bb679942b556ca69b5195a0c74f0da000c8930c9`**.
Earlier starters/reflections/reference code and user migration renames preserved, including
`20261022_daily_reflections_ran.sql`; **application unverified by this work**.
No helper service/browser/DB/connected fixture or generated repository artifact was created;
bounded child processes exited, no owned cleanup failure. Only tools' local transcripts remain.

**Not run / not proved:** no `check:setup`, `check:ai`, connected browser suites, app server,
Next/full build, full test suite, `.env` contents, Supabase/provider/catalog/SMTP network,
remote migration/grant, quota consumption, owner content review, rehearsal, commit/deploy
or agents. Fresh **40/40 is writer LOCAL evidence only**. Latest61/61 accepted reference
packet and Task22's earlier305/build stay historical LOCAL evidence, not rerun claims.
Later `check:setup` is a remote zero-row metadata read; `--ai` adds free catalog and one
quota-consuming completion. `check:ai` reads provider catalog/account-quota data and its
probe flags add inference. Column passes prove no grants/RPCs/cache/concurrency/eligibility/
provider quality; no successful live AI is claimed.

**Exactly FIVE OPEN demo workstreams unchanged:** core connected journey; owner review of
three canonical-family lessons; one actual eligible free-AI showcase (prefer existing saved
generation); connected reflection lifecycle; demo/rehearsal/accessibility/submission approval.
Target/schema/app-version/operation authorization are shared prerequisites, not a sixth
feature, five unbuilt modules or25 old tasks. Six deferrals unchanged: coding runner24,
binaryPPT19 (demo PDF/PPTX), student slide assistant19, private planner23, genuine tailoring18,
targeted AI revisions14/16. Privacy/role/key/upload/server-grading/free-only/adult-grant
controls remain. Deadline31Oct, supervised HK13+ demo, not public launch.

**Request independent focused QA** of the frozen actual-CLI/client/schema coverage,
sanitization and source-inspected runbook; Coordinator owns acceptance. Owner must confirm
demo duration later and retain final academic/content/submission responsibility.
No self-certified release, fabricated AI output/findings/contributions/user studies.

## 22 October 2026 — independent encoded-Unicode follow-up: LOCAL PASS

**Boundary:** independently reverified only the frozen encoded-Unicode reference repair. Loaded repository-local delivery/security/verification skills after the sibling paths proved absent; inspected all four file hunks, nearby actual-consumer harnesses and package scripts. No repository source/tests/CSS/SQL edits, original permission/quiz/scheduler assertion or timeout changes. No external URLs opened. Coordinator retains final acceptance; this does not close connected/content/live-AI/submission gates.

**Reproducible commands/results:** repository cwd, existing Node25.2.1, Chromium153.0.8010.12 and in-memory PGlite. `$node = 'C:\Program Files\nodejs\node.exe'`; `$safe = 'C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-task22-QA22c719\safe-run.mjs'`; `$diag = 'file:///C:/Users/SOLUSER/AppData/Local/Temp/forge-independent-task22-QA22c719/manual-diagnostic.mjs'`; `$evidence = 'C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-unicode-20261022'`; `$probe = 'C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-task08-aS2a0n\independent-reference-probe.cjs'`. Existing safe/diagnostic helpers inspected and unchanged; children receive OS-only settings, not application environment/secrets. Diagnostic hook retains the original5000ms wait and only captures state/trace.

| Exact command | Fresh independent result |
| --- | --- |
| `& $node $safe $probe` | **PASS**, exit0,2.243s. Canonical URL equivalence true; **player2/2 and preview2/2** expected literal/encoded CJK anchors, original text retained, requests/errors both empty |
| `& $node $safe --experimental-strip-types --import $diag --test --test-concurrency=1 tests/lesson-text.test.mjs tests/manual-authoring.test.mjs tests/progress.test.mjs tests/resume.test.mjs tests/curriculum-ui.test.mjs` | **61/61**,0 failed/cancelled/skipped/todo, exit0; Node65.612s/wall65.720s. Renderer7, manual22, progress19, resume12, curriculumUI1. No retry or manual timeout; historical timeout root remains unresolved |
| `& $node $safe node_modules/eslint/bin/eslint.js src/components/lesson-preview.tsx tests/lesson-text.test.mjs tests/manual-authoring.test.mjs tests/progress.test.mjs` | Exit0,7.681s, no diagnostics |
| `& $node $safe node_modules/typescript/bin/tsc --noEmit --incremental false` | Exit0,7.271s; direct compiler, no Next/env loader |
| `& $node $safe "$evidence\unicode-keyboard-probe.cjs"` | **PASS**, exit0,3.985s. Four independently assembled equivalent CJK/emoji path/query/fragment pairs and30 rejected tokens, each in both actual consumers at320 and1440px; Tab/Enter/Escape/focus return and overflow checks passed; requests/errors/actions all empty |
| `& $node $safe "$evidence\freeze.cjs" before` and same with `after` | Exit0 before execution and after tests; sorted relative path + NUL + raw bytes + NUL hashes exactly match supplied freeze |

The independent matrix verifies original literal/encoded href **attributes and visible text**, including `%20` and reserved escapes; no decoded href/text is substituted. Raw C0/C1/format controls, `%0A`, `%7F`, `%C2%80`, malformed triplets, lone/incomplete/invalid/overlong/surrogate/out-of-range UTF-8 remain nonlinks in both real consumers. Complete-sequence guarded decoding replaces the continuation-byte blacklist; raw controls, absolute HTTPS, authority/credentials, nested-token/markup rejection and React escaping prechecks remain. New-tab/noopener+noreferrer/no-referrer and accessible **reference not verified** hints pass. Existing permission/tampering, private-answer-key, failure recovery, quiz and scheduler regressions remain intact and pass. No claim of link availability, factual correctness, pedagogy or arbitrary-site safety.

**Fresh evidence actually opened:** `C:\Users\SOLUSER\AppData\Local\Temp\forge-lesson-text-NfTUFe\player-unicode-320.png`, `preview-unicode-320.png`, `player-unicode-1440.png`, `preview-unicode-1440.png`; also `$probe`'s fresh `encoded-unicode-preview-320-utf8.png` in its own directory. Literal/encoded CJK and emoji remain distinct underlined, wrapping links; rejected examples remain plain. These are fresh independent-run images, not writer images. Packet console: `C:\Users\SOLUSER\AppData\Local\Temp\1792641917085-copilot-tool-output-27144-ff4390d0-accf-4897-a724-77f092ca17bf.txt`. Other retained synthetic artifacts: Temp `forge-manual-qa01-08IHtX` (including `independent-manual-trace.zip`), `forge-progress-20261021-eiLYm2`, `forge-tracker08-UTCDTE`; these other images/trace were not opened for visual approval.

**Freeze/whitespace/cleanup:** four owned code/test files retain **`2741de68b876c1ba6c93ef9cd07ba8851a2aadda5902ce0e5b4e0483a94d6ca6`**; all138 other files under `src`, `supabase`, `scripts`, `tests` retain **`9a621bc0c7967c4bd8686224f09de9e989040cfaa08cafe997c9d70b26ac4f0f`**. Manifest and supplemental reproducer retained under `$evidence`; no source snapshot created. Tracked scoped `git diff --check` passes; untracked `tests/lesson-text.test.mjs` `git diff --no-index --check -- NUL ...` emits no whitespace diagnostics (exit1 denotes the new-file difference), with an explicit trailing-whitespace/conflict-marker check as well. Browser/context/PGlite teardown completed; no owned Node/automation Chromium workers or service left running. Existing user Google Chrome left untouched. Only README/tracker evidence edits in repository; prior dirty work and `20261022_daily_reflections_ran.sql` preserved, suffix not evidence of schema application.

**Untested/open, not failures or passes:** no fresh full suite/Next build, provider/remote/server/install, env-file/secret access, connected tests, migration application, login, commit/deploy or agents. Earlier Task22 Coordinator-accepted305/305 remains dated evidence only. Exactly **five selected-demo workstreams remain OPEN**, not five unbuilt modules: connected core journey; owner factual/pedagogical/source review of three canonical-family lessons; one actual eligible free-AI showcase; connected private4D reflection lifecycle; demo package/rehearsal/accessibility/submission approval. Target/schema/version are shared prerequisites, not a sixth feature. All six approved deferrals unchanged. Continue locally; shared-screen login later. Deadline remains31October Hong Kong supervised13+ demo, not public launch.

*The writer checkpoint below predates this independent pass. Its57/57+Unicode BLOCKED history, red4/7 and fixture58/61 results are preserved, not relabelled green.*

## 22 October 2026 — Task08 independent-QA defect repair; frozen for independent re-QA

**Current status/history:** the earlier focused reference packet passed **57/57**, but **independent QA remained BLOCKED**: its actual full-preview/player probe expected literal and equivalent percent-encoded CJK anchors and got only the literal anchor, with original text preserved and zero external requests/page errors. The retained ASCII-escaped reproducer is `C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-task08-aS2a0n\independent-reference-probe.cjs`; the earlier stdin-Unicode fixture had Windows encoding ambiguity. This writer's repair checks do **not** constitute independent acceptance. The earlier Task22 **305/305** remains a dated full-suite baseline, not new reference evidence.

**Owned files only:** `src/components/lesson-preview.tsx`, `tests/lesson-text.test.mjs`, `tests/manual-authoring.test.mjs`, `tests/progress.test.mjs`, `README.md`, `IMPLEMENTATION_TRACKER.md`. Inspected the controlling validator/renderer, actual consumer harness mappings, real lesson schema, package scripts and existing offline/diagnostic helpers before production editing. Sibling skill paths were absent; repository-local `.github/skills/forge-delivery/SKILL.md` and `forge-verification/SKILL.md` were loaded. Existing dirty/untracked work was retained, including the user's `supabase/migrations/20261022_daily_reflections_ran.sql`; **its application remains unverified**. No resume/CSS/SQL edits or source-policy/schema/content/gate expansion.

**Falsifiable hypothesis and red-first check:** the raw `%80`–`%9F` blacklist misclassifies valid UTF-8 continuation bytes as C1 controls. Predict that a guarded complete-sequence decode plus decoded Unicode control check links equivalent encoded CJK/emoji while rejecting malformed/invalid UTF-8 and actual encoded controls, without changing text/href/storage. Added production-renderer and real-consumer cases before production editing. The smallest renderer suite then failed exactly on missing encoded anchors; the mounted case also exposed invalid UTF-8 tokens previously linked.

**Minimal production fix:** remove the percent-octet regex and, inside the existing `try`/`catch`, reject `[\p{Cc}\p{Cf}]` in `decodeURIComponent(value)`. The standard decoder throws for malformed percent triplets, lone continuations, incomplete/invalid/overlong/surrogate/out-of-range UTF-8. **Decoded output is validation-only**; `new URL`, rendering, storage and `href` still use the untouched original string. Existing raw whitespace/control/markup/backslash, credentials/authority, scheme/protocol-relative/prefix/nested-token checks and all external-link attributes/hints remain. `%20` and encoded reserved query characters are not mistaken for controls. No HTTP/markup/credential broadening or fetch/telemetry/privacy/paid-AI change.

**Regression coverage:** original assertions remain. New ASCII-escaped literal/encoded fixtures first assert `new URL(literal).href === new URL(encoded).href`, covering CJK and emoji in path/query/fragment plus encoded spaces/reserved characters. Actual `LessonText`, actual full preview and actual learner route/player assert original visible text and `getAttribute("href")`, unchanged editor/database content, no save/progress writes and preserved answer-key privacy. Negatives include malformed triplets, `%80`, `%9F`, `%FF`, incomplete/invalid/overlong/surrogate/out-of-range sequences, `%0A`, `%7F`, `%C2%80`, other C0/C1 and encoded format controls, retaining nested-HTTPS smuggling guards. Existing offline network/page-error assertions pass; no helper-answer/text-renderer stubs were added.

**Exact command environment:** repository cwd, existing Node25.2.1 / Chromium153.0.8010.12 / PGlite; no installs. `$node = 'C:\Program Files\nodejs\node.exe'`; `$safe = 'C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-task22-QA22c719\safe-run.mjs'`; `$diag = 'file:///C:/Users/SOLUSER/AppData/Local/Temp/forge-independent-task22-QA22c719/manual-diagnostic.mjs'`; `$git = 'C:\Users\SOLUSER\AppData\Local\GitHubDesktop\app-3.6.7\resources\app\git\cmd\git.exe'`. Existing helpers inspected, not modified. `$safe` spawns absolute Node with OS-only settings/PATH, no env-file loader or inherited application secrets. `$diag` only captures real timeout state/trace and retains the original **5000ms** wait. Chromium contexts are offline, service workers blocked, routes aborted; database work is local in-memory PGlite, not target migration application.

| Exact command from repository root | Fresh writer result / interpretation |
| --- | --- |
| `& $node $safe --experimental-strip-types --test --test-concurrency=1 tests/lesson-text.test.mjs` before production edit | **4/7**,3 failed (two children + parent),0 cancelled/skipped/todo, exit1; Node3.446s/wall3.584s. Intended red, actual missing encoded anchors and invalid UTF-8 links |
| Same renderer command immediately after minimal validator fix | **7/7**,0 failed/cancelled/skipped/todo, exit0; Node3.711s/wall3.792s |
| `& $node $safe --experimental-strip-types --import $diag --test --test-concurrency=1 tests/lesson-text.test.mjs tests/manual-authoring.test.mjs tests/progress.test.mjs tests/resume.test.mjs tests/curriculum-ui.test.mjs` first combined run | **58/61**,3 failed (new progress child + two parents), exit1; Node63.761s/wall63.906s. Actual `ZodError` at new slide0.example, max240; not a product/timeout diagnosis. Manual22/22 and renderer7/7 passed |
| `& $node $safe --experimental-strip-types --test --test-concurrency=1 tests/progress.test.mjs` immediately after fixture correction | **19/19**,0 failed/cancelled/skipped/todo, exit0; Node9.595s/wall9.682s. Shortened only new negative fixtures using `https://e.org/`; added real-schema assertions in both new consumer tests; no limit/assertion relaxation |
| Same exact five-file combined command above after fixture correction | **61/61**,0 failed/cancelled/skipped/todo, exit0; Node62.021s/wall62.111s. Renderer7, manual22, progress19, resume12, curriculumUI1 |
| `& $node $safe node_modules/eslint/bin/eslint.js src/components/lesson-preview.tsx tests/lesson-text.test.mjs tests/manual-authoring.test.mjs tests/progress.test.mjs` | Final exit0,3.698s; earlier pre-fixture-correction invocation also exit0 |
| `& $node $safe node_modules/typescript/bin/tsc --noEmit --incremental false` | Final exit0,4.776s; earlier invocation also exit0. No Next/env loader or build |
| `& $git --no-pager diff --check -- src/components/lesson-preview.tsx tests/lesson-text.test.mjs tests/manual-authoring.test.mjs tests/progress.test.mjs README.md IMPLEMENTATION_TRACKER.md` | Exit0 before and after documentation updates |

No arbitrary retry: the first packet's concrete fixture/schema failure was diagnosed and corrected before the progress-only check and final packet. The manual5s timeout did **not** recur in either combined run; its historical cause is still unresolved, not labelled flaky/fixed. Final manual320/1440 activity-formatting subtests passed1.600s/1.675s. Existing typeless-package warnings remain non-failing. One initial inline `-e` fingerprint probe failed exit1 because PowerShell stripped JavaScript quotes; the ASCII stdin fingerprint command succeeded, with no source effect.

**Fresh artifacts/inspection:** renderer red screenshots in Temp `forge-lesson-text-ybh5KK`; immediate green `forge-lesson-text-5LvZSK`. Actually opened the latter's `player-unicode-320.png`, `preview-unicode-320.png`, `player-unicode-1440.png`, `preview-unicode-1440.png`: distinct original literal and encoded CJK/emoji links remain underlined/wrapped; invalid/control examples remain plain, with no horizontal overflow in asserted layouts. This is writer visual inspection, not independent acceptance. Final packet artifacts (retained, not opened here): `forge-lesson-text-GdOu6z`, `forge-manual-qa01-lbGFe1` including `independent-manual-trace.zip`, `forge-progress-20261021-Zec0Ra`, `forge-tracker08-XogrrF`, all under `C:\Users\SOLUSER\AppData\Local\Temp`. First combined failure console: `1792641208129-copilot-tool-output-27144-6909a874-fa1d-47bb-8bce-438dd56ca612.txt`; final green console: `1792641346581-copilot-tool-output-27144-af6b1509-3bfa-4c8b-a8cf-757d6a4b490e.txt` in the same Temp root. No existing independent evidence overwritten.

**Source/test freeze:** SHA256 over sorted repository-relative path, NUL, raw bytes, NUL for the four owned TSX/MJS paths above: **`2741de68b876c1ba6c93ef9cd07ba8851a2aadda5902ce0e5b4e0483a94d6ca6`**. All138 other files under `src`, `supabase`, `scripts`, `tests` retain before/after aggregate **`9a621bc0c7967c4bd8686224f09de9e989040cfaa08cafe997c9d70b26ac4f0f`** using the same algorithm. Documentation-only evidence updates follow that source/test freeze.

**Cleanup / remaining gates:** test teardown closes Chromium contexts/browsers and PGlite; no server/service started; synthetic screenshots/trace retained for independent QA. No full `npm test`/Next build, network/provider/Supabase/remote call, env-file access, login, install, migration application, commit/deploy or nested agents. Exactly **five open demo workstreams remain** (connected core, owner review of three lessons, live eligible free-AI success, connected reflections, demo/submission package), not five unbuilt features; all six deferrals below remain. Source URL availability/correctness and lesson pedagogy/supervised13+ suitability remain unverified. **Request fresh independent re-QA of this frozen encoded-Unicode repair and Coordinator acceptance; writer tests do not self-certify release or source review.**

## 22 October 2026 — authorized resume-loader/current-path repair; independent QA requested

**Boundary/deliverable:** Coordinator granted the narrow loader exception after the reference writer's **47/57** packet. This repair touches only `tests/resume.test.mjs` loader wiring, README and this tracker. Earlier dirty work is preserved; the initial owned-file status already showed both docs modified, setup script modified and reflection tests untracked, with no resume delta. No scheduler assertion, clock, action/fixture, timeout, source/UI/CSS/renderer or SQL change. Exactly five selected-demo workstreams remain **OPEN for connected/content/live-AI/submission acceptance**, not five unbuilt modules; the earlier Coordinator-accepted Task22 independent305/305 evidence remains dated below. Six feature deferrals and source-review/no-autofetch/privacy boundaries remain unchanged.

**Inspection and falsifiable hypothesis:** the actual player imports `LessonText` from `./lesson-preview`, while the old browser loader returned only `{ LessonPreview: () => null }`. Predict failure at mount before scheduler exercise, followed by unchanged scheduler passes when the real module is loaded. Inspected actual player/preview/metadata and existing manual/progress preview compilers. The smallest affected file reproduced that failure: validation2 passed, all nine scheduler children plus parent failed with undefined element type in `PlayerSession`.

**Smallest repair:** use the same TypeScript/ReactJSX CommonJS compiler options to populate both `player` and `./lesson-preview` sources; remove the preview stub so real `LessonPreview`/`LessonText` exports load through the existing real React module cache. Unexecuted metadata adapters explicitly expose `MetadataFields` and `LessonMetadata`, avoiding curriculum/CSS dependencies unrelated to scheduler coverage. No identity/canned text renderer, assertion change, missing-module fallback or new source module. Existing nine scheduler regressions now exercise the actual renderer dependency.

**Environment/commands:** Windows, existing Node25.2.1 and Chromium153.0.8010.12/PGlite; no install. Supplied sibling skill files were absent; loaded the existing `.github/skills/forge-delivery/SKILL.md` and `forge-verification/SKILL.md`. Git was absent from PATH; used `$git = 'C:\Users\SOLUSER\AppData\Local\GitHubDesktop\app-3.6.7\resources\app\git\cmd\git.exe'`. `$safe = 'C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-task22-QA22c719\safe-run.mjs'`; `$diag = 'file:///C:/Users/SOLUSER/AppData/Local/Temp/forge-independent-task22-QA22c719/manual-diagnostic.mjs'`. These inspected, existing helpers were not edited. `$safe` spawns absolute Node with OS-only settings/PATH, no inherited application settings or env loader. Browser contexts are offline with blocked service workers and aborting routes; PGlite is local/in-memory, not target migration application.

| Command (repository cwd) | Fresh repairer result |
| --- | --- |
| `node $safe --experimental-strip-types --test --test-concurrency=1 tests/resume.test.mjs` before edit | **2/12**,10 failed,0 cancelled/skipped/todo, exit1; Node3.368s/wall3.458s. Intended loader reproducer, not a scheduler diagnosis |
| Same command immediately after loader edit | **12/12**,0 failed/cancelled/skipped/todo, exit0; Node4.106s/wall4.188s |
| `node $safe --experimental-strip-types --import $diag --test --test-concurrency=1 tests/lesson-text.test.mjs tests/manual-authoring.test.mjs tests/progress.test.mjs tests/resume.test.mjs tests/curriculum-ui.test.mjs` | **57/57**,0 failed/cancelled/skipped/todo, exit0; Node58.774s/wall58.865s. Renderer5/5, manual21/21, progress18/18, resume12/12, curriculumUI1/1 |
| `node $safe node_modules/eslint/bin/eslint.js tests/resume.test.mjs` | Exit0,3.494s; no warnings/errors |
| `& $git --no-pager diff --check -- tests/resume.test.mjs README.md IMPLEMENTATION_TRACKER.md` | Exit0, including after documentation updates |

No arbitrary retries, full `npm test`, build, repository Next command or direct TypeScript rerun: only `.mjs` wiring/docs changed and the runtime packet transpiles actual TSX. Existing non-failing typeless-package warnings remain. The diagnostic hook only adds in-memory failure-state capture/trace, retaining the original five-second wait and assertions. Manual320px activity-formatting passed1.430s,1440px1.416s; no timeout recurred, so no new failure-state diagnosis or product-fix claim. The original timeout's cause is still unresolved.

**Evidence:** red console `C:\Users\SOLUSER\AppData\Local\Temp\1792640175397-copilot-tool-output-27144-ce123db3-7129-47f1-b733-2156440d7a2f.txt`; green bounded-packet console `C:\Users\SOLUSER\AppData\Local\Temp\1792640275638-copilot-tool-output-27144-eaf83333-59b1-45e7-b44c-68c432358abd.txt`. Fresh synthetic artifacts: `forge-lesson-text-MaATh2`, `forge-manual-qa01-ob5vRz` (including `independent-manual-trace.zip`), `forge-progress-20261021-nJMAPb`, `forge-tracker08-R7xztT` under the same Temp root. Captured, **not opened/visually approved here**; the earlier writer's four opened screenshots remain separate historical evidence.

**Filename-only reconciliation:** narrow searches of README/tracker, `docs/*.md`, `tests/*.mjs`, `scripts/*.mjs` and source code globs found only `supabase/migrations/20261022_daily_reflections_ran.sql` on disk. README's schema paragraph/current migration link and the current priority matrix below now use that path. Historical dated old-path references at the prior writer's drift/lifecycle/touched-path records remain historical, not globally rewritten. `tests/reflections.test.mjs`, `tests/database.test.mjs`, `tests/e2e.mjs` and `scripts/check-setup.mjs` already reference `_ran`; `tests/reflections-ui.test.mjs` has no filename literal. No extra test/script edits needed; directory-scanning migration loaders need no changes. No SQL edit/rename, logical/schema conflict or remote query. **Application status is not verified by this work; `_ran` is not execution evidence.**

**Freeze/handover:** the six-file reference-writer freeze remains SHA256 `1bdba1bd6852211a3e0bfb103b259872868d96d1e412baf2cf6a4e00cc6534a3`. All141 files under `src`, `supabase`, `scripts`, `tests` excluding the owned resume file retain aggregate SHA256 `a4db4fe2d046dbcd38182e65de332cdaecc1336d288cfe7a131cf6d003933fd6` (sorted relative path, NUL, raw bytes, NUL). No source/UI/SQL change, env/ledger access, provider/network/login, server, connected script, install, commit/deploy or migration application. Harness teardown closes browsers/PGlite; no helper service started. **Request independent focused QA for the loader/reference packet and Coordinator acceptance; repairer checks do not self-certify a release.** Owner content/suitability review and separately authorized connected/live-AI/accessibility/submission gates remain open; no login request now. Stop at this repair.

## 22 October 2026, 11:20 request — five-workstream reconciliation + Task08 LOCAL reference display

**Exactly FIVE OPEN SELECTED-DEMO WORKSTREAMS**, not five unbuilt modules, not the original25 tasks. Local implementation/testing does not close connected gates. Deadline31Oct, Hong Kong supervised13+ demo. Coordinator owns acceptance; no self-approved release.

| Open workstream | Owner | Existing deliverable / status | Dependencies and remaining verification |
| --- | --- | --- | --- |
| 1. Core learning journey | Developer; owner/Coordinator connected acceptance | Locally implemented | Authorized connected create/edit/publish → enroll/slides/resume → ten-question server grading6/10, unlimited retry, result/per-pass certificate |
| 2. Three canonical-family authored starters | Author/owner | Locally implemented; supplied reference display improved in this slice | Owner factual/pedagogical/answer-key/source/supervised13+ suitability review; not reviewed or endorsed by link rendering |
| 3. One actual eligible free-AI showcase | Owner + developer | Local code exists; prefer saved generation | Live free-provider success/quality not proven; separately authorized eligible operation/review later |
| 4. Private daily4D reflections | Developer; owner/Coordinator | Locally implemented and independently locally accepted | Migration application unverified by this work; actual connected CRUD/export/cascade pending |
| 5. Demo/submission package | Owner + Coordinator | Documentation and local evidence exist | Artifact package/rehearsal/accessibility/owner academic final approval incomplete |

Target/schema/app-version/authorization are **shared prerequisites, not a sixth feature**. The supplied **Task22 independent LOCAL packet is now Coordinator-accepted** (305/305 full suite, scoped lint/directtsc, env-free Next webpack snapshot build). Historical dated “acceptance requested” and writer303/304/repairer28/30 entries below are retained, not current acceptance requests or relabelled passes. The original manual5s timeout cause remains unresolved; diagnostic21/21 and full305/305 passed, not a proved product fix. This slice did not rerun305 or build.

**Approved boundary:** no AI code/policy changes; explicit20Oct no client/provider overrides remains controlling. Deferred AREAS remain runner24, binaryPPT19 (demo PDF/PPTX only), student slide assistant19, private planner23, genuine tailoring18 and targeted AI revisions14/16, with other approved roster/voice deferrals preserved. No reactivation or completion claim for the original brief. Production hardening can wait; basic auth/ownership/limits/AI eligibility/free-only/server-grading controls cannot. Owner09:54 local-features-first/shared-screen-login-later sequencing stands. No credentials/target authorization requested now; future login is not remote-write/provider authorization.

### Bounded implementation / falsifiable check

Hypothesis: starter references already survive real create/save in slide.example; only both views' plain-string rendering prevents their use. Smallest regression checks the **actual exported production `LessonText`**, then mounted React/real preview/player output, not fabricated parser answers. Initial new-test run failed0/1 because the export did not exist.

Owned implementation: `src/components/lesson-preview.tsx` exports the one shared renderer; `src/components/learning-controls.tsx` uses it only for slide body/example. No new source module, data/schema/metadata expansion, API/save/progress/grade/certificate change, provider change or package. `src/app/globals.css` adds only scoped whitespace/wrapping/underlined-link/focus rules. Full author preview and learner player preserve text exactly, with common sentence delimiters outside anchors and balanced path parentheses/queries/fragments/Unicode handled. Invalid/credentialed/control-bearing HTTPS and rejected schemes/tokens are literal, with no nested HTTPS recognition; markup-looking input stays fully literal/React-escaped. Empty-port colons are not stripped to “repair” malformed URLs.

Anchors have the **original URL as visible text**, native new-tab target, `rel="noopener noreferrer"`, explicit no-referrer and accessible URL + external/new-tab/**not verified** hint. There is no Markdown/HTML execution, prefetch/fetch/telemetry, availability check or endorsement. Raw saved text is unchanged; author/owner source selection and review-pending labels remain. **Task08/starter usability progress is LOCAL only**, not source factual review or verified domains.

Tests: new `tests/lesson-text.test.mjs` mounts the actual exported renderer and real full preview/player, covers literal text/negative adversaries/no requests, exact href/attrs, multiple URLs, starter sources, Unicode/query/fragment/balanced parentheses/punctuation, keyboard focus/Escape return and320/1440 overflow. Existing manual starter subtest gains assertions for all three starters' references in actual saved previews; original save/native-validation/ambiguous-create assertions unchanged. Progress harness now loads the actual preview module (not a renderer stub) and adds real-route source-text/links/no-progress-write/answer-key-privacy coverage; original progress/quiz assertions unchanged.

### Fresh writer commands / results — combined gate NOT GREEN

Windows, existing Node25.2.1/Chromium153.0.8010.12/PGlite. Missing supplied sibling skill paths were resolved to existing `.github/skills/forge-delivery/SKILL.md` and `forge-verification/SKILL.md`. Git is not on PATH; existing VS bundled Git used. For the exact commands below, `$safe = 'C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-task22-QA22c719\safe-run.mjs'`, `$diag = 'file:///C:/Users/SOLUSER/AppData/Local/Temp/forge-independent-task22-QA22c719/manual-diagnostic.mjs'`; these are existing prior-QA helpers, not new repository files. Each `node $safe ...` spawns an absolute Node child with only `SystemRoot,WINDIR,COMSPEC,TEMP,TMP,OS,PATHEXT,USERPROFILE,LOCALAPPDATA,APPDATA,PROCESSOR_ARCHITECTURE,NUMBER_OF_PROCESSORS` plus OS/Node PATH. No inherited application settings or env loader. Browser contexts offline/service-workers-blocked, routes abort all network. External links were **not clicked** against the internet.

| Command (repository cwd) | Actual result |
| --- | --- |
| `node $safe --experimental-strip-types --test --test-concurrency=1 tests/lesson-text.test.mjs` before implementation | **0/1**, exit1, Node1.317s/wall1.410s: missing production export; intended red regression |
| Same new-test command immediately after implementation | **3/5**, exit1,3.487s/wall3.577s: static-HTML harness parsing removed NUL before assertion; production kept the rejected token literal. Replaced only new-test HTML parsing with actual mounted React DOM, preserving exact NUL text |
| Same command after harness correction | **5/5**, exit0,3.597s/wall3.702s |
| Initial scoped ESLint and directtsc commands below | Both exit0 (7.052s/4.304s); ESLint had one `aria-description` support warning. Replaced it with accessible URL-inclusive `aria-label`/title, no suppression |
| `node $safe --experimental-strip-types --test --test-concurrency=1 tests/lesson-text.test.mjs tests/progress.test.mjs` after new empty-port negatives | **21/23**, exit1,11.886s/wall11.969s. New `https://example.org:` negative exposed colon trimming into a clickable prefix. Stopped colon stripping; no timeout/retry changes |
| New-test command after empty-port correction | **5/5**, exit0,3.379s/wall3.475s |
| `node $safe --experimental-strip-types --import $diag --test --test-concurrency=1 tests/lesson-text.test.mjs tests/manual-authoring.test.mjs tests/progress.test.mjs tests/resume.test.mjs tests/curriculum-ui.test.mjs` | **47/57**,10 failed,0 cancelled/skipped/todo; exit1, Node58.149s/wall58.227s. Renderer5/5, manual21/21, progress18/18, curriculumUI1/1 and resume validation2/2 passed. All nine mounted resume scheduler children + parent failed before scheduler exercise because its existing preview stub has no `LessonText` export. **This combined gate is blocked**, not accepted |
| `node $safe node_modules/eslint/bin/eslint.js src/components/lesson-preview.tsx src/components/learning-controls.tsx tests/lesson-text.test.mjs tests/manual-authoring.test.mjs tests/progress.test.mjs` | Final exit0,4.312s; zero warnings/errors |
| `node $safe node_modules/typescript/bin/tsc --noEmit --incremental false` | Final exit0,4.747s; direct compiler, no repo Next env-loading command |
| VS bundled `git --no-pager diff --check` | Exit0; new-test whitespace/final-newline check also passed using OS-only stdin Node below |

The existing diagnostic hook changes only in-memory failure-state capture and trace, not the five-second timeout or any assertions. No timeout occurred in the fresh manual21/21, so no fabricated failure-state evidence; historical manual timeout remains unresolved. Bounded packet console evidence: `C:\Users\SOLUSER\AppData\Local\Temp\1792639798567-copilot-tool-output-27144-3b4e4476-b228-4b81-b56d-bb893f1ecab1.txt`; diagnostic trace: `C:\Users\SOLUSER\AppData\Local\Temp\forge-manual-qa01-5yJDZn\independent-manual-trace.zip`. Existing typeless-package warnings were non-failing.

Four source-equivalent screenshots **actually opened** from `C:\Users\SOLUSER\AppData\Local\Temp\forge-lesson-text-E1APnd`: `player-links-320.png`, `preview-links-320.png`, `player-links-1440.png`, `preview-links-1440.png`. Long URLs wrap and remain underlined; keyboard focus is visible. The320px dialog is vertically scrollable, not horizontally overflowing. Final combined-run screenshot directory `forge-lesson-text-xUnI3x` and manual/progress/curriculum images were captured but not separately opened in this slice; no screenreader or external navigation/availability claim.

**Concrete ownership blocker / bounded exception requested:** `tests/resume.test.mjs:63` returns only `{ LessonPreview: () => null }`, so the new production import is undefined in that harness. Its mounted scheduler tests fail at React render, not with evidence of a scheduling regression. It is outside unconditional ownership (the conditional helper-mapping permission would require a justified new leaf source module, which this change does not need). Left it untouched: request permission for **real preview-module transpilation/mapping plus metadata adapter only**, no assertion edits, new source module or fake `LessonText` stub. Then rerun the same bounded packet and obtain independent focused QA. No full-suite escalation can fix a known missing mapping; no green retry or product fallback was added to hide it.

**Handover / freeze:** source changes are limited to the three owned application/style paths and three owned tests (including new test); docs are README/tracker only. Earlier dirty starter/reflection/schema/AI/dependency work is preserved. Browsers/PGlite closed by harness teardown; no server/helper service started, installs, network/provider/login, environment-file reads, remote writes/migrations, commits or deployment. Retained synthetic temp screenshots/trace intentionally remain. Independent focused QA and Coordinator acceptance of this new slice remain **open**, together with owner source/pedagogy/answer/suitability, connected lifecycle/schema, actual eligible AI, accessibility/artifact/academic gates above.

Six-file source freeze SHA256: **`1bdba1bd6852211a3e0bfb103b259872868d96d1e412baf2cf6a4e00cc6534a3`** (ordered relative filename, NUL, raw bytes, NUL for each file below). An initial `node $safe -e '…'` freeze-only probe failed exit1,0.107s because Windows native argument quoting removed JavaScript string quotes; no file writes. Corrected stdin probe exit0,0.078s, whitespace PASS:

```powershell
@'
const fs = require('node:fs'), crypto = require('node:crypto');
const files = ['src/components/lesson-preview.tsx', 'src/components/learning-controls.tsx', 'src/app/globals.css', 'tests/lesson-text.test.mjs', 'tests/manual-authoring.test.mjs', 'tests/progress.test.mjs'];
const hash = crypto.createHash('sha256');
for (const file of files) hash.update(file).update('\0').update(fs.readFileSync(file)).update('\0');
const text = fs.readFileSync('tests/lesson-text.test.mjs', 'utf8');
if (/[ \t]+$/m.test(text) || !text.endsWith('\n')) process.exitCode = 1;
console.log('New-test whitespace/final newline:', process.exitCode ? 'FAIL' : 'PASS');
console.log('Six-file source freeze SHA256:', hash.digest('hex'));
'@ | node $safe -
```

**Unowned workspace drift, left untouched:** first status showed untracked `supabase/migrations/20261022_daily_reflections.sql`; final status shows `20261022_daily_reflections_ran.sql` instead (observed file LastWriteTime22Oct10:05:03). This slice did not edit/rename either path or execute any migration. Coordinator should reconcile the filename change separately; no application/applied-schema conclusion follows from a filename. The source-migration/actual-connected verification gate remains open per the supplied reconciliation. Existing curriculum-loader dirty delta also remains unchanged; `git diff -- tests/resume.test.mjs` is empty. No additional source edit after the freeze.

## 22 October 2026 — independent Task22 / curriculum-loader bounded LOCAL acceptance

**Verdict: PASS for the approved local functional/privacy/lifecycle packet only; Coordinator acceptance requested.** Read the complete relevant tracked delta and new reflection/starter modules/tests/SQL, actual auth/server helpers, shell/proxy/export, preview/save flow and existing harnesses. The curriculum repair adds only the actual demo-lessons module to the existing transpilation list; original assertions and real learning/curriculum/Zod remain. No substantive product defect reproduced. No source/SQL/repository-test changes, skips, timeout increases or application workaround. Earlier starter delivery and its71/71+4/4 evidence remain separate; writer80/80 and303/304 and repairer28/30 remain historical evidence below.

**Environment / reproducibility:** Windows, Node25.2.1, installed Chromium153.0.8010.12 and in-memory PGlite. Required skills loaded from existing `.github/skills` because supplied sibling paths are absent; bundled Git used because Git is not on PATH. Define `$qa = 'C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-task22-QA22c719'`. Retained `$qa\safe-run.mjs` spawns the existing absolute Node executable with only `SystemRoot,WINDIR,COMSPEC,TEMP,TMP,OS,PATHEXT,USERPROFILE,LOCALAPPDATA,APPDATA,PROCESSOR_ARCHITECTURE,NUMBER_OF_PROCESSORS`, and PATH `C:\Windows\System32;C:\Windows;C:\Program Files\nodejs`. No inherited app settings or environment-file loader. Browser routes abort network and contexts are offline/service-workers-blocked; action tests use actual helpers with synthetic auth/DB boundaries, not fabricated authorization results.

| Exact command / check (repository cwd unless stated) | Fresh independent result |
| --- | --- |
| `node "$qa\safe-run.mjs" --experimental-strip-types --import file:///C:/Users/SOLUSER/AppData/Local/Temp/forge-independent-task22-QA22c719/manual-diagnostic.mjs --test --test-concurrency=1 tests/manual-authoring.test.mjs` | **21/21**,0 failed/cancelled/skipped/todo; Node44.816s, wall44.921s, exit0. Real unchanged320px activity-formatting subtest passed1.751s,1440px1.873s. Diagnostic hook retains the5s wait/assertions and would capture mutation calls/row counts, active element, buttons/fieldset, native invalid fields, dialogs, statuses/alerts and page errors on timeout. It records a browser trace without changing files. |
| `node "$qa\safe-run.mjs" "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" test` → existing `node --experimental-strip-types --test --test-concurrency=1 tests/*.test.mjs` | **One uninstrumented full serial run:305/305**,0 failed/cancelled/skipped/todo, exit0; Node154.626s, wall155.112s. Curriculum route1/1 and starters8/8 passed. Manual320px activity-formatting1.105s and1440px1.124s passed. Fresh current local full baseline, not21Oct283 or writer303/304. |
| `node "$qa\safe-run.mjs" node_modules/eslint/bin/eslint.js src/lib/reflections.ts src/lib/reflections-server.ts src/app/reflections/page.tsx src/app/reflections/actions.ts src/components/daily-reflections.tsx src/components/learner-shell.tsx src/lib/supabase/middleware.ts src/app/api/account/export/route.ts src/app/studio/page.tsx src/lib/demo-lessons.ts scripts/check-setup.mjs tests/reflections.test.mjs tests/reflections-ui.test.mjs tests/account.test.mjs tests/database.test.mjs tests/public-config.test.mjs tests/e2e.mjs tests/curriculum-ui.test.mjs tests/manual-authoring.test.mjs tests/demo-lessons.test.mjs` | Exit0,10.455s; scoped21 source/test/script paths. |
| `node "$qa\safe-run.mjs" node_modules/typescript/bin/tsc --noEmit --incremental false` | Exit0,7.398s; direct compiler only, no repo Next writer. |
| `node "$qa\safe-run.mjs" --experimental-strip-types --import file:///C:/Users/SOLUSER/AppData/Local/Temp/forge-independent-task22-QA22c719/reflection-supplement.mjs --test --test-concurrency=1 tests/reflections-ui.test.mjs` | Final **1/1**,0 failed/cancelled/skipped/todo, exit0; Node9.531s, wall9.626s. Read-only in-memory extension reuses actual mounted UI/actions/PGlite at320/1440: required-field Enter focuses Delegation without action; keyboard create; auth-error-with-user retains dirty text/focus with no write; explicit retry updates same ID/revision2; Escape cancels deletion/returns focus; keyboard confirmed deletion leaves zero rows. Original complete UI assertions then execute unchanged. Initial extension failure explained below. |
| `node "$qa\safe-run.mjs" --experimental-strip-types --test --test-concurrency=1 "$qa\owner-roles.test.mjs"` | **1/1**,0 failed/cancelled/skipped/todo, exit0; Node3.907s, wall4.007s. Actual action/helper/DB denies foreign reviewer/instructor/admin read/list/update/delete; owner row unchanged; revoked auth rejects before service creation. |
| `node "$qa\snapshot-check.mjs"` | Selected source/config physically copied to `$qa\snapshot`; no `.env*` copied/read, no inherited app settings; existing dependency junction only. Serialized inside snapshot: `node node_modules/next/dist/bin/next typegen` exit0,1.178s; `node node_modules/typescript/bin/tsc --noEmit --incremental false` exit0,7.781s; `node node_modules/next/dist/bin/next build --webpack` exit0,31.400s. Next16.3.5 compiled `/reflections`, export and proxy;24 static pages. Owned CI/telemetry-disabled flags and inherited QA-only network guard deny fetch/HTTP/HTTPS/socket/TLS access. No repo Next command or server. All96 snapshot source files matched original bytes before cleanup. |
| Bundled `git --no-pager diff --check`; explicit changed/new trailing-whitespace + new-file final-newline checks | Exit0;24 changed/new paths passed. An initial broader final-newline scan exited1 only for11 tracked files already lacking final newline in Git HEAD; preserved convention, not a new source defect. |

**Manual timeout reconciliation, not a claimed fix:** inspected all harness state/fixture setup and the repeated native preview Escape/focus → Save+Enter → status wait. The prior repairer28/30 timeout at `tests/manual-authoring.test.mjs:452:79` did not reproduce in the smallest diagnostic run or the one standard full suite. Cause remains unresolved; no evidence justifies increasing the timeout, weakening keyboard assertions or inferring a production fix. The retained diagnostic trace is from a successful run, not a fabricated failure capture. If it recurs, use its failure-state capture and return the reproducible defect to the Implementer; do not retry until green.

**Own failed attempts, kept separate from passes:** first manual diagnostic invocation (same command above) reported0/1, exit1, Node0.118s/wall0.261s, before the test body loaded because the temporary hook expected LF but source uses CRLF; normalized only the temporary hook's in-memory input, then21/21 above. First supplemental UI invocation (same command above) reported0/1, exit1, Node10.037s/wall10.144s, after both keyboard-width probes had passed: their two successful delete calls polluted the counter used by a later unchanged original assertion (`2 !== 0`). Diagnosed as QA-extension isolation, verified no rows remained, then reset only the extension's call counter before original coverage; final1/1 above. No frozen test/assertion or application fix. One console-result extraction failed on Windows cp1252 Unicode encoding, corrected to ASCII-escaped display only. Existing typeless-package warnings and snapshot no-build-cache notice were non-failing.

**Acceptance actually exercised:** fresh auth/user+auth-error failclosed before service access; strict forged-owner/date/cursor/text validation; Gregorian/leapday/HK midnight and Unicode/nonblank/null bounds; private daily uniqueness and exact plain-text roundtrip; owner-filtered create/read/edit/delete, stable IDs/revisions and stale CAS conflict/missing behavior; reviewer/instructor/admin foreign denial. Real migration RLS/no browser policies, anon/auth CRUD denial, service CRUD, SQL bounds and auth-user cascade preserving foreign rows passed. History20/20/5 metadata-only pages, malformed lookahead/oversized/failing pages; actual export route all16 owner-filtered datasets with1050-row/exact1000/empty checked pagination, missing schema and later-page all-or-nothing private/no-store failures passed. No reflection logging/provider/report forwarding or award/progress write path found. Original quiz6/10, unlimited retry/per-pass certificate and starter regressions execute unchanged in full suite.

Mounted real UI/actions/helpers/PGlite exercised create/edit/date/history/delete, unavailable initial/schema/history vs empty/new, definite auth/validation failure, unknown/lost/malformed/unsupported acknowledgements, blocked replay and explicit canonical comparison/adoption, draft retention, same-tick duplicate/deferred calls, late unmount response invalidation, dirty date/history/nav cancellation, failed-read retained dirty guard,320/1440 layout and Enter/Escape/Tab/Shift+Tab/focus. No actual Next HTTP/action-transport or screenreader claim.

**Evidence actually opened / retained:** full-suite transcript `C:\Users\SOLUSER\AppData\Local\Temp\1792637207330-copilot-tool-output-27144-c5909fd8-b876-477a-9395-d50a4ed59b32.txt`. All four fresh full-suite images opened from `C:\Users\SOLUSER\AppData\Local\Temp\forge-reflections-20261022-C8LUvn`: `unconfirmed-create-320.png`, `confirmed-delete-320.png`, `history-canonical-1440.png`, `validation-focus-1440.png`. Inspected retained plain text, disabled unsafe mutation, explicit recovery, no false empty history, current nav, escaping, labels/counters and feedback. Other new captures under `forge-reflections-20261022-vxEBjV`/`ZXJsAO` are not claimed opened. Smallest manual-run trace retained at `C:\Users\SOLUSER\AppData\Local\Temp\forge-manual-qa01-z28AxI\independent-manual-trace.zip` (28,064,489 bytes); test helper scripts and synthetic screenshots/transcripts retained, not uploaded. Writer7EBJzi images were not reused as independent visual acceptance.

**Freeze / cleanup:** before and after all checks, all141 files under `src`, `tests`, `supabase`, `scripts` have aggregate SHA-256 **`8A2839C300DC3A0DE1779C5D76240A777223E8B05AE030B1F43A3707E4159615`** (sorted relative POSIX path + `:` + uppercase byte SHA-256, LF-joined without trailing LF). Earlier dirty work preserved. QA edits only README/tracker after gates pass. Browser/PGlite finally cleanup ran; final matching QA/test/build/Chromium process scan empty. Exact owned snapshot dependency junction unlinked first, then only `$qa\snapshot` removed; absence and original `node_modules/next/package.json` verified. No connected fixtures/services to clean. No env/key/real-record access, setup/AI/E2E/instructor execution, remote/provider request, schema application, install, commit, deploy or nested agent.

**Still unaccepted:** Coordinator final reconciliation/acceptance; owner lesson/source/4D prompt/content/pedagogical review; separately authorized synthetic-only disposable target/origin/operations/cleanup, migration/service/browser grants/schema cache, real Next action transport and Postgres concurrency/connected lifecycle; eligible live free AI; screenreader/full accessibility, owner academic submission and demo/release/production. Date/per-day/text bounds remain documented prototype assumptions. User09:54 local-features-first/connected-later sequencing and approved demo deferrals stand. Explicit20Oct provider policy unchanged; no AI code/policy change. No login request now; future shared-screen login is not permission for writes or inference.

## 22 October 2026 — separately approved narrow curriculum loader repair; freeze / independent QA requested

**Owned delta:** only `tests/curriculum-ui.test.mjs`, README and this tracker. Added `demo-lessons` to the existing production TypeScript transpilation/alias list, as already done by `tests/manual-authoring.test.mjs`; real learning/curriculum modules and installed Zod are retained. No fake helper/content, starter stub, assertion weakening/removal/addition, skipped tests or application change. This restores the existing curriculum regression coverage against the real Studio helper.

**Falsifiable hypothesis / pre-edit evidence:** after inspecting actual Studio, demo-lessons, learning/curriculum, the curriculum loader and manual-authoring precedent, predicted the unmapped Studio import would throw `Unexpected offline dependency @/lib/demo-lessons`. The single-file reproducer confirmed precisely that at the existing Studio route loop. Adding the actual module should allow those unchanged assertions to finish; they did in the combined run below.

All Node children cleared inherited environment and retained only `SystemRoot,WINDIR,COMSPEC,TEMP,TMP,OS,PATHEXT,USERPROFILE,LOCALAPPDATA,APPDATA,PROCESSOR_ARCHITECTURE,NUMBER_OF_PROCESSORS`, with fixed PATH `C:\Windows\System32;C:\Windows;C:\Program Files\nodejs`; existing absolute Node executable, dependencies, offline Chromium153.0.8010.12 and in-memory PGlite only. No environment files or Next env-loading wrapper.

| Exact command / check | Actual writer result |
| --- | --- |
| Before edit: `node --experimental-strip-types --test --test-concurrency=1 tests/curriculum-ui.test.mjs` | **0/1**,1 failed,0 cancelled/skipped/todo, exit1,5.951s; `Unexpected offline dependency @/lib/demo-lessons`. |
| After edit, **one serial combined run**: `node --experimental-strip-types --test --test-concurrency=1 tests/curriculum-ui.test.mjs tests/demo-lessons.test.mjs tests/manual-authoring.test.mjs` | **28/30**,2 failed,0 cancelled/skipped/todo, exit1,37.300s. Curriculum **1/1** and starter **8/8** passed. Manual-authoring had19 passing subtests; the 320px `activity formatting, preview, create/update, dirty baseline and retained failure` subtest timed out5000ms waiting for visible `Lesson created.` at `tests/manual-authoring.test.mjs:452:79` (subtest declared at424:19), and its parent failed. This is an observed remaining blocker, not established as transient or diagnosed as a source defect. No retry or out-of-scope repair. |
| `node node_modules/eslint/bin/eslint.js tests/curriculum-ui.test.mjs` | Exit0. Direct TypeScript not needed/run: JavaScript module-list-only change, exercised by actual runtime transpilation; no TS source/config change. |
| Bundled Git `--no-pager diff --check`; frozen-file SHA-256 comparison | Post-documentation exit0; all140 frozen files byte-identical to pre-edit fingerprint below. Only the owned curriculum test was added to the pre-existing dirty-file list. |

**Retained history / acceptance boundary:** the previous reflection full `npm test` result remains **303/304**, exit1, as recorded verbatim in its historical handover below; no new full-suite baseline is claimed. Its loader blocker was reproduced and repaired here, but **the requested combined gate is not green** because of the manual-authoring timeout. No full-suite/build rerun or independent reflection acceptance. Independent QA is requested to verify this one-line repair and reconcile the separate timeout under its own authority.

**Freeze / preservation:** all140 files under `src`, `tests`, `supabase` and `scripts`, excluding the owned curriculum test, had identical pre/post SHA-256 aggregate `7DA6232FBF42D000181BB4081DB3BEA8A7951CA897F9599D27B8CB91F1E4B672`. Earlier dirty starter/reflection work and authorization boundaries remain untouched. No new application implementation, environment-file reads/imports, remote/providers, services, installs, migration application, connected suites, commit or deployment. Test-owned browser/PGlite cleanup ran; generated synthetic screenshots were not visually inspected or accepted. Connected testing remains deferred to later shared-screen login and separately authorized operations.

## 22 October 2026 — 09:54 continuation, Task22 private daily reflections LOCAL writer handover

**Decision and scope:** owner explicitly asked to continue other implementation and deferred login/shared-screen connected tests until features are ready. Coordinator assigned this bounded Task22 prototype-MVP slice. It proceeds on independently accepted **local** core/starter regressions, **not connected-core-stability acceptance**. No nested agents; latest20Oct provider policy unchanged; no AI/provider work. Original demo deferrals (14/16 targeted revisions,18 tailoring,19 binaryPPT/student assistant,23 planner,24 runner) and academic/content/submission ownership remain unchanged. Historical first-starter-slice records below correctly describe what was absent then.

| Task / owner | Dependencies | Delivered locally | Acceptance / verification still required |
| --- | --- | --- | --- |
| **22 — private daily 4D reflections**; Implementer (writer), Coordinator reconciliation, independent QA, Owner pedagogy | Existing currentUser/auth, shell, service DB, account export/delete; ordered migrations through `20261021_progress_evidence_ran.sql`; accepted local core/starter evidence. No AI or tailoring dependency for this bounded slice. | Signed-in `/reflections`, shell link, protected middleware path; four beginner-prompted plain-text fields, per-owner/date uniqueness, stable ID/revision/timestamps, create/read/edit/CAS-delete, metadata pagination, explicit recovery/discard/delete controls; export and auth cascade. | **Writer local gate green; independent Task22 acceptance pending.** Separate owner prompt/pedagogy review; authorized target/schema/grants/cache and real Next action transport, multi-tab/connected races/lifecycle, screenreader/full accessibility. One unrelated full-suite loader blocker below needs Coordinator authority. No release certification. |

**Product assumptions:** default date uses **Asia/Hong_Kong**, visibly labelled; strict real Gregorian `YYYY-MM-DD` including leap days and years0001–9999, no arbitrary last-year restriction. One editable entry per explicit owner/date, retained until individual or account deletion. All four fields required, nonblank, max2000 Unicode code points (native textarea maxLength4000 for surrogate pairs plus displayed Unicode counter/client/server/DB validation); “not used today” is valid. Text stays untrimmed/plain/React-escaped, never interpreted as Markdown/HTML. No reflection text forwarding to AI, analytics or reports; no automatic admin/instructor/reviewer browsing. No attendance/review/pass/progress inference, streaks, grades or certificates. History returns20 metadata rows with strict date/ID cursor and lookahead, never full text. Unavailable read/schema/history is distinct from an empty date/history.

**Safety/recovery:** all actions use actual fresh `currentUser()` before service DB construction; auth errors reject even when a user is present. Strict input shapes reject forged owner fields; every read/update/delete has owner filters, CAS also checks ID/date/revision. DB unique owner/date prevents duplicate creates. Failed or unconfirmed writes preserve date/selected entry/draft, block unsafe replay, and require explicit **Inspect canonical entry** reconciliation without replacing text. Choosing canonical state discards only after a guard; an inspected empty date can retain the draft for explicit create. Delete has explicit confirmation and expected revision, retains state on failure/uncertainty, and never auto-creates after confirmed deletion. Locks prevent duplicate/overlapping mutations; unmount/owner-keyed selection invalidates late responses. In-app date/history/links/logout have discard guards; cancel/Escape returns focus, Tab stays inside the dialog. No always-on beforeunload trap. Normal reload/inspection/no-op saves never write.

**Lifecycle/all surfaces:** `forge_reflections` is the **16th** complete owner export table; existing checked500-row pagination/all-or-nothing private/no-store errors remain. Missing schema cannot be silently omitted. FK `auth.users ON DELETE CASCADE` removes only the deleted owner's reflections. New migration `supabase/migrations/20261022_daily_reflections.sql` is **source only, not applied by this work**, after all existing migrations including `20261021_progress_evidence_ran.sql`. Old migrations untouched. No browser policies/grants; explicit service-role CRUD. Sanitized setup table/column diagnostics updated but **not executed**.

**Pre-edit falsifiable hypothesis/check:** inspected actual auth/export/interview/helper/shell/middleware and nearby test contracts plus nonsecret status/diff; predicted owner-filtered CRUD + unique owner/date + CAS would reject foreign/stale writes and preserve uncertain drafts without side effects. Chose actual-action/helper offline PostgreSQL tests first, then actual mounted component/actions/DB in network-blocked Chromium. Initial six dirty starter files were preserved; no revert/amend/commit.

**Commands/environment/results (writer only):** each Node/npm child cleared its environment, retained only `SystemRoot,WINDIR,COMSPEC,TEMP,TMP,OS,PATHEXT,USERPROFILE,LOCALAPPDATA,APPDATA,PROCESSOR_ARCHITECTURE,NUMBER_OF_PROCESSORS`, and used fixed PATH `C:\Windows\System32;C:\Windows;C:\Program Files\nodejs`. No app-secret inheritance, environment-file import/access or Next env-loading wrappers.

| Actual command / check | Result |
| --- | --- |
| Inline `node --experimental-strip-types --input-type=module -e …` leaf probe before UI | Passed leapday/date/HK-midnight/create validation. |
| `node --experimental-strip-types --test --test-concurrency=1 tests/reflections.test.mjs tests/account.test.mjs tests/database.test.mjs` | First50/53,3 failed: PGlite date serialization mismatch (not a successful action). Adapter corrected to PostgREST's `YYYY-MM-DD`, no expected helper answers stubbed. Next four-file gate including `tests/public-config.test.mjs`: **57/57**. |
| `node --experimental-strip-types --test --test-concurrency=1 tests/reflections-ui.test.mjs` | First failed on missing explicit discard interaction in test; then exposed mobile-shell Escape focus loss. Test now confirms the required discard; product dialog stops Escape propagation and uses explicit guarded-link focus origin. An added failed-selection-load regression produced78/79 in an intermediate combined run: text/selection survived but a premature discard reset disabled its next guard. Removed that reset; focused UI passed, then79/79. Final checks add Tab/Shift+Tab trapping, Enter cancellation, unsupported acknowledgement blocking, and a separate actual-page auth/no-write test. Subsequent passes include actual actions/DB, not fake CRUD answers. |
| `node --experimental-strip-types --test --test-concurrency=1 tests/reflections.test.mjs tests/reflections-ui.test.mjs tests/account.test.mjs tests/database.test.mjs tests/public-config.test.mjs tests/auth.test.mjs` | **Final80/80**,0 failed/cancelled/skipped/todo, exit0,30.951s. Earlier79/79 passed before the additional page regression; earlier80/80 preceded the explicit unchanged-form submit guard/assertion. Final transcript `C:\Users\SOLUSER\AppData\Local\Temp\1792636404272-copilot-tool-output-27144-5baec50b-2ec4-4e96-93ca-d92676914aa4.txt`. |
| `node node_modules/eslint/bin/eslint.js src/lib/reflections.ts src/lib/reflections-server.ts src/app/reflections/page.tsx src/app/reflections/actions.ts src/components/daily-reflections.tsx src/components/learner-shell.tsx src/lib/supabase/middleware.ts src/app/api/account/export/route.ts scripts/check-setup.mjs tests/reflections.test.mjs tests/reflections-ui.test.mjs tests/account.test.mjs tests/database.test.mjs tests/public-config.test.mjs tests/e2e.mjs` | Final exit0. Initial scoped lint rejected a render-time dirty-ref assignment; moved to an effect, UI rerun green. |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | Exit0, including final source; no Next typegen/build. |
| **One** `npm test` (existing npm CLI via absolute Node path) | **303 passed/304,1 failed**,0 cancelled/skipped/todo,169.469s, exit1. Failure: `tests/curriculum-ui.test.mjs` actual Studio route lacks loader mapping for the earlier slice's `@/lib/demo-lessons`. **Not green; not a new independent baseline.** File untouched: it is unrelated to reflection imports/export, outside narrow cross-test repair permission; Coordinator authorization/reconciliation requested. No repeated full run. Full transcript `C:\Users\SOLUSER\AppData\Local\Temp\1792635105002-copilot-tool-output-27144-95eed85b-0c39-41fb-a766-060db8ab9546.txt`. Final malformed/oversized-lookahead/acknowledgement checks, failed-selection guard fix, visible page-auth recovery and E2E contract additions were covered by focused gate/lint/tsc after this sweep, not a rerun full pass. |
| Bundled Git `--no-pager diff --check` | Passed after source edits; repeated after docs. |

**Coverage actually executed:** real Gregorian/leap/HK midnight; Unicode/whitespace/null/size bounds; currentUser unauth/returned-auth-error-with-user/thrown denial before service access, including actual page auth-error display and authenticated no-write default/history projection (leaf component tags substituted only for this route-prop probe); forged owner/admin foreign read/list/update/delete; daily uniqueness and stable IDs/revisions; stable20/20/5 metadata pagination, malformed21st/oversized page rejection; actual DB constraints, direct anon/auth CRUD denial, service CRUD, stale CAS, account cascade preserving foreign owner; >1000-row per-table owner export, exact boundary, missing reflection schema and all returned/thrown/malformed later-page failures. Mounted actual component+actions+helpers/PGlite covers failed initial reads vs empty, returned DB failure, postcommit thrown/malformed/unsupported ack, conflict/inspect/discard/cancel/draft preservation, duplicate click/deferred mutation, late unmount response, select/edit/delete/history/pagination failures (including retaining the dirty guard after failed selection) and no HTML execution, 320/1440 overflow, keyboard Escape/Tab/Shift+Tab/Enter/focus and visible validation/status. Ordinary reload/inspection has no write path; submitting an unchanged form is also explicitly guarded and tested to dispatch nothing. No claim of actual Next transport or comprehensive accessibility.

**Fresh images actually opened:** `C:\Users\SOLUSER\AppData\Local\Temp\forge-reflections-20261022-7EBJzi\unconfirmed-create-320.png`, `confirmed-delete-320.png`, `history-canonical-1440.png`, `validation-focus-1440.png` (all four from final80/80); installed Chromium153.0.8010.12. Visible retained text, disabled unsafe saves, no false empty history, explicit recovery controls, current navigation, text escaping, labels/counters and feedback inspected. Four earlier green-run images each under `…\forge-reflections-20261022-qEhXcY`, `…\forge-reflections-20261022-JW81Lq` and `…\forge-reflections-20261022-uKsFEl` were also opened; unviewed intermediate/full-suite captures are not claimed as visual acceptance.

**Touched paths/ownership:** new `src/lib/reflections.ts`, `src/lib/reflections-server.ts`, `src/app/reflections/page.tsx`, `src/app/reflections/actions.ts`, `src/components/daily-reflections.tsx`, `src/components/reflections.module.css`, `supabase/migrations/20261022_daily_reflections.sql`, `tests/reflections.test.mjs`, `tests/reflections-ui.test.mjs`; assigned existing `src/components/learner-shell.tsx`, `src/lib/supabase/middleware.ts`, `src/app/api/account/export/route.ts`, `scripts/check-setup.mjs`, `tests/account.test.mjs`, `tests/database.test.mjs`, `tests/public-config.test.mjs`, README and this tracker. **Narrow permitted exception:** `tests/e2e.mjs` full-scope schema preflight must now recognize the new required export table, and its existing export assertions now additionally require the reflection array/owner isolation; existing assertions retained, suite not executed. No instructor-harness change needed. No unrelated source/dependency/test-loader repair.

**Cleanup/remaining:** all test browser contexts/PGlite instances closed via cleanup; no helper service started and no connected fixtures exist. Only synthetic temporary screenshots/tool transcripts remain. Missing sibling skill files/Git-on-PATH were resolved using existing `.github/skills` and bundled Git, without installation. Node typeless-package warnings are non-failing. Independent local QA requested, with the full-suite blocker explicitly disclosed; no self-certification of release/all-features/production. Target authorization, migration application/cache/grants, actual Next/session/connected persistence/concurrency/export/delete checks, owner pedagogy/content and accessibility/submission gates remain. The owner's future shared-screen login is not migration/provider/production authorization. No remote/provider/Supabase/inbox requests, environment-file reads, installs, servers, paid use, migration application, connected suites, commit or deployment.

## 22 October 2026 — independent first-starter-slice LOCAL acceptance

**Verdict: PASS for this bounded local functional slice only.** Independently inspected the complete six-file tracked/untracked delivery and nearby Studio/editor/save/permission/player contracts. Initial and final working-tree scope is the same six-file packet; no unrelated dirty work was reverted. No substantive product defect reproduced; no source/test repair or assertion change. Coordinator owns final reconciliation; owner content approval and connected/release acceptance remain open.

**Fresh execution, main gate 09:44–09:45 HKT plus supplemental follow-up, existing Windows dependencies / Chromium153.0.8010.12:** child processes used only `SystemRoot,WINDIR,COMSPEC,TEMP,TMP,OS,PATHEXT,USERPROFILE,LOCALAPPDATA,APPDATA,PROCESSOR_ARCHITECTURE,NUMBER_OF_PROCESSORS` plus fixed PATH (`C:\Windows\System32;C:\Windows;C:\Program Files\nodejs`). No inherited application settings, environment-file access/import or Next env-loading wrapper.

| Exact command / check | Independent result |
| --- | --- |
| `node --experimental-strip-types --test --test-concurrency=1 tests/demo-lessons.test.mjs tests/manual-authoring.test.mjs tests/learning.test.mjs tests/curriculum.test.mjs tests/resume.test.mjs tests/progress.test.mjs` | **71/71**,0 failed/cancelled/skipped/todo, exit0; Node48.422s, wall48.538s;09:44:14–09:45:03. |
| `node node_modules/eslint/bin/eslint.js src/lib/demo-lessons.ts src/app/studio/page.tsx tests/demo-lessons.test.mjs tests/manual-authoring.test.mjs` | Exit0,5.351s. |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | Exit0,6.312s; no Next typegen/build. |
| `node --experimental-strip-types --input-type=module` with independent inline QA code (command transcript, session27; no test file edit) | **4/4**,0 failed/cancelled/skipped, exit0: actual transpiled learner route for all three starters exposes prompt/options only, no correct index/explanation/authoring-reference props; six-file transpiled learner-client import closure has no starter module, stopping at server-action boundaries. Saved reference slides remain visible. This is not a generated Next bundle check. |
| Bundled Git `--no-pager diff --check`; explicit trailing-whitespace/final-newline checks for both new files | Exit0 / passed before evidence edits; repeated after doc-only edits. Four delivered non-doc SHA-256 fingerprints unchanged through checks. |

**Executed coverage:** strict allowlisted IDs/prototype and array/non-string rejection; independently cloned drafts; canonical family/metadata and distinct five-slide/ten-four-option-question content with explanations; real grader5-fail/6-pass; review-pending text and reference URLs retained by real save actions. Actual mounted Studio selection/reopening causes no save/enroll/AI; explicit manual opt-in, blank authoring, authorized persisted-edit precedence, foreign-owner denial, first private create/second same-ID version2 save, learner publish denial and instructor owner publication passed. Existing uncertain-save/retry/stale-version, resume queue/conflict and progress/player boundaries passed. Keyboard Enter/Tab/Shift+Tab/Escape, validation/error focus, preview and dirty-link cancellation have bounded mounted evidence, not full accessibility acceptance. The non-manual generation branch is stubbed in this authoring harness; no AI success is inferred.

**Fresh evidence actually opened:** `C:\Users\SOLUSER\AppData\Local\Temp\forge-manual-qa01-JkiMv4`: six `starter-review-`/`starter-editor-` captures (three review/editor pairs) for `sdlc-small-change-320.png`, `coding-agent-4d-1440.png`, `product-tradeoffs-1440.png`; also `starter-sdlc-small-change-320.png`, `blank-quiz-320.png`, `activity-insufficient-1440.png`, `uncertain-create-mobile.png`, `blank-saved-1440.png` (**11 images**). Visible guidance/references, editable fields and focused validation/recovery states inspected; mounted overflow assertions passed at320/1440. Desktop starter review/editor captures share the same viewport and show review guidance/title, not the entire editor. Test transcript: `C:\Users\SOLUSER\AppData\Local\Temp\1792633492003-copilot-tool-output-27144-5184699b-8b10-4a52-a4bb-97d9a7e38203.txt`. Additional progress captures were generated but are not claimed as opened.

**Failures / cleanup:** no failed functional acceptance check or cleanup failure. An extra whole-document final-newline scan exited1: README/tracker both lack a final newline already in Git HEAD; that existing convention was preserved. Required changed-line Git whitespace and both new-file whitespace/newline checks pass. Missing sibling skill paths/Git-on-PATH were resolved with repository `.github/skills` and existing bundled Git; no installation. Existing Node typeless-package warnings were non-failing. Browser contexts/PGlite closed through harness cleanup; all seven known QA Node workers were absent on the final process check. Only synthetic temporary screenshots/tool transcripts remain; no connected fixtures, service or temporary source copy to clean. QA touched **README.md and IMPLEMENTATION_TRACKER.md only**, after checks passed; historical writer/baseline logs remain unchanged.

**Unaccepted / remaining gates:** explicit owner review of all three lessons' facts, pedagogy, age suitability, order, keys and references; no external plagiarism or URL/source-availability certification. Real Next routing/action transport, separately authorized disposable nonproduction target/schema/grants/cache, connected persistence/reload/races/enrollment/results/per-pass certificates, eligible free live AI, screenreader/full accessibility, full-suite/build and submission/release/production gates remain open. No disposable nonproduction DB is confirmed. Latest independent full-suite baseline remains **21Oct283/283**; today's71/71 and4/4 are focused local evidence, not replacement full-suite or whole-core acceptance. No remote request, environment-file read/import, app-secret inheritance, server, install, connected suite, deployed migration, live AI probe, nested agent, commit or deployment;22Oct approval is not remote-write/live-AI/production authorization.

## 22 October 2026 — approved prototype-first cut; first local curated-starter slice

**Authorization / status:** owner approved the proposed prototype-first cut and explicitly asked to start implementation on 22 October. This bounded first **local** slice now has independent LOCAL acceptance above; **owner review pending**. Coordinator retains scope reconciliation/acceptance; owner retains academic/content and final submission responsibility. Deadline **31 October**, supervised Hong Kong demo, ages **13+**. Neither three owner-reviewed lessons nor a connected accepted journey nor live AI success is claimed.

### Current priority / deferral matrix

| Order | Owner / dependencies | Deliverable and acceptance gate | Current evidence / remaining work |
| --- | --- | --- | --- |
| **1 — existing core** | Coordinator assigns; Implementer repairs assigned defects; independent QA. Requires separately authorized synthetic-only target/origin and correct schema/grants. | Instructor manual create/edit/publish → learner enroll/slides/resume → ten-question server grading, 6/10, unlimited retries → result and certificate for each pass. Preserve existing controls. | Existing bounded local acceptance retained; this slice additionally exercises manual create/private save/same-ID edit. Actual Next transport, connected persistence/reload/races, enrollment/results/certificates still need authorized acceptance. |
| **2 — three short lessons (08/14)** | Implementer owns six files below; Owner reviews content/pedagogy/sources/13+ suitability; independent QA. Reuses real editor/actions; no AI dependency. | One original lesson per canonical SDLC, coding-agent and soft/product family, metadata, 4–6 slides, 3–6 ordered steps, exactly ten four-option questions. Owner review before demo publication. | Three review-ready starters delivered, five slides each. Coding-agent activity applies Delegation, Description, Discernment and Diligence. **Not owner-reviewed**; source links suggested, not remotely verified. |
| **3 — ONE timeboxed AI showcase** | Coordinator/Owner choose; QA only after separate eligible-adult/free-provider/data-processing/target authorization. | Prefer saved generation; interviews alternate only if more reliable. Require valid saved output and explicit recovery over real transport. | **No live AI success proven.** Existing generation/interviews/paths stay accessible; no provider/client or eligibility change. |
| **4 — bounded 4D/reflections continuation (22)** | Coordinator/Owner; Implementer; independent QA. Local core/starter evidence; owner deferred connected testing at09:54. | Private daily CRUD/history with owner privacy/export/deletion; no AI/awards. Connected core is not claimed stable. | First starter slice supplied ordering practice only, no daily implementation then. Subsequent Task22 packet now passes independent LOCAL QA305/305 plus focused probes/build above; Coordinator acceptance, owner prompt review and connected gates remain. |
| **5 — parallel demo/submission (21)** | Owner final responsibility; Coordinator reconciles; team supplies evidence. | Reviewed report, video, manuals, slides, demo script and contribution/stakeholder evidence by deadline. | Remains open; historical local passes are not submission or release acceptance. |

**Owner-approved DEMO deferrals (original brief conflicts remain unmet, not completed):** new embedded JS/Python runner24; binary PPT conversion19 (**PDF/PPTX only for demo**, binary PPT still unsupported); student slide assistant19; private project planner23; genuine content tailoring18; targeted AI revisions14/16. Separate roster/cohort/invitation and voice/video deferrals remain. Do not delete existing implementations. Production hardening can wait, not authentication, role/owner checks, upload/resource limits, keys, grading, free-only or AI eligibility. No privacy relaxation: explicit20Oct client settings supersede historical ZDR wording and are unchanged.

### Delivered files / falsifiable check

Exclusive six-file ownership respected; clean initial Git status/diff, no unrelated work reverted:
- **Created** `src/lib/demo-lessons.ts`: three typed allowlisted IDs, original lesson content and public source/review descriptions; strict unknown-input rejection and fresh cloned drafts. No I/O or persistence.
- **Edited** `src/app/studio/page.tsx`: server-rendered starter links, explicit `?manual=1&starter=<id>`, visible authored/review-pending labels and review sources. Reuses `LessonEditor` and real save actions; blank authoring, persisted edit precedence, permissions and dirty-link/uncertain-save contracts retained. No learner-player key exposure or public read route added.
- **Created** `tests/demo-lessons.test.mjs`; **edited** `tests/manual-authoring.test.mjs`: actual schema/curriculum/grader, transpiled route/editor/actions with offline synthetic adapters, starter isolation, explicit invalid/repeated/non-string inputs, no pre-save mutation/inference, private create → same-ID/version2 save, edit/foreign-owner precedence, canceled dirty links, learner publish denial and instructor owner publishing. Existing ambiguous-save/native-validation regressions preserved.
- **Edited** `README.md` and this tracker: approved priorities/deferrals, usage, current summaries and evidence. No schema/editor/helper/client/policy/dependency changes.

**Hypothesis before editing:** only an explicit allowlisted manual selection supplies an isolated draft; existing persisted edits win and no write/inference occurs before Save. Chosen first checks: real schema/metadata/grader smoke, then starter/manual mounted regression selectors before expansion. Initial smoke passed all three (five slides, ten questions, correct-key score10). Tests use actual production contracts, not fabricated happy-answer helpers.

### 22 October fresh implementer commands / results

All Node **children** used OS-only allowlist: `SystemRoot,WINDIR,TEMP,TMP,USERPROFILE,LOCALAPPDATA,APPDATA,COMSPEC,PATHEXT,NUMBER_OF_PROCESSORS,PROCESSOR_ARCHITECTURE`, fixed PATH (Node directory + System32), `CI=1`, `NEXT_TELEMETRY_DISABLED=1`; no inherited application settings. Invoked using PowerShell single-quoted here-string piped to `node --input-type=module`, `spawnSync(process.execPath,args,{env,stdio:"inherit"})`. Existing installed dependencies, Windows/Node25.2.1, Chromium153.0.8010.12. No Next env loader.

| Exact child command / check | Actual result |
| --- | --- |
| `node --experimental-strip-types --test --test-concurrency=1 tests/demo-lessons.test.mjs tests/manual-authoring.test.mjs` | First **24/29 passed,5 failed** (four failed assertions/subtests + parent); second **27/29,2 failed** (one subtest + parent); repaired **29/29**,0 failed/cancelled/skipped,29.413s. |
| `node --experimental-strip-types --test --test-concurrency=1 tests/demo-lessons.test.mjs tests/manual-authoring.test.mjs tests/learning.test.mjs tests/curriculum.test.mjs` | Final **42/42**,0 failed/cancelled/skipped,**34.539s**,exit0. Existing curriculum import check uses actual helpers/migrations in in-memory PGlite; mounted authoring uses real actions with synthetic DB adapter and offline/network-blocked Chromium. |
| `node node_modules/eslint/bin/eslint.js src/lib/demo-lessons.ts src/app/studio/page.tsx tests/demo-lessons.test.mjs tests/manual-authoring.test.mjs` | Exit0 |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | Exit0; direct compiler, no Next typegen/build |
| Bundled Git `--no-pager diff --check`; explicit trailing-whitespace/final-newline checks for `src/lib/demo-lessons.ts` and `tests/demo-lessons.test.mjs` | Passed; final status contains only the six assigned files (four modified, two new). |

**Preserved failures/fixes:** initial Git-on-PATH and requested sibling skills paths were unavailable; used existing bundled Git and loaded `.github/skills/forge-delivery/SKILL.md` plus `forge-verification/SKILL.md`. No install needed. First test run found short club-name options under the new anti-filler assertion (expanded to meaningful club names), wrong publish-checkbox label, ambiguous edit hidden ID (publication-review form also has one), and exact Summary label matching an initially populated textarea text node. Second run isolated that final selector issue; changed only the new harness selector to a prefix label. No production authorization/validation workaround or assertion removal. Existing Node typeless-package warnings remain non-failing.

**UI evidence:** final run directory `C:\Users\SOLUSER\AppData\Local\Temp\forge-manual-qa01-nNVDb2`. Actually opened six final images: `starter-review-` and `starter-editor-` pairs for `sdlc-small-change-320.png`, `coding-agent-4d-1440.png`, `product-tradeoffs-1440.png`. Review guidance/source links and editable title/metadata are readable; checked no horizontal document overflow, keyboard Save and dirty navigation cancellation. Native narrow subject selects clip long values (existing control convention). This is mounted UI, not deployed/Next routing or screenreader acceptance. Three earlier starter-menu captures were also opened from `forge-manual-qa01-nAS1F4`; not relabeled final images. Browsers/PGlite closed via existing cleanup, no remote fixtures.

**Remaining gates / safety:** request independent QA, not self-certified release. Owner must review original explanations, answer keys, order, public references and age suitability; owner review is not satisfied by schema/grade tests. Latest independent baseline is **21Oct283/283**, not a fresh full-suite pass today. Connected core, actual action transport, target migration/grants/cache, multi-session races, screenreader, eligible free live AI and owner submission gates stay open. **Synthetic-only restriction:** current authorization is local/offline; before any connected write reconfirm disposable nonproduction target/origin, action-scoped permission, synthetic accounts/data and cleanup. No production approval, real learner data, environment-file reads/loads, setup/AI/connected scripts, services, external requests, installs, migrations, deployments, commits or nested agents. Coordinator must separately resolve target availability; no assumed production fallback.

## 21 October 2026 — fresh independent 09/12 bounded LOCAL acceptance after test-loader repair

**Verdict / ownership:** accepted for the approved local/offline scope only. Coordinator owns final reconciliation; Tasks09/12 and connected/release gates remain **Open/Partial**. QA changed only this near-top evidence/current09/12 phrasing and the short README current summary after the fresh gates passed. The first independent **281/282** failure, writer reproducer **0/1 → 1/1**, focused **3/3** and all earlier histories below remain historical evidence, not reclassified as fresh passes.

**Exact repair review / freeze:** inspected the complete `tests/onboarding.test.mjs` diff: the loader transpiles the actual `src/lib/learning.ts` using its existing Zod adapter; optional synthetic lesson/record inputs retain empty defaults; one added test runs the real onboarding action and dashboard/shared helper over historical/current evidence. Original redirect/return/recovery assertions are unchanged. No application workaround, fabricated helper return, skip or assertion weakening. Original11 non-doc packet still hashes **`25f6e83a5fc93c40397b62759b23224f88dba49becd4a41d64079d80f75515e8`**; repaired12 aggregate matches **`14d030fadb6b9742fb047dbec62f3f4d68ca7b688d5109db0bdb07eaf1e7033b`**, and onboarding test SHA-256 is **`3591dfc1ccb73dc3a947125fa733f82e252c8fc9795b4b81b29bf90b2016b82b`**.

The first-QA137 non-documentation core aggregate is reproduced exactly as **`d7ccebf25427f891a9a270b14930fe13a77944a0c6b44cb376e6c1455dac481f`** when only onboarding is substituted with its prior Git version in original Windows-checkout CRLF bytes; no source file was restored or edited. This verifies application/config/schema/other-test equivalence against the core of the prior155-input baseline. Current155 nonsecret inputs hash **`f49df478abcf883bfbe564124fcc16326ea35f20efedc4a751ca59da64ee8e4a`** before/after the fresh suite, before permitted doc edits. Frozen153 inputs excluding README/tracker hash **`40396e0ce560c92ee518a04b1411db11ef18cc1d15b21e8a1564ea9949dfd33a`**. Convention: sorted relative path + space + byte SHA-256, newline-joined without trailing newline. Git HEAD remains `095790e2eb7bbdafd6d3bb499aa748c86990f84c`; pre-existing work was preserved.

**Fresh commands / actual results — Windows, Node v25.2.1, existing dependencies, 21 October HKT:**

| Command | Start–end / actual result |
| --- | --- |
| `npm test` → existing `node --experimental-strip-types --test --test-concurrency=1 tests/*.test.mjs` | **13:15:49.184–13:17:37.108;283/283**,0 failed/cancelled/skipped; Node107.593s, wall107.921s, exit0 |
| `node node_modules/eslint/bin/eslint.js tests/onboarding.test.mjs` | **13:16:22.700–13:16:25.596**;2.897s, exit0 |
| Bundled Git `--no-pager diff --check` | Exit0 before and after permitted documentation updates |
| Explicit trailing-whitespace checks on delivered untracked SQL/progress test | Passed; these files remain frozen |

Only one fresh standard suite was run, using the unchanged serial package script; no redundant focused rerun or heavy build gate. Both original actual-dashboard onboarding test and new current-version helper/dashboard test passed. Fresh suite also re-exercised real action/helper/PGlite progress semantics and mounted offline UI. Transcript: `C:\Users\SOLUSER\AppData\Local\Temp\1792559762227-copilot-tool-output-20708-47990e55-e76c-4d65-a9c4-aa287dfe21d9.txt`.

**Retained first-QA source-equivalent evidence, explicitly not fresh:** on **21 October12:56–13:06 HKT**, full lint/direct TypeScript passed; env-file-free snapshot `npm run typecheck` and `npm run build` passed (13:01:31–13:01:55); three independent PGlite revocation/version/deletion/cascade-isolation probes passed (13:04:57); nine screenshots under `C:\Users\SOLUSER\AppData\Local\Temp\forge-progress-20261021-hoW80k` were actually opened, including keyboard/status/result focus and320/1440 layouts. Their dimensions/hashes, commands and limits remain in `C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-progress-20261021-qgb2jj1n\INDEPENDENT_EVIDENCE.md`. Application/UI/migration/dependency equivalence makes that evidence applicable; it was not needlessly rerun or re-opened. Fresh suite images under `C:\Users\SOLUSER\AppData\Local\Temp\forge-progress-20261021-1xsTyn` are retained but **not claimed as newly inspected**.

**Safety / cleanup:** fresh Node/npm children received the same OS-only allowlist plus fixed local PATH, CI/no-color/telemetry-disabled and offline npm controls; no inherited application settings or Next env loader. In-memory synthetic PGlite and offline/network-blocked Playwright only; suite fixtures/browser contexts closed. No new snapshot/service/connected fixture was created, so there is no new snapshot cleanup. First-QA exact owned snapshot/cache removal at13:06:05 remains complete; retained evidence/source/caches were not removed. No environment-file access/imports/edits, secrets, remote/Supabase/catalog/provider calls, server startup, connected suites, installs, schema deployment, commits or nested agents.

**Remaining gates (not passes):** real Next HTTP/server-action transport; separately authorized migration/grants/PostgREST schema cache; real multi-session Postgres locking/races; connected owner export/cascade/unload; screenreader; broader authorized reports and release/operational gates. Local09/12 acceptance does not certify remote durability, accessibility or release readiness.

## 21 October 2026 — independent 09/12 gate BLOCKED; bounded test-loader repair awaiting fresh QA

**Verdict / ownership:** independent QA **`1d212ede-d03b-4554-8758-3f66e2374460` BLOCKED** the standard suite: **281 passed / 1 failed of 282**, 0 cancelled/skipped, Node **126.828s** (wall127.298s, exit1). No substantive application defect was demonstrated in its exercised scope. This blocked gate is **not accepted** by the writer's repair results. Coordinator explicitly extended same-task ownership only to `tests/onboarding.test.mjs` plus README/tracker evidence. Sole writer, no nested agents; all application source, migration, other delivered tests and dependency manifests remain frozen. Tasks09/12 remain **Open/Partial** pending fresh independent acceptance and connected gates.

**Independent evidence — recorded separately from implementer red/green:** read `C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-progress-20261021-qgb2jj1n\INDEPENDENT_EVIDENCE.md`. QA ran the existing serial `npm test` once (12:56:41–12:58:48 HKT). Its sole failure was the actual dashboard onboarding test's loader rejecting the new real `@/lib/learning` import before first-entry/return/recovery assertions executed. The progress module's 17 checks passed within that otherwise-blocked suite. QA also independently passed:
- Three additional PGlite boundary probes: enrollment deletion between authorization/RPC without evidence recreation; version advance plus lesson deletion preserving the original saved attempt snapshot; and auth-owner deletion without changing a foreign owner's explicit review.
- Full `npm run lint`, direct TypeScript, `npm run typecheck` and `npm run build`, with Next commands **only inside an env-free snapshot** with physically copied dependencies and an OS-environment allowlist. Git/explicit new-file whitespace checks passed.
- Nine fresh synthetic screenshots actually opened at `C:\Users\SOLUSER\AppData\Local\Temp\forge-progress-20261021-hoW80k`: optional review 320/1440, unconfirmed 320, saved 1440, quiz-pass 320, history 320/1440, dashboard-new-version 320/1440. The independent report records individual hashes/dimensions and keyboard/focus/overflow review.
- All **155** expanded frozen-input fingerprints unchanged before/after QA; no QA source/docs edits. Exact owned snapshot/cache were removed at 13:06:05 HKT; report/probes/screenshots retained. These passing checks do not turn the failed standard suite into acceptance.

**Hypothesis / precise bounded repair:** the loader, not dashboard behavior, omitted the shared learning module. Adding `"@/lib/learning": "src/lib/learning.ts"` to its existing transpiled `sourcePaths` should make the unchanged dashboard gate assertions execute. The exact reproducer first failed **0/1** with `Unexpected dependency: @/lib/learning`; the one-line real-module mapping then passed **1/1**. Zod is already supplied by the existing loader; no fabricated helper return values, import removal, application workaround, weakened assertion or skip was added.

Extended only this fixture's existing lesson/record adapters with optional synthetic inputs (empty defaults unchanged) and added **one** narrow integration test: real onboarding action followed by real dashboard/shared helper renders. Legacy attendance and an old-version pass keep the current card at Continue while the any-version aggregate remains 1; old review/attendance stay old; explicit current-version review, attendance and saved 6/10 independently produce the corresponding current labels. Original first-entry redirect, returning-user and recovery-link assertions remain unchanged.

**Implementer commands / actual results (not independent acceptance):**

```powershell
node --experimental-strip-types --test --test-concurrency=1 --test-name-pattern="actual dashboard gates first entry" tests/onboarding.test.mjs
node --experimental-strip-types --test --test-concurrency=1 --test-name-pattern="actual dashboard|progress evidence never" tests/onboarding.test.mjs tests/progress.test.mjs
node node_modules/eslint/bin/eslint.js tests/onboarding.test.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
& 'C:\Users\SOLUSER\AppData\Local\GitHubDesktop\app-3.6.7\resources\app\git\cmd\git.exe' --no-pager diff --check
```

Exact reproducer **red: 0 passed / 1 failed**, Node 622.678ms; same command after the minimal repair **green: 1/1**, Node 669.431ms. Final focused selector **3/3**, 0 failed/cancelled/skipped, Node 1.582s. Scoped ESLint, direct TypeScript and bundled Git `diff --check` passed (exit0), including the documentation completion; manifest diff is empty and both freeze fingerprints rechecked unchanged. Existing module-type warning is non-fatal. **No full-suite rerun by the implementer**: fresh standard-suite validation remains with independent QA. No new browser run/screenshots were needed for this loader-only repair; independent UI evidence above is preserved and attributed, not claimed as a new writer visual check.

**Repair files / final freeze:** changed only `tests/onboarding.test.mjs`, `README.md`, `IMPLEMENTATION_TRACKER.md` in this repair; all existing user/feature work preserved. Original 11 non-doc packet aggregate remains **`25f6e83a5fc93c40397b62759b23224f88dba49becd4a41d64079d80f75515e8`**; manifest diff is empty. Repaired onboarding test SHA-256 **`3591dfc1ccb73dc3a947125fa733f82e252c8fc9795b4b81b29bf90b2016b82b`**. New 12-input non-doc freeze (original 11 plus onboarding test; same sorted-path/hash convention below): **`14d030fadb6b9742fb047dbec62f3f4d68ca7b688d5109db0bdb07eaf1e7033b`**. No further source/test edits after these gates; documentation-only handover follows.

**Safety / next owner:** no environment-file reads/imports/edits, remote/Supabase/provider/catalog calls, installs, server startup, Next env-loader/typegen/build in checkout, connected suites, migration application, commits or deployment; no nested agents or cleanup of historical evidence. Request **fresh bounded independent QA**, including the standard serial suite and repair diff/freeze checks. The first 281/282 failure remains historical BLOCKED evidence, not overwritten by 3/3 writer checks. Actual Next action transport, authorized-target migration/grants/cache, real multi-session Postgres races, connected export/cascade/unload, screenreader, authorized reports and release gates remain **Open**.

## 21 October 2026 — 09/12 progress evidence locally delivered; source frozen for independent QA

**Owner / scope / dependencies:** sole application writer, no nested agents. Coordinator explicitly authorized **both** `src/app/courses/[slug]/page.tsx` and `src/app/courses/[slug]/lessons/[lesson]/page.tsx`; the earlier route-ownership blocker is **resolved**, not a scope expansion. Delivered only the approved player/progress/history packet, its directly coupled dashboard labels, additive migration, focused regressions and these docs. Preserve all pre-existing tracker overview edits and all dated evidence. Independent QA owns acceptance; Coordinator/Owner own authorized connected/release decisions. Tasks09/12 and connected gates remain **Open/Partial**, not closed by this writer.

**Falsifiable hypothesis / outcome:** `forge_enrollments` can hold independent owner/lesson/version evidence without a new table or historical inference; its existing owner `*` export and cascades cover it. First helper check passed **1/1** for unknown history, independent states and versions. Real action/helper/PGlite and mounted route checks then confirmed this model, including direct browser-role denial and account cascade. No `learning-server.ts`, resume schema/storage, account handler or readiness change was required.

**Actual implementation:**
- New **`supabase/migrations/20261021_progress_evidence.sql`**, local only, after existing `20261020_lesson_generation_ran.sql`: empty version-keyed JSON evidence on `forge_enrollments`, no data backfill. Service-only `forge_record_progress` takes server-derived owner and expected version; locks lesson/enrollment, rechecks access/enrollment/version, preserves the first timestamp on replay and independent review/attendance fields. Explicit table/RPC grants and browser/public revokes; no original migration edits. Evidence follows existing owner/lesson enrollment cascades; quiz snapshots retain their existing lifecycle.
- Final-slide **Acknowledge slide review** is optional self-acknowledgement, never proof of reading/comprehension and never a new practice/quiz gate. Review cannot write attendance, attempts, passes or certificates. Attendance means reaching this version's final quiz; restoring a quiz keeps answers/place and records attendance only when mounted at the quiz again, not by historical backfill. Authoritative `gradeQuiz`, ten questions, 6/10, unlimited retries and private/public per-attempt certificates remain.
- Shared evidence helper distinguishes reviewed, attended and saved-version pass in real overview/player/progress/history. Dashboard cards now identify the current version instead of incorrectly showing an older pass as current; aggregate counts say any version. Missing historical review stays unknown; enrollment/bookmark/resume/visit never imply review. Inaccessible lessons have no current private title/content/link in evidence history.
- Unknown/thrown/failed/malformed acknowledgements never claim review/attendance success. Same-version retries reconcile idempotently. Player remounts by owner/lesson/version, ignores late responses, merges independent concurrent evidence without clobbering, focuses error/success notices, and retains existing resume serialization. Unconfirmed quiz saves expose no score/certificate and direct users to history before retry.
- Existing owner-paginated enrollment export includes both explicit multi-version evidence and unchanged empty legacy evidence; no extra export table/handler changes. Real service-role invocation/browser RPC denial, owner isolation, historical unknowns, retries, versions, grading and auth-user cascade are locally exercised.

**Exact changed files (13, including pre-existing tracker changes):** `src/components/learning-controls.tsx`; `src/app/globals.css`; `src/app/learning/actions.ts`; `src/lib/learning.ts`; `src/app/courses/[slug]/page.tsx`; `src/app/courses/[slug]/lessons/[lesson]/page.tsx`; `src/app/progress/page.tsx`; `src/app/dashboard/page.tsx`; `supabase/migrations/20261021_progress_evidence.sql`; `tests/progress.test.mjs`; `tests/account.test.mjs`; `README.md`; `IMPLEMENTATION_TRACKER.md`. No auth/profile/AI/generation/interview source, dependencies/lockfile, base schema, original migrations or environment files changed.

**Commands / actual results (existing dependencies, local synthetic offline only):**

```powershell
node --experimental-strip-types --test tests/progress.test.mjs
node --experimental-strip-types --test tests/resume.test.mjs
node --experimental-strip-types --test --test-name-pattern='enrollment export' tests/account.test.mjs
node --experimental-strip-types --test --test-concurrency=1 tests/learning.test.mjs tests/database.test.mjs tests/account.test.mjs tests/curriculum-ui.test.mjs
node --experimental-strip-types --test --test-concurrency=1 tests/progress.test.mjs tests/resume.test.mjs tests/learning.test.mjs tests/database.test.mjs tests/account.test.mjs tests/curriculum-ui.test.mjs
node node_modules/eslint/bin/eslint.js src/components/learning-controls.tsx src/app/learning/actions.ts src/lib/learning.ts 'src/app/courses/[slug]/page.tsx' 'src/app/courses/[slug]/lessons/[lesson]/page.tsx' src/app/progress/page.tsx src/app/dashboard/page.tsx tests/progress.test.mjs tests/account.test.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
& 'C:\Users\SOLUSER\AppData\Local\GitHubDesktop\app-3.6.7\resources\app\git\cmd\git.exe' --no-pager diff --check
```

Focused progression: helper **1/1**; corrected initial action set **9/9**; existing resume **12/12**; selected export **1/1**; adjacent four-file checks **55/55**; expanded dedicated progress **17/17**. Intermediate combined progress/resume checks passed **21/21** then **26/26** as coverage grew. Final six-file scope above: **84/84**, **0 failed/cancelled/skipped**, Node duration **27.367s**. Final scoped ESLint and direct TypeScript passed (exit0); bundled Git `diff --check` passed, and explicit whitespace checks also covered the new untracked migration/test. Related README migration paths exist. No redundant full suite was run. Existing Node module-type warnings are non-fatal.

**Source freeze:** no further source/test/migration edits after these gates. The 11 non-documentation files listed above have aggregate SHA-256 **`25f6e83a5fc93c40397b62759b23224f88dba49becd4a41d64079d80f75515e8`** (sorted relative paths, each followed by a space and its byte SHA-256, joined with newline and no trailing newline). Full per-file hashes were returned in the command output. Documentation-only completion follows; no commit/deployment or self-certified acceptance.

**Failed attempts preserved, not reclassified:** first skill-directory lookup at `../skills` failed; actual guidance was loaded from `.github/skills`, and bundled Git established that only the tracker was initially dirty. Two initial nine-test runs each reported **7 passed / 2 failed** (one fixture assertion plus parent): PGlite returns `Date`, then the unzoned SQL fixture crossed UTC date boundaries. Fixed the test fixture to explicit UTC; no application workaround. The dashboard regression's first 17-test run reported **14 passed / 3 failed** (one assertion plus parents): `renderToStaticMarkup` has no hydration comments. Corrected only that expected markup; current label logic passed. All were rerun green. The prior writer's path blocker/read-only result remains below as historical evidence.

**UI evidence actually opened:** all **9** final images under `C:\Users\SOLUSER\AppData\Local\Temp\forge-progress-20261021-lLLr5q`: `optional-review-320.png`, `optional-review-1440.png`, `review-unconfirmed-320.png`, `review-saved-1440.png`, `quiz-passed-320.png`, `history-320.png`, `history-1440.png`, `dashboard-new-version-320.png`, `dashboard-new-version-1440.png`. Checked optional acknowledgement vs navigation, visible focus/error/saved states, separate version/legacy/pass history, certificate only after saved pass and dashboard after version change. Automated overflow assertions passed at 320/1440; Enter/Tab, status/result focus, retained quiz answers, pending review access, duplicate clicks and late owner/version replies passed; zero unexpected browser network requests/page errors. Prior synthetic run directories are retained, including `forge-progress-20261021-ooILd3` (7 inspected images), `forge-progress-20261021-63UheL` and failed assertion evidence `forge-progress-20261021-sl8z1q`. Existing curriculum harness also passed and captured images at `C:\Users\SOLUSER\AppData\Local\Temp\forge-tracker08-vhVbIT`; those extra images were **not** visually reviewed for this packet.

**Limits / independent handover:** real application actions/helpers/migrations execute against in-memory PGlite, and the actual async route functions and real player/evidence components execute locally. The browser action bridge is not Next HTTP/server-action transport; shell/metadata/icons/navigation/catalog projection are adapters and resume writes in the new UI bridge are mocked (existing resume scheduler suite separately passed). PGlite does not prove real multi-session PostgreSQL lock scheduling. No env reads/imports, server startup, installs, Next build/typegen, e2e/instructor connected suite, Supabase/catalog/provider call, remote migration, commit or deployment. Retain screenshots; no source artifacts needed cleanup. Request **bounded independent QA** of these 13 files, fresh action/helper/PGlite and keyboard/320/1440 evidence, plus broader safe gates in an env-free snapshot if desired. Connected migration/grants/cache/action transport/export/cascade/unload, screenreader, authorized-report scope and full Tasks 09/12/release remain **Open** pending separate authorization and acceptance.

## 21 October 2026 — 09/12 local evidence packet blocked on route-file ownership (historical; resolved)

**Resolution:** Coordinator's explicit authorization of both actual routes on 21 October resolved this blocker. The delivery above supersedes this read-only implementation status; the inspection/failure record below is preserved unchanged.

**Status / owner:** application writer inspected the approved packet but stopped before application edits. Local implementation is **not complete**; independent QA and connected/full-task gates remain open. Existing uncommitted tracker work and all dated evidence are preserved.

**Bounded deliverable / dependencies / acceptance:** explicit learner acknowledgement after slide review, durable owner- and lesson-version-scoped reviewed evidence, and distinct reviewed/attended/passed player and history presentation. Enrollment, bookmarks and page visits must not fabricate review evidence; review must not gate existing final-quiz attendance or grant passes/certificates. Saved authoritative attempts remain the only pass evidence (at least 6/10). Implementation still needs retry/stale-version/failure/owner-isolation regressions, export/deletion integration and independently checked keyboard/focus/320/1440 UI evidence.

**Specific ownership blocker:** the assigned `src/app/courses/[id]/page.tsx` does not exist. The actual overview is `src/app/courses/[slug]/page.tsx`; the sole player mount is `src/app/courses/[slug]/lessons/[lesson]/page.tsx:24`. That nested route currently loads enrollment/resume only and passes no persisted review/attendance/pass evidence to `LessonPlayer`. Request explicit ownership of **both actual route files** for normal server-loaded evidence wiring instead of creating a duplicate route or adding a client-fetch workaround. No route rename or unrelated feature expansion is requested.

**Actual local checks / results / limits:** loaded `.github/skills/forge-delivery/SKILL.md`, `.github/skills/forge-verification/SKILL.md`, the implementer instructions, README, current 09/12 details, controlling actions/helpers/player/routes/progress, nearby learning/resume/database tests and the account export handler. Bundled Git `--no-pager status --short` showed only pre-existing `IMPLEMENTATION_TRACKER.md` changes; its diff was inspected before this additive entry. `Test-Path -LiteralPath` returned **False** for the assigned overview and **True** for both actual routes. `Get-ChildItem src -Recurse -File -Include *.tsx | Select-String -Pattern '<LessonPlayer\b'` found **one** mount, in the nested route above, confirming the focused source hypothesis. The first bare `git` command failed because Git is not on PATH; subsequent checks used `C:\Users\SOLUSER\AppData\Local\GitHubDesktop\app-3.6.7\resources\app\git\cmd\git.exe`. Skills were found under `.github/skills` (the relative paths in agent instructions resolve there).

**Migration / verification handover:** no new migration, application edit, dependency change or README setup change was made. No tests, lint, TypeScript, build/typegen, UI harness or screenshot checks were run: there is no implemented change to validate or hand to independent acceptance yet. No environment files, connected services, providers or remote migrations were accessed. After ownership clarification, resume the approved implementation and its focused action/helper/PGlite/mounted UI checks; then freeze source and request separate bounded independent QA. Do not close 09 or 12 from this blocker entry.

## 20 October 2026 — fresh independent saved-generation QA (bounded LOCAL acceptance)

**Verdict/ownership:** independent rerun after the approved repair; **bounded offline/local acceptance**, not production/release completion. QA changed only this current evidence entry and the README current summary, after all local gates and visual inspection passed. The first independent **257/258** full-suite failure, four unwanted reservation-time completions, implementer red/green repair history and earlier **150 passes / 2 parallel V8 OOM failures** remain below; none are reclassified as passes. The old parallel command was not rerun.

**Freeze and source review:** comparing the previous QA's 145-file SHA-256 manifest against this delivery confirmed exactly six changed files: `src/lib/lesson-generation-server.ts`, `tests/lesson-generation.test.mjs`, `tests/curriculum-ui.test.mjs`, `package.json`, README and this tracker. The application repair adds a fresh `confirm(user.id, reserved.kind)` after successful reservation and immediately before inference, retaining the post-inference guard. The package repair adds only `--test-concurrency=1` to `scripts.test`; lockfile/dependencies, migration and UI source fingerprints are unchanged from first QA. Source/action/SQL review was combined with actual local execution, not assertions about test names alone.

| Acceptance / owner | Fresh independent result | Remaining boundary |
| --- | --- | --- |
| Separate saved stages / QA | Start has zero completions; each advance at most one; sequential client awaits saved state. Outline, 4/5/6 slides, activity, 5+5 questions, distinct options, immutable curriculum metadata and canonical private finalize pass. Studio/Teaching use the shared component; no live monolithic caller. Existing PDF/PPTX/PPT-unsupported/file/archive bounds pass. | Real Next HTTP/server-action transport and provider pedagogy/content remain unverified. |
| Pause/resume/recovery/UI / QA | Mounted real component + local action/PGlite flows pass pause/close/reload, saved-stage skipping, lost start/part/final acknowledgements, explicit reconciliation/retry, keyboard Enter/Tab, status focus and retained curriculum/file/consent. Shared 320/1440 layouts and corrected Studio/Teaching route flows pass; 13 fresh images opened. | Screenreader/full deployed accessibility and real browser-to-Next transport open; route harness substitutes shell/auth/navigation/image adapters. |
| Atomic quota/private finalization / QA | Stable-ID and concurrent starts/finalizers, lost acknowledgements and replay produce one quota claim and one private canonical lesson. No client final-content parameter or success-shaped postcommit fallback. | Connected transactions/PostgREST/schema cache require an authorized disposable target. |
| Auth/permission/races / QA | Four independent RPC-wrapper checks after committed reservation produce zero completions/parts on owner switch, approval revoke, actual profile age17 and import-role revoke. Full suite also proves post-inference denial, same-owner checks, foreign-admin isolation, pending-owner guard, revisions/request replay, DB-clock lease expiry, explicit recovery, deletion/late response and account cascade. | Actual Supabase Auth/RPC grant behavior remains connected-only. |
| Bounds/failures / QA | Three stage attempts, five daily new starts (not stages/replay), ten unfinished drafts, missing migration, invalid schema/payload and visible failure/reconciliation pass. Exact identity test observes99 tombstones, successful100th start, denied101st with no extra row/quota, replay at100, deletion retaining100 and cascade to0. | Seeded historical identities are local fixtures, not99 provider calls or elapsed-day testing. |
| Deadlines/authority / QA | Stage60000, shared default30000/max60000 strict numeric validation and cumulative catalog/inference/body deadline pass. Coach/interview defaults remain30s; Studio/Teaching Node/maxDuration90 declarations reviewed. Requests omit provider/reasoning; free-only/zero-price and adult-approved eligibility retained. | Actual hosting/proxy/database overhead and effective provider/account defaults unknown; no ZDR/data-collection-denial certification. |
| Storage/export / QA | Separate server-only draft storage, browser/public denial and service mutation grants, bounded extracted source/consent and clearing, no stored originals, 15th owner-scoped paginated/all-or-nothing export, and auth-user cascade pass locally. | Live migration/RLS/RPC/schema cache not applied or checked. |
| Existing behavior / QA | Full suite passes retained manual/uncertain-save, curriculum/filter/player/path, publishing/enrollment/grading, account/eligibility and other-AI regressions. | No connected regression/release claim. |

**Independent repair proof beyond the writer's assertions:** ran a separate stdin script with the unchanged harness and a fresh wrapper around `h.server.database().rpc`. It first committed a real `forge_generation_reserve`, then switched owner, revoked approval, updated the actual `profiles.age` to17, or revoked the import role before returning that RPC response. Assertions required an error, no returned draft, zero completion calls, zero stored parts, one pending attempt and revision+1: **4/4 passed**, including the private-import case with no source sent. The full standard suite separately executes the writer's four regression tests, including exact-request replay, busy-before-expiry, DB-time expiry/reload and one explicit recovery completion without another quota claim.

The identity boundary test is not a count proxy: it seeds99 cleared tombstones, executes real start/delete/replay RPC paths, checks total/deleted/unfinished counts and quota, rejects the101st distinct identity before and after deletion, then deletes the actual auth row and observes0. The account-deletion race waits for one real injected completion to be suspended, checks a pending reservation, deletes `auth.users`, releases completion, and verifies no draft/profile/quota/private lesson survives and late settle/finalize/start cannot recreate it. Both tests passed in the independent full suite.

**Actual commands/results — Windows, existing dependencies, allowlisted environment, times HKT on 20 October:**

| Command (snapshot working directory) | Start–end | Result / elapsed |
| --- | --- | --- |
| `node --experimental-strip-types --input-type=module -` (independent four-race script above) | 12:59:41.570–12:59:52.165 | Exit0;4/4;10.595s |
| `npm test` → `node --experimental-strip-types --test --test-concurrency=1 tests/*.test.mjs` | 12:59:52.165–13:02:25.773 | **264 passed,0 failed/cancelled/skipped**,22 test files; Node152.931s, wall153.606s |
| `npm run lint` → `eslint .` | 13:02:49.306–13:03:07.690 | Exit0;18.383s |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | 13:03:07.690–13:03:13.946 | Exit0;6.256s |
| `npm run typecheck` → `next typegen && tsc --noEmit --incremental false` | 13:03:13.946–13:03:21.138 | Exit0;7.192s |
| `npm run build` → `next build` | 13:03:21.138–13:03:41.592 | Exit0;20.454s;Turbopack production build/typecheck/static generation completed |
| Bundled Git `--no-pager diff --check` | Pre-documentation check13:04:49–13:05:03 cleanup window; repeated after documentation | Exit0 before documentation; final repeat reported in QA handover |

`npm test` itself was run this time with **no concurrency override**: the repository script now serializes by default. No identical focused subset or old parallel OOM command was rerun. Existing Node module-type/no-build-cache warnings are not failures.

**Fresh visual evidence — actually opened13/13 selected images, Chromium153.0.8010.12:** `C:\Users\SOLUSER\AppData\Local\Temp\forge-generation-20261020-j2SRxG` contains `paused-320.png`, `error-320.png`, `completed-320.png`, `paused-1440.png`, `error-1440.png`, `completed-1440.png`, `import-1440.png` (7). `C:\Users\SOLUSER\AppData\Local\Temp\forge-tracker08-DmwS9h` contains the inspected `studio-start-error-mobile.png`, `studio-stage-error-mobile.png`, `studio-saved-paused-mobile.png`, `teaching-start-error-mobile.png`, `teaching-stage-error-mobile.png`, `teaching-saved-paused-mobile.png` (6,390px). Visible focus/status/errors, retained fields/file/consent, saved progress and responsive wrapping inspected. Other generated screenshots are retained but not newly claimed as inspected. Actual route functions/client component are mounted offline with real local generation actions/helpers; completions/extraction and shell/navigation/Auth adapters remain synthetic, not an HTTP/deployed end-to-end claim.

**Snapshot/fingerprint/cleanup:** scratch `C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-generation-recheck-20261020-mmr94pxt`;145 copied non-environment source/config/test/instruction files; aggregate SHA-256 **`f83b379053778924b012dc8e438eebfecf4ca9a5a3adfe5b352af2cc1270c27d`**. Existing dependencies were copied inside `snapshot/node_modules`, not junctioned outside the root. Snapshot `.env*` count0. Child environment included only allowlisted OS variables, fixed local PATH, CI/no-color/telemetry-disabled and offline npm/cache controls, with no application environment settings. No env-file contents were accessed. All145 original hashes matched at13:04:49 before only the two approved doc edits. Exact owned snapshot and npm cache removed successfully at13:05:03; retained `fingerprints.json`, `safety.json`, `inspected-screenshots.json` with image hashes/dimensions, and actual synthetic images. No original cache/source/dependency cleanup. Full-suite/race transcript: `C:\Users\SOLUSER\AppData\Local\Temp\1792472400196-copilot-tool-output-27260-b8784684-eccc-437d-a4ec-1ab38ed91380.txt`.

**Deployment/migration handoff — NOT performed:** on a separately authorized target, confirm existing `supabase/schema.sql` and prior migration ledger, through `20261015_interviews_ran.sql` and `20261015_onboarding_diagnostic_ran.sql`, before applying **`supabase/migrations/20261020_lesson_generation.sql`**. It depends on existing `auth.users`, `forge_lessons` and `forge_claim_request` (introduced by `20260923_learning_ran.sql`); do not blindly replay historical `_ran.sql` files. Refresh PostgREST schema cache, verify browser/public table/function denial, service-only SELECT/mutation RPC grants, owner isolation/quota/replay/cascade and export on a disposable target, then deploy code and verify actual action transport and60s+overhead within the90s host/proxy budget. Provider/content and screenreader gates remain open. No environment/key changes, installs, remote traffic/catalog/quota/Supabase/services, remote migrations, deployments, commits or nested agents in this QA.

## 20 October 2026 — bounded repairs after blocked independent generation QA (IMPLEMENTER; frozen for fresh QA)

**Authority and preserved work:** independent QA `45e54438-4a24-4b59-8a59-aa43a2ca348c` blocked local acceptance at 12:33–12:41 HKT. Its full serial run was **258 tests: 257 passed / 1 failed**, and four injected reservation-time authorization reproducers each dispatched one completion (zero saved parts), including private import reference. No provider was contacted by QA; QA reported no source/docs changes and 145 unchanged fingerprints. The earlier implementer 152-pass focused handover did not cover these defects. User explicitly approved this bounded repair and extended ownership to `tests/curriculum-ui.test.mjs` and the `package.json` test script only. Initial worktree retained the prior 22 dirty/new files; none were reverted.

| Task / owner | Dependency and bounded deliverable | Acceptance / status |
| --- | --- | --- |
| Pre-inference authorization / implementer | Existing reservation + same-owner/access guard; fresh check between reservation and completion, post-inference guard retained | Four real-action/PGlite reproducers red **0/4**, green **4/4** with zero calls/parts, pending replay/lease recovery; fresh independent review required |
| Curriculum route harness + standard test command / implementer | Delivered shared component and local action/PGlite adapter; retained curriculum/file/consent/error checks; serial npm test | Focused UI **1/1**, combined **15/15**, full `npm test` **264/264** locally; not independent acceptance |
| Missing proof boundaries / implementer | Existing SQL, no migration edit; 99/100/101 identities and in-flight account cascade | Focused **2/2**; fresh independent repeat and connected gates remain open |

**Hypothesis/check before editing:** `advanceGeneration` awaited the reservation after its initial access check and called AI directly, so changed authorization could leak content before the working post-inference guard. Wrap the real harness database RPC, change authorization immediately after `forge_generation_reserve` returns `code=ok`, assert zero completions and zero stored parts, then prove explicit recovery. Only application change: call the existing `confirm(user.id, reserved.kind)` immediately before `generateLessonPart`; retain the existing call after inference.

**Exact repair files:** `src/lib/lesson-generation-server.ts`, `tests/lesson-generation.test.mjs`, `tests/curriculum-ui.test.mjs`, `package.json`, `README.md`, `IMPLEMENTATION_TRACKER.md`. No harness helper, migration, UI source, dependencies, lockfiles, model/privacy/key settings or other source changes in this repair. Package diff is solely `--test-concurrency=1` in `scripts.test`, as approved.

**Regression detail:** four separate real action/helper/PGlite cases switch owner, revoke trusted AI approval, update actual profile age to17, or revoke import instructor role after committed reservation. All fail safely before inference, send no reference, keep parts empty and preserve the pending reservation. After restoring permission, exact replay still sends nothing; fresh attempt is busy until DB-time expiry, then explicit reload/resume completes once without another start claim. Identity fixtures begin at99 cleared tombstones; the 100th start succeeds, attempted101st is denied without quota/row, existing start replay succeeds at100, tombstone replay stays deleted, and deletion cannot free a new identity; account cascade removes all100. In-flight imported generation suspends inside injected completion, deletes the actual auth user, then releases it: no late part/normal lesson, reference/reservation/profile/quota rows are absent, and late settle/finalize/start reject recreation.

The curriculum harness now loads the **actual** shared component, schemas/styles and explicit staged action dependencies at a secure, locally fulfilled synthetic origin. Real local actions/helpers + PGlite replace old monolithic-button expectations; extraction/completions are injected. Existing catalog/filter/legacy/player-answer-key/path checks remain. Both Studio and Teaching retain exact subject/topic/audience/difficulty/outcomes/objective and teaching file/consent on a missing-migration error, focus the delivered status heading with a visible role=alert, save without inference, preserve exact saved metadata, stop after one failed completion, require state loading, and allow keyboard Tab/Enter retry + pause after a single saved outline. No assertion was skipped; focus expectations follow the delivered shared status convention rather than the retired ActionForm alert-focus behavior.

**Actual commands/results — Windows/Node25.2.1, existing dependencies, local offline controls:**

```powershell
node --experimental-strip-types --test --test-concurrency=1 --test-name-pattern='reservation recheck' tests/lesson-generation.test.mjs
node --experimental-strip-types --test --test-concurrency=1 --test-name-pattern='identity boundary|account deletion during' tests/lesson-generation.test.mjs
node --experimental-strip-types --test --test-concurrency=1 tests/curriculum-ui.test.mjs
node --experimental-strip-types --test --test-concurrency=1 tests/lesson-generation.test.mjs tests/curriculum-ui.test.mjs tests/lesson-generation-ui.test.mjs
npm test
node node_modules/eslint/bin/eslint.js src/lib/lesson-generation-server.ts tests/lesson-generation.test.mjs tests/curriculum-ui.test.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
& 'C:\Users\SOLUSER\AppData\Local\GitHubDesktop\app-3.6.7\resources\app\git\cmd\git.exe' --no-pager diff --check
```

First command **0 passed / 4 failed** before the source fix (each actual1 vs required0 completion), then **4 passed / 0 failed** immediately after. Boundary/race selector **2/2**, repaired curriculum UI **1/1**, combined **15/15** (46.249s). Standard `npm test` expanded to the serial script and passed **264 tests, 0 failed/cancelled/skipped**, 121.025s. Scoped ESLint/direct TypeScript/diff checks passed before and after the full run; existing Node module-type warnings only. No Next typegen/build/env-loading commands were used for this repair. The original independent **257/258** failure and earlier parallel OOM evidence are preserved, not reclassified as passes.

**Inspected evidence:** Chromium153.0.8010.12; original 390px mobile/1280px desktop curriculum flows retained, shared generation suite separately re-exercised320/1440. Six new route-generation screenshots from the full `npm test` run actually opened/inspected under `C:\Users\SOLUSER\AppData\Local\Temp\forge-tracker08-5L32yV`: `studio-start-error-mobile.png`, `studio-stage-error-mobile.png`, `studio-saved-paused-mobile.png`, `teaching-start-error-mobile.png`, `teaching-stage-error-mobile.png`, `teaching-saved-paused-mobile.png`. These show retained curriculum/file/consent, visible errors/status focus and paused saved controls. Six corresponding combined-run images at `forge-tracker08-EobQ2X` were also inspected. Other generated images are not newly claimed as visually inspected.

**Freeze/handover/open gates:** source/test/package changes are frozen for fresh independent QA; the blocked independent verdict is not self-overturned by implementer passes. Request the same QA matrix and full gates again, with build/Next typegen only in a sanitized env-file-free snapshot. Actual Next action transport, connected Supabase grants/schema cache, hosting budget, screenreader and content/provider checks remain open and need separate authorization where connected. No environment-file reads/imports/edits, installs, remote/catalog/AI/Supabase calls, remote migrations, deployments, commits or nested agents. The original migration remains local-only; timeout/lease/retry/quota policy unchanged.

## 20 October 2026 — sequential saved/resumable lesson generation (IMPLEMENTER; independent QA requested)

**Authority/ownership:** user approved saved sequential generation, 60-second lesson-part calls, coaching/interviews unchanged at 30 seconds, existing key and no live operations. Sole writer; initial bundled-Git status clean. Required skills read at actual `.github/skills/forge-delivery/SKILL.md` and `forge-verification/SKILL.md`; no delegation. Owned new `src/lib/lesson-generation{,-ai,-server}.ts`, `src/components/lesson-generation{.tsx,.module.css}`, `src/app/learning/generation-actions.ts`, migration `20261020_lesson_generation.sql`, focused harness/protocol/UI tests; coupled existing learning/teaching actions/pages, shared timeout client, account export and account/OpenRouter/curriculum/manual test fixtures, README/tracker. Existing manual editor, uncertain-save handling, eligibility policy and provider compatibility retained. No unrelated source/config/dependency churn.

| Task / owner | Dependencies / deliverable | Acceptance / current verification |
| --- | --- | --- |
| Draft protocol / implementer | Prior migrations, current auth/eligibility; atomic private draft, leases/replay/CAS, canonical finalize | Focused real-helper/action + PGlite checks locally pass; independent QA and actual PostgREST grants/RPC gate open |
| Shared Studio/Teaching UI / implementer | Protocol; explicit sequential browser scheduling, pause/resume/retry/delete/reconcile/editor link | Offline mounted Chromium 320/1440, keyboard/focus and inspected screenshots pass locally; deployed transport/screenreader gate open |
| Deployment/acceptance / independent QA + owner | Authorized target/schema cache, hosting budget and env-free snapshot | Not performed; full gates, content approval and release remain open |

**Hypothesis/check before edits:** whole completion-before-save loses all progress on failure; replace live paths with separately persisted parts, then falsify using real actions/helpers and all local migrations with injected completions and blocked network. Start/import extraction makes zero completions. One completion per advance request: outline, 4–6 individual slides, 3–6-step activity, 5+5 questions (four distinct options/index); finalize independently validates stored canonical content/curriculum and atomically creates one private lesson with the stable draft ID. Exact metadata is immutable and server-owned. No client final JSON, placeholder content, worker, auto-retry or accessible whole-lesson fallback.

**Protocol/bounds:** owner auth-row lock serializes starts/caps/reservations/finalization/deletion. DB revision + request-ID history + server token; **90-second DB-time lease**, one unexpired inference per owner, **3 attempts/stage**, ≤10 parts/30 attempts, **10 unfinished / 100 retained start identities** per owner (including content-cleared deletion tombstones). One existing **5/day** `forge_claim_request` claim transactionally with a new start; replay/parts/finalization never re-claim it. Lifetime identity bound is intentionally not reset by deletion; manual authoring remains available. Late/expired/deleted/foreign/replayed results cannot append parts. Every inference and retry checks current adult/admin-approved AI access; after inference checks currentUser is the **same owner** and repeats eligibility/import instructor checks before saving. Revoked imports still permit owner read/list/delete; import finalization requires current instructor/admin role. Administrators never read another owner's draft.

**Storage/privacy:** separate RLS table, no public/anon/authenticated grants; service role SELECT + only mutation functions, no direct writes. Selection/objective/content/reference bounded in server + SQL. Consent-required extracted reference ≤20,000 characters, no original file; reference cleared on completion/delete. Activity/quiz facts use only saved slides; batch-two deduplication sends prior prompts, not saved answer keys. Lists project metadata and a DB-derived part count only, not source/parts/keys; this bounds the 100-row listing response independently of draft payload size. Owner export includes the 15th table with stable pagination/all-or-nothing failures and auth cascade coverage. Tombstones retain no objective/selection/source/parts/attempts. Original PDF/PPTX limits/signatures and unsupported PPT remain unchanged.

**Timeout/hosting:** shared default **30000 ms**, max **60000 ms**; staged helper explicitly passes `{ timeoutMs: 60000 }`. One cumulative deadline for catalog+inference+bodies; coach/interviews still default30, interview75-second lease untouched. Studio Node/maxDuration90 added, Teaching90 retained. Actual hosting/plan/proxy/DB overhead must be independently verified. No new environment settings. Singular model/free-only catalog/Unicode token formula/no provider or reasoning override authority unchanged.

**Actual commands/results — Windows, Node25.2.1, existing dependencies; no Next env-loading commands:**

```powershell
node --experimental-strip-types --test --test-concurrency=1 tests/lesson-generation.test.mjs tests/lesson-generation-ui.test.mjs tests/manual-authoring.test.mjs tests/curriculum.test.mjs tests/openrouter.test.mjs tests/account.test.mjs tests/database.test.mjs tests/teaching-material.test.mjs tests/eligibility.test.mjs tests/learning.test.mjs tests/interviews.test.mjs
node node_modules/eslint/bin/eslint.js src/lib/lesson-generation*.ts src/components/lesson-generation.tsx src/app/learning/generation-actions.ts src/app/learning/actions.ts src/app/studio/page.tsx src/app/teaching/actions.ts src/app/teaching/page.tsx src/app/api/account/export/route.ts src/lib/openrouter-client.ts src/lib/openrouter.ts tests/lesson-generation*.mjs tests/manual-authoring.test.mjs tests/curriculum.test.mjs tests/openrouter.test.mjs tests/account.test.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
& 'C:\Users\SOLUSER\AppData\Local\GitHubDesktop\app-3.6.7\resources\app\git\cmd\git.exe' --no-pager diff --check
```

Final serial focused command: **152 passed, 0 failed/cancelled/skipped**, 68.333s. Previous serial gate **152/152**, 60.374s; the final bounded-list/status refinements immediately passed protocol/UI **8/8** before repeating the full focused gate. Earlier coherent 11-file gate: **150/150** before two coverage additions. Latest fully parallel version of the command (without `--test-concurrency=1`): **150 passed / 2 failed**, curriculum and eligibility workers both emitted V8 `Fatal process out of memory: Zone`; first serial rerun without source/config changes passed. Scoped ESLint, direct TypeScript and diff checks passed locally; full npm gates/build intentionally left for independent QA, with build/Next type generation only in a sanitized environment-file-free snapshot.

**Correction history (not acceptance):** immediate database/OpenRouter run **28 passed/2 failed** due stale >30000 timeout assertions; corrected to60001, subsequent account/database/client gate **73/73**. Initial protocol run failed its first saved-part assertion and was stopped when the second test waited indefinitely; isolated **0/1** reproduced a SQL variable/alias ambiguity. Added bounded wait and fixed alias. Subsequent protocol runs **4/6**, **5/6**, **5/6** exposed a real deletion check rejecting cleared selection and invalid synthetic age/profile fixtures; fixed the constraint and fixtures, then targeted auth **1/1** and coherent protocol/UI **7/7**. Initial mounted-generation **0/1** used an insecure synthetic HTTP origin without browser randomUUID; switched the offline harness to a secure synthetic origin, then **1/1**. Retained manual/curriculum/resume gate **33 passed/3 failed** exposed obsolete monolithic import assertions and the new Studio module import in the manual harness; replaced obsolete AI coverage with real staged suites (not skipped) and retained all manual/editor/activity/coach checks. Existing Node module-type warnings remain; React effect lint issue was corrected, not suppressed.

**Browser/evidence:** network-blocked real shared component with real server action/helper + PGlite adapters, injected synthetic completion/extraction (real PDF/PPTX extraction separately covered); no actual Next routing transport. Distinct sequential requests, zero-inference starts, pause and close while in flight, reload without auto-start, explicit failed-stage retry after load, retained input after failed start, lost start/part/finalization acknowledgements, completed editor link, import deletion, keyboard Enter and status focus, 320px/1440px no horizontal overflow. All **seven** final serial screenshots actually inspected: `paused-320.png`, `error-320.png`, `completed-320.png`, `paused-1440.png`, `error-1440.png`, `completed-1440.png`, `import-1440.png` under `C:\Users\SOLUSER\AppData\Local\Temp\forge-generation-20261020-xxr0VD` (Chromium153.0.8010.12). Inspection led to readable retention text and stopped/error status fixes before the final run. Earlier serial evidence at `forge-generation-20261020-aR9eq2` was also inspected; older synthetic/manual screenshots are not claimed as new independent QA.

**Safety/open gates:** no environment-file reads/imports/edits (including example/local/prod), installs, remote/catalog/AI/Supabase traffic, connected e2e, deployments, commits, remote migration application or subagents. New migration exercised only in local in-memory PGlite. Request independent QA of the coordinator's acceptance matrix, resource-capped full test/lint/type/build gates, Next action transport, real RLS/service grants/schema cache, revocation/session edge behavior, screenreader and pedagogy. Connected checks require separately authorized disposable target/origin and quota-consuming AI permission. No production availability, migration application, release or independent acceptance claim.

## 20 October 2026 — latest user-approved note.py request compatibility (IMPLEMENTER; local only)

**Original authority/ownership:** after coordinator explicitly explained removal of both request privacy restrictions, the user approved “Please use the same setting as note.py”. This supersedes historical strict provider/reasoning contracts for this bounded shared-client change only. Owned files: `src/lib/openrouter-client.ts`, `tests/openrouter.test.mjs`, README and this tracker. No other source/tests, env files (including example/local/prod), dependencies or services were changed in that packet. Git was absent from PATH; bundled GitHub Desktop Git reported a **clean** initial worktree, unlike the supplied dirty-state warning. Existing work/history, including independent activity QA, was retained.

**Hypothesis/check/deliverable:** hard-coded provider filters constrain routing, and hard-coded diagnostic policy fields would misreport an override-free request. Check actual outbound JSON and captured JSON failure logs under fully mocked fetches. Delivered: omit `provider` entirely, including `data_collection`/`zdr`/`require_parameters`; omit `reasoning` entirely; use singular `model: models[0]` for one selected ID and ordered `models` only for multiple explicit free IDs. No default added fallback. Request-level ZDR and data-collection denial are **no longer enforced**. Effective account/provider policies remain applicable and unknown; no retention/training certification or live success is claimed.

**Preserved/differences from note.py:** NVIDIA default and environment overrides/key alias; mandatory syntax/zero-price free-catalog validation before authenticated inference; no paid routes; adult/admin eligibility elsewhere; strict lesson `response_format`/schema; safe single-boundary logging, opaque ID, HTTP-status/provider-code distinction and closed reasons including `zdr`; abort/deadline/bounded reads and no hidden retry. Tokens still count all outgoing message-content Unicode code points, not translation raw-note text: `min(16384,max(256,count*3))`. The default/maximum 30000 ms covers the whole operation, stronger than per-phase HTTP timeouts. No caller token-budget APIs or translation prompt/retry behavior were copied. 404/503 text now describes configured model/request/account settings, retaining the existing message prefix and status/retry behavior.

**Current diagnostics:** exact fields remain `event`, `diagnostic_id`, `stage`, `http_status`, `provider_code`, `elapsed_ms`, `timed_out`, `retry_after_seconds`, `models`, `output_mode`, `provider`, `reasoning_enabled`, `reason`, `error_body_state`. `provider: null` and `reasoning_enabled: null` mean **not sent / no request override**, not false or guaranteed privacy; account/provider defaults are unknown. No raw text, prompts/schema, metadata, headers, credentials or learner identifiers are logged. README's current sample/descriptions are updated; old dated evidence below is preserved as history.

**Actual local commands/results — Windows, Node 25.2.1, existing dependencies; no Next env loader:**
- `node --experimental-strip-types --test tests/openrouter.test.mjs tests/interviews.test.mjs`: baseline **43/43**, immediate coherent-change run **45/45**, final code rerun **45/45**. Actual JSON tests cover singular/default/override and ordered-multiple routing in text/structured modes, absent override keys, key alias, exact Unicode token clamp boundaries, exact/shared deadlines, strict lesson schema, invalid/paid/missing/nonzero catalog denial, accurate null diagnostics, ZDR classification despite omitted overrides, status/code separation and synthetic non-disclosure. Timer/stream/oversize/stalled-body/late-log tests remain.
- `node --experimental-strip-types --test tests/openrouter.test.mjs tests/interviews.test.mjs tests/manual-authoring.test.mjs tests/eligibility.test.mjs`: initial **74 passed / 3 failed** (two subtests + parent). Restoring the compatible public-message prefix fixed one stale-prefix failure; that packet ended at **75 passed / 2 failed** (one stale-provider subtest + parent), no cancelled/skipped tests. The remaining failure was `tests/manual-authoring.test.mjs:497`, expecting the removed strict provider block; its next assertion at line 498 also expected `models` for a single ID. That file was outside the original scope and was not edited then. All other authoring/eligibility/interview/OpenRouter checks passed. The narrow follow-up below repairs this stale-assertion gate.
- `node node_modules/eslint/bin/eslint.js src/lib/openrouter-client.ts tests/openrouter.test.mjs` and `node node_modules/typescript/bin/tsc --noEmit --incremental false`: initial and final code checks exit 0. Existing Node module-type warnings only. Bundled Git `git --no-pager diff --check` passed. SHA-256 fingerprints of unrelated `src/components/learning-controls.tsx`, `tests/manual-authoring.test.mjs`, `src/lib/interview-ai.ts` and `scripts/check-setup.mjs` match initial reads.
- Synthetic inline `node --experimental-strip-types --input-type=module -` capture (all fetches injected): actual text JSON was `{"model":"nvidia/nemotron-3-ultra-550b-a55b:free","messages":[{"role":"user","content":"Explain SDLC"}],"max_tokens":256}`; structured JSON added only the existing strict `response_format`. Captured failure records had `provider:null`, `reasoning_enabled:null`, actual `http_status:404`, separate `provider_code:503`, and `reason:"zdr"`. This is mock evidence, not production output.

**Narrow assertion follow-up (implementer, local only):** inherited the four dirty files above unchanged; ownership extended only to `tests/manual-authoring.test.mjs` and this current README/tracker entry. Replaced the two stale actual-generation assertions with explicit absent `provider`/`reasoning`/`models`, exact singular `model: "synthetic/model:free"`, and positive strict `json_schema` envelope/object-schema checks. Existing content/schema, free-model, eligibility and persistence coverage remains; no editor/application code or provider-error expectation needed changing. The same four-file command above ran once after the edit: **77 passed, 0 failed/cancelled/skipped** (unchanged test structure). `node node_modules/eslint/bin/eslint.js tests/manual-authoring.test.mjs src/lib/openrouter-client.ts tests/openrouter.test.mjs`, `node node_modules/typescript/bin/tsc --noEmit --incremental false` and bundled Git `git --no-pager diff --check` passed (exit 0). Browser offline/route denial and injected synthetic fetches remained active; no remote traffic. Client/OpenRouter-test SHA-256 hashes matched the start. Required `../skills/forge-delivery/SKILL.md` and `../skills/forge-verification/SKILL.md` were unavailable; no copies found in the targeted local agent-config search.

**Pending/blockers:** independent bounded QA remains requested, not self-certified; the authoring assertion gate is now green locally. Coordinator's supplied prior production log was HTTP 404, text mode, hint `zdr`; no new live retry was performed and post-change production result is pending. Vercel **redeploy required** to activate code; `.env.prod` is not automatically used by Vercel. No env-file reads/edits, other-project access, installs, services, remote fetches/probes/writes, migration/deploy/commits, full suite/build or nested agents in either packet. `scripts/check-setup.mjs` remains a separate legacy strict-policy probe outside ownership; README distinguishes it from the shared-client `check:ai` probe.

## 20 October 2026 — bounded OpenRouter failure observability (IMPLEMENTER; independent QA pending)

**Historical contract/evidence:** request provider/reasoning settings in this entry are superseded by the latest user-approved compatibility decision above; the dated implementation/QA provenance is unchanged.

**Owner/scope:** implementation in `src/lib/openrouter-client.ts`, focused regression coverage in `tests/openrouter.test.mjs`, and additive README/tracker documentation only. Coordinator owns final reconciliation. Initial Git state already contained README/tracker changes; all historical entries and independently accepted activity-step work are retained. No other application/test files, environment files or manifests were edited.

**Hypothesis/check:** discarded upstream bodies and conflated 404/503 public errors hide the production cause. A closed, privacy-safe error hint plus actual HTTP status and separate embedded code can distinguish recognized failures without changing routing/privacy. Check real captured JSON `console.error` records under fully mocked fetches, adversarial data, shared deadlines and late abort-ignoring work. No existing application structured-server-logger convention was found to reuse.

**Delivered contract:** one `openrouter_completion_failed` JSON record per failed completion, including config/catalog failures; no success payload logs. Fields, complete closed reason/stage/body-state enums, sanitized sample and Vercel runtime-log instructions are documented in [README](README.md#production-troubleshooting-logs--20-october-2026-local-implementation-independent-qa-pending). Fresh opaque UUID is on `OpenRouterError.diagnosticId` only, not appended to public messages or passed through new UI/action layers. Public messages/status/retry remain compatible. Actual HTTP 200 remains distinct from embedded provider codes. Only fully syntax- and zero-price-catalog-verified configured IDs are logged; before verification, the list is empty (including syntactically valid unknown IDs). Accepted free-ID syntax is capped at 200 characters per ID for bounded diagnostics. A throwing platform log sink cannot replace the primary sanitized failure or cause retries.

**Bounded/privacy behavior:** non-OK body ≤16 KiB; HTTP-OK completion/envelope ≤1 MiB; catalog ≤2 MiB; fixed-capacity retained input buffers, one read per response, message hint inspection ≤4096 characters, best-effort cancellation and the unchanged single ≤30000 ms deadline. Oversized/malformed/unreadable error bodies keep the default failure, known HTTP status and safe primary public error; stalled diagnostic reads can time out without replacing that known error. Only the outer operation catch logs; late work cannot emit another record or start post-deadline inference. Parsed-object/transport allocations are not byte-exact bounds; abort-ignoring transports cannot be forcibly settled. Logs omit raw messages, prompts, schema/content, content sizes, learner IDs, credentials/env values, raw errors/stacks/metadata/body and arbitrary headers/provider names. Recognized hints are not proof, and status-only 404/503 is never classified as a particular policy cause.

**Preserved:** requested default `nvidia/nemotron-3-ultra-550b-a55b:free`, explicit optional ordered free fallbacks, verified zero pricing, `data_collection: deny`/`zdr: true`/`require_parameters: true`, disabled reasoning, strict schema, Unicode-code-point `min(16384,max(256,count*3))` tokens, whole-operation 30000 ms default/maximum, sanitized public errors and eligibility. No privacy relaxation, paid fallback, new model, hidden retry or extra request.

**Actual local checks (Windows, Node 25.2.1; existing dependencies, no Next env loader):**
- Immediate `node --experimental-strip-types --test tests/openrouter.test.mjs tests/interviews.test.mjs`: initial attempt **17 passed / 1 failed** at OpenRouter module startup because a new parameter property is unsupported by strip-only Node; replaced with an explicit property. Next run **36/36**. Expanded diagnostics run **40 passed / 2 failed**, both test fixture/synchronization mistakes (default code and stream-start timing); corrected to explicit code omission and read-time synchronization. Subsequent runs **42/42**; final known-model/sink-failure hardening **43/43**.
- `node --experimental-strip-types --test tests/openrouter.test.mjs tests/interviews.test.mjs tests/manual-authoring.test.mjs tests/eligibility.test.mjs`: initial expanded run **74/74**; final frozen-code rerun **75/75**, zero failures/cancellations/skips. Every fetch, including deadlines, is mocked; the OpenRouter file installs a network-forbidden default mock. Tests capture actual emitted JSON, check closed fields, fresh IDs, 404 policy/parameter/model vs unknown/503, HTTP-200 embedded errors, malformed/non-JSON/oversized/stalled bodies, late resolves/no duplicates, config/catalog/transport/refusal/truncation/empty output, no success logs, a throwing log sink, and synthetic secret/prompt/email/schema/metadata/header non-disclosure (including a syntax-valid but unknown configured ID).
- `node node_modules/eslint/bin/eslint.js src/lib/openrouter-client.ts tests/openrouter.test.mjs`, `node node_modules/typescript/bin/tsc --noEmit --incremental false`, and `git diff --check`: exit 0. Node emitted existing module-type warnings, not failures.
- Unrelated `src/components/learning-controls.tsx`, `tests/manual-authoring.test.mjs` and `src/lib/interview-ai.ts` SHA-256 fingerprints match initial reads; Git application/test changes are confined to the two owned files.

**Open gates/acceptance:** request independent QA of this bounded packet; no independent acceptance or release certification claimed. The actual production upstream cause remains UNKNOWN and connected/production success is unverified. Authorized redeploy is required to obtain the new Vercel logs (environment changes also require redeployment); account/key data policy, request privacy, required structured output and transient availability must be distinguished. Catalog presence/zero pricing alone does not establish compatible live availability. No full suite/build, remote/catalog/quota calls, production operations, deployment, service startup, installs, commits or env-file access were performed for this task. Historical 246-test activity QA remains unrelated evidence.

## 20 October 2026 — approved OpenRouter configuration (IMPLEMENTER; independent QA pending)

**Historical contract/evidence:** strict privacy/disabled-reasoning settings below are superseded by the latest compatibility decision; all-message Unicode token counting and the whole-operation deadline remain current.

**Owner/deliverable:** bounded configuration change in `src/lib/openrouter-client.ts`, the stale comment in `src/lib/interview-ai.ts`, `tests/openrouter.test.mjs`, `.env.example`, model/fallback assignments only in ignored/untracked `.env.local`, and these small README/tracker updates. Existing activity-step and other work is preserved. Default/local model: `nvidia/nemotron-3-ultra-550b-a55b:free`; no configured fallback. Optional ordered free fallbacks remain supported.

**Contract:** all outgoing message-content Unicode code points (Python `len`, including system/history/reference text; no separators, role fields or schema JSON) determine `min(16384, max(256, count * 3))` for structured lessons and plain coaching/interviews alike. One 30,000 ms default/maximum deadline covers catalog, inference and bodies; smaller injectable deadlines remain valid. Zero-price catalog checks, strict privacy/ZDR/required parameters, disabled reasoning, structured output, abort, sanitized failures and eligibility protections remain intact. Missing/nonzero catalog entries are not bypassed.

**Actual local evidence — Windows, Node 25.2.1, existing dependencies:**
- `node --experimental-strip-types --test tests/openrouter.test.mjs tests/interviews.test.mjs`: baseline **30/30**; immediate post-change **36/36**, no failures/cancellations/skips. Node timer mocks prove exact 30,000 ms and shared cumulative deadlines without a 30-second wait; token coverage includes adjacent clamp boundaries, both schema modes, astral Unicode and combining characters.
- Focused pre-change name-filtered regression run: **2 passed / 8 failed**, confirming model, token and timeout mismatches. One earlier red timeout case accidentally omitted its fetch mock and reached the public catalog before failing closed; no authenticated inference or quota probe followed. The corrected case explicitly forbids network and the subsequent red/green runs use synthetic fetch only.
- `node node_modules/eslint/bin/eslint.js src/lib/openrouter-client.ts src/lib/interview-ai.ts tests/openrouter.test.mjs` and `node node_modules/typescript/bin/tsc --noEmit --incremental false`: both exit 0; no Next environment loader.
- Local env had no model/fallback assignments; only those two were added. Model-only checks confirm the requested ID and empty fallback exactly once. A byte-exact remove/add roundtrip confirmed preservation of the remaining bytes, including CRLF/no final newline (the first verifier's expected trailing newline was corrected). Git confirms ignored, untracked and nothing staged.
- Final focused rerun: **36/36**; scoped lint, direct TypeScript and `git diff --check` pass. The three unrelated modified application/test files match their initial SHA-256 fingerprints. New documentation references resolve; the broader link check found the preexisting missing `supabase/migrations/20261015_onboarding_diagnostic.sql` link (also present in HEAD README), left unchanged as out of scope.

**Acceptance/limits:** request independent QA of this frozen configuration/tests; no independent acceptance, live catalog/provider availability, connected fix or release certification is claimed. Full suite/build, services, quota probes, remote writes, learner-data access, installs, deployment and commits were not performed; `.env.prod` was untouched. Earlier evidence and connected gates remain open.

## Current coordination — 20 October 2026 - lesson creation repair

**Governing current status:** Forge QA independently accepted the lesson-creation repair within bounded **LOCAL** checks on **20 October 2026, 09:34–09:36 HKT: 232 tests passed**, with lint, typecheck and build passing. This supersedes the current-status wording in the historical 15 October entry below, not its dated evidence. It is **not live, release or whole-project acceptance**: the original user's connected failure/root cause is not established, healthy local mocks worked before some repairs, and neither “live generation fixed” nor “all creation failures resolved” is supported. The whole project and associated tasks remain **Open/Partial**.

**Ownership and delivered scope:** Forge Implementer delivered the repair; Forge QA supplied independent local acceptance; Coordinator owns this documentation-only reconciliation. The six delivered application/test files are [src/app/learning/actions.ts](src/app/learning/actions.ts), [src/app/studio/page.tsx](src/app/studio/page.tsx), [src/components/learning-controls.tsx](src/components/learning-controls.tsx), [src/lib/ai-eligibility-server.ts](src/lib/ai-eligibility-server.ts), [tests/manual-authoring.test.mjs](tests/manual-authoring.test.mjs) and [tests/eligibility.test.mjs](tests/eligibility.test.mjs). Earlier implementer-reported 232 tests, lint, direct `tsc` and 11 screenshots are delivery evidence, distinct from the independent QA results below.

**Concrete repairs and preserved boundaries:**

- Manual required/max-length native validation opens invalid collapsed quiz sections and provides authoring guidance. Manual creation remains independent of AI access and provider availability.
- Operational eligibility lookup errors are explicit rather than misreported as age/approval denial.
- Definite missing-schema/storage rejection is distinguished from an uncertain save; an unknown outcome is not treated as a safe automatic retry.
- AI creation validates the canonical saved UUID and retains input with blocked-replay recovery for malformed, missing or thrown acknowledgements and transport uncertainty.
- No weakening of the canonical **4–6 slides / 10 questions** or canonical metadata requirements, ownership/publishing checks, age restrictions, admin-granted AI access, free-only provider policy or privacy rules.

| Work | Owner | Dependency | Acceptance / status |
| --- | --- | --- | --- |
| Lesson-creation repair | Forge Implementer | Approved bounded repair scope | Delivered in the six files above |
| Independent local QA | Forge QA | Delivered repair | Locally accepted; evidence below, not connected/release acceptance |
| Connected verification | Coordinator + Owner | Confirmed intended disposable nonproduction Supabase target and app origin; authorization, including separate permission for any quota-consuming AI probe | Pending; connected gates remain Open |

**Independent QA evidence — 20 October, 09:34–09:36 HKT:** commands ran sequentially in an isolated, sanitized source snapshot using existing dependencies, an OS-environment allowlist and offline controls; no installs. These are supplied independent QA results, not commands rerun for this documentation handover.

| Command | Independent result |
| --- | --- |
| `node --experimental-strip-types --test tests/manual-authoring.test.mjs tests/eligibility.test.mjs` | **26 passed, 0 failed/skipped** |
| `npm test` | **232 passed, 0 failed/cancelled/skipped** |
| `npm run lint` | Exit 0 |
| `npm run typecheck` | Exit 0 |
| `npm run build` | Exit 0; Next.js **16.3.5 Turbopack**, **23/23** static-generation work items |
| `git diff --check` | Passed |

**Reproducibility and inspected evidence:** the snapshot contained **125 files**, SHA-256 `1a6768d615989d12dc7495d680030147d43933e6c8fd9a17bde24902ab52b87b`. Environment: Windows, Node **25.2.1**, npm **11.6.2**, TypeScript **5.9.3**, ESLint **9.39.5**, Playwright **1.63.0**, Chromium **153.0.8010.12**. QA actually opened and inspected **11 fresh lesson screenshots at 320×900 and 1440×900**, covering invalid-field focus, keyboard Enter, retained-error/retry, success and uncertainty. This was a component harness, **not full deployed routing/styling or a screenreader audit**. Evidence is retained at `C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-lesson-20261020-qa\evidence` (**69 captures total across tests; 11 inspected**). Owned temporary snapshot/scratch cleanup was verified; repository input fingerprints were unchanged by QA.

**What local acceptance proved:** the actual blank manual form reached one confirmed create and then the same canonical ID at version 2. The actual generation form/action/real generator/client, using synthetic fetch, produced a schema-valid private saved lesson. Permission, configuration, schema and provider failures, plus unknown acknowledgements, were covered. These synthetic/local results do not prove connected persistence or live provider availability.

**Open connected gates and authorization:** historical missing migrations and provider 429/404 observations were **not rechecked**. Read-only remote `check:setup` was skipped because database target classification was unconfirmed. Offline Next dev checks covered configuration presence/public validity, OpenRouter key presence and the `:free` model suffix without revealing values; `.env.prod` was not imported and is **not automatically loaded by Next/Vercel**. Connected schema/cache, RPC/grants, real route/action transport, provider availability/quota and actual persisted creation require the confirmed intended disposable nonproduction target and app origin, plus separate permission for any quota-consuming AI probe. No remote writes or reads of learner data, migration application, connected suites, live AI/quota calls, deployment or commit occurred. Coordinator/Owner must authorize and arrange independent connected QA; local acceptance does not close these gates.

**Documentation handover boundary:** only this tracker and the short README current-status note are reconciled here; the six existing application/test modifications and all dated historical logs are preserved. Documentation whitespace, local links and content consistency are the only checks for this handover; no test rerun or additional implementation is required.

### 20 October residual activity-step defect — follow-up independently accepted LOCAL

**New report after the first repair, not a retroactive closure:** the user's exact `Please check activity.steps.1: Too small: expected string to have >=1 characters.` was reproduced by the mounted real editor submitting a blank second line. This establishes this local manual-authoring defect, not the original connected generation failure's root cause. The six previous lesson repairs and their dated evidence above remain preserved.

| Work | Owner | Dependency / deliverable / acceptance |
| --- | --- | --- |
| Activity-step entry follow-up | Forge Implementer | Delivered only in `src/components/learning-controls.tsx`, `tests/manual-authoring.test.mjs`, `tests/learning.test.mjs`, plus these short README/tracker entries |
| Independent regression/visual QA | Forge QA (separate from implementer) | Locally accepted **20 October, 10:11–10:13 HKT**: fresh **31 focused / 246 full-suite** passes, lint/typecheck/build, six final activity screenshots inspected; bounded evidence and limits below |
| Connected acceptance | Coordinator + Owner | Still pending authorized disposable nonproduction target/app origin and separately authorized AI quota use; no connected acceptance claimed |

**Behavior:** raw textarea state retains Enter, caret, whitespace and failed-save input. A derived ordered list trims surrounding whitespace and ignores separator-only blank lines for preview, hidden JSON and dirty/saved baseline. Instructions explicitly explain this formatting treatment. Associated inline feedback/native custom validity focuses the steps field for fewer than 3 or more than 6 real steps, or a step over 120 characters; meaningful content is never silently dropped/truncated and missing steps are never fabricated. No shared helper, server action or schema changes were necessary; direct action tampering remains rejected by the authoritative existing bounds, and `z.toJSONSchema(lessonSchema)` retains its strict provider-compatible activity shape.

**Original implementer commands/results (Windows, Node 25.2.1, existing dependencies, offline Playwright Chromium 153.0.8010.12; preserved provenance):**

| Command | Implementer result |
| --- | --- |
| `node --experimental-strip-types --test tests/manual-authoring.test.mjs` before fix | Initial test locator failure: **17 passed, 2 failed**; corrected locator then reproduced the **exact user error**, **17 passed, 2 failed** (new regression and parent) |
| Same command immediately after editor fix | **19 passed, 0 failed/skipped** |
| Same command after expanded activity coverage | **24 passed, 0 failed/skipped** |
| `node --experimental-strip-types --test tests/manual-authoring.test.mjs tests/learning.test.mjs` | Final **31 passed, 0 failed/cancelled/skipped** |
| `node node_modules/eslint/bin/eslint.js src/components/learning-controls.tsx tests/manual-authoring.test.mjs tests/learning.test.mjs` | Exit 0 |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | Exit 0; direct compiler, no Next/environment loader |
| Bundled Git `git diff --check` | Passed |

Coverage includes raw `'\n\n'` blank-route default; blank second, leading/trailing and whitespace-only lines; CRLF; Enter then next-step typing/caret; native validation focus/no action/write for insufficient/excess/overlong steps; valid six-step/120-character boundaries; 320px/1440px Tab/Shift+Tab, Enter and Escape; preview/submission/persisted order; three-step create and same-ID/version-2 update; clean formatting-only versus dirty meaningful edits; retained failed-save input and retry; direct invalid create/update actions; unchanged provider JSON schema. Existing manual/AI/ownership/uncertain-save cases in the same harness also remain green. Harness assertions recorded **0 unexpected browser/Node network attempts and 0 page errors**; persistence/provider dependencies were synthetic only.

**Original implementer visual evidence:** six `activity-{insufficient,overlong,preview}-{320,1440}.png` screenshots from the expanded green run were actually opened and inspected in `C:\Users\SOLUSER\AppData\Local\Temp\forge-manual-qa01-LAlwaQ`. Feedback/help/focus wrap without overlapping controls; preview shows exactly three ordered nonempty steps at both widths. Final focused-run captures are retained separately at `C:\Users\SOLUSER\AppData\Local\Temp\forge-manual-qa01-ASw8zj`; these additional captures are not claimed as newly inspected. These are real-component/CSS offline mounts, not deployed routing/action transport or screenreader acceptance.

**Implementer handoff boundary (historical):** no full suite/build rerun or release certification by the implementer. No environment-file reads/imports, remote services/quota/DB operations, connected suites, installs, migrations, commits or deployment; browser contexts close through harness cleanup. Existing unrelated files and earlier documentation are preserved. Initial Git inspection reported a clean baseline despite the supplied dirty-worktree expectation; no reset/stash/cleanup of existing work was performed. All connected/provider/privacy/release gates above remain open.

**Fresh independent activity QA — 20 October 2026, 10:11:11–10:13:30 HKT:** final commands ran serially in a new sanitized snapshot, focused tests first. This closes the residual manual activity defect **locally only**, not the original connected-generation report. The earlier **232-pass** packet and implementer red/green results above remain separate evidence.

| Command | Fresh independent result |
| --- | --- |
| `node --experimental-strip-types --test tests/manual-authoring.test.mjs tests/learning.test.mjs` | **31 passed, 0 failed/cancelled/skipped** |
| `npm test` | **246 passed, 0 failed/cancelled/skipped** |
| `npm run lint` | Exit 0 |
| `npm run typecheck` | Exit 0; `next typegen` then `tsc --noEmit --incremental false` |
| `npm run build` | Exit 0; Next.js **16.3.5 Turbopack**, **23/23** static-generation work items |
| Bundled Git `git diff --check` | Passed, including final documentation edit check |

**Acceptance proved:** a valid blank second line and leading/trailing/whitespace-only/CRLF separators produce the same three real ordered steps in preview, hidden submission and synthetic persisted content, without altering retained raw input except browser CRLF conversion. Enter/next-step typing and caret, Tab/Shift+Tab, preview Enter/Escape/focus return pass at **320×900 / 1440×900**. Empty defaults, fewer than 3, more than 6 and over-120-character steps focus the associated field with actionable custom/native feedback and **no action/write**; valid six-step/120-character boundaries remain intact. No meaningful step is silently truncated or fabricated; internal spaces are retained. Failed saves retain raw text and dirty state; confirmed creates/updates establish normalized clean baselines, and formatting-only changes stay clean. Existing actual blank-form create → **same ID/version 2**, native collapsed-quiz validation, authorization/foreign-owner/publishing denials, stale versions and uncertain acknowledgement no-replay pass. Direct invalid create/update calls remain rejected before writes. `z.toJSONSchema(lessonSchema)` retains strict activity **minItems 3 / maxItems 6 / minLength 1 / maxLength 120**. The activity follow-up did not change server actions or either authoritative schema. Mounted authoring assertions report **0 unexpected browser/Node network attempts and 0 page errors**.

**Environment/reproducibility:** Windows, Node **25.2.1**, npm **11.6.2**, TypeScript **5.9.3**, ESLint **9.39.5**, Playwright **1.63.0**, Chromium **153.0.8010.12**; existing dependencies copied, no installs. Snapshot captured **10:10:01.177 HKT**, **125 source/config/test files**, SHA-256 `856f1671b7e055987d07b2ac8c17e02b7576c3ec677244bc7183fa8678c12b99`. `.env*`, repository Git/build output and caches were excluded; child processes used an OS-environment allowlist, Node outbound-network block and existing offline/aborted-route browser harnesses. No environment-file reads/imports or real credentials were needed.

**Drift/preservation, not an application failure:** first independent commands also passed (**31 focused / 246 full**, lint/typecheck/build), but the post-run preservation check detected an unrelated comment-only `tests/openrouter.test.mjs` change and concurrent README/tracker edits. That run is retained, not silently substituted for the final run above. QA recaptured and repeated the requested gates. All **125 final source/config/test file bytes** and both docs then matched the final capture before QA's permitted doc edits; Git status independently changed dirty → clean, so the combined status/content check reported false. `content-preservation.json` distinguishes verified unchanged bytes from that external Git-state drift. QA issued **no commit, add, reset, stash or other Git mutation** and changed no application/test files. The snapshot includes pre-existing unrelated OpenRouter changes/tests; these explain part of the fresh full-suite count but this activity QA does **not** independently accept that separate configuration request.

**Fresh inspected evidence/cleanup:** final evidence root `C:\Users\SOLUSER\AppData\Local\Temp\forge-independent-activity-20261020-qa-final\evidence` contains command logs/results, fingerprints, preservation/diff checks, screenshot inventory and `visual-inspection.md`. QA actually opened **six final-run** `activity-{insufficient,overlong,preview}-{320,1440}.png` files in `screenshots\forge-manual-qa01-jjfOHy`: visible field focus, wrapping help/actionable errors, separated controls and exactly three ordered nonempty preview items. Six equivalent images were inspected from the first run in sibling `forge-independent-activity-20261020-qa\evidence\screenshots\forge-manual-qa01-NymuBP` (**12 inspected total this session**). Each run retains **81 captures** across focused/full suites; other images are not claimed as inspected. Owned snapshot/scratch directories for both runs were removed and verified absent; screenshots/logs remain. No repository cleanup/reset or services were used.

**Failures/limits/open requirements:** no concrete application/test/lint/typecheck/build failures reproduced. Initial evidence-preservation drift is disclosed above; Node module-type and missing-build-cache warnings were nonfailing. QA edited **only README.md and this tracker**, preserving original implementer provenance, prior dated entries and the separate OpenRouter handoff. Offline component/CSS mounts and synthetic action dependencies do **not** establish compiled deployed styling/routing, real action transport/database persistence, screenreader acceptance or live provider availability/quota. All connected schema/cache/RPC/grants/persistence/provider and release gates remain **Open**, requiring the authorized disposable nonproduction target/app origin and separate quota permission. No connected diagnostics/suites, production services, remote learner-data operations, live AI/quota calls, installs, migrations, commits or deployment by QA.

## Current coordination — 15 October 2026, 03/18 + 08 integration

**Governing current status:** the integrated onboarding/profile and curriculum/manual-authoring packet has independent bounded **LOCAL acceptance at 15:07 HK: 224 tests, lint, typecheck and build pass**. This entry supersedes stale current-status wording below without converting historical logs into new evidence. The whole project remains Open; 03/08/18 remain Open/Partial for owner pedagogy/content, actual tailoring and connected gates. Task25's pagination repair remains independently fixed **locally**; Task25 and all connected/release gates remain Open.

**Owners and boundaries:** Forge Implementer delivered 03/18 onboarding/local diagnostic plus the coupled 03/13/20 profile/email repairs and integrated `tests/e2e.mjs`/`tests/instructor-e2e.mjs`. The disjoint curriculum writer delivered 08 canonical metadata/curriculum support and the tightly coupled 14 manual-editor repair. After the final test-only eligibility adaptation, all source was frozen; Forge QA independently ran the local gates and owns only this final README/tracker evidence update. Coordinator+Owner owns pedagogy/content and final acceptance. No new service, remote migration, provider/mail call, installation, commit or deployment was authorized/executed.

**Source delivery:** first dashboard entry sends incomplete accounts to role-appropriate `/onboarding`, with later profile editing; `/diagnostic` independently computes a bounded latest summary and offers explicit adopt/override/retake without changing chosen level automatically. Trusted instructor/admin roles receive instructor questions, reviewers/other accounts learner questions; self-report grants nothing. `draft-2026-10-v1` samples six questions: 0–1 New, 2–3 Foundation, 4–5 Intermediate, 6 Advanced; owner pedagogical review remains required. Completion/background, latest summary and revision are separately persisted; no raw answer history or inferred historical ages/completion. All three canonical families now align authoring/generation/coaching/paths. New lesson writes require explicit version-1 JSON metadata; legacy missing/invalid metadata remains unspecified. Audience is suitability, not authorization. No diagnostic/background fields were added to AI payloads; profile four-level/goals contracts remain.

**Five reproduced profile repairs:** (1) email client/auth/update failures are handled, email is retained without querystrings, uncertain acknowledgement is not replayed automatically, and success still asks for both inbox confirmations; (2) actual File, removal and nonsecret text state survive failed profile actions, with deliberate retry/cancel; (3) failed/missing profile reads cannot render saveable fallback defaults or be masked by success-query text, while recovery/export/deletion remain reachable; (4) profile file controls wrap at 320px, with mounted keyboard/focus checks; (5) returned auth errors deny profile/email mutations even with a user object. Shared compare-and-swap revisions also prevent stale profile/setup writes. The real manual editor's reproduced red-green result changed **2 inserts → 1 insert + same-ID update to version 2**, preserving permission/version checks, without claiming targeted AI revision support.

| Evidence and provenance | Actual result / limit |
| --- | --- |
| Independent preimplementation QA supplied by Coordinator, **14:17:48.940 HK** | **168 tests + lint passed**, 102-file fingerprint `935b1f3fa1586827c85fe8401c3a98ff26037fe952cd30ef60e468c1098ab235`; baseline only, not acceptance of new features |
| Stable combined source packets, Coordinator-reported **13-file focused run** | **134 passed, 0 failed/skipped**; direct `tsc`, scoped lint and diff checks pass. Implementer evidence, not independent acceptance |
| Earlier onboarding packet's 33-pass/one-startup-failure and historical 56-pass subset | Startup blocker resolved by the curriculum writer's leaf-module import repair within ownership; no account-test loader workaround. Superseded for integrated evidence by the 134-pass run, not retroactively changed |
| This harness/docs integration | Both `node --check` commands and scoped harness ESLint pass; **22 isolated actual-helper synthetic contracts** pass with real curriculum/schema validation. Harness top-level environment/network setup and connected suites were **not executed** |
| Task25 retained independent evidence | Historical full **168** + local lint/typecheck/build acceptance; fresh preimplementation **168** baseline also passes. T25-QA-01 fixed locally, not connected-verified |
| Earlier independent QA, Coordinator follow-up at 14:53 HK | Separate **33 targeted + 103 curriculum/account** tests passed; original five profile contracts and onboarding role/scoring/owner/state checks passed. At that stage two low focus findings required repair; this was not final acceptance |
| Independent repair rerun, before the first final full attempt | **47 passed, 0 failed/skipped** across six test files; all three application repairs and persistent curriculum harness synchronization passed |
| First independent integrated full attempt | **223 passed / 1 failed**, 0 skipped; stale eligibility fixture, not an application regression. Later gates were not run. Test-only adaptation below resolves this recorded failure |
| Final independent run, **15:06:14.580–15:07:19.543 HK** | **224 passed, 0 failed/cancelled/skipped**; lint, typecheck and build exit 0. Independent bounded local acceptance only; exact evidence below |

**QA-FOCUS-01/02 — closed locally:** independent QA found focus falling to BODY after keyboard Cancel retake and Cancel picture change at 320×844/1440×1000. Minimal component changes focus the persistent saved-result heading (`tabIndex=-1`) and existing file chooser respectively; no action/persistence logic changed. The implementer's four persistent red cases and subsequent **18/18** repaired UI run remain earlier evidence. Independent **47/47** and final **224/224** now verify visible/in-viewport focus, no cancellation mutations, saved summary/level preservation, retained text, failed-save File retries and removal/cancel distinctions. All four fresh final focus screenshots were opened and inspected.

**QA-MANUAL-01 — closed locally:** independently reproduced thrown-after-commit acknowledgement followed by retry created two rows. `createManualLesson` now distinguishes definite statement rejection from uncertain creation; the mounted editor retains its draft and blocks another create. Thrown/returned-error/missing-data/malformed-ID post-insert variants each finish with **one insert, one row, Save disabled**; outer transport rejection remains uncertain too. `/catalog?visibility=private` is the canonical owner-private recovery list in a separate tab; publishing-capable editors also link to permission-gated `/teaching`. Canonical existing-ID reconciliation continues to version 2 without replaying the unknown create. Original definite-rejection retry, confirmed-create/same-ID update, ownership/version/publish/AI restrictions and input retention still pass. Persistent `flushSync` synchronization in `tests/curriculum-ui.test.mjs` repairs the reproduced render race without changing assertions or application behavior. Both repairs pass independent targeted and final full runs.

**Harness/schema integration:** both harnesses complete onboarding through the UI, not seeded completion markers; the signup-confirmation path also completes onboarding. They retain numeric age 22 and original auth/quiz/version/cleanup semantics, check the saved profile revision, resolve the testing alias via the curriculum registry, and write canonical subject/topic/audience/difficulty/outcomes/prerequisites. The instructor import revocation fixture now satisfies required metadata before testing server denial. Authoring-only scope is no longer described as migration-independent. Current migration order ends with **`20261015_interviews_ran.sql` then `20261015_onboarding_diagnostic.sql`**; the latter is required for onboarding/diagnostics **and profile editing**. Neither packet remotely applied them; connected applied status remains unverified. `_ran` is never proof of application. Curriculum metadata uses existing JSON content, without DDL/backfill; older writers may strip it on rollback.

**Still open:** connected auth/database/migration/grants/concurrency/export/cascade and connected-harness cleanup acceptance; owner diagnostic review and reviewed curriculum/resources; 09/12 reviewed-state presentation; 14/16 targeted AI revisions; 18 actual explanation/example/practice tailoring; 19 legacy PPT/student slide assistance; 22 4D/reflections; 23 planner; 24 embedded coding; provider eligibility/live success, hosted CI, owner deliverables and all release/deployment gates. This is not whole-project, Task03/08/18/25 connected, or comprehensive accessibility acceptance. No new planning document was added.

## Final independent local QA — 15 October 2026, 15:07 HK

**Disposition:** bounded integrated local acceptance passes. QA made no application or test edits; only README and this tracker were updated after passing gates. Earlier baseline, implementer evidence and failed attempts retain their original provenance.

**Fixture failure and resolution:** the previous frozen snapshot (`fa65bb77b1775024476aa55247d31ddbd13668ed6fb067bec11c57240f78e245`) passed the independent 47-test repair subset, then `npm test` returned **223 passed / 1 failed**, exit 1, duration **20,919.4089 ms** (wrapper 21,355 ms). `tests/eligibility.test.mjs:155` expected `/administrator review/` but received field validation because the old fixture omitted `setupRevision`; its profile revision, explicit auth success and persistence stub also predated the action contract. Lint/typecheck/build were not attempted after that failure. The writer changed only `tests/eligibility.test.mjs` (SHA-256 `c4a1adb0769d77fbaf7a3c291fe15a65016f5db1ef9fba3767770f4622856a98`): valid form/stored revisions, `error: null`, owner/revision-filtered update/select/maybeSingle, matching-ID assertions and mismatched-ID denial. QA inspected the exact diff; original invalid-age, known-underage review, lookup failure and no-AI-grant assertions remain. This is a **resolved fixture adaptation**, not an application regression, skipped assertion or policy relaxation.

**Snapshot and environment:** captured **15:05:50.662 HK** at `C:\Users\SOLUSER\AppData\Local\Temp\forge-final-accepted-hPG9kM`; **125 files**, SHA-256 `b46b50503e3865dc5188576836f7c5c07cd82d6cfac530e2670350c98a39cf89`. Scope: `src/`, `tests/`, `scripts/`, `supabase/`, plus `package.json`, `package-lock.json`, `next.config.ts`, `next-env.d.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`. Fingerprint is SHA-256 of JSON containing forward-slash relative paths and file SHA-256 values, sorted by `localeCompare(..., "en")`. Replacing only the eligibility entry with its previous Git-blob content in original CRLF form exactly reproduced the preceding snapshot fingerprint: no other source/config/test/script/schema change occurred between attempts. Repository and copied inputs matched before and after all commands and before cleanup; no generated config input changed.

Windows; Node **25.2.1**, invoked bundled npm **11.6.2**, Next **16.3.5**, React **19.1.0**, TypeScript **5.9.3**, ESLint **9.39.5**, Playwright **1.63.0**, Chromium **153.0.8010.12**. The invoked npm version corrects the earlier QA-wrapper report of 11.19.1; dated logs are not rewritten. Existing dependencies were reused through **26,802 file hardlinks** into separate directories, not a dependency-directory junction. No dependency environment-file names were encountered. Child processes received only an OS-variable allowlist, controlled Node/System32 PATH, disabled telemetry/update/audit/fund checks, offline npm, nonexistent user/global npmrc paths and snapshot-local npm cache. No environment files, credentials, installs, servers, remote setup/AI/mail/Supabase calls, connected suites or migration application.

| Final command, executed once each in this order | Actual result | Wrapper elapsed |
| --- | --- | --- |
| `npm test` | **224 passed, 0 failed/cancelled/skipped**, exit 0; Node duration **26,100.8958 ms** | **26,470 ms** |
| `npm run lint` | Repository ESLint passed, exit 0 | **12,098 ms** |
| `npm run typecheck` | `next typegen` and `tsc --noEmit --incremental false` passed, exit 0 | **6,363 ms** |
| `npm run build` | Next.js 16.3.5 default Turbopack compilation/TypeScript passed; **23/23** static-generation work items, onboarding/diagnostic dynamic, exit 0 | **19,982 ms** |

The final sequence ran **15:06:14.580–15:07:19.543 HK**, with no concurrent `.next` writer. All npm commands used Node with `C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js`. The test runner emitted 15 non-fatal `MODULE_TYPELESS_PACKAGE_JSON` warnings; no package behavior was changed to suppress them.

The earlier independent repair command was `node --experimental-strip-types --test tests/onboarding-ui.test.mjs tests/profile-ui.test.mjs tests/profile.test.mjs tests/manual-authoring.test.mjs tests/curriculum-ui.test.mjs tests/resume.test.mjs`: **47 passed, 0 failed/skipped**, exit 0, duration **10,835.7007 ms** (wrapper 10,922 ms). It was not rerun separately after the eligibility-only change. Across the final repair/gate cycle: **one 47-test command, two full npm-test attempts, and one each lint/typecheck/build = six test/gate invocations**. Earlier bounded 33/103 and supplemental probes are separate evidence, not added to a fictitious unique-test total.

**Coverage and limits:** independent review/fixtures exercise trusted-role selection and forged-role/score rejection; owner-only latest diagnostic summaries and server scoring; explicit adoption/override/retake without automatic level/completion changes; dashboard-only entry gating with profile/recovery/privacy routes still reachable; stale revisions and returned/thrown/lost-acknowledgement recovery. Curriculum metadata-only catalog projection, private visibility, safe player props and request-local path tokens remain intact. The `learning.ts` leaf import blocker was independently verified without alias-loader workarounds. Original five profile repairs, manual confirmed-save/version-2 continuity and negative auth/owner/publishing/AI-grant contracts pass. Browser harness onboarding/schema/metadata/revision adaptations were inspected, not imported or executed as connected suites. These are mocked/in-memory/browser contracts, not proof of live Next transport, Postgres multi-session concurrency or connected persistence.

**Fresh synthetic visuals:** the successful full run captured **49 PNGs**, of which **17 were opened and inspected**. All paths below are under `C:\Users\SOLUSER\AppData\Local\Temp\`:

| Retained directory | Captured / inspected | Scope |
| --- | --- | --- |
| `forge-tracker08-m0OsAA` | 2 / 2 | Three-family/legacy catalog, combined mobile filters |
| `forge-manual-qa01-H84jn1` | 2 / 2 | Mobile/desktop uncertain-create notice, blocked Save and canonical recovery |
| `forge-onboarding-ui-gCSWSR` | 7 / 7 | Learner/instructor onboarding and diagnostic, desktop keyboard focus, both cancel-focus widths |
| `forge-profile-ui-VTStlg` | 6 / 6 | File retry, retained email uncertainty, desktop/mobile and both cancel-focus widths |
| `forge-auth-4QGOWh` | 4 / 0 | Captured; not newly visually inspected |
| `forge-task25-qa-1BIcuY` | 28 / 0 | Captured; not newly visually inspected; earlier independent T25 review retained |

The four fresh cancellation captures show visible focus at **320×844 / 1440×1000**, retained state and wrapping controls; assertions verify no cancellation mutation. Manual uncertainty and catalog notices/recovery controls remain readable at mobile/desktop. `profile-mobile-320.png` catches the sidebar's 250 ms viewport transition; `profile-email-uncertain-320.png` includes a fixed header within the full-page scrolled capture. Those two images were inspected but are **not settled-layout approval**; dedicated stable retry/cancel captures and keyboard/overflow assertions are the bounded evidence. No full screen-reader/accessibility audit is claimed. The final Task25 harness reported zero network attempts/page errors; relevant browser suites also assert aborted/absent external requests and no page errors.

**Cleanup:** removed only owned `C:\Users\SOLUSER\AppData\Local\Temp\forge-final-accepted-hPG9kM`, including its generated `.next` and npm cache; absence verified. The preceding failed-gate copy `C:\Users\SOLUSER\AppData\Local\Temp\forge-final-local-0IcMcN` had already been removed with absence verified. Browser contexts and in-memory databases close in harness cleanup; no remote fixtures existed and no cleanup failure was reported. The 49 fresh screenshots, the earlier 17 targeted/49 failed-attempt captures and prior baseline/bounded evidence remain retained. No application/test changes by QA, no commit or deployment.

## Current approved scope - 15 October 2026

Owner-confirmed after the brainstorm comparison on 15 October. This decision governs the current overview and pending tasks: it supersedes conflicting September 25 SDLC-only limits and deferrals of the selected features, without rewriting dated evidence or treating approval as implementation. Focus: university learners and instructors. Deadline remains **31 October 2026**, for a supervised Hong Kong demo, not a public launch. **One standalone lesson per mini-course; no multi-lesson containers.**

- **Group A core, locally implemented slice:** role-appropriate first-login background/goals onboarding (03/18; self-report never grants instructor rights); a separate local diagnostic with explained suggestion and explicit adoption/override/retake (18); explicit audience/difficulty/outcomes/prerequisites metadata/filtering and canonical three-family support (08). Independent/connected acceptance, diagnostic pedagogy, reviewed curriculum and learning/tool resources remain open.
- Core also includes genuinely tailored explanations/examples/practice, not merely reordered recommendations (18/15/16); AI-assisted targeted instructor revisions with preview/accept/reject/versioning (14/16); clear reviewed vs attended vs passed progress states (09/12); activities/reflections applying AI fluency 4D — Delegation, Description, Discernment, Diligence (22).
- **Selected extras:** private project planner (goals → suggested stack/structure → editable milestones/tasks/progress, 23); daily reflections (22); student slide assistant (authorized course material or personal uploads → source-referenced summary/key terms/glossary/beginner explanations, private by default, 19); beginner-friendly embedded JavaScript/Python coding (24) remain pending. LIVE TEXT interviews (25) have bounded local implementation and independent local repair acceptance under the approved 11:26 policy; connected acceptance remains open. Outbound coding links and generic coach chat are not substitutes.
- **Curriculum target:** SDLC plus AI coding-agent skills and software-development soft/product skills (08). Authoring/generation/coaching/paths now share the canonical registry and explicit metadata; reviewed content/resources and genuine tailoring remain open. Recommendations, editor preview/version checks, attendance/results and teaching extraction alone do not complete the expanded scope.
- **Not selected:** no community is required — no peer showcases/sharing, human Q&A, instructor news/community feed, comments or community notifications. Campus retrieval, lecture-video ingestion/alignment, rich advanced media/real-time voice/video, and broader games/simulations are not newly approved. Basic tailored practice and 4D activities remain core.

**User-confirmed detail — 2026-10-15 11:20 HK:** 24 initially uses **JavaScript and Python**, beginner-friendly; TypeScript/other languages are not required. 25 is **LIVE TEXT only**, with no voice/video requirement. **Persisted interview transcripts are explicitly approved in principle**; this newer decision supersedes the prior no-transcript-storage assumption for **interviews only**, not the session-only generic lesson coach. These are approved choices, not completed implementation.

**Packet-specific design status:** 24 has an isolated guest-interpreter/WASM runtime direction only; capability, licensing, local assets, escape/resource controls and hosting compatibility remain unverified. No coding runner was implemented. For 25, the architect's bounded single-row/reservation design has been implemented locally after the 11:26 approval; this does not resolve connected acceptance.

**25 transcript policy — APPROVED, 2026-10-15 11:26 HK:** private learner-owner history/list/reopen/continue; explicit finish and individual deletion; retain until interview or account deletion; own transcripts included in export and Auth-user FK cascade. No automatic administrator/instructor/reviewer/peer access. Authentication and ownership suffice for history/read/finish/delete/export after AI rights are revoked. New inference/retry additionally requires current numeric-adult/trusted-grant approval and the unchanged free-only strict-privacy client. Generic coach remains unsaved. Implementation and local evidence are below; connected behavior is not certified.

**Authorization boundary:** beyond the approved private interview transcript policy, the decision does **not** authorize other conversation/recording storage, original upload retention, new services, public hosting/deployment, paid endpoints, privacy-filter relaxation or third-party analytics/training use.

**Preserved policy:** 13+ signup; minors/unknown-age accounts denied external AI; recorded adults need administrator-approved AI access; free-only models and existing privacy filters; no persisted coach history or original teaching-upload retention; admin-granted instructor rights and owner-scoped publishing/reporting; explicit enrollment; 10 questions, 6-to-pass, unlimited retries and per-passing-attempt certificates; optional paths/no forced enrollment. University focus removes none of these safeguards. Required legacy PPT import stays open under 19.

**20 October supersession:** the strict request-policy statements in this dated 15 October record are historical; latest explicit approval removes shared-client provider/reasoning overrides only. Free-only validation, eligibility and the transcript/storage authorization boundaries remain.

**Prior blockers remain separate from new scope:** last recorded missing `profiles.age`, outstanding migration/access and resume-grant/live persistence checks, free-provider 429/404 failures, legacy PPT feasibility, eligibility/retention and release gates are not resolved by this decision. These connected blockers were not rechecked; new local Task25 evidence is recorded separately. All prior evidence below, including references to "fresh", "current" or "this turn", retains its original September/October context.

The earlier 11:20 documentation-only assignment changed this tracker and README, with consistency checking only. The later 11:26-approved Task25 implementation packet is recorded separately below. Existing dated September/October evidence is preserved, not presented as current execution. The retained existing-work plan is not the sole governing scope.

## T25-QA-01 bounded repair handoff — 15 October 2026

**Task25: Open — local repair implemented; independent QA rerun and connected acceptance pending.** Sole application writer: Forge Implementer; no agents. This entry supplements, not replaces, the original independent QA failure below. Ownership stayed within `src/components/interview-history.tsx`, `tests/interviews-ui.test.mjs`, README and this tracker. No server action/helper, schema, provider or other application file changed. QA's `tests/interviews.test.mjs` SHA-256 is unchanged from the repair baseline; the original UI defect subtest and its assertions are retained.

**Hypothesis and fix:** confirmed creation changed the first 20 rows but retained the old continuation boundary, so the displaced row was skipped. The untouched focused regression reproduced it before editing. Confirmed creation now requests the canonical latest page via the existing `listInterviews(null)` action; page rows, cursor and latest/older selection are stored together. No guessed cursors or synthetic rows/pages. Creation from an older page explicitly returns to latest on successful refresh. Returned/thrown refresh failure leaves the previous page and cursor together, retains **Open new interview**, and says creation succeeded but history refresh failed. Creation uncertainty remains separate and is never automatically replayed. A synchronous in-flight guard serializes creation (including its refresh) and manual page loads, including events before disabled controls commit.

**Added coverage — 10 UI subtests:** latest creation with 18, 20 and 41 retained rows; older-page creation with 21 (short last page), 40 (full last page), and 41 (full intermediate page) retained rows; returned-unavailable and thrown history-refresh failure with unchanged selected page/boundary, explicit recovery and an openable created interview; deferred post-create refresh/older-load overlap and same-tick duplicate submits; returned `create_unknown` and thrown lost creation acknowledgement, explicit reload and no replay. Original full-page 21→22 reachability regression unchanged. All-page comparisons reject missing/duplicate IDs; caps, short-page termination, latest/older copy, keyboard notice focus and recovery are asserted.

| Command / sequence | Actual result |
| --- | --- |
| `node --experimental-strip-types --test tests/interviews-ui.test.mjs tests/interviews.test.mjs` — before editing | **26 total / 24 passed / 2 failed / 0 skipped**, exit 1; retained defect plus its parent |
| Same command — component-only repair | **26 passed / 0 failed/skipped**, exit 0 |
| Same command — extended harness first run | **36 total / 34 passed / 2 failed / 0 skipped**, exit 1; new race test selected the shell logout form, not interview creation. Inspected shell markup and corrected only the new selector to the topic field's owning form |
| Same command — final | **36 passed / 0 failed/skipped**, exit 0, about **11.70 s**; **19 UI + 17 server** including parents |
| `node node_modules/eslint/bin/eslint.js src/components/interview-history.tsx tests/interviews-ui.test.mjs` | Passed, exit 0 |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | Passed, exit 0; direct compiler, no Next typegen/environment loading |

Windows / Node.js v25.2.1 / offline Chromium 153.0.8010.12; existing module-type warnings remain non-fatal. Final UI harness: **0 network attempts, 0 page errors**; keyboard flows and overflow checks passed at 1440×900, 390×844, 320×844 and 844×390. **28 screenshots** retained at `C:\Users\SOLUSER\AppData\Local\Temp\forge-task25-qa-o0VBhA` (count checked). Implementer inspected four images: success and refresh-failure history at 1440×900 and 320×844; notices, page labels, focus outlines and new-interview link wrap without overlap. This is not independent visual/accessibility acceptance. Removed only repair-created intermediate directories `forge-task25-qa-FRXwEY`, `forge-task25-qa-IkUBLp`, `forge-task25-qa-k7QWtO`, with absence verified. QA's original screenshot evidence remains untouched; browser contexts/PGlite closed through test cleanup.

Git was absent from PATH, but a bundled GitHub Desktop Git was located for baseline/status inspection; existing unrelated modifications/untracked implementation files were preserved. No environment-file reads, installs, services, remote/provider operations, commits or deployment. No full suite, Next typegen/build, migration application or connected check was run in this repair. **Request independent QA rerun**, not implementer release certification. Real routing/action transport, current rights/session behavior, Postgres multi-session locking/grants/RPCs, connected owner export/cascade, provider availability/retention and existing privacy/release blockers remain open; no additional product defect is known from the focused repair checks.

## Task25 independent QA — 15 October 2026

**Status: Open — local repair required; no QA-complete certification.** Forge QA was the sole test/build runner, with no subagents or concurrent writer. Read the actual repository skills, current policy, implementation, migrations and existing offline harnesses. Git was unavailable, so this is source inspection and execution evidence, not a verified diff. QA edits are limited to `tests/interviews.test.mjs`, `tests/interviews-ui.test.mjs`, README and this tracker; no application/migration/manifest repair was made.

### Reproducible defect and bounded implementer request

**T25-QA-01 / medium — history creation invalidates pagination reachability.** `src/components/interview-history.tsx:42–44` prepends the confirmed created row and truncates to 20 without changing `cursor`; line 64 subsequently sends the old boundary. With 21 synthetic retained interviews, open the first 20, create one, then choose **Older interviews**. Expected: all 22 retained interviews remain reachable across pages. Actual: only 21 are reachable; the displaced previous 20th row is skipped. Explicit **Reload latest history** followed by paging recovers all 22 (tested); no stored transcript deletion was observed. The failing test is `tests/interviews-ui.test.mjs:290`, assertion at line 304, using the actual mounted history component with metadata-only deterministic mock pages, not a source-text proxy.

**Repair owner: Forge Implementer.** Reconcile page rows and continuation cursor atomically after a confirmed create, preferably via canonical metadata refresh or equivalent correct page handling. Cover full/latest/older pages and the transition to needing a cursor. Preserve the new-interview link, caps, ownership and creation-uncertainty policy; do not automatically replay creation or change application behavior merely to satisfy a mock. Keep the failing regression and return for QA rerun. Connected acceptance alone does not close this local defect.

### Exact local checks and boundaries

Windows, Node.js **v25.2.1**, npm **11.19.1**, Chromium **153.0.8010.12**; synthetic fixtures only:

| Executed command / environment | Actual result |
| --- | --- |
| `node --experimental-strip-types --test tests/interviews.test.mjs` | **17 passed, 0 failed, 0 skipped**, exit 0; all six actions now tested for absent user, returned error with user and thrown auth failure, with no privileged DB access |
| `node --experimental-strip-types --test tests/interviews-ui.test.mjs` | Final **7 passed, 2 failed, 0 skipped**, exit 1; one failed pagination subtest and its parent, not two independent product defects |
| `npm test` | Run twice; final **158 total / 156 passed / 2 failed / 0 skipped**, exit 1, about **22.05 s**; same defect only |
| `npm run lint` | Both runs passed, exit 0; final run includes all final test-only refinements |
| `npm run typecheck` then `npm run build` | Sequential in an isolated secret-free copy; both exit 0. Next route type generation, `tsc --noEmit --incremental false`, default Next.js **16.3.5 Turbopack** production compilation and build TypeScript passed; static generation **21/21**, both interview routes listed dynamic |

Build safety: a temporary QA wrapper copied only `src` and the named package/Next/TS/PostCSS/ESLint configuration files, hardlinked existing dependency files, and used an OS-variable allowlist with telemetry disabled for child processes. No workspace environment file was read/copied/changed, no application credentials were inherited and no dependencies were installed. Its `.next` writers were serialized and confined to the copy. Temporary copy `C:\Users\SOLUSER\AppData\Local\Temp\forge-task25-build-Tl0aXN` and wrapper `forge-task25-build-qa.mjs` were removed and absence verified. Build preceded final UI-harness-only refinements; no application code changed during QA.

**Passing executed boundaries:** actual server actions/helpers plus in-memory PGlite cover learner/instructor/admin/reviewer direct-call owner isolation; revoked/minor/unknown/profile-failure inference denial with history access; strict client envelope/no replacement history; minimized canonical provider messages; quota before inference, shared 15/day quota, rollback, replay-payload conflict, owner overlap, expiry/attempt token/lease, explicit bounded retry, missing acknowledgement and late completion; finish/delete/account-cascade races; metadata paging, caps, SQL constraints, browser-role denies and service grants. Existing account export uses all 14 owner-scoped tables, including interview pagination and later-page/missing-migration all-or-nothing failure. Synthetic >1,000-row interview export fixtures stress the generic paginator, not the 100-interview application cap. Existing account deletion/password/identity/cookie ordering and auth/eligibility/free-only privacy-client regressions passed.

**UI and visual evidence:** reused the mounted real components/CSS harness, with real local icons, mocked actions/navigation, offline Chromium and blocked service workers/network. Added deterministic metadata pages, actual keyboard submit/reload/retry/finish/delete/cancel, and draft-preservation checks for failed transport. At all four sizes, textarea Tab→Send/Enter, focused error notice, disabled submission and explicit reload preserve an unreserved answer. Mobile menu/Escape and deletion-confirm/cancel focus, canonical-only replies, retry without replacement text, finished read-only reopen and pending delete/finish late-response suppression passed. **0 network attempts; 0 page errors** in the interview harness.

QA independently inspected all **24 final narrow-run screenshots** at **1440×900, 390×844, 320×844, 844×390** for each of `history`, `pending`, `failed-retry`, `connection`, `finished`, `delete-confirmation`. No horizontal overflow or overlapping controls in the settled states; disclosures/transcripts/notices wrap, focus outlines are visible, pending is not labelled saved, the failed draft remains visible, and the delete confirmation is distinct. Native narrow topic selects clip long selected labels; full labels appear in the history/transcript heading (non-blocking visual limitation). These are mounted-component views, not actual Next route screenshots or a screen-reader audit. Early captures were taken mid-resize and with nonzero scroll; QA corrected only the capture harness to await animations/normalize scroll and removed those superseded images.

Retained inspected evidence: `C:\Users\SOLUSER\AppData\Local\Temp\forge-task25-qa-Lvz9Jt\<state>-<width>x<height>.png` (**24 files**, existence/count checked). Browser contexts and in-memory PGlite instances closed through test cleanup; no remote fixtures existed. Removed exact owned intermediate/duplicate directories `forge-task25-qa-wgqQsn`, `forge-task25-qa-O6MTut`, `forge-task25-qa-I0ztQh`, `forge-task25-qa-Z1ka9r`, and incidental full-suite auth screenshot directories `forge-auth-UysrTu`, `forge-auth-Obp1mQ`; absence checked. No cleanup failures.

**Reviewed-only / untested, not passes:** protected `/interviews` paths, profile retention copy, quota wording and metadata-only setup diagnostic were inspected but no `check:setup`, `check:ai`, E2E or instructor connected suite ran. No remote reads/writes, migration application, app server/deployment, provider or inbox calls, or live session checks occurred. PGlite serializes its engine: real multi-session Postgres lock scheduling, PostgREST/RPC/grants and hosting timeouts remain unverified. Real authenticated routing/action transport, current rights revocation across live sessions, connected owner export/account cascade, provider availability/quality/retention and release/privacy gates require separate authorization. Historical age/resume-grant/free-provider blockers were not re-probed. No Task24 coding or broader Group A completion claim. Earlier implementer/history entries below remain dated evidence, not this QA result.

## Task25 bounded local implementation — 15 October 2026

**Status: Open.** Sole mutable writer: Forge Implementer; no agents dispatched. Read the Forge Architect report and repository delivery/security/verification skills before edits. The falsifiable hypothesis was that transactional answer+quota reservation with owner locks, revision/request replay checks and DB-time lease/token finalization would prevent duplicate quota claims, overlapping accepted replies and finish/delete resurrection, while keeping owner history independent of AI eligibility. Focused checks exercised actual actions/helpers against a mocked provider/auth and local PGlite before UI/integration work. Git is unavailable in this shell; no diff/commit claim is made. Existing migrations were inspected, not renamed or assumed applied.

| Deliverable / owner | Local outcome | Remaining acceptance |
| --- | --- | --- |
| Forge Implementer — data/server/AI | New typed bounded schema, owner reads, static approved topics/chosen level, minimized canonical prompt and server actions; additive RLS migration with explicit browser/PUBLIC deny and service-role function/SELECT grants. Reservation atomically claims existing shared 15/day text-AI quota and saves learner text before inference; replay/revision/attempt/75-second lease guards; conditional finalization, no upsert or fabricated fallback | Independent authorization/race/schema review; real Postgres multi-session contention, PostgREST RPC and deployed timeout behavior |
| Forge Implementer — UI | Dedicated history/create and reopen/continue, explicit saved-answer retry, finish and individual hard deletion. Persistence/provider disclosure, visible caps, saved vs pending vs uncertain status, text-only rendering, focusable notices, late-response suppression | Independent desktop/mobile visual/accessibility review and real authenticated routing/action transport |
| Forge Implementer — integration | Navigation/protected path; 14th export table `forge_interviews/owner_id/id`; metadata-only setup readiness; profile deletion/privacy and shared coach-quota copy. Account deletion action/password/identity/cookie ordering unchanged; FK cascade tested locally | Apply migration before feature **and export** queries; separately authorized real grants/cascade/export/session checks |
| Forge QA — requested, not run here | Independent bounded local review and serialized release gates | No implementer release certification; connected acceptance requires explicit disposable target authorization |

Owned implementation files added:
- `src/lib/interviews.ts`, `src/lib/interviews-server.ts`, `src/lib/interview-ai.ts`
- `src/app/interviews/actions.ts`, `src/app/interviews/page.tsx`, `src/app/interviews/[id]/page.tsx`
- `src/components/interview-history.tsx`, `src/components/interview-practice.tsx`, `src/components/interviews.module.css`
- `supabase/migrations/20261015_interviews.sql`
- `tests/interviews.test.mjs`, `tests/interviews-ui.test.mjs`

Narrow existing-file changes: `src/components/learner-shell.tsx`, `src/lib/supabase/middleware.ts`, `src/app/api/account/export/route.ts`, `scripts/check-setup.mjs`, `src/app/profile/page.tsx`, `src/app/profile/delete/page.tsx`, `src/app/learning/actions.ts` (quota wording only), `tests/account.test.mjs`, `README.md`, `IMPLEMENTATION_TRACKER.md`. No existing lesson grading/report/ownership, coach storage/privacy client, old migration/base schema, dependency or Task24 runtime changes.

Limits implemented and disclosed: 8 learner answers + opening; 1,200 learner / 1,600 assistant characters; 128 KiB transcript; 12,000 total provider-message characters; then-unchanged 600-token completion (superseded by the approved 20 October content-based budget above); 3 explicit attempts per turn; one pending turn per owner; 75-second DB lease; 100 retained interviews; stable metadata-only 20-row history pages. Expired pending work requires explicit retry/finish/delete before another interview starts. Failed inference consumes shared quota; no automatic retries/refunds. Successful eighth answer requests final formative feedback. Early finish retains existing feedback and makes no extra AI request or invented summary/score/hiring decision. Retention ends only at interview/account deletion; infrastructure backups/log/provider retention are separate gates.

### Actual Task25 commands and results

Windows / Node.js **v25.2.1**, offline synthetic fixtures only:

```powershell
node --experimental-strip-types --test tests/database.test.mjs
node --experimental-strip-types --test tests/interviews.test.mjs tests/database.test.mjs
node --experimental-strip-types --test tests/interviews.test.mjs tests/account.test.mjs tests/database.test.mjs
node --experimental-strip-types --test tests/interviews-ui.test.mjs
node --experimental-strip-types --test tests/interviews.test.mjs tests/interviews-ui.test.mjs tests/account.test.mjs tests/database.test.mjs tests/eligibility.test.mjs tests/openrouter.test.mjs
node node_modules/eslint/bin/eslint.js src/lib/interviews.ts src/lib/interviews-server.ts src/lib/interview-ai.ts src/app/interviews src/components/interview-history.tsx src/components/interview-practice.tsx src/components/learner-shell.tsx src/lib/supabase/middleware.ts src/app/api/account/export/route.ts src/app/profile/page.tsx src/app/profile/delete/page.tsx src/app/learning/actions.ts scripts/check-setup.mjs tests/interviews.test.mjs tests/interviews-ui.test.mjs tests/account.test.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

- First migration regression: **1/1 pass**. Core combined rerun: **15/15 pass** after correcting synthetic signup age/trusted-grant fixtures and guarding malformed JSON-array state constraints. Intermediate interview/account/database run: **56/56 pass**.
- Mounted UI first run failed on an exact select-label lookup and `about:blank` lacking secure-origin UUID support; explicit select labels and a harness-only synthetic UUID shim fixed those causes. UI rerun **7/7 pass**.
- Final combined narrow run: **87 passed, 0 failed, 0 skipped** (about 11.9 seconds; repeated after final typed-lease/null-revision constraints and operation-specific creation/finish/deletion acknowledgement notices). Actual server actions/helpers use real currentUser/AI-guard/schema logic with mock auth/provider and PGlite RPCs; includes cross-role direct denials, auth error with user, minor/unknown/revoked/profile-error AI separation, malformed input/output, exact minimized context, shared quota/replay/rollback/overlap/expired lease/late finalization, finish/delete/account cascade during inference, uncertain acknowledgements and bounded retry. Export covers all 14 tables, >1,000 rows, exact boundaries, malformed/error later pages and missing migration with no partial download. Existing eligibility and strict free-provider/privacy-client regressions pass.
- Network-blocked mounted Chromium: create/history/reopen/continue/retry/finish/delete; mobile 390×844 navigation and notice/deletion focus, textarea newline and 16px input, no horizontal overflow, inert HTML-like provider text, late-response suppression. **0 network attempts; 0 page errors**. Final-run synthetic screenshot captured in memory (36,058 bytes), not written or independently visually inspected.
- Scoped ESLint and direct `tsc --noEmit --incremental false`: **exit 0**. Existing module-type warning is non-fatal. Direct tsc intentionally avoids Next type generation/environment loading; `npm test`, full lint/build/Next type generation were not run in this bounded packet.
- Local Python documentation assertions passed after reconciling remaining current-scope references: all 9 README migration links resolve to the inspected filenames, current transcript policy is approved at 11:26 HK, and Task25 remains Open. Dated historical evidence was retained.

**Open gates / limitations:** new migration **not applied remotely**; live interviews unverified. PGlite serializes its engine, so local contenders prove protocol/state outcomes, not multi-session Postgres lock scheduling. Independent QA should review owned files, rerun the focused command, then run broader local gates serialized under appropriate environment authorization; review actual route transport and desktop/mobile visuals. Separately authorize a disposable connected database before applying/validating migrations, service grants/RPCs, concurrent transactions, export/cascade/session cleanup and eligible free-provider behavior. Do not run old E2E fixtures or provider probes on an unconfirmed target. No environment files loaded/read, server started, remote/setup/AI/inbox calls, installs, commits or deployment occurred. Prior connected age/resume/provider failures were not rechecked. Task24 is runtime direction only (isolated guest JS and capability-constrained Python WASM candidates), not verified coding. Task25 and broader Group A scope are **not marked done**.

## Team continuation - 9 October 2026 - Task 05 export and deletion failures

Bounded approved local assignment, Task 05 remains **Open**. Completed team sequence: Coordinator-dispatched Forge Implementer export packet, concurrent Forge Architect read-only full findings, Forge Implementer deletion packet, Forge QA independent review and local gates, then this final documentation handover. Coordinator retains plan and dispatch ownership; no Implementer agent dispatch or concurrent mutable-file work occurred. The deletion packet owned only `deleteAccount` in [src/app/profile/actions.ts](src/app/profile/actions.ts), the optional display-name fallback in [src/app/profile/delete/page.tsx](src/app/profile/delete/page.tsx), [tests/account.test.mjs](tests/account.test.mjs) and this tracker. Existing export/auth work, the shared client wrapper, updateProfile/changeEmail and earlier evidence were preserved. This final assignment owns only this tracker and a narrow [README.md](README.md) verification note; it records the Coordinator-supplied QA report, not a new verification run.

| Process / owner | Status | Deliverable / acceptance | Evidence / remaining gate |
| --- | --- | --- | --- |
| Assignment / Forge Implementer | Bounded implementation completed | Exercise the actual GET handler with injected auth/database and real NextResponse/collectRows; complete >1000-row exports, owner filters on all 13 tables including resume, fail-closed authentication, private/no-store and generic non-download errors | Hypothesis confirmed and repaired: failed authentication must prevent privileged database access even with a returned user; failed/malformed later pages must never produce partial downloads. Focused command/results below. |
| Independent review / Forge Architect | Read-only full findings completed concurrently with export packet; report supplied by Coordinator | P1: lenient cookie adapter can hide cleanup failure. P2: unhandled client/auth stages and misclassified errors; missing same-account reauthentication invariant (exploit unproven); optional privileged displayName failure can hide form/notice | No execution or mutations. Findings required strict cookie writes, staged sanitized handling, identical non-null reverified user ID before admin creation, and page-local optional-name fallback. Keep local signout; say cleanup could not be confirmed, not that SDK storage definitely remains. Assigned repairs and independent local QA are completed below. |
| D1 deletion assignment / Forge Implementer | Bounded implementation completed; independent local QA subsequently passed | Validate form before auth; distinguish expired/absent identity from operational failures and invalid credentials; never trust submitted email/ID; one same-account delete; truthful uncertainty/partial-success guidance; optional-name failure must not bypass mandatory auth | Actual action uses strict cookie writes and separate auth/reauth/admin/delete/cleanup handling. Changes limited to the assigned function, optional page fallback, existing account tests and tracker. Subsequent independent review/full suite/build results are recorded below. |
| D2 focused deletion action tests / Forge Implementer | Passed immediately after action/test edit | VM-loaded actual action and actual cookie adapter with mocked SDK: first/later cleanup writes after confirmed delete must produce login error acknowledging deletion, never success or another delete; reauth cookie failures must stop before admin | `node --experimental-strip-types --test tests/account.test.mjs`: 38 passed / 0 failed / 0 skipped, 1370.4084 ms (20 preserved export tests + 18 deletion tests, with failure matrices). Also covers early form validation, client/auth failures, expiry vs operational errors, invalid credentials vs 429/5xx/thrown reauth, missing email/verified ID/mismatch, forged identity fields, missing service config/admin constructor, returned/thrown delete uncertainty with zero signout/retry, returned/thrown cleanup, exact happy-path ordering/local scope. Synthetic process env only; no provider or browser-session verification. |
| D3 optional page fallback tests / Forge Implementer | Passed after test-only assertion repair | Catch displayName rejection only; actual page and SubmitButton server-render with mocked authentication/shell boundaries; form/escaped notice remain, successful name/roles unchanged, mandatory authentication still rejects | `node --experimental-strip-types --test tests/account.test.mjs`: initial 41 tests, 40 passed / 1 failed / 0 skipped, 1601.5871 ms; immediate repaired rerun 41 passed / 0 failed / 0 skipped, 1428.5243 ms (20 export + 18 deletion action + 3 page tests). Initial failure was only React HTML attribute ordering; no extra application change. No live route/browser workflow, full-shell layout or accessibility acceptance claimed. |
| D4 existing adapter regression / Forge Implementer | Focused compatibility checks passed | Preserve unchanged shared wrapper and existing auth work: read-only tolerance, strict chunk propagation, logout/reset cookie-failure integration | `node --experimental-strip-types --test --test-name-pattern="read-only server clients\|strict action clients\|logout cookie\|reset cookie" tests/auth.test.mjs`: 4 selected tests passed / 0 failed / 0 skipped, 1192.4354 ms. Other auth tests, including Chromium, excluded by name filter, not freshly verified. SDK/cookies mocked; no actual users, sessions, mail or remote access. |
| D5 deletion local gates / Forge Implementer | Scoped lint and direct TypeScript passed; handover completed | Existing export/auth changes preserved; no updateProfile/changeEmail/shared-wrapper edits, dependency installs or generated Next files | `node node_modules/eslint/bin/eslint.js src/app/profile/actions.ts src/app/profile/delete/page.tsx tests/account.test.mjs` and `node node_modules/typescript/bin/tsc --noEmit --incremental false`: completed without errors/output. `node -p "JSON.stringify({node: process.version, platform: process.platform, arch: process.arch})"`: v25.2.1 / win32 / x64. Direct tsc uses existing generated types, with no Next typegen/build. Tests are bounded synthetic matrices, not provider latency/timeouts, live revocation/cascades/retention or hosted Node.js 24 evidence. Implementer did not duplicate the full suite/build; subsequent independent QA did run those gates below. |
| Focused implementation and tests / Forge Implementer | Local checks passed | Route checks returned auth errors and page-array/error shape; 401/503 are private/no-store. Successful export format, all 13 table filters/orders, snapshots, certificates, schema and AI policies unchanged | `node --experimental-strip-types --test tests/account.test.mjs`: initial 20 tests, 2 passed / 18 failed (1086.1319 ms); immediate repaired rerun 20 passed / 0 failed (796.6267 ms). Coverage: 1050 rows per multi-row table, single profile, foreign-owner exclusion, empty/exact-page boundaries, 10 later-page failure shapes at offsets 500/1000 for attempts and resume, six auth failure shapes, auth/database configuration failures, exact generic error-only bodies, no error download headers and private/no-store. |
| Export local gates / Forge Implementer | Local gates passed; subsequent independent local QA passed | Scoped ESLint and direct TypeScript checking; no environment-file loading or .next writers in this implementation step | Windows x64 / Node.js v25.2.1. `node node_modules/eslint/bin/eslint.js src/app/api/account/export/route.ts tests/account.test.mjs` and `node node_modules/typescript/bin/tsc --noEmit --incremental false` completed without errors/output. Editor diagnostics clear for all three owned files. Direct tsc uses existing generated types, not Next type generation/build. This implementation step did not run the full suite/build; independent results follow. |
| Q1 independent review / Forge QA | No substantive defect found; bounded local acceptance passed | Audit actual GET/collectRows/NextResponse tests: all 13 owner filters, 1050-row completeness, foreign exclusion, later errors and private/no-store. Audit deletion input/auth/reauth/error ordering, same-account guard before admin, ignored forged targets, uncertainty with no signout/retry, actual cookie adapter first/later errors with strict flag and local signout | Optional-name fallback preserves mandatory auth; authentication itself is mocked. These are offline actual-handler/action/component checks, not live HTTP or provider/database/session proof. Report supplied by Coordinator. |
| Q2 independent local gates / Forge QA | All passed | Windows Node.js v25.2.1 / win32 / x64; focused account tests, full suite, lint, typecheck and build; .next writers serialized | `node --experimental-strip-types --test tests/account.test.mjs`: 41 passed / 0 failed / 0 skipped, 1461.6645 ms (20 export + 18 deletion + 3 page). `npm test`: 131 passed / 0 failed / 0 skipped, 7715.2097 ms, including auth cookie-adapter checks. `npm run lint`, `npm run typecheck`, `npm run build` passed; build includes TypeScript and 20 static pages. Six scoped files had clear diagnostics. Existing module-type and ancestor-lockfile warnings only. |
| Q3 independent synthetic UI review / Forge QA | All 8 scenarios passed and visually inspected | Network-blocked actual components and CSS in Chromium 153.0.8010.12: deletion fallback and cleanup notice at 320x740, 390x844, 1440x900 and 844x390; wrapping, separation, reachability, keyboard, pending and cleanup-alert focus | Zero network attempts and page errors. All 8 screenshots visually inspected; landscape capture includes the scrolled sticky header. OS-temp artifacts retained: `forge-task05-qa-3UGVie`; full-suite auth screenshots: `forge-auth-jmxP1s`. No live workflow or full accessibility acceptance. |
| Q4 QA cleanup and boundaries / Forge QA | Review completed without application/test/document edits | No temporary scripts; browser contexts closed and screenshots retained; no server start or status check | No live Supabase/E2E/provider/schema/grant/session/cascade/snapshot/retention or hosted Node.js 24 proof. Earlier preview port 3133 was not rechecked. Local acceptance is not release acceptance. |
| Final process documentation / Forge Implementer | Completed; documentation only | Reconcile this tracker after the completed processes; append a narrow README verification note; preserve dated history, Task 05 Open and owner/data/policy gates | Coordinator-supplied QA evidence recorded, not rerun by this documentation agent. Validation limited to editor diagnostics for these two documents; no tests/build, remote commands, installs, environment inspection, commits or agent dispatch. |

Authorization boundary: no dependency installs, environment-file reads, remote reads/writes, mail, AI probes, live E2E, commits or deployment. Offline actual-handler tests are not live HTTP/provider/database verification. Independent local QA is complete; remaining connected gates require reconfirmed disposable target/local origin and age/profile/resume-grant readiness, then authorized real export/resume/deletion, provider and cookie/session failure checks, other learners' snapshot retention and backup/log retention review. Historical schema absence has not been freshly probed. Owner policy approval and independent release QA remain separate gates.

Handover: the Coordinator-supplied Architect full findings informed the completed deletion repair; independent Forge QA found no substantive defect and passed bounded LOCAL acceptance, including the full 131-test suite and build. This new October team result is separate from the earlier 90-test auth packet and September 60/70-test history. The deletion implementation changed only the assigned action, optional page fallback, account tests and tracker; QA made no application/test/document edits. This final documentation process edits only this tracker and [README.md](README.md), performs no QA rerun and dispatches no agents. Task 05 stays Open for the connected/data/policy gates above; no website-complete, hosted CI or production claim is made. The prior local preview at `http://127.0.0.1:3133` was not rechecked by QA or this documentation process; no fresh Ready claim. Next available work is packet 6's broader profile/account configuration, failure and accessibility review; connected profile/resume/export stays blocked by target confirmation and readiness. Earlier export tool limitation remains recorded: `git status --short` and `C:\Program Files\Git\cmd\git.exe status --short` failed with CommandNotFoundException, so that packet had no Git baseline/diff verification; no fresh Git evidence is claimed here.

## Continuation - 9 October 2026

Earlier local assignment: 02/20 authentication failure handling, owned and verified locally by the implementation agent for that packet. Its evidence below is preserved separately from the later independent team QA above. The 25 September approved scope remains binding. No remote writes, schema applications, provider probes or deployment were performed in that packet; no new migration-readiness claim or independent Forge QA sign-off was made for it.

| Process | Status | Deliverable / acceptance | Evidence / remaining gate |
| --- | --- | --- | --- |
| 02 reset/logout session behavior | Local action checks passed | Explicit global logout; successful reset followed by logout; truthful partial-success guidance; mocked returned/thrown provider and configuration failures | `node --experimental-strip-types --test tests/auth.test.mjs`: 10 passed. No live session invalidation or mail delivery established. |
| 02 cookie-cleanup failure handling | Local checks passed | Reset/logout require cookie-write errors to propagate; read-only Server Components retain existing tolerance; failed/partial cleanup cannot report logout success | `node --experimental-strip-types --test tests/auth.test.mjs`: 14 passed, including failed first/later cookie writes and actual adapter-to-action integration with mocked SDK. Real browser cookies/provider invalidation remain external gates. |
| 02/20 notice accessibility | Local interaction checks passed | Redirect errors now focus their alert; invalid fields keep precedence; error/success query conflicts do not show a success icon; recovery retains email and supports pending/failure/retry | Initial focused auth suite: 19 passed, including four offline mounted Chromium subtests; final suite below adds responsive coverage. No network requests; real mail delivery and assistive-technology audit not established. |
| 02/20 responsive checks | Local checks passed | Real stylesheet/brand/icon layout checks at 1440x900, 390x844, 320x740 and 844x390; synthetic screenshots | Final focused auth suite: 20 passed; no horizontal overflow, notice clipping or form overlap, and login control reachable. Desktop and narrow-mobile screenshots visually inspected. Final screenshots in OS temp `forge-auth-VZ1G1d`; earlier inspected set `forge-auth-FSxvuG`. |
| 02/20 regression and lint repair | Local gates passed | Full offline regression; immutable query normalization required by React effect dependency; final focused rerun and production compile | Windows, Node.js 25.2.1: `npm test` 90 passed; `npm run typecheck` passed; lint initially found prop reassignment, repaired to local constants, then `npm run lint` passed; final focused auth rerun 20 passed; `npm run build` passed including TypeScript. Full 90 not rerun after the small lint repair. Hosted Node.js 24 CI and live E2E not run. |
| Local preview and handover | Reported Ready in earlier auth packet; not rechecked | Local dev server at `http://127.0.0.1:3133` with matching process-only `NEXT_PUBLIC_SITE_URL`; no environment file changes | Next.js reported Ready then; final edited-file diagnostics were clear. No live login, database-writing browser fixtures, migration application or AI calls were run. Later QA and documentation performed no server status check. |

Reproduce the focused checks with `node --experimental-strip-types --test tests/auth.test.mjs`. These use synthetic data, mocked auth/cookie adapters, and network-blocked Chromium; screenshots are created in the OS temporary directory, not the repository. Non-blocking diagnostics: existing Node module-type warnings and Next.js ignoring an ancestor lockfile outside this repository. No dependency, migration, eligibility or AI-privacy change was made.

Packet 6's subsequent bounded export/deletion implementation and independent local QA are recorded above. Next available local work is broader profile/account configuration, failure and accessibility review. Connected profile/resume/export checks remain gated by reconfirmed disposable target/local origin and age/grant readiness; the September schema absence has not been freshly probed in this continuation. Keep tasks 02/20 Open until their remaining external and full-workflow checks pass.

The dated September evidence below is historical; references to "this turn" in those sections refer to the recorded September work, not this continuation.

## Prior approved scope - 25 September 2026 (historical record)

Retained decision/evidence below: its scope-governing and sequencing statements describe the September baseline. The 15 October decision above supersedes conflicting SDLC-only and selected-feature deferrals; non-conflicting policy and unfinished acceptance remain binding.

This decision governs the current scope, overview and task details below; conflicting decisions in the historical evidence log are superseded. Deadline: 31 October 2026. The owner approved AI-native implementation and disposable-development checks and will perform final review/submission. No production changes or deployment are authorized. Coordinator owns the plan and assigned bounded work to Forge Architect, Forge Implementer and Forge QA in the September continuation; those completed dispatches and evidence are recorded below. The October documentation handover above edits only this tracker and a narrow README verification note and does not change project authority.

| Work | Owner | Current deliverable / acceptance | Evidence / remaining dependency |
| --- | --- | --- | --- |
| Instructor role and account maintenance | Forge Implementer + Forge QA | Admin grants/revokes instructor role; own-lesson publication/editing/reporting; private drafts stay isolated | Recorded implementation and 18-stage instructor regression, including forged direct actions and next-request revocation; not rerun here |
| Learner import | Forge Implementer + Forge QA | Email-filtered selection of existing verified learner accounts, up to 50/action; repeated import preserves progress | Recorded implementation and live tests; no roster files, account creation, invitation mail, cohorts or notifications |
| Standalone SDLC lessons | Coordinator+Owner | Private unless published by owning instructor or admin; learner self-enrollment remains | Standalone scope decision complete; multi-lesson containers not required; owner's curriculum review remains |
| Material-to-editable-draft import | Forge Implementer + Forge QA | PDF/PPTX/PPT to editable slides/activity/quiz; original files not retained | Recorded 14 local extraction/guard tests for PDF/PPTX; legacy binary PPT blocked; end-to-end generation awaits provider + age migration |
| Free-only AI generation/coaching | Forge Architect + Forge QA | Verified free-only routing, explicit optional ordered fallback, bounded errors, strict lesson schema; no provider/reasoning overrides per 20 October approval | Historical 12-test/429/404 evidence retained; latest local compatibility evidence/blocker above. No paid model or live success proven; request no longer enforces ZDR/data-collection denial |
| Optional personalization | Forge Implementer + Forge QA | Optional preferences, explainable local SDLC recommendations and explicit AI paths using background/goals/progress; no forced enrollment | Recorded 16 local tests and page/layout checks; AI action gated, generated paths session-only, live AI blocked |
| Age and AI eligibility | Forge Architect + Coordinator+Owner | Supervised HK demo, ages 13+; minors/unknown ages denied external AI pending approved consent policy; recorded adults also need admin grant | Recorded 8 isolated tests; numeric-age migration pending. Self-reported age and grants do not establish legal consent; no minor AI enablement approved |
| Setup and data protection | Forge Architect + Forge QA | Migrations, application grants, encrypted hosting transport/storage review, safe diagnostics | Fresh Forge QA read-only setup: profiles.age absent (42703); other checked profile columns and all 7 forge tables, including resume, available. All checked SQL/management environment-presence flags false; service-role grants unverified. Encryption-at-rest, backup/log retention and restricted deployment unverified |
| Submission and deployment | Coordinator+Owner | Required report/video/manuals/slides/contribution and stakeholder evidence | Owner retains submission responsibility; artifacts incomplete; staging/production approval still required |

Current next assignments follow the ordered remaining-work plan below: Coordinator+Owner and Forge Architect resolve schema/age/grant readiness, then Forge QA runs the full authorized profile/resume/export scope with the locally ready harness. Forge Architect AI/PPT feasibility and Forge Implementer local account failure/accessibility work can proceed in parallel without waiting for every migration. No website-complete claim is permitted while these and the failure/accessibility/delivery gates remain open.

Recorded evidence from 25 September (previous work, not newly verified here): 60 local tests, lint, typecheck and production build passed. The instructor browser suite passed 18 stages plus widths 1440/390/320 and mobile menu focus/inert checks; all four temporary accounts were deleted. These are development results, not production certification or a fresh full profile/resume/export pass. Setup diagnostics failed on missing profile age; live provider probes failed as described above. No original testing data was intentionally removed in that recorded work.

Fresh evidence this turn: Forge QA ran read-only `npm run check:setup` and the baseline `npm test` (60 passed); last-known `profiles.age` absence was revalidated with code 42703, while other checked profile columns and all 7 forge tables including `forge_resume` were available. All checked SQL/management environment-presence flags were false. No AI calls/probes, remote writes, schema applies or new browser/Supabase fixtures occurred this turn.

Forge Implementer completed the numeric-age harness repair and immediate serialized LessonPlayer saves, with mounted real-Chromium component coverage in [tests/resume.test.mjs](tests/resume.test.mjs). Implementer reported `npm test`: 70 passed, `npm run typecheck` and scoped lint passed on local Node.js 25.2.1. Independent Forge QA found a stale transient-error alert on idle reversion and missing CI Chromium installation; both were repaired. Final independent focused QA passed 12 tests, confirmed alert count 0 for the regression and preserved conflict/in-flight behavior; YAML ordering checks passed. Independent QA did not rerun all 70 tests. Hosted Node.js 24 CI and the current full live E2E suite were not run; no fresh production build is claimed.

Evidence boundary: this final documentation assignment records the supplied completed dispatch/execution evidence, not a new application verification run. The dated historical log remains unchanged. IDs stay stable, and unfinished acceptance gates below remain binding.

## How to maintain this tracker

- Mark a task `[x]` only when its acceptance checks pass; record the evidence in the update log.
- Keep unfinished implementation separate from external verification and policy approval.
- Update the status, last-reviewed date and blockers when work changes.
- For an item requiring a decision, record the approved scope before implementation.
- Never include credentials, verification links, learner records or private provider responses here.

Statuses: **Open** (implementation or tests remain), **Verification** (review/external checks remain), **Blocked** (needs a decision or dependency), **Partial** (explicitly split completed and deferred scope), **Paused** (explicitly stopped), **Deferred** (future scope), **Complete** (agreed scope verified in recorded evidence). **Open/Blocked** identifies unfinished implementation with a blocking dependency; no status certifies production readiness.

## Current agreed scope

- The **22 October approved prototype-first matrix above** governs demo sequencing/deferrals; original requirements remain recorded, not silently completed.
- Authenticated registered users only, including for published lessons; explicit self-enrollment.
- Supervised Hong Kong demonstration, ages 13+, targeting 31 October 2026; no production/deployment approval.
- Learners create private lessons. Administrators grant/revoke instructor roles; instructors publish/edit their own lessons and report only on their own published lessons. Administrators retain global public-lesson control.
- Private drafts stay hidden from administrators until explicitly submitted for review.
- One standalone lesson per mini-course; no multi-lesson containers. Authoring/generation/coach/path support now shares canonical SDLC, AI coding-agent and software-development soft/product families with explicit metadata. Task25 retains its separate bounded topic registry. Owner review of curriculum, resources and content correctness remains mandatory (08).
- Ten four-option quiz questions; pass at 6/10; unlimited retries.
- Attendance means reaching the final quiz, not submitting or passing it.
- Every passing attempt receives its own private/public certificate snapshot.
- Authorized reviewers see published-lesson participation and quiz results, not private attempts or coach chats.
- The generic lesson coach remains session-only with no persisted history; no retained original teaching uploads. Task25 private transcript access/retention was approved at 11:26 HK: owner history, individual deletion, export/account cascade, no automatic administrator/instructor/reviewer/peer access, retained until interview/account deletion. It is locally implemented and tested, not connected-verified. Current learning-record retention is until account deletion; consent withdrawal, retention exceptions, backups and operational-log policy remain unresolved under 04/05/21.
- AI implementation is approved but live success is unverified. Free-only zero-price catalog validation remains mandatory. The 20 October compatibility approval removes shared-client provider/reasoning overrides, including request-enforced ZDR/data-collection denial; account/provider policies still apply without a retention/training guarantee. Minors and unknown ages are denied external AI pending approved consent/eligibility policy; recorded adults additionally need a trusted administrator grant. No minor AI enablement is approved by this decision.
- First-login background/goals onboarding, a separate local diagnostic and explainable three-family recommendations are implemented locally; explicit AI-generated paths remain session-only and never force enrollment. Genuine content tailoring, diagnostic pedagogy and connected acceptance remain open under 03/18/15/16; durable learning paths remain unapproved, distinct from the private project planner (23).
- Instructor email-filtered enrollment of existing verified learners is implemented; roster-file imports, account creation/invitations, cohorts and notifications remain deferred.
- PDF/PPTX extraction passed recorded local checks and is the demo import scope. Legacy binary PPT remains unsupported, an unmet original requirement now demo-deferred; student slide assistant19 is also demo-deferred, not satisfied by instructor draft import.
- Explicit lesson metadata/filtering (08) and reviewed/attended/passed distinctions (09/12) have bounded local acceptance; connected gates remain. Three original curated starters have independent LOCAL acceptance22Oct, owner review pending. Task22 daily reflections now passes bounded independent LOCAL functional/privacy/lifecycle QA under09:54 continuation/connected-test deferral; Coordinator acceptance and owner prompt review pending, not connected-core-stability acceptance. Targeted AI revisions14/16, genuine tailoring18, planner23 and embedded JS/Python24 remain explicitly demo-deferred, not completed. Existing LIVE TEXT interviews25 retain local acceptance but connected/release gates remain.
- No community is required; the unselected extensions and authorization boundaries in the 15 October record apply. The 11:26 private interview transcript policy is the sole new conversation-storage approval. Apart from the explicitly approved 20 October shared-client request omissions, further privacy relaxation, persisted coach history, original upload retention, paid services, third-party analytics/training integration and deployment remain unauthorized. Omitted request restrictions do not certify upstream retention/training protections.

## Interview simulator implementation — 2 November 2026

**Owner:** implementation agent; Coordinator handles handover, independent QA requested. **Approval:** latest explicit user approval supersedes prior voice deferral only for optional English browser dictation; no video/TTS/cloud polyfill/paid service or shared AI-policy/auth changes. **Dependencies:** existing adult18+/trusted admin grant, owner-scoped interview lifecycle, ordered migrations; real browser speech support/permission. **Deliverable:** renamed simulator UI at unchanged `/interviews`, focus/difficulty setup, original-question/situational-followup prompt with exactly one question and no coaching/grading before final answer eight. Final context retains all eight learner answers within 12,000 characters, shortening question excerpts only. Old histories/replies/keys stay valid; early finish makes no inference or invented feedback.

**Dictation:** `react-speech-recognition@4.0.1` and `@types/react-speech-recognition@3.9.6` (React19.1.0/Next16.3.5). Client-only eligible input, explicit opt-in disclosure of possible browser-vendor audio processing before microphone request, en-US, separate editable unsaved preview, Stop/Insert/Discard, no auto-send/raw audio persistence/silent truncation. Typed drafts survive failure/discard; permission/errors/unsupported fall back to typing. Capture aborts on send/finish/delete/reload/navigation/unmount/hidden/unavailable states; native-end ownership quarantine and per-capture callback guards prevent cross-turn transcript reuse. A browser that never emits end needs page reload for further dictation; typing remains usable. A server-denied AI request removes the mic UI without blocking history management.

**New migration PENDING:** `supabase/migrations/20261102_interview_simulator.sql`, additive technical/projects/teamwork choices alongside all legacy keys; historical `_ran.sql` untouched. Review/apply after prior migrations on a separately authorized target before offering new focuses there. No remote application, credentials, actual provider requests, connected scripts, deployment or commits in this packet. Git was clean before edits.

**Writer checks (Windows, 2 November; not independent acceptance):**
- Baseline `node --experimental-strip-types --test tests/interviews.test.mjs`:17/17. Initial changed run exposed the obsolete intermediate-feedback assertion; aligned it to approved deferred feedback. Browser fixture syntax/selectors and old finished-heading assertions were corrected. Actual browser focus failure (preview still disabled when focused) was fixed by post-commit focus.
- Focused `node --experimental-strip-types --test --test-concurrency=1 tests/interview-dictation.test.mjs tests/interviews.test.mjs tests/interviews-ui.test.mjs`:44/44 before revoked-grant coverage; expanded actions/dictation rerun26/26. Full inspected offline suite subsequently **370/370**,0 failed/skipped/cancelled,349.535s, using `node --experimental-strip-types --test --test-concurrency=1 tests/*.test.mjs` after removing child environment variables except PATH/SystemRoot/WINDIR/TEMP/TMP/USERPROFILE/APPDATA/LOCALAPPDATA/ComSpec/PATHEXT. No `.env` loading or connected e2e/setup/provider commands.
- `npm run lint`, direct `node_modules/.bin/tsc --noEmit --incremental false`, `git diff --check`, `npm ls react-speech-recognition @types/react-speech-recognition react next`: passed. `node scripts/check-interview-build.mjs`: isolated env-file-free Next typegen, TypeScript and webpack production build passed,24 static pages; temporary build workspace removed.
- Actual mounted React components/actions/speech library + mocked native API, network-blocked Chromium153.0.8010.12 and offline PGlite: focus/difficulty, original prompt semantics/technical caveats, all-eight-answer budget, permission denial/other errors/unsupported/ineligibility/revocation, interim/final duplicate replacement, overflow/edit/discard/typing preservation, stale callbacks/ownership/lifecycle cleanup, early finish/retry/unknown-save/old history/RLS/export/account cascade covered.
- Dictation review screenshots captured/opened at320 and1440, no horizontal overflow: `%TEMP%\forge-interview-simulator-eiMhnW\dictation-review-{320,1440}.png`; full-suite later captures `%TEMP%\forge-interview-simulator-A1gsb4`; legacy full-shell history/retry screenshots `%TEMP%\forge-task25-qa-QNAGuD`. Synthetic mounted UI, not authenticated deployed routes.

**Open acceptance:** independent QA and owner question-quality/pedagogy review; real microphone/permission prompts, vendor processing/support/accuracy and native device lifecycle; authorized connected migration/grants/auth/history/export/delete/cascade and compatible free AI endpoint. Prompt contract tests cannot guarantee live generated question/feedback quality. No connected/production-complete claim.

## Current overview

**Status as of 22 October 2026:** approved prototype-first demo cut; first three-family starter slice independently accepted LOCAL, owner content review pending. Task22 private daily reflections and curriculum-loader repair now pass independent bounded LOCAL QA; Coordinator acceptance and owner prompt review remain, connected testing is owner-deferred. A substantial prototype has independently accepted **local** workflows, but is **not yet connected-demo/release ready**. Deadline remains **31 October 2026** for the supervised Hong Kong demonstration (ages 13+), not a public launch. Historical public GET evidence below is not authenticated, database, AI or release acceptance.

### Where we are now

- **Latest independent full-suite baseline (22 October):305/305**,0 failed/cancelled/skipped/todo; one fresh existing serial npm test, Node154.626s. Scoped21-path lint, direct TypeScript, isolated env-file-free Next typegen/TypeScript/webpack build, role/keyboard probes and four opened reflection images passed. This is local evidence only;21Oct283/283 and all failures retain their dates.
- **Earlier independent starter slice gate (22 October):71/71** requested six-file starter/manual/learning/curriculum/resume/progress gate plus **4/4** inline learner-projection/import checks; scoped lint, direct TypeScript and whitespace passed;11 fresh images opened. Bounded LOCAL acceptance only, owner review pending. Writer42/42 remains separate evidence; that earlier slice did not run full-suite/build/connected gates. The subsequent Task22 packet supplies today's fresh full-suite/build above; earlier264/224/232/246 checkpoints keep their dates.
- **Task22 writer / repairer history (22 October):80/80** writer focused gate; writer full303/304 failed on the starter curriculum loader, separately repaired with actual module mapping. Repairer combined28/30 then observed a320px manual timeout. Independent smallest21/21 and full305/305 did not reproduce it; cause unresolved, not proven fixed/flaky. Current independent LOCAL verdict and all exact results above supersede pending QA status, not historical failures.
- **Implemented locally:** manual lesson creation/editing and blank-line activity handling; three-family curriculum metadata/filtering and now three authored review-pending starters; onboarding/local diagnostic; owner-scoped account/export/deletion controls; private daily4D reflections; private LIVE TEXT interview history; staged, saved generation shared by Studio/Teaching; and per-owner/lesson/version review vs attendance vs saved-pass evidence. The09/12 packet has independent bounded local acceptance, connected gates open. Generation draft creation/reload makes no inference; explicit resume/retry and private finalization remain. These do not establish working live AI or real server-action/database transport.
- **Main blocker:** no current authorized-target acceptance of migration/schema-cache/service grants, real authenticated workflows, or a compatible free AI endpoint. Historical missing `profiles.age`, resume-grant uncertainty and provider 429/404 results are **last-known observations, not checks made today**. The `_ran` suffix never proves a migration is applied.
- **Still unfinished:** Coordinator acceptance of this bounded LOCAL Task22/loader packet; owner-reviewed demonstration content/resources/4D prompts and diagnostic pedagogy, connected core/report/reflection lifecycle acceptance, one proven live AI showcase, and owner submission/accessibility gates. Prior manual timeout remains an unreproduced observation with no root-cause/fix claim. Tailoring, targeted revisions, binary PPT/student slide assistant, planner and embedded JS/Python remain explicitly22Oct demo-deferred original requirements, not completed work.

### Production read-only checkpoint - 21 October 2026

**Origin and scope:** [https://comp5241-project.vercel.app/](https://comp5241-project.vercel.app/); **21 October 2026, UTC+08:00 11:46-11:48**. Python 3.13.7 `urllib` HTTPS GET only; no browser. Ten distinct routes checked: `/login`, `/signup` and `/forgot-password` returned **200 HTML**; `/` and all six protected routes (`/dashboard`, `/catalog`, `/studio`, `/teaching`, `/admin/accounts`, `/interviews`) returned **307**, followed by actual login HTML **200** at `/login?message=Please+log+in+to+view+your+private+learning+space.`. No 4xx/5xx or transport error occurred in these checks; no product defect was established in this scope.

**Limits:** Protected redirects do not prove underlying features exist or work. No rendered-page, mobile, keyboard or JavaScript verification and no screenshots; no login, mail, database, grants, provider or local-to-deployment version-equivalence checks. No forms submitted, production writes or AI calls. Authenticated, database and visual acceptance remain unverified.

### Task-by-task status

Priorities below retain historical tracker labels; **22 October demo ordering/deferrals above control execution**. **Complete** means the recorded bounded feature scope, not production certification.

| ID | Priority | Status | Implemented / recorded scope and next gate |
| --- | --- | --- | --- |
| 01 | P0 | Open | Guarded unavailable/configuration states exist; real session expiry, partial configuration and target-origin checks remain. |
| 02 | P0 | Open | Reset/global logout, cookie-failure handling and offline recovery checks pass locally; real sessions, controlled inbox delivery and PKCE remain. |
| 03 | P1 | Open/Partial | Onboarding, profile editing, failed-load guards and shared revisions accepted locally; migrations/legacy-row review and connected auth/persistence remain. |
| 04 | P0 before minors | Blocked | 13+ supervised-HK policy and local age/adult-grant gates exist; connected age enforcement, institutional/legal consent and retention approval remain. Minors/unknown ages stay AI-denied. |
| 05 | P0 | Open | Export/deletion and updated generation/interview export/cascade paths covered locally; real HTTP pagination/failure handling, session cleanup, cascade isolation and backup/log retention remain. |
| 06 | P1 | Open | Player entry/Continue implemented; durable restore needs verified 09 schema/grants and connected persistence. |
| 07 | P1 | Complete | Recorded search shortcut, combined filters and keyboard scope passed; retain in connected regression. |
| 08 | P0 | Open/Partial | Canonical three-family metadata/filtering accepted locally;22Oct three review-ready authored starters independently accepted LOCAL, owner content and source review pending; connected boundaries remain. |
| 09 | P0 | Open | Serialized resume and21Oct evidence retain bounded independent LOCAL acceptance (283/283, dated).22Oct current-version public-roster reports now integrated with canonical evidence; writer37/37, independent reports QA open. Connected migration/grants/durability/conflicts/export/unload remain Open. |
| 10 | P1 | Complete | Recorded owner-scoped bookmark/saved-lessons scope passed; retain in connected regression. |
| 11 | P1 | Open | Unfinished-answer state implemented; connected reload/retry/version-change acceptance depends on 09. |
| 12 | P1 | Partial | 21Oct player/history/dashboard independent LOCAL baseline retained.22Oct report current-public-roster/current-version counts separated from version-labelled all-version public snapshots, including removed enrollees; writer37/37, independent reports QA/connected/release gates open. Private records excluded; awards/credential extensions still deferred. |
| 13 | P2 | Verification | File/removal/text retention, uncertain email handling and cancellation focus accepted locally; controlled inbox and real session confirmation remain. |
| 14 | P1 | Partial | Manual same-ID editing, uncertain-save reconciliation and activity validation accepted locally;22Oct starters exercise manual actions. Targeted AI revision preview/accept/reject/versioning is demo-deferred, unmet; connected core QA remains. |
| 15 | P1 | Blocked | Three-family session-only coach implemented; working eligible free provider, meaningful tailoring and live quality/context isolation remain. Generic coach is not Task25. |
| 16 | P1 | Open/Blocked | Saved staged generation accepted locally20Oct; preferred single AI showcase, not live-proven. Migration/grants/cache, transport, provider/content/hosting checks remain. Tailoring/targeted revisions are demo-deferred, unmet. |
| 17 | P1 | Partial | Email-filtered enrollment of existing verified learners passed recorded scope; roster files, cohorts, invitations and notifications remain deferred. |
| 18 | P1 | Open/Partial | Onboarding, diagnostic/adopt/override/retake and recommendations accepted locally; owner rubric/connected review remain. Genuine content tailoring is demo-deferred, unmet; existing paths remain accessible. |
| 19 | P1 required import | Partial | PDF/PPTX only for demo; local extraction/staged-import guards exist, connected acceptance remains. Binary PPT unsupported and student slide assistant explicitly demo-deferred, original requirements unmet. |
| 20 | P1 | Open | Focus/keyboard, retained-input and narrow/desktop flows have bounded local evidence, including latest generation recovery checks; full workflow and screenreader audit remain. |
| 21 | P0 | Verification | Latest independent local full suite22Oct305/305, scoped lint/direct TypeScript/whitespace, isolated env-free typegen/build, owner-role/keyboard probes and four opened reflection images passed. Earlier71/71+4/4 starter and21Oct283/283 evidence retain dates. Connected QA, owner artifacts and release gates remain; submission materials parallel priority5. |
| 22 | Bounded demo4 continuation | Partial / independent LOCAL QA PASS |22Oct4D starter plus09:54 private daily CRUD/history, owner export/cascade and recovery pass bounded functional/privacy/lifecycle QA305/305 plus focused probes/build. Coordinator acceptance, owner pedagogy/prompts and authorized schema/connected gates pending. Not connected-core-stability or whole Task22 acceptance. |
| 23 | Demo-deferred | Deferred | Private project planner/milestones/tasks/progress deferred22Oct for demo, unmet original requirement; no implementation authorized in this slice. |
| 24 | Demo-deferred | Deferred | New embedded JS/Python runner deferred22Oct for demo, unmet original requirement; no runner implemented. Links are not acceptance; isolation/resource feasibility still unresolved. |
| 25 | Unranked | Open | 2Nov approved simulator/focus/original-question/deferred-final-feedback and optional browser dictation implemented; writer370/370 full offline suite, lint/types/isolated build pass; independent QA pending. New topic migration pending; real mic/vendor, authenticated routes/RPC grants/concurrency/provider quality and connected export/deletion/cascade remain. No video/TTS. |

### What we should do first

**Immediate next action:** Coordinator acceptance/reconciliation of the independently passed LOCAL Task22/actual-module loader packet, alongside owner review of the three starters and4D prompts. Keep the unreproduced prior manual timeout visible, without asserting a fix. Owner deferred login/connected tests so they do not block assigned local feature work; no login request now and no claim of connected-core stability. Use the22Oct priority matrix above, not the superseded broad feature build-out. Current work is **local/offline synthetic-only**. Target availability remains an owner/Coordinator gate: no disposable nonproduction target is confirmed; do not request credentials in chat or substitute production. A future connected packet needs explicit target/origin, permitted operations, synthetic-only accounts/data and cleanup approval before writes. No migration/provider/production operation is authorized here.

| Order / work | Owner | Dependencies and deliverable | Acceptance / verification needed |
| --- | --- | --- | --- |
| **1 — reconcile core and target readiness** | Coordinator + Owner; independent QA; Implementer for assigned repairs | Prioritize the existing manual/publish/enroll/slides/resume/quiz/result/certificate flow. Connected checks require separately confirmed disposable synthetic-only target/origin. Latest source migration is `20261022_daily_reflections_ran.sql`, after `20261021_progress_evidence_ran.sql`, saved-generation and earlier dependencies; application status is unverified by this work and file names are not execution evidence. | Real transport/persistence, correct grants/cache, owner/role checks, five-fail/six-pass, retries and per-pass certificate evidence, cleanup. No migration or connected operation now. |
| **2 — review and accept starters** | Owner content review; independent QA | Delivered six-file local packet above, no AI dependency. Review sources, original text, outcomes, order and quiz keys; edit/save privately before publication. | Independent regression evidence plus explicit owner content/pedagogical approval; do not label starters reviewed merely because schema passes. |
| **3 — timebox one AI showcase** | Coordinator/Owner choose; QA after separate authorization | Prefer saved generation; interviews alternate if more reliable. Recorded adult/trusted grant, free-only and synthetic inputs; current20Oct policy unchanged. | Valid saved output/recovery over actual transport in hosting budget; no live success currently proven, no paid/policy fallback. |
| **4 — private daily4D continuation** | Implementer delivered; independent LOCAL QA passed; Coordinator/Owner |09:54 continuation proceeds on accepted local core/starter evidence with connected tests owner-deferred. Daily CRUD/history and lifecycle/export/private controls implemented locally; no AI/tailoring dependency. | Independent305/305 plus focused role/keyboard probes, lint/directtsc and isolated typegen/build pass. Prior timeout unreproduced, no fix claim. Coordinator acceptance, owner pedagogy and future authorized schema/connected gates remain; not connected-core-stability. |
| **5 — parallel submission/demo evidence** | Owner final; Coordinator reconciles; QA reports limits | Prepare report/video/manuals/slides/demo script and contribution evidence; retain current controls, note unmet demo deferrals honestly. | Owner-approved submission and separately authorized demo/release gates. No production/deployment certification. |

**AI policy boundary:** the latest20Oct approval omits shared-client provider/reasoning overrides; it does not guarantee upstream retention/training protections. Free-only validation, adult/admin-grant eligibility, owner privacy, session-only generic coaching and no retained original uploads remain.22Oct explicitly approves the documented demo scope reduction only, not remote writes, provider calls, further privacy relaxation or deployment.

### 15 October pending work packages and ownership

**Historical assignment record:**22Oct demo deferrals/conditional priorities above supersede conflicting next-action sequencing here; these original capabilities are not completed.

These are remaining work assignments, not a claim that the locally accepted 03/08/13/14/18/20 slices or Task25 repair are still unwritten. Forge Implementer delivered 03/18/profile and browser-harness integration; the disjoint curriculum writer delivered 08/14 curriculum/manual repairs; Forge QA completed independent local verification and the final docs-only evidence update. Coordinator+Owner owns future sequencing and pedagogy/content acceptance, including 08 resources. Forge Architect reviews AI/privacy/feasibility dependencies for 14/15/16/18/19 and 24/25. Existing file-ownership and remote-authorization boundaries remain; detailed acceptance for extended IDs is below.

| New ID / work | Owner | Dependencies / unresolved details | Pending acceptance |
| --- | --- | --- | --- |
| 22 — 4D activities and daily reflections | Coordinator+Owner content; Forge Implementer; Forge QA | 08 curriculum, 18 tailoring, 09/12 progress; 05 export/deletion for any new private records | Learners apply Delegation, Description, Discernment and Diligence in activities and reflections, not just see labels; daily reflection workflow is usable and private, with no community sharing or conversation storage; reflections alone never award a quiz pass/certificate |
| 23 — Private project planner | Forge Implementer; Forge QA; Coordinator+Owner reviews | 03/18 goals and tailoring; 04/15/16 for AI suggestions; 05 for new owner-scoped records | Goals produce suggested stack/structure; owner can edit milestones/tasks and track progress; cross-account access denied, no public showcase/sharing or forced enrollment; suggestion failures remain truthful and user edits preserved |
| 24 — Embedded coding | Forge Architect + Coordinator+Owner design; Forge Implementer; Forge QA | JavaScript and Python initially approved on 15 October at 11:20 HK; TypeScript/other languages not required. Runtime/execution isolation and resource-control design/feasibility pending; 08/22 activities and 20 accessibility; no new execution service authorized | Actual beginner-friendly embedded coding workflow in both initial languages, not outbound links; independently validate untrusted-code isolation, bounded execution/resources, failure feedback and cross-user/data protection in the chosen design; unmet feasibility stays open, not silently reduced |
| 25 — Real-time interviews | Forge Implementer local repair delivered; Forge QA bounded local acceptance passed; Coordinator+Owner connected acceptance | Policy approved 15 October 11:26 HK. History-page/cursor repair independently passed local gates; 04/15/16 eligibility/provider, 20 broader accessibility and 05 connected export/deletion remain | Separately authorize actual routing, database migration/grants/RPCs, multi-session concurrency, retained owner history after AI revocation, deletion/export/cascade and eligible free-provider feedback. Keep Open; no hiring decision/course score/certificate; coach remains session-only |

**25 access/retention — APPROVED 15 October 11:26 HK:** private learner-owner history, own-interview deletion, transcript export/account FK cascade, retention until interview/account deletion and no automatic administrator/instructor/reviewer/peer access. The earlier 11:20 proposed/pending policy is superseded, not an unresolved approval gate. New local Task25 evidence covers these paths synthetically; historical Task05 evidence alone did not. No original upload retention, paid service, further privacy relaxation beyond the 20 October shared-client omissions, third-party analytics/training integration or deployment is authorized.

## Retained September delegated work log

These four September continuation packets were executed by Forge Architect, Forge Implementer and Forge QA, not merely proposed. They are preserved separately from the October team process above. Coordinator retains plan ownership; local acceptance is distinct from live or release acceptance.

| Completed dispatch | Owner | Deliverable / execution | Acceptance / verification | Remaining dependency |
| --- | --- | --- | --- | --- |
| Documentation and baseline QA | Forge Implementer; Forge Architect; Forge QA | Implementer reconciled tracker; Architect source review identified missing profile age fixture input and 600ms debounce cancellation; QA ran fresh read-only setup and baseline tests | QA baseline `npm test`: 60 passed; setup reports age 42703, other checked profile columns and all 7 forge tables available; checked SQL/management presence flags all false | Coordinator+Owner migration access and Forge Architect readiness review; no schema application or grant proof |
| Numeric-age browser harness | Forge Implementer; Forge QA | [tests/e2e.mjs](tests/e2e.mjs) fills numeric age 22 at early invalid-name validation and profile save, adds persistence assertions and sanitized full-suite schema preflight | Local syntax, mocked preflight and offline DOM checks passed; harness locally ready without weakening age/AI gates | Forge QA full authorized live run after schema/grant readiness and disposable target/local origin confirmation; no actual mail or live age persistence proved |
| Immediate save scheduling and QA repair | Forge Implementer; Forge QA | Removed lost 600ms window with immediate serialized saves preserving latest in-flight state, reversions, retry and conflict; added mounted Chromium tests; repaired QA-reported stale transient-error alert on idle reversion | Implementer full `npm test`: 70 passed, typecheck/scoped lint passed; final independent focused QA: 12 passed, alert count 0, conflict/in-flight behavior preserved | Local scheduling accepted; live persistence/export/restore checks remain; native browser-close completion not guaranteed; QA did not rerun full 70 |
| CI browser prerequisite | Forge Implementer; Forge QA | Repaired QA-reported missing Chromium prerequisite: `npm ci` -> `npx playwright install --with-deps chromium` -> `npm test`; README documents local browser prerequisite | Independent YAML ordering checks passed; CI configuration ready | Hosted Node.js 24 execution not run; local evidence uses Node.js 25.2.1; no fresh production build or deployment claim |

## Retained existing-work plan (September/October)

This ordered plan preserves unfinished baseline work and its evidence, not the sole governing scope. Read it alongside the 15 October extensions and packets 22–25 above. Its SDLC-only output/content criteria describe the prior implementation baseline; expanded curriculum acceptance now also requires 08/15/16/18. Existing readiness and authorization gates still apply, without requiring blanket reapproval of the newly approved scope.

The completed dispatches above inform these next assignments; Coordinator+Owner retains sequencing and file-ownership authority. Forge Architect and Forge QA independently review without application mutations; findings return to Forge Implementer for an assigned fix. Next: readiness by Coordinator+Owner + Forge Architect, then full authorized profile/resume/export verification by Forge QA. Parallel Forge Architect AI/PPT feasibility and Forge Implementer local account failure/accessibility scopes need not wait for all migrations. Remote writes require target reconfirmation; AI probes consume quota and need separate authorization. Staging/production deployment remains unapproved.

| Order / task IDs | Owner | Dependency | Deliverable | Acceptance | Verification |
| --- | --- | --- | --- | --- | --- |
| 1 - 03/04/09/21 | Coordinator+Owner; Forge Architect; Forge QA verifies | Confirmed disposable target and owner-operated SQL/management access; fresh checks found all checked presence flags false | Owner supplies secure migration configuration or applies outstanding SQL in the SQL editor; Architect reviews README order, especially 20260928, 20260929 and 20260930 | Resume presence distinguished from grant readiness; missing age addressed; legacy ages never fabricated; review existing rows before constraint validation | Forge QA records sanitized setup empty reads plus explicit grants/invalid-write checks after owner-authorized application; setup alone is insufficient |
| 2 - 02/03/04/09/21 | Forge Implementer; Forge QA verifies | Local harness work completed; packet 1 and confirmed disposable target/local origin required only for external acceptance/browser writes | Numeric age 22 at both profile fixture points, persistence assertions and sanitized full-suite schema preflight complete; preserve unique fixtures and finally cleanup | Local syntax, mocked preflight and offline DOM checks passed; full current-form/age/adult-grant acceptance remains external; signup streaming fallback separate | Forge QA verifies full authorized live compatibility and cleanup after readiness; authoring-only scope is not a full pass; no live age persistence/mail claim |
| 3A - 09 local scheduler | Forge Implementer; independent Forge QA | Completed local implementation and QA-repair cycle; no remote dependency for local acceptance | Immediate serialized saves and mounted Chromium regression tests; lost 600ms cancellation window and stale idle-reversion alert fixed | Local scheduling accepted: latest in-flight state, reversions, retry and conflict preserved; native browser-close completion not guaranteed | Implementer full 70 passed plus typecheck/scoped lint; independent focused 12 passed and alert count 0; not live database evidence |
| 3B - 03/09 then 06/11/05 live gates | Forge QA; Forge Implementer for assigned fixes | Packet 1 readiness and packet 2 local harness complete; no schema/grant failures; confirmed disposable target/local origin | Full authorized profile age/save, cross-device resume, conflicts/retries/version changes, Continue/quiz restore, export/deletion verification; remaining unload behavior review | Owner isolation and no answer-key leaks; failed saves truthful; resume included in real export and deletion; large/later-page failures covered | Blocked live acceptance: Forge QA runs full authorized browser scope and records commands, scope and fixture cleanup; local scheduler tests do not satisfy these gates |
| 4A - 04/15/16/18 | Forge Architect | Can run read-only alongside packets 1-3 after assignment; latest 20 October request contract and historical evidence | Free-only text/structured endpoint feasibility under approved omitted overrides; HK/age/consent/data-processing review, including effective account/provider policy | No paid fallback, further privacy relaxation or inferred live success from 429/404; identify provider/eligibility blockers without claiming request-enforced ZDR | Independent read-only contract review; mocked tests first in an assigned implementation packet; separately authorized synthetic/live checks only after age/grants and policy gates |
| 4B - 19/16 | Forge Architect | Can run read-only in parallel with 4A and packets 1-3 after assignment | Legacy binary PPT conversion feasibility: Vercel runtime/budget, resource limits, licensing, privacy and draft schema | Required PPT stays open unless a safe route is demonstrated; PDF/PPTX extraction not equated with full generation | Independent read-only dependency/runtime assessment; no installs/uploads/probes here; fixture extraction and deployed-runtime checks after assignment/approval |
| 5 - 15/16/18/19 | Forge Implementer; Forge QA | Packets 1-2 and 4A/4B recommendations; approved implementation ownership | Resolve feasible AI/PPT blockers and complete optional session-only paths and editable import drafts | SDLC-only output, adult grant and minor denial, context isolation, safe failures/limits, no retained originals, all three required formats | Focused mocked regression first; independent Forge QA performs authorized generation/coaching/path/import checks with synthetic data and records quality/runtime limits |
| 6 - 01/02/03/05/13/20 | Forge Implementer; Forge QA | Local harness ready; assign local account failure/accessibility work in parallel with Architect AI/PPT feasibility and live-readiness work, without waiting for all migrations; controlled inbox/SMTP for mail gates | Account expiry/failure recovery, PKCE/email-change verification, keyboard/screen-reader/responsive audit | All remaining task checkboxes addressed; no private-data leaks, false success, unreachable controls or cleanup failures | Inject failures locally first; independent QA records desktop/mobile/landscape and assistive checks; authorized inbox/browser tests for external gates |
| 7 - 04/08/21 | Coordinator+Owner; Forge Architect; Forge QA | Earlier evidence; legal/institutional review, reviewed SDLC curriculum and separate environment/deployment approval | Consent/withdrawal/retention decision, reviewed content, report/video/manuals/slides/contribution/stakeholder artifacts and release handover | Owner owns academic submission; conditional consent requirements not invented; hosted CI, clean install/upgrade, restricted demo and operational gates pass before release | Independent QA reviews evidence and reruns applicable tests/typecheck/lint/build; record hosted CI and authorized staging smoke results separately; owner accepts by 31 October 2026 |

Owner decisions still required: institutional/legal and provider consent/withdrawal/retention requirements (including whether parental verification/versioned consent records are required), safe environment/access for outstanding migrations, curriculum approval, and acceptance of any infeasible required PPT/AI delivery. No scope reduction is assumed. Streaming/cancel/regenerate/durable-job requirements under 15/16 also need confirmation; durable paths, cohorts and roster-file extensions are not silently added.

Owner action for remote SQL: provide migration configuration through a secure channel/environment, never credentials in chat, or apply outstanding migrations directly in the Supabase SQL editor after confirming the disposable target. Access is still awaited; source changes and table availability do not establish applied migrations or grants.

## Current task details

### 01 - Configuration and protected access

Implemented: protected routes fail closed; misconfiguration returns a retryable HTML 503 for protected pages and JSON 503 for APIs. Required public settings and site-origin format are validated before server-client creation and email callbacks. Unit tests cover malformed configuration and encoded redirect attempts; focused browser checks reject anonymous page/API access and a synthetic stale cookie.

- [x] Replace the plain configuration-error response with a usable unavailable screen; retain appropriate API errors.
- [ ] Validate required configuration and the canonical deployment origin without exposing secrets (format and presence validated; deployment origin still needs a staging check).
- [ ] Complete missing/partial configuration checks across page and API routes, real expired-session checks and remaining redirect encodings; anonymous access and synthetic stale-cookie checks already pass.

Acceptance: configuration failures are explicit and recoverable; no protected operation runs without valid configuration and authentication; redirects cannot escape the application origin.

### 02 - Authentication experience and failure handling

Implemented: signup/login/recovery forms retain nonsecret values and focus validation errors; provider failures show generic notices, and resend retains retry context. Token-hash confirmation/recovery, single-use links, invalid-code rejection, safe callbacks and protective redirect headers passed the earlier authenticated browser suite. The signup loading-fallback investigation is paused after two sessions; the focused suite does not establish reliable automated signup-form coverage.

9 October local continuation: reset now requests global sign-out after the provider confirms the password update; ordinary logout retains its global scope explicitly. Reset/logout propagate cookie-write failures instead of silently reporting success; read-only Server Components retain their prior cookie tolerance. A saved password followed by failed logout has distinct recovery guidance, and uncertain updates do not claim the password was unchanged. Fourteen offline action/adapter tests pass; actual provider revocation and browser-cookie behavior remain unverified. Global sign-out requests refresh-session revocation, not immediate invalidation of already issued access tokens.

Current harness evidence: numeric age 22 is supplied before early invalid-name validation and profile save, with persistence assertions and sanitized full-suite schema preflight. Syntax, mocked preflight and offline DOM checks passed locally; the current full live suite, actual mail delivery and successful PKCE remain unverified.

- [x] Preserve nonsecret form inputs after validation/provider errors and show field-level feedback (signup/login and recovery email; reset contains only a password, which is cleared).
- [x] Preserve resend context and keep retry available after resend success or failure.
- [x] Consistently handle thrown auth-provider failures without leaking internal details.
- [x] Define reset/global-logout behavior and verify returned/thrown provider, configuration and cookie-cleanup failures locally (9 October: 14 focused offline tests).
- [ ] Verify reset/logout against real recovery and concurrent sessions, including browser-cookie cleanup, expired sessions and access-token expiry; local mocks do not establish provider revocation.
- [ ] Test tampered query parameters and recovery under slow/offline requests.
- [x] Verify local redirect-error focus, ambiguous/non-string query notices, pending recovery, email retention and keyboard retry in offline Chromium (9 October focused auth suite: 19 passed). Real transport interruption and the wider query/auth matrix remain open above.
- [ ] Verify signup, resend and recovery email delivery using a controlled inbox.
- [ ] Verify successful PKCE code exchange; invalid-code rejection is already tested.
- [ ] Review Supabase rate limits and abuse controls for deployment.
- [ ] Paused after two sessions: investigate intermittent signup loading fallback in headless browsers when work resumes; page HTML can contain the form while its streamed reveal remains pending.

Blocker: actual mail delivery requires SMTP configuration and a controlled inbox. Generated token links do not establish mail delivery or PKCE success.

### 03 - Profile editing

Current local implementation: field feedback, client/server limits, retained nonsecret/File/removal state, truthful failed/missing-load screens, user-plus-auth-error mutation denial and shared profile/setup revision checks. Numeric-age signup/profile rules and adult AI-access controls remain. The last connected `profiles.age` absence (42703) is historical, not a new probe; age and onboarding/diagnostic migrations, legacy-row review and connected behavior remain unverified.

15 October extension (Open/Partial): first-login background/goals onboarding and later editing are implemented locally, separate from the chosen level and diagnostic summary. Owners follow the current coordination entry; 04 safeguards, owner pedagogy and connected acceptance remain dependencies.

- [x] Implement role-appropriate first-login background/goals onboarding, later editing and truthful local failure recovery; current trusted role drives questions and self-report grants no instructor/AI rights. Actual action/mounted-component role/forgery checks pass in the implementer packet.
- [ ] Independently accept both role flows, current-role changes, concurrency and connected persistence after schema readiness; do not treat local checks as owner/connected acceptance.

- [x] Add field-level feedback and matching client-side limits.
- [x] Preserve nonsecret edits and the actual selected File/removal state when saving fails; explicit retry/cancel payloads are locally covered.
- [x] Repair local harness age input at early invalid-name validation and profile save (numeric 22), persistence assertions and sanitized full-suite schema preflight; syntax/mocked/offline DOM checks passed, not live age persistence.
- [ ] Align profile database constraints with accepted values and limits where needed (migration and isolated invalid-write tests pass; connected deployment and legacy-row review pending).
- [x] Add focused real-action/page/mounted regressions for auth/config/database failures, failed-load defaults, success-notice precedence, uncertain email acknowledgements and stale profile revisions.
- [ ] Verify real session expiry and connected failure recovery without false success notices.
- [ ] Verify the implemented age-change rules under 04 after age migration: valid numeric age, underage/unknown rejection as applicable, minor AI denial, and trusted adult grant enforcement on direct actions.

Acceptance: invalid/failed saves never appear successful or discard unrelated edits; displayed identity matches persisted values.

### 05 - Data export and account deletion

Implemented: owner-scoped checked-pagination exports, a pending/failure/retry download control, password-confirmed deletion and distinct deletion/sign-out failure guidance. Partial-page failures are covered at the pagination-helper level, and the browser suite passed a simulated download failure followed by a real retry before the resume migration was added.

9 October team continuation: the actual GET handler rejects returned auth errors before privileged database creation, rejects malformed page data and protects every error response with private/no-store and no download headers. The Coordinator-dispatched Architect supplied independent read-only full findings: hidden cookie cleanup failures, unhandled/misclassified auth stages, a missing same-account reauthentication invariant (exploit unproven), and optional display-name failure hiding the page. The assigned implementation addressed those findings. Independent Forge QA audited the actual handler/action/adapter tests and found no substantive defect: 41 focused tests passed (20 export, 18 deletion, 3 page), the full 131-test suite and local gates passed, and all 8 synthetic UI scenarios passed visual and interaction checks. Authentication/provider boundaries remain mocked; offline actual-handler tests are not live HTTP requests. Process rows above separate this new team result from earlier auth and September evidence; provider execution, real browser-session cleanup, cascades and retention are not established.

- [x] Add export pending, download-failure and retry feedback.
- [x] Exercise and independently review the actual GET/collectRows/NextResponse offline: 1050-row completeness, all 13 owner filters including resume, foreign exclusion, later-page returned/thrown/malformed failures, no partial/error-data leaks, auth/config failures and private/no-store (9 October independent QA: 20 export tests passed).
- [x] Exercise and independently review actual deletion action/cookie adapter and optional-name page failure handling offline: early validation and staged errors, same-account guard before admin, ignored forged targets, one delete/local signout, uncertainty with no signout/retry, strict first/later cookie errors, truthful notices and mandatory page auth with authentication mocked (9 October independent QA: 18 deletion + 3 page tests passed).
- [x] Independently verify local deletion fallback and cleanup-notice components/CSS in network-blocked Chromium at 320x740, 390x844, 1440x900 and 844x390: all 8 visually inspected; wrapping, separation, reachability, keyboard, pending and cleanup-alert focus passed; zero network attempts/page errors. This is not live workflow or full accessibility acceptance.
- [ ] Inject a later-page query failure through the live HTTP endpoint; offline actual-handler tests now reject incomplete results but do not verify connected transport/provider/database behavior.
- [ ] Test large exports through the live HTTP endpoint; >1000-row offline handler tests are not connected scale verification.
- [ ] Inject deletion-provider and cookie/session-cleanup failures through the real workflow; generic recovery guidance is implemented but unverified under these failures.
- [ ] Confirm backup and operational-log retention and document the limits of immediate erasure.
- [ ] Verify resume records in the real export and account-deletion endpoint after schema/grant readiness under 09; the recorded empty read confirms table presence, not endpoint behavior. Keep future consent/storage models in scope when approved.
- [ ] Reverify live deletion cascades remove only the deleted learner's own records while preserving other learners' certificate snapshots; historical pre-resume evidence does not satisfy current connected acceptance. Owner consent/withdrawal/retention decisions under 04/21 remain required.

Local acceptance passed independently for the bounded offline export/deletion and synthetic UI checks above. Remaining connected acceptance: exports are complete and private through live HTTP; deletion failures are actionable with real provider/session behavior; other learners' certificate snapshots survive author deletion while the deleted learner's own records are removed. Task 05 remains Open until the connected and owner/data/policy gates pass.

### 07 - Catalog interaction

Implemented: search, subject/visibility filters, no-results state and explicit enrollment with stable lesson IDs.

- [x] Add the planned search keyboard shortcut with accessible focus behavior.
- [x] Add explicit combined-filter, clear-filter, empty-result and keyboard regression coverage.

Acceptance: filters combine correctly, keyboard users can find and enroll in lessons, and repeated enrollment remains idempotent.

### 09 - Durable in-lesson progress

**22Oct14:04 current reports integration:** bounded canonical current-version/public-roster
consumer delivered locally (writer37/37); independent reports QA and connected durability/
schema/transport acceptance remain open. No new evidence, backfill or DDL. See current
handover above; dated21Oct statements below are retained, not a new acceptance request.

Implemented locally: version-aware private resume storage, authenticated reads and optimistic revision writes for slide, stage, ordering and unfinished answers. Isolated migration, policy, concurrency and cascade tests passed in recorded work. Fresh Forge QA empty reads this turn confirm `forge_resume` is present. This does not establish application/service-role grants or durable writes; `20260930_resume_grant.sql` application and full live persistence remain pending. Missing profile age blocks the full profile/resume/export flow; the repaired harness is locally ready.

15 October extension (Open; with 12, dependent on progress/grant readiness). 21 October update: bounded evidence implementation delivered locally; independent QA and connected acceptance still Open:

- [ ] Independently accept and connect the locally delivered 21 October **reviewed**, **attended** and **passed** evidence/states across real player/progress/history. Implementation and focused action/helper/PGlite/UI checks are local-delivered, not full acceptance: review is optional and never implies attendance/passing, final-quiz reach records attendance, and a saved authoritative result ≥ 6/10 alone passes. New `20261021_progress_evidence.sql` adds no historical evidence. Independently verify transitions/retries/versions/owner isolation, migration/grants/transport/export/cascade and remaining durability/unload gates.

Local scheduling acceptance completed: LessonPlayer now saves immediately through serialized writes, removing the lost 600ms debounce-cancellation window while preserving latest in-flight state, reversions, retry and conflict handling. Mounted real-Chromium component tests were added to the existing resume tests. Independent QA found a stale transient-error alert on idle reversion; Implementer repaired it. Implementer reported 70 total tests plus typecheck/scoped lint passed; final independent QA passed 12 focused tests, alert count 0, with conflict/in-flight behavior preserved. These offline tests establish local scheduling behavior, not remote durability or guaranteed completion on native browser close.

- [x] Define a version-aware progress record for slide position, stage, activity state and unfinished answers.
- [x] Complete immediate serialized scheduling and mounted Chromium regressions, including independent QA idle-reversion repair verification.
- [ ] Review/verify remaining native unload behavior; immediate dispatch does not guarantee a save completes on browser close.
- [ ] Verify authenticated, owner-scoped progress reads/writes and required migration/policies (code and isolated migration passed; table presence recorded; connected grants and behavior pending).
- [ ] Define duplicate-write and concurrent-device conflict behavior (revision checks and retryable transient saves implemented; live concurrency/retry verification pending).
- [ ] Restore progress after reload or login on another device.
- [ ] Include new records in exports and deletion cleanup (code and isolated cascade pass; live endpoint verification pending).
- [ ] Test cross-device persistence, duplicate/concurrent writes, unauthorized access and version changes.

Acceptance: authenticated learners restore their own version-compatible position on another device; stale writes cannot silently overwrite newer progress, and answer keys stay private. Existing attendance, grading and certificate rules remain unchanged.

### 06 - Contextual resume links

Implemented: enrolled dashboard and catalog actions open the lesson player; unenrolled catalog actions open the overview. Focused authenticated browser checks pass for those links.

- [ ] Verify that dashboard/catalog Continue restores the saved position after reload or login on another device (depends on 09 schema/grant readiness and live persistence, not a presumed absent table).
- [ ] Verify fallback to an appropriate position when lesson content changes (depends on 09).

Acceptance: Continue reaches the owner's saved position when compatible and a safe starting position when not; it never bypasses enrollment.

### 11 - Unfinished quiz continuation

Implemented locally: unfinished quiz selections are part of the versioned private resume state; submitted attempts and certificate eligibility remain separate records.

- [ ] Verify unfinished answers restore across reload and devices without exposing correct answers (depends on 09 grants and live persistence; table presence alone does not verify restore).
- [ ] Define and verify quiz restart/retry behavior, including lesson version changes and stale attempts.

Acceptance: unfinished choices restore only for the appropriate learner and lesson version; retries remain unlimited and attendance is not treated as passing.

### 13 - Avatar preview and email changes

Implemented and locally tested: JPG/PNG validation, size/decode limits, 160px JPEG conversion, private profile storage, preview/cancel/removal and preservation of the actual File/removal/text state across failed saves. Email changes distinguish operational/auth/rejected/uncertain outcomes, retain the submitted address without querystrings, focus status notices and block automatic replay after lost acknowledgement. Success asks for current/new inbox confirmation, never claims the address already changed. New independent QA and external verification remain, so this item stays Verification.

- [x] Preview the selected image before saving; reset preview correctly on remove/cancel.
- [x] Cover validation/database-failure retries, retained image bytes, removal/cancel payloads and text preservation with actual actions and mounted components.
- [x] Handle email client/getUser/updateUser failures, including user-plus-error denial, retained address, duplicate submits and explicit uncertain-request recovery.
- [ ] Verify secure email-change confirmation, expired/reused links and session behavior using controlled inboxes.

Acceptance: invalid images cannot replace saved data and an email change is not shown as complete before required verification.

### 14 - Authoring completion

Recorded implementation: private ownership, structured editing, review submission, validation and optimistic version checks. Administrators grant/revoke instructor rights; instructors publish/edit their own lessons and report only on their own published lessons, while administrators retain global public-lesson control. Private drafts remain isolated until explicit review submission. The recorded September 25 instructor suite passed ownership, forged direct-action and next-request revocation checks; this is not a new run or independent release sign-off.

15 October extension (Open; existing editor slice retained, overall Partial): targeted AI-assisted instructor revisions depend on 08 metadata/curriculum and 04/16 AI readiness.

- [x] Repair the actual mounted manual editor's repeated-create defect: reproduced two inserts before the fix; confirmed creation now transitions to a same-ID update, producing one insert and version 2 on the next save. Required canonical metadata, safe preview, permissions and optimistic version checks are preserved; included in Coordinator-reported integrated 134-test evidence.
- [ ] Let an authorized instructor request a targeted revision to their own content and preview the proposed change before explicit accept/reject. Rejection/failure leaves saved content intact; acceptance uses version/conflict checks and never bypasses publication permissions or automatically publishes. Verify unchanged unrelated content, stale proposals, role revocation and learner/private-draft isolation; existing manual preview is not evidence of this AI workflow.

- [x] Track dirty editor state and warn before losing unsaved edits (link/unload and browser Back guards verified in Chromium, Firefox and WebKit for the editor entry flow).
- [x] Add a dedicated local learner-facing preview before saving or publishing (no answer keys).
- [x] Test saved/dirty transitions, cancelled navigation, failed saves, concurrent edits and published-content preview (focused authoring suite covers these in Chromium, Firefox and WebKit).

Acceptance: authors can inspect learner-facing content and cannot accidentally lose edits without warning; previews preserve draft isolation, instructor own-lesson publication/edit/report permissions and administrator grant/revocation boundaries. Broader independent release regression remains under 21.

### 20 - Accessibility and interaction resilience

Implemented and tested locally: catalog search keyboard focus, mobile navigation Escape and focus restoration, active primary links, editor/preview and lesson/coach reachability at 844x390, and auth/profile/lesson/quiz focus changes. This is not a completed accessibility audit.

9 October: auth redirect errors now receive focus as well as action-state errors; error notices no longer show a success icon when query parameters conflict. Offline mounted Chromium checks cover error-to-input keyboard navigation, generic recovery failure/retry, retained email, validation focus and success status semantics. These are focused component checks, not screen-reader or full application acceptance.

- [x] Add mounted onboarding/diagnostic/profile/email keyboard, status-focus, retained-input, duplicate/conflict/uncertain-submit and 320px/desktop checks, with actual CSS and six inspected source-packet screenshots. No new screenshots or connected browser run were produced by this harness/docs integration.
- [ ] Audit keyboard navigation and screen-reader announcements across the main workflows.
- [ ] Add navigation Escape handling, appropriate focus management/restoration and active-link semantics (mobile sidebar focus/restore and primary links done; other navigation still needs audit).
- [ ] Check mobile landscape, long labels/content and coach panel sizing (editor, preview, lesson width and inline coach-input reachability pass at 844x390; long labels/content still need checks; legacy fixed coach-panel CSS is unused).
- [ ] Standardize action-specific pending, empty, offline, timeout, failure and retry states.
- [ ] Verify focus after validation errors, quiz results and view changes (auth/profile field errors, provider alerts, lesson stage/slide changes, quiz results and retry pass in the focused browser suite; remaining workflows need audit).

Acceptance: workflows remain usable without a mouse and under slow/failing requests; controls and content do not overlap or become unreachable.

## Current policy, content and operational gates

### 04 - Minors and consent

Approved decision: supervised Hong Kong demonstration for ages 13+, not a public launch. Under-13 guardian self-attestation has been removed in the recorded implementation; numeric age 13-120 is required for new signup/profile writes. Minors and unknown-age accounts are denied external AI pending approved consent/eligibility policy, and recorded adults additionally require trusted administrator approval. This is self-reported age, not independent verification or legal consent. No minor AI enablement is approved; the connected age migration and live checks remain blocked.

Current harness coverage supplies numeric age 22 at both profile fixture points, adds persistence assertions and fails full-suite schema preflight with sanitized diagnostics. Local syntax/mocked/offline DOM checks passed; fresh QA still reports missing `profiles.age` (42703). No new live age persistence, adult-grant/denial workflow or mail delivery was established this turn.

- [x] Record the 13+ supervised-HK policy choice and local signup/profile/AI eligibility controls (8 isolated tests recorded; not live migration or legal approval).
- [ ] Obtain institutional/legal approval for age eligibility, consent and retention requirements.
- [ ] Publish approved policy links and consent copy.
- [ ] Select a parental-verification integration only if the approved policy requires one.
- [ ] Apply/review age and profile migrations in the README order, review legacy rows without fabricating ages, and verify server-enforced signup/profile age rules and adult grants live.
- [ ] Determine whether versioned consent records are required by the approved policy; implement and verify them if required. No existing consent record is claimed as proof.
- [ ] Resolve withdrawal and associated retention/deletion policy; implement and test required handling once approved, including backups/log limitations with 05/21.
- [ ] Test underage signup, profile age changes, unknown-age/minor AI denial, adult grant/revocation and direct bypass attempts live; test consent withdrawal once its policy is defined.

Release gate: technical age checks or an administrator grant do not establish consent, provider eligibility or approval to deploy to minors. Keep external AI denied to minors unless a separately approved consent/eligibility policy is implemented and verified.

### 08 - Curriculum and course structure

Current state: published/owner-visible standalone lessons retain stable IDs and ordered slides/activity/quiz. Canonical SDLC, AI coding-agent and soft/product families now share author/generate/coach/path support. New lesson writes require version-1 `content.metadata`: topic, audience, difficulty, 1–8 bounded outcomes and 0–8 bounded prerequisites. Legacy aliases resolve through the registry; absent/invalid legacy metadata is displayed as unspecified, never inferred beginner/everyone/no-prerequisites. Audience does not grant access.

15 October extension (Open): Coordinator+Owner leads reviewed curriculum/resources; Forge Implementer delivers metadata/filtering and curriculum support with Forge QA verification. Depends on 14 authoring, 15/16 AI scope alignment and 18 tailoring; manual reviewed content need not wait for live AI.

- [ ] Approve the curriculum and publish reviewed learning content.
- [x] Decide lesson structure: standalone SDLC lessons satisfy approved scope; multi-lesson courses are not required.
- [ ] Complete owner review of SDLC semantic correctness, slide/activity/quiz consistency and publish only reviewed demonstration content; schema/prompt restrictions do not prove correctness.
- [x] Align subject validation, authoring, generation/coaching and path selection with the canonical three-family registry; preserve legacy-read behavior without allowing noncanonical new writes.
- [ ] Extend owner-reviewed demonstration content to coding-agent and soft/product skills alongside SDLC; labels, schemas and prompts alone do not guarantee correctness.
- [x] Implement explicit audience/difficulty/outcomes/prerequisites, learner-facing metadata, combined filters/empty states and local author/visibility validation coverage.
- [ ] Independently verify metadata accessibility, owner/visibility boundaries and connected authoring/filter flows alongside existing 07 behavior.
- [ ] Provide reviewed learning/tool resources with source links, purpose/suitability and review attribution; verify relevance, access/licensing and usability. These resources supplement, not replace, embedded coding.

Decision record: the checked 25 September structure decision remains historical evidence; 15 October retains one standalone lesson per mini-course and supersedes its SDLC-only curriculum limit. Metadata/filtering and three-family code support are implemented locally, but reviewed content/resources and independent/connected gates keep 08 Open/Partial. No multi-lesson containers or cross-lesson navigation are required. This metadata slice needs no DDL/backfill; rollback to older writers can strip metadata from JSON content, so freeze/review writes before reverting.

### 21 - Delivery and operational readiness

- [x] Record current Coordinator-supplied integrated **134 passed, 0 failed/skipped** across 13 focused files, direct tsc/scoped lint/diff passes, and resolved leaf-module alias startup blocker; implementer evidence only.
- [x] Record independent preimplementation **168 + lint** baseline at 14:17:48.940 HK with the 102-file fingerprint in the current coordination entry; retain historical independent Task25 local 168/full-gate acceptance separately.
- [x] Integrate first-login UI completion, profile revisions and canonical metadata into both connected harnesses; both syntax checks/scoped lint and 22 isolated helper contracts pass. No connected harness was run.
- [ ] Receive independent acceptance of the new source packets and integrated harness/docs; QA is currently running, not preclaimed.
- [x] Record earlier 9 October local auth continuation: 90 total tests passed, typecheck passed, lint repaired and passed, final 20 auth checks rerun, and local production build passed on Windows/Node.js 25.2.1. That packet did not claim independent QA, hosted CI, remote fixtures or deployment.
- [x] Record subsequent 9 October independent Forge QA LOCAL acceptance supplied by Coordinator: no substantive defect found; 41 account tests and 131 full-suite tests passed with zero failures/skips; lint, typecheck and build passed (TypeScript and 20 static pages, serialized .next writers); six scoped diagnostics clear; all 8 network-blocked actual-component/CSS scenarios visually inspected and passed. Windows/Node.js v25.2.1 win32/x64, Chromium 153.0.8010.12; this documentation handover did not rerun QA.
- [x] Add migrations and isolated database integrity/policy tests.
- [x] Add setup diagnostics that avoid printing secrets or learner records.
- [x] Add a secret-free GitHub Actions workflow for tests, lint, type checking and build.
- [x] Record prior local gates and browser passes: September 24 baseline plus September 25's 60 local tests and 18-stage instructor suite; these do not verify the new full profile/resume/export flow.
- [x] Configure CI order `npm ci` -> `npx playwright install --with-deps chromium` -> `npm test` and document the local Chromium prerequisite in README; independent YAML ordering checks passed.
- [x] Preserve September continuation evidence separately: QA baseline 60 passed; Implementer full 70 passed and typecheck/scoped lint passed; final independent focused QA 12 passed after repair. Local Node.js 25.2.1; independent QA did not rerun full 70 in that continuation.
- [x] Complete local numeric-age harness syntax/mocked/offline DOM checks and mounted Chromium scheduler regression coverage; no new browser/Supabase fixtures or AI probes.
- [ ] Verify age/profile/onboarding-diagnostic/resume-grant readiness and external harness acceptance, then rerun full profile/resume/export workflows with fixture cleanup; current full live E2E not run. Apply/verify `20261015_interviews_ran.sql` before interview/export queries and `20261015_onboarding_diagnostic.sql` before setup/profile editing, after prior migrations; filenames do not prove applied status.
- [ ] Run and verify the hosted GitHub Actions workflow.
- [ ] Rehearse clean installation and the documented migration sequence on a fresh staging database.
- [ ] Rehearse an upgrade with representative existing records and confirm schema compatibility.
- [ ] Verify deployment origins, SMTP, secrets, access-log query redaction and retention settings.
- [ ] Run deployed smoke tests with separate learner, reviewer and administrator accounts.
- [ ] Independently verify admin-granted instructor own-lesson publication/edit/report, filtered enrollment and role/AI-grant revocation in the approved target.
- [ ] Confirm encryption-at-rest, transport, backup/log/provider retention and restricted-demo access; no production data-protection certification is recorded.
- [ ] Complete owner-reviewed report, video, manuals, slides, contribution and stakeholder evidence by 31 October 2026.
- [ ] Complete remaining independent release QA and Coordinator+Owner acceptance; bounded Task 05 local acceptance above does not close this gate. Obtain separate deployment approval before any staging/production rollout.

Acceptance: staging/deployment setup is reproducible and does not depend on undocumented local state. CI configuration is ready, but hosted Node.js 24 execution remains unverified. The independent 9 October build is local compilation evidence supplied by Coordinator, not a documentation-agent rerun or deployment rehearsal; local results do not authorize deployment or certify release readiness.

## Current AI, imports and optional work

### 15 / 16 - AI coaching and generation: Blocked

Current state: server-side coaching/generation align with the three canonical curriculum families and explicit selection metadata. Optional ordered free-model fallback, zero-price validation, strict schema, rate limits, private drafts and eligibility controls remain. The approved 20 October shared-client request omits provider/reasoning overrides and no longer enforces ZDR/data-collection denial; account/provider policies still apply. Historical synthetic text returned 429 and structured generation 404; no new live provider probe or successful connected generation/coaching is proven. Age migration, trusted adult grants and eligibility review remain dependencies.

15 October curriculum-alignment slice is locally implemented by the curriculum writer; actual tailoring and targeted revisions remain open with Forge Architect feasibility/privacy review and independent Forge QA. Dependencies remain 04 eligibility, 08 reviewed curriculum, 14 targeted revisions and 18 tailoring.

- [x] Extend canonical subject/topic selection across the approved three-family author/generate/coach/path code without weakening free-only/privacy, owner or age/grant controls.
- [ ] Support genuinely tailored explanations/examples/practice and targeted instructor revision proposals; verify semantic quality and context isolation against reviewed examples, not just labels or reordered recommendations. Preserve data minimization and no persisted coach history. Generic coaching does not satisfy interview task 25.

- [x] Record September 25 approval for AI-native implementation within free-only/privacy/eligibility constraints.
- [ ] Verify a working free provider under the approved 20 October request settings and actual account/provider policies; no paid fallback or further policy relaxation without approval. New live checks require separate authorization.
- [ ] Verify age/schema/grant readiness and direct-action minor/unknown-age denial before authorized live AI workflows; recorded adults require administrator approval.
- [ ] Verify full generation, saved drafts, coaching quality and context isolation.
- [ ] Test malformed output, unsafe inputs, provider failures/timeouts and quota behavior.
- [ ] Complete provider age/region eligibility and data-processing review.
- [ ] Confirm whether streaming/cancel, explicit regenerate controls and durable generation jobs remain required; implement and test approved scope.

Persisted coach history is not approved and is not a pending implementation task.

### 18 - Onboarding, diagnostic and personalization: Open/Blocked live AI

Current local implementation: first-login role-specific background/goals onboarding, independent explained local diagnostic with explicit adopt/override/retake, separate chosen level and latest bounded summary, and three-family recommendations. Draft rubric `draft-2026-10-v1` requires owner pedagogical review. No raw answer history, fabricated historical completion/ages or self-reported permissions. AI paths remain session-only and never enroll learners; only derived coarse preferences/course metadata go to AI, not raw profile goals, diagnostic/background fields, identifiers, grades or answer keys. Live AI remains blocked by 04/15/16.

The 03/18 + 08 source packets supply local implementation and integrated 134-test evidence, not independent/connected acceptance or genuine content tailoring. 15/16 remain dependencies for authorized AI delivery.

- [x] Connect first-login background/goals onboarding and later editing using the current trusted role, without treating self-report as diagnostic evidence or instructor authorization.
- [x] Implement a separate server-computed local diagnostic, explained thresholds, explicit adopt/override and retake; retakes leave chosen level unchanged. Exhaustive answer combinations/thresholds, forged role/score rejection and actual-action/mounted flows have local coverage; no enrollment/pass/certificate effects.
- [ ] Obtain owner pedagogical review and independent/connected acceptance of both roles, cold starts, changes/overrides, uncertain saves, shared revisions and latest-summary export/cascade.
- [ ] Tailor actual explanations, examples and practice to differing backgrounds/goals/levels. Compare the same topic across contrasting learner needs and verify meaningful content differences, user control and safe fallbacks; reordered recommendations alone fail acceptance. Keep raw profile goals, identifiers, grades and answer keys out of provider requests.

- [x] Record optional background/goals/progress-based personalization scope with explanations and user choice; no forced enrollment.
- [x] Implement local recommendations and gated session-only AI-path action with recorded local tests.
- [ ] Verify successful live AI paths and failure recovery, privacy/eligibility gates and session-only lifetime after dependencies clear.
- [ ] Complete evaluation of cold starts, differing backgrounds/goals, overrides and inappropriate topics; local passes do not establish live semantic quality.

Private versioned/durable learning paths remain deferred, distinct from the approved private project planner (23). Wider content tailoring is now approved as specified above; session-only paths and no forced enrollment remain unchanged.

### 19 - Required teaching-material imports: Open/Blocked

Approved requirement: PDF/PPTX/PPT to editable private slides/activity/quiz, with no original-file retention. PDF/PPTX text extraction and guards passed 14 recorded local tests. Legacy binary PPT is explicitly rejected and remains an unmet requirement; a safe Vercel-compatible conversion route has not been verified. Extracted text is not proof of successful AI draft generation. Scanned/image-only PDF OCR is outside this workflow.

15 October extension (Open): a **student slide assistant**, separate from instructor material-to-draft authoring. Depends on source/course authorization, existing upload guards, 04/15/16 eligibility/provider readiness and 05 for any new private records; it does not close the required legacy PPT work.

- [ ] Accept authorized course material or the student's personal uploads and produce a source-referenced summary, key terms, glossary and beginner explanations, private by default. Verify usable page/slide references, faithfulness to the source and explicit handling of missing/unsupported source content; extraction alone is not acceptance.
- [ ] Verify course-material access and owner-only default output access, no implicit publication, upload consent/nonpersonal-input guidance, existing privacy filters/resource limits and no retained originals. New source handling must not send raw profile data or relax eligibility; authorized classroom material is not campus-wide retrieval.

- [x] Record PDF/PPTX/PPT teaching-input scope and local searchable-PDF/PPTX extraction/guard coverage.
- [ ] Resolve and implement safe legacy binary PPT conversion within runtime, licensing, privacy and resource limits, or obtain an explicit owner scope decision; rejection alone does not satisfy the requirement.
- [ ] Verify typed editable output, upload permissions, consented/nonpersonal teaching text, asset licensing, accessibility and submission/progress behavior for imported lessons.
- [ ] Complete hostile-input/resource-limit coverage for the chosen PPT route and imported drafts; retain existing PDF/PPTX guards and no-original-retention behavior.
- [ ] Verify end-to-end generation, editing, save/publish and learner behavior for all three required formats after provider and age/grant readiness; confirm deployed parsing, memory and route-time budgets in an approved environment.

Basic tailored practice and 4D activities are now core (18/22); beginner-friendly embedded JavaScript/Python is approved, with isolated runtime direction but unverified execution/resource capabilities under 24. Interviews are LIVE TEXT only, with private transcript policy approved at 11:26 HK under 25; bounded local ownership/context/persistence implementation and focused checks are recorded above, with independent QA and connected acceptance still open. Generic lesson coaching remains session-only. Other unselected media, lecture-video ingestion/alignment and broader games/simulations remain outside the new approval; selected work still requires safe inputs, licensing, accessibility and appropriate progress rules.

### 17 - Learner imports: Partial; extensions Deferred

Completed approved slice (recorded September 25 instructor regression): instructors select existing verified learner accounts by email filter, up to 50 per action, for their own published lessons; duplicate enrollment preserves progress. Directory filtering, ownership/report isolation and next-request role revocation were exercised. Existing per-lesson reports do not constitute cohort management.

- [x] Implement and verify email-selection imports for existing verified learners, with ownership checks and idempotent enrollment in recorded development tests.

Deferred slice: roster-file uploads, account creation, invitation mail, broader assignment/cohort management and notifications require a new scope decision. They are not part of the completed email-selection workflow. Independent release regression remains under 21.

### 12 - Progress presentation and optional reporting/certificate expansion

**22Oct14:04 current report integration:** public current-roster/version acknowledgement,
quiz reach and saved pass counts are independent, once per learner; all-version public
history/versioned snapshots remain separate, including removed public enrollees. Private
enrollments/results/reflections/transcripts excluded. Writer37/37 only; independent report
QA and connected/revocation-race/transport acceptance remain open. No award/retention change.

The agreed result history, statistics and private/public printable HTML certificates are implemented. Durations, timezone streaks, additional award types and signed/PDF credentials are deferred and require approved definitions and eligibility rules before implementation.

15 October extension (Open; existing reporting/certificate slice retained, overall Partial): depends on 09's evidence model and owner-scoped reporting. 21 October player/learner history/dashboard distinction is locally delivered with 09; independent acceptance and connected/authorized-report boundaries remain Open.

- [ ] Independently accept 21 October's locally delivered reviewed/attended/passed learner progress/history, including reviewed-only, attendance without submission, failure, pass/retry, versions and historical unknowns; verify connected and authorized-report boundaries separately. No report authorization/source changes were made in this bounded packet. Never expose private attempts/reflections to reviewers or award certificates for reviewing/attendance; retain per-passing-attempt snapshots, 10 questions/6-to-pass/unlimited retries and existing ownership rules.

## Historical completed baseline

These recorded earlier passes are retained as evidence, not fresh checks of the expanded September 25 scope. Current acceptance gates above take precedence.

- [x] 10: persistent owner-scoped bookmarks and saved-lessons view.
- [x] 12: attempt history, real result summaries and authorized private/public HTML certificate downloads.
- [x] Manual lesson creation, consecutive saves, private isolation, review/publication and reviewer grant/revocation.
- [x] Enrollment, attendance-before-submission, fail/pass/retry grading, stale-version rejection and snapshot preservation.
- [x] Profile/avatar persistence and validation, owner-scoped export, password-confirmed deletion and cross-learner certificate retention.
- [x] Token-hash signup/recovery, single-use links, safe redirects, invalid PKCE rejection and callback protective headers.

## Historical verification evidence and update log

Original dated entries below are preserved unchanged, including superseded scope decisions and then-current migration blockers. They do not describe the current backlog. Fresh September 25 dispatch/execution results and their limits are recorded separately at the top; this final documentation assignment does not rerun them.

| Date | Scope | Evidence / change | Remaining limitation |
| --- | --- | --- | --- |
| 2026-09-23 | Local gates | `npm test` passed 5 tests; lint, type checking and production build passed. | Not a hosted CI run or clean-install rehearsal. |
| 2026-09-23 | Browser regression | `npm run test:e2e` passed the authenticated manual-learning, account and token-based auth workflows; temporary accounts cleaned up. | No actual email sends, successful PKCE exchange, or AI inference. |
| 2026-09-23 | Tracking baseline | Created this tracker from the original plan, inspected code and verified results; AI remains paused. | Open checkboxes are not completion claims. |
| 2026-09-24 | 01 configuration (partial) | Added guarded 503 screen/JSON responses, shared public config validation, setup checks and encoded redirect tests; `npm test` passed 7 tests, typecheck, lint, setup diagnostics and production build passed; isolated malformed-config HTTP checks returned 503 for page/API. | Staging origin, expired sessions and full anonymous/access edge cases remain unverified. |
| 2026-09-24 | 02 auth (partial) | Signup/login action-state validation and safe field retention; manual invalid-signup browser check retained name/email/age/consent and cleared password. Resend context and generic thrown-provider handling added; `npm test` (7), typecheck, lint, build and authenticated production-mode browser suite passed with fixture cleanup. | New signup E2E check blocked by intermittent streamed-page loading; recovery field retention, mail delivery, successful PKCE and provider failure injection remain open. |
| 2026-09-24 | 02/03/05/07/13/20 UI | Recovery email and profile fields now retain edits after failures; export supports failure/retry; catalog keyboard and combined-filter coverage, mobile navigation Escape/active semantics, and avatar preview/cancel added. Authenticated browser suite passed with temporary-account cleanup. | Signup loading investigation paused after two sessions; mail and email-change confirmation require controlled inboxes. Profile database constraints and other accessibility flows remain open. |
| 2026-09-24 | 09/06/11 local implementation | Versioned owner-scoped resume migration, serialized revision writes, quiz/slide restore and export inclusion; isolated migration/concurrency/cascade and resume schema tests passed (`npm test`: 9). | Apply resume migration to connected development database before live cross-device, stale-version and export verification. |
| 2026-09-24 | 05/14/20 follow-up | Deletion-provider failures no longer expose internal errors; failed post-deletion sign-out has separate guidance. Editor dirty warnings and local preview, mobile menu focus/restore, and authoring-only browser suite passed with fixture cleanup. | Live failure injection and full authoring navigation audit remain open. |
| 2026-09-24 | 03 profile limits (local) | Added non-validating database constraints on name, level, subjects and goals; isolated invalid-write tests pass. Signup now checks the same name maximum. | Apply migration to connected database, inspect legacy profiles, then validate constraints and rerun profile workflow. |
| 2026-09-24 | 01 access follow-up | Focused authoring browser run passed anonymous page/API rejection and a synthetic stale-cookie check, along with catalog and editor checks; temporary accounts cleaned up. | Real expired-session and staging origin checks remain open. |
| 2026-09-24 | 14 navigation follow-up | Focused browser run passed cancelled/accepted client-side Back, cancelled full-page Back, and stale-version failed-save retention using temporary lessons; fixture cleanup passed. | Browser-history interception uses the Navigation API where available; verify other browsers and published-content preview. |
| 2026-09-24 | 09/14/20 follow-up | Added retryable transient progress saves (typecheck/lint), verified preview/draft isolation before and after publication, and 844x390 editor/preview layout in the focused authenticated browser suite with fixture cleanup. | Live resume retry needs the connected migration; cross-browser history and lesson landscape/content audits remain. |
| 2026-09-24 | 14 editor entry | Lesson overview, admin review and manual editor entry use full-page links for native unload protection where the Navigation API is unavailable. Focused authoring browser checks wait for editor hydration before typing and passed with temporary-account cleanup. | Verify history behavior in Firefox/WebKit; do not claim cross-browser completion yet. |
| 2026-09-24 | 14 cross-browser | Focused authoring browser suite passed in Chromium, Firefox and WebKit with temporary-account cleanup; covers failed-save retention, history cancel/accept, draft isolation and published preview. Editor hydration readiness checks prevent early form input from being reset. | Other authoring flows outside focused suite and deployed browsers still need routine regression checks. |
| 2026-09-24 | 06 resume navigation | Enrolled dashboard and catalog links now open the lesson player; unenrolled catalog links retain the overview. Focused authenticated browser checks passed with temporary-account cleanup. | Live restoration of saved progress awaits the resume migration on the connected database. |
| 2026-09-24 | 20 lesson focus | Player now focuses the new slide/section heading, saved quiz-result heading, and quiz heading on retry. Focused authenticated browser checks passed with temporary-account cleanup. | Form validation focus and remaining lesson/landscape accessibility checks remain open. |
| 2026-09-24 | 20 form focus | Auth actions now focus the first invalid field or provider-error alert; profile validation focuses its invalid field or general save notice. Focused authenticated browser checks passed without persisting invalid profile edits. | Remaining form/view workflows and screen-reader audit remain open. |
| 2026-09-24 | 20 landscape | Focused authenticated browser run found no lesson horizontal overflow at 844x390 and confirmed the inline coach question input remains reachable by scrolling; no AI calls made. | Long labels/content and wider viewport audits remain open. |
| 2026-09-24 | Items 01-20 plan reconciliation | Rechecked the tracker against recorded local test evidence and owning code paths. Refreshed stale overview descriptions; split 09/06/11 into distinct acceptance gates; moved 13 to Verification because avatar work passes and only controlled-inbox email-change checks remain. Items 07/10/12/14 stay Complete, 04/08 Blocked, 15/16 Paused, and 17-19 Deferred. | No new production certification, migration application, hosted CI, SMTP delivery or policy approval is claimed by this documentation review. |

Related files: [README](README.md), [CI workflow](.github/workflows/checks.yml), [browser tests](tests/e2e.mjs), [setup diagnostics](scripts/check-setup.mjs).

## Final independent LOCAL T25-QA-01 acceptance — 15 October 2026

**Current governing disposition: T25-QA-01 FIXED and independently verified; bounded LOCAL acceptance PASS. Task25 remains Open.** This final verification supersedes earlier same-day statements that local repair is required, independent QA rerun is pending, or local acceptance is not certified. Initial **156 pass / 2 fail** evidence and the implementer's repair/harness history remain intact as dated history; they no longer govern the local defect status. No connected acceptance, deployment approval, Task24 runtime or broader Group A completion is implied.

### Execution safety and unchanged inputs

Forge QA was the sole test/build runner, without subagents. Windows / Node.js **v25.2.1** / npm **11.19.1** / Chromium **153.0.8010.12**. Bounded inspection covered `interview-history.tsx`, retained/extended UI assertions, relevant documentation, package scripts and offline harness safety; not a repeated architecture audit. Server actions/providers use mocks, SQL fixtures use in-memory PGlite, and mounted Chromium uses offline contexts, blocked service workers and abort-all routing. Setup/AI/E2E/instructor commands were not invoked.

Reused the documented secret-free-copy method, extended to include tests/scripts/schema for the requested full gates: copied only `src`, `tests`, `scripts`, `supabase`, `package.json`, `package-lock.json`, `next.config.ts`, `next-env.d.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`; environment files excluded without inspecting their contents. Existing dependency files were hardlinked, no install. Children inherited an OS-variable allowlist, not application credentials or `NODE_OPTIONS`; Next telemetry and npm update/audit/fund notifications disabled. Framework-generated files remained isolated. All gates and supplemental execution were serialized.

Pre/post SHA-256 inventories matched for **102** source/config/test/schema/script files in both executions. `tests/interviews.test.mjs` SHA-256 throughout this QA: `897f7af10304433763b546c4e473deaa8850a37342d417887fc0ff044f036bb2`. This establishes unchanged inputs during this verification, not an independently reconstructed pre-implementer diff. Git was unavailable on PATH; no Git diff/commit verification claim. Repository changes by this QA are append-only evidence in README and this tracker; no application, migration, manifest or test edits.

### Exact commands and outcomes

The temporary runner invoked the installed npm CLI with the existing Node executable; commands below ran in `C:\Users\SOLUSER\AppData\Local\Temp\forge-t25-final-local-ESDpUL`, in this order:

| Command | Actual outcome |
| --- | --- |
| `node --experimental-strip-types --test tests/interviews-ui.test.mjs tests/interviews.test.mjs` | **36 passed, 0 failed/skipped**, exit 0; **19 UI + 17 server**, including parents; Node duration **12658.656 ms** |
| `npm test` | **168 passed, 0 failed/skipped**, exit 0; Node duration **15770.9429 ms** |
| `npm run lint` | Passed, exit 0; wrapper elapsed **17971 ms** |
| `npm run typecheck` | Passed, exit 0; `next typegen` then `tsc --noEmit --incremental false`; wrapper elapsed **9166 ms** |
| `npm run build` | Passed, exit 0; Next.js **16.3.5**, default Turbopack, compilation and build TypeScript; **21/21** static-generation work items; `/interviews` and `/interviews/[id]` dynamic; wrapper elapsed **18768 ms** |

Existing module-type warnings and the isolated build's missing-cache notice were non-fatal. No dependency/configuration changes were made to silence them.

**Reproducible runner-only failure, resolved:** after all five gates passed, the supplemental UI launch used a Windows absolute path for Node `--import` and failed before mounting with `ERR_UNSUPPORTED_ESM_URL_SCHEME` (`c:`), **0 passed / 1 failed**. Corrected only the owned temporary runner to use `pathToFileURL(...).href`. Reran only supplemental UI in fresh secret-free copy `forge-t25-final-local-b4PzaG`; did not rerun or relabel the already-passing gates.

Successful supplemental command: `node --experimental-strip-types --import file:///C:/Users/SOLUSER/AppData/Local/Temp/forge-t25-final-ui.mjs --test tests/interviews-ui.test.mjs` — **20 passed, 0 failed/skipped**, exit 0, **15311.4039 ms**. That temporary external loader appended independent assertions in memory to the existing mounted-component harness; neither repository nor copied test files were edited. The 20 comprise the original 18 UI subtests, one supplemental subtest and their parent, not 20 new product scenarios.

### Passing acceptance and regression boundaries

- Original 21→22 regression retained and passed. Latest creation with **18/20/21/41** retained rows and creation from older **21/40/41** pages reaches every saved ID exactly once, preserving the 20-row cap and correct continuation.
- Source review confirms a single history state object; deferred-create refresh preserves old rows/mode while pending, then canonical rows/cursor/latest mode move together. Deferred older loads and same-tick create/history events cannot overlap or duplicate submissions; settled traversal has no stale page overwrite.
- Both returned-unavailable and thrown post-create refresh failures preserve old rows, older mode and matching cursor. Notice confirms creation while truthfully reporting refresh failure; **Open new interview** remains openable. Explicit older/reload recovery neither creates again nor loses IDs.
- Returned `create_unknown` and thrown lost creation acknowledgements leave rows unchanged, disable creation, focus the truthful uncertainty notice, omit any unconfirmed-created link and require explicit reload. No automatic list/create replay or false claim that storage was unsaved.
- Supplemental desktop **1440×900** and narrow **320×844** workflows used level→Tab→Create→Enter, focused status→Tab→Open link→Enter, uncertain status→Tab→Reload→Enter, and Space-operated page controls. Focus, disabled state, notice semantics, explicit recovery and actual opened practice state passed for success/pending/returned/thrown failures. Retained keyboard/overflow flows also reran at **390×844** and **844×390**.
- Original pending/not-confirmed-save, plain-text output, retry without replacement text, draft-preserving lost transport, finish/delete/cancel focus, read-only reopen and late-response suppression regressions passed. Server/full-suite negative owner/learner/instructor/admin/reviewer, auth/eligibility/revocation, local RLS/grants, quota/replay/rollback/expiry, export all-or-nothing pagination and account cascade regressions passed with synthetic fixtures; these are not live-service proofs.

### Fresh UI evidence and inspection

Focused, full-suite and successful supplemental interview harness executions each reported **0 network attempts / 0 page errors**. Fresh final evidence: `C:\Users\SOLUSER\AppData\Local\Temp\forge-task25-qa-zWczdA` (**40 PNGs**, count checked).

QA opened and independently inspected all **12** new images, each at **1440×900 and 320×844**:

- `independent-create-success-<width>x<height>.png`
- `independent-create-refresh-pending-<width>x<height>.png`
- `independent-refresh-failed-unavailable-<width>x<height>.png`
- `independent-refresh-failed-throw-<width>x<height>.png`
- `independent-create-uncertain-create_unknown-<width>x<height>.png`
- `independent-create-uncertain-throw-<width>x<height>.png`

Status focus outlines, success-versus-refresh-failure wording, old/latest page labels and open/reload controls remain visible and wrap without overlapping controls; horizontal-overflow assertions passed. The other **28** current-run images were captured but are not claimed as newly visually inspected. These are actual-component/CSS mounts with mocked actions/navigation, not real Next route/transport screenshots or a screen-reader audit. The prior independently inspected **24** images in `forge-task25-qa-Lvz9Jt` and implementer's **28** in `forge-task25-qa-o0VBhA` remain untouched, counts verified; previous visual passes are explicitly historical.

### Cleanup and remaining gates

Both owned copies `forge-t25-final-local-ESDpUL` and `forge-t25-final-local-b4PzaG`, plus owned scripts `forge-t25-final-qa-runner.mjs` and `forge-t25-final-ui.mjs`, were removed; absence verified. Removed only this run's duplicate captures `forge-task25-qa-4DtEcm`, `forge-task25-qa-1X8hwy` and incidental `forge-auth-CwTzHk`; absence verified. Retained final synthetic evidence and previous work. Browser contexts and PGlite instances closed through test cleanup. No remote fixtures existed; no cleanup failures.

**Open/untested, not passing:** new migration remains unapplied; connected grants/RPC/PostgREST, real multi-session concurrency and transport/hosting timeouts, authenticated routing/current live rights, connected owner export/account cascade, live eligible free-provider availability/quality, provider/backup/log retention, privacy/region eligibility and deployment gates. No environment-file inspection/modification, Supabase/mail/provider calls, setup/AI probes, connected E2E/instructor suites, dev server, migration application, installs, commits or deployment. Task24 coding runtime and broader Group A remain open and were not implemented by this work. No unresolved product defect was found within this narrow local repair scope.

## 5 November 2026 — final independent narrow font/height/denied-range acceptance

**Owner: independent QA. Scope: only the requested unchanged font-layout/UI pair.**
Read the current repair entry and harnesses; loaded the repository delivery,
security and verification skills (the requested sibling skill paths are absent).
Prior implementation/QA results above are historical, not this run's evidence.
No agents, product edits, test edits, temporary probes or expanded review.

### Safety and actual command

Repository cwd: `C:\Ken\PolyU\COMP5241\Project\COMP5241-Project`.
Before execution, inspected `offline-run.mjs` (OS-only child environment, no
application environment loader) and its network-denial import (fetch,
HTTP/HTTPS/net/TLS/Socket.connect denied). Browser contexts are offline,
service workers blocked, unexpected routes aborted; HTML/image routes are
fulfilled in memory. Fixtures are synthetic; PGlite uses disposable memory,
with database/browser/context and request gates released by harness cleanup.
No environment-file contents read or application server started.

Exactly one test invocation, unchanged:

```powershell
node tests\offline-run.mjs --experimental-strip-types --test --test-concurrency=1 tests\presentation-font-layout.test.mjs tests\presentation-ui.test.mjs
```

**Actual: 13 tests, 13 passed, 0 failed/cancelled/skipped/todo; exit 0;
duration 53591.1506ms.** No additional test/build/lint/type commands ran.

### Accepted checks and retained assertion

- Original sequential font drafts **24 -> 48 -> 12**, Enter, blur, keyboard
  arrows and native pointer spinner pass, including mobile minimum 8 and
  increment to 9. Mixed/noninitial ranges, CJK, empty text and newlines remain
  asserted against actual Fabric styles and saved/native editable text.
- Stale height, wrapping/autogrow, reserved height on shrinking, fractional
  resize/scale-once, repeat-save drift and rotated/real bounds remain meaningful.
  Real action/PGlite reopen/native OOXML fixture reported required height
  **121.49759999999996**, saved **121.5**, width **210**, rotation **7**, font **24**.
  Foreign-owner update was denied without writes or content changes.
- Retained `QA: noninitial overflow selection...` assertion remains intact.
  Actual denial output for **both Save and Export** (and preview) was
  `{start:5,end:7,editing:true,text:"Lead 中文 tail",sizes:[120,120]}`.
  The original probe chooses the range before each independent action, then
  reads it immediately after denial without reselection; its final deep
  equality checks the complete selection/editing state for every action.
  Denials cause no writes/downloads/preview dialog.
- Added `temporary validation locks...` loops over Save and Export separately:
  no reselection or enterEditing occurs between denial and size-18 correction.
  Complete paragraphs/fonts/marks prove only the original Chinese characters
  change; other characters remain intact. Rendered pixels match before/after
  denial; accessible alert retains focus. Undo/redo and saved paragraphs agree.
- Real validation and pending request gates prevent native text/style/geometry
  mutations. Denied-request caret/multiselect recovery and persistent unknown
  save locking pass. Desktop IME and 320px keyboard/overflow workflows reran.

No product failures reproduced; no implementer escalation needed. These are
local bug acceptance passes, not a fresh broad permissions or release audit.

### Evidence, preservation and cleanup

Retained **8 synthetic PNGs**, two in each directory under
`C:\Users\SOLUSER\AppData\Local\Temp\`:
`forge-font-layout-y1CvAJ`, `forge-font-errors-Djj469`,
`forge-font-qa-2uYpCt`, `forge-presentation-ucMn6Q`.
Independently opened only `forge-font-qa-2uYpCt\denied-range.png` and
`recovered-mobile-size8.png`: desktop overflow notice/size and 320px size/spinner
controls are visible. Full-page canvas captures are not desktop PowerPoint or
complete rendering certification; actual object/style/pixel assertions supply
the range/rendering evidence. Other six captures were not visually inspected.

Only this evidence was appended to README/tracker. Before/after SHA-256
inventories hash sorted relative paths plus each file's SHA-256, with counts:

| Protected inventory | Files | Identical aggregate SHA-256 |
| --- | ---: | --- |
| src | 111 | `69c3204c8c6463a65ed060858134d0994387c31d7ddcac0cc529ae3c7931588a` |
| supabase | 17 | `0e7bba2aa21c603c40a62244091e40c3e2f7c93d063224ba350e8da7fe909691` |
| scripts | 3 | `6344ca06ce5c3ccd75bd504d73d51f297a2ed433d05e95cff06d7db430ee7e75` |
| tests | 57 | `2eb29d4cf9af731bda9c64c29898ab31404f3875d5d38588b7ba502cc50dc1d8` |
| .github | 8 | `4154ed66f0bc3a98df591e6bcfc722fc898c3c5a15836a15f3bd49a93d2b6936` |
| Root non-Markdown/PDF/environment files | 8 | `95dded88d919b256d05766ca0442c1a5a0aa30ac0ff66281fb4066c24302c722` |

Total **204 unchanged protected files**, including every test/harness and
product/schema/config file in those inventories. No Git diff claim: Git is
unavailable on this shell's PATH. Existing changes were not reverted.
The post-document metadata command verified all fingerprints, then initially
failed its heading lookup because PowerShell's stdin encoding replaced an em
dash. An ASCII-only marker retry verified both appended sections and no new
trailing whitespace; this was not a test/product failure or another test run.
Test process exited successfully after finally cleanup; post-run process check
found **0 Playwright Chromium profiles and 0 matching test processes**. No helper
or remote fixture exists; no cleanup failure. Synthetic PNG evidence retained.

### Untested limits, separate from passes

Connected Next routing/action transport, live Supabase authorization/storage,
full permissions/accessibility/release gates, and native desktop PowerPoint,
font substitution and empty-paragraph caret formatting were not certified.
No environment files/setup loader, connected E2E/instructor tests, remote
DB/storage/provider/quota use, server startup, install, migration application,
full suite/build/lint/types, commit or deployment. Historical unrelated open
requirements remain open. **Local font/height/denied-range acceptance passes.**