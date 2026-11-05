import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import ts from "typescript";
import { z } from "zod";
import { PGlite } from "@electric-sql/pglite";
export const transpile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
export function load(path, deps) {
  const mod = { exports: {} };
  new Function("require", "module", "exports", transpile(path))(name => {
    assert.ok(Object.hasOwn(deps, name), `Unexpected module ${name}`); return deps[name];
  }, mod, mod.exports);
  return mod.exports;
}
export const learning = load("../src/lib/learning.ts", { zod: { z } });
export const curriculum = load("../src/lib/curriculum.ts", { zod: { z } });
export const slides = load("../src/lib/slide-lesson.ts", { zod: { z }, "./learning": learning, "./curriculum": curriculum });
export const resume = load("../src/lib/resume.ts", { zod: { z } });
const permissions = load("../src/lib/permissions.ts", {});
export const draft = (count = 0) => ({
  ...slides.emptyAuthorLesson(), title: "Author lesson",
  slides: Array.from({ length: 3 }, (_, i) => ({ title: `Title ${i}`, body: `Complete body ${i}`, style: { color: "#123456", size: 32, align: "right", background: "#abcdef" } })),
  quiz: Array.from({ length: count }, (_, i) => ({ prompt: `Question ${i}`, options: ["A", "B", "C", "D"], correct: 0 })),
});
export const migration = readFileSync(new URL("../supabase/migrations/20261105093000_slide_authoring_ran.sql", import.meta.url), "utf8");
export async function harness() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql as 'select null::uuid';`);
  await db.exec(readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8"));
  for (const file of readdirSync(new URL("../supabase/migrations/", import.meta.url)).filter(n => n.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"));
  }
  const owner = "00000000-0000-4000-8000-000000000001", other = "00000000-0000-4000-8000-000000000002";
  await db.query(`insert into auth.users(id,raw_user_meta_data) values($1,'{"age":22}'),($2,'{"age":22}')`, [owner, other]);
  const state = { user: { id: owner, app_metadata: {} }, lose: false, writes: [], paths: [] };
  function from(table) {
    assert.match(table, /^forge_[a-z_]+$/);
    const filters = [], args = [];
    let values, kind, single = false, columns = "*";
    const q = {
      select(c) { columns = c; return q; },
      eq(k, v) { filters.push(`${k}=$${args.push(v)}`); return q; },
      order() { return q; }, range() { return q; },
      insert(v) { kind = "insert"; values = v; return q; },
      update(v) { kind = "update"; values = v; return q; },
      maybeSingle() { single = true; return q; }, single() { single = true; return q; },
      then(resolve, reject) {
        const encode = v => Array.isArray(v) && table !== "forge_resume" || v && typeof v === "object" && !Array.isArray(v) ? JSON.stringify(v) : v;
        const pairs = values ? Object.entries(values) : [];
        const vs = pairs.map(([,v]) => `$${args.push(encode(v))}`);
        const where = filters.length ? ` where ${filters.join(" and ")}` : "";
        const sql = kind === "insert" ? `insert into ${table}(${pairs.map(([k]) => k).join(",")}) values(${vs.join(",")}) returning ${columns}` :
          kind === "update" ? `update ${table} set ${pairs.map(([k],i) => `${k}=${vs[i]}`).join(",")}${where} returning ${columns}` : `select ${columns} from ${table}${where}`;
        if (kind) state.writes.push({ table, kind, values: structuredClone(values) });
        return db.query(sql, args).then(result => {
          if (state.lose && kind) { state.lose = false; throw new Error("PRIVATE_ACK"); }
          return { data: single ? result.rows[0] ?? null : result.rows, error: null };
        }).catch(error => ({ data: null, error: { code: error.code } })).then(resolve, reject);
      },
    };
    return q;
  }
  const server = {
    ...permissions, database: () => ({ from }),
    currentUser: async () => { if (!state.user) throw new Error("Log in again."); return state.user; },
    accessibleLesson: async (id, user, review = false) => {
      const { rows } = await db.query("select * from forge_lessons where id=$1", [id]);
      const row = rows[0];
      return row && (row.owner_id === user.id || row.visibility === "public" || review && permissions.isAdmin(user) && row.review_requested) ?
        { ...row, content: learning.storedLessonSchema.parse(row.content) } : null;
    },
    enrolledLesson: async (id, user) => {
      const lesson = await server.accessibleLesson(id, user);
      const { rows } = await db.query("select * from forge_enrollments where lesson_id=$1 and user_id=$2", [id,user.id]);
      if (!lesson || !rows.length) throw new Error("Enroll first."); return lesson;
    },
  };
  const actions = load("../src/app/learning/actions.ts", {
    "next/cache": { revalidatePath: p => state.paths.push(p) }, zod: { z },
    "@/lib/learning-server": server, "@/lib/learning": learning, "@/lib/curriculum": curriculum,
    "@/lib/slide-lesson": slides, "@/lib/resume": resume, "@/lib/openrouter": {},
    "@/lib/lesson-generation-server": {}, "@/lib/ai-eligibility-server": {},
  });
  const form = (value = draft(), extra = {}) => {
    const f = new FormData();
    for (const [k,v] of Object.entries({ template: "slides", content: JSON.stringify(value), intent: "save", ...extra })) f.set(k,v);
    return f;
  };
  return { db, owner, other, state, actions, form, server };
}
