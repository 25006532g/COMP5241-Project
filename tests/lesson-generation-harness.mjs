import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";
import { z } from "zod";

export const transpile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
export function load(path, dependencies) {
  const mod = { exports: {} };
  new Function("require", "module", "exports", transpile(path))(
    name => { assert.ok(Object.hasOwn(dependencies, name), `Unexpected import ${name}`); return dependencies[name]; }, mod, mod.exports);
  return mod.exports;
}
const presentation=load("../src/lib/presentation.ts",{zod:{z}});
export const learning = load("../src/lib/learning.ts", { zod: { z },"./presentation.ts":presentation });
export const curriculum = load("../src/lib/curriculum.ts", { zod: { z } });
const slides = load("../src/lib/slide-lesson.ts", { zod: { z }, "./learning": learning, "./curriculum": curriculum,"./presentation":presentation });
export const generation = load("../src/lib/lesson-generation.ts", { zod: { z }, "./learning": learning, "./curriculum": curriculum });
const eligibility = load("../src/lib/eligibility.ts", {});
const permissions = load("../src/lib/permissions.ts", {});
export const selection = {
  subject: curriculum.FAMILIES.sdlc,
  metadata: { version: 1, audience: "learners", difficulty: "foundation", topic: "requirements", outcomes: ["Write testable requirements"], prerequisites: [] },
};
export const outline = { title: "Software requirements", summary: "Capture testable software requirements.", plan: ["Discover", "Describe", "Review", "Validate"] };
export const slide = { title: "Requirements", body: "Write testable software requirements.", example: "A learner can save a private draft." };
export const activity = { prompt: "Order the work", steps: ["Discover", "Describe", "Validate"] };
export const batch = { questions: Array.from({ length: 5 }, (_, index) => ({ prompt: `Which requirement ${index + 1} is testable?`, options: ["Measurable", "Vague", "Unknown", "Unbounded"], correct: 0, explanation: "Measurable requirements can be verified." })) };
export const canonical = { ...selection, title: outline.title, summary: outline.summary, slides: Array(4).fill(slide), activity, questions: [...batch.questions, ...batch.questions] };

export async function harness() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql as 'select null::uuid';`);
  await db.exec(readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8"));
  for (const file of (await readdir(new URL("../supabase/migrations/", import.meta.url))).filter(n => n.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"));
  }
  const owner = randomUUID(), other = randomUUID();
  await db.query(`insert into auth.users(id,raw_user_meta_data) values($1,'{"age":22}'),($2,'{"age":22}')`, [owner, other]);
  const state = {
    user: { id: owner, app_metadata: { ai_access: true, role: "instructor" } },
    calls: [], completions: [], gate: null, failure: false, afterAI: null, malformed: false,
    missing: false, lose: null, source: "PRIVATE_REFERENCE software requirements", extractionCalls: 0, outline,
  };
  const query = table => {
    assert.match(table, /^[a-z_]+$/);
    const filters = [], args = [], orders = [];
    let max = "", single = false;
    const q = {
      select() { return q; }, eq(key, value) { filters.push(`${key}=$${args.push(value)}`); return q; },
      is(key, value) { assert.equal(value, null); filters.push(`${key} is null`); return q; },
      order(key, options) { orders.push(`${key} ${options?.ascending === false ? "desc" : "asc"}`); return q; },
      limit(count) { max = ` limit ${count}`; return q; },
      maybeSingle() { single = true; return q; },
      then(resolve, reject) {
        const sql = `select * from ${table}${filters.length ? ` where ${filters.join(" and ")}` : ""}${orders.length ? ` order by ${orders.join(",")}` : ""}${max}`;
        return db.query(sql, args).then(result => resolve({ data: single ? result.rows[0] ?? null : result.rows, error: null }), reject);
      },
    };
    return q;
  };
  async function rpc(name, args) {
    state.calls.push({ name, args });
    if (state.missing) return { data: null, error: { code: "PGRST202", message: "PRIVATE_DATABASE_DETAIL" } };
    assert.match(name, /^forge_generation_[a-z]+$/);
    const entries = Object.entries(args);
    const params = entries.map(([key], i) => `${key}=>$${i + 1}`).join(",");
    const values = entries.map(([, value]) => value && typeof value === "object" ? JSON.stringify(value) : value);
    const result = await db.query(`select ${name}(${params}) as result`, values);
    if (state.lose === name) { state.lose = null; throw new Error("PRIVATE_ACK"); }
    return { data: result.rows[0].result, error: null };
  }
  const server = {
    ...permissions, database: () => ({ from: query, rpc }),
    currentUser: async () => { if (!state.user) throw new Error("PRIVATE_AUTH"); return state.user; },
  };
  const guard = load("../src/lib/ai-eligibility-server.ts", { "server-only": {}, "@/lib/learning-server": server, "@/lib/eligibility": eligibility });
  const ai = load("../src/lib/lesson-generation-ai.ts", {
    "server-only": {}, zod: { z }, "@/lib/lesson-generation": generation,
    "@/lib/openrouter-client": { async completion(messages, schema, options) {
      const call = { messages, schema, options }; state.completions.push(call);
      if (state.gate) await state.gate;
      if (state.afterAI) await state.afterAI();
      if (state.failure) throw new Error("PRIVATE_PROVIDER_DETAIL");
      if (state.malformed) return '{"invalid":true}';
      const task = messages[0].content;
      return JSON.stringify(task.startsWith("Create a title") ? state.outline : task.startsWith("Write slide") ? slide :
        task.startsWith("Create an ordering") ? activity : batch);
    } },
  });
  const store = load("../src/lib/lesson-generation-server.ts", {
    "server-only": {}, "node:crypto": { randomUUID }, zod: { z },
    "@/lib/learning-server": server, "@/lib/ai-eligibility-server": guard,
    "@/lib/curriculum": curriculum, "@/lib/lesson-generation": generation, "@/lib/lesson-generation-ai": ai,
  });
  const actions = load("../src/app/learning/generation-actions.ts", { "@/lib/lesson-generation-server": store });
  const common = {
    "next/cache": { revalidatePath() {} }, zod: { z }, "@/lib/learning-server": server,
    "@/lib/lesson-generation-server": store, "@/lib/ai-eligibility-server": guard, "@/lib/curriculum": curriculum,
    "@/lib/slide-lesson": slides,
  };
  const learningActions = load("../src/app/learning/actions.ts", {
    ...common, "@/lib/learning": learning, "@/lib/resume": {}, "@/lib/openrouter": { coachReply() { throw new Error("Not a staged call"); } },
  });
  const teachingActions = load("../src/app/teaching/actions.ts", {
    ...common, "@/lib/account-directory": {}, "@/lib/teaching-material": { extractTeachingMaterial: async () => { state.extractionCalls++; return state.source; } },
  });
  const start = (input = {}) => store.startGeneration({ id: randomUUID(), kind: "studio", objective: "Describe testable software requirements", selection, ...input });
  const advance = draft => actions.advanceLessonGeneration(draft.id, draft.revision, randomUUID());
  const form = (extra = {}) => {
    const f = new FormData();
    for (const [key, value] of Object.entries({
      generationId: randomUUID(), topic: "Describe testable software requirements", subject: selection.subject,
      curriculumTopic: "requirements", audience: "learners", difficulty: "foundation", outcomes: "Write testable requirements", prerequisites: "", ...extra,
    })) f.set(key, value);
    return f;
  };
  return { db, owner, other, state, server, store, actions, learningActions, teachingActions, start, advance, form, rpc, close: () => db.close() };
}

export const nativeRequire = createRequire(import.meta.url);
