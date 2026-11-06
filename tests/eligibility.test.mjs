import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";
import { z } from "zod";
import { ageRangeFor, isAiEligible, isDemoAge } from "../src/lib/eligibility.ts";

test("demo ages start at 13 and require a valid numeric integer", () => {
  for (const age of [undefined, null, "", "18", 12, 12.9, 17.5, NaN, Infinity, -1, 121, {}, true]) {
    assert.equal(isDemoAge(age), false);
  }
  for (const age of [13, 17, 18, 35, 120]) assert.equal(isDemoAge(age), true);
});

test("external AI requires only trusted administrator approval regardless of age", () => {
  for (const age of [13, 17, 18, 120, null, undefined]) {
    assert.equal(isAiEligible({ app_metadata: { ai_access: true }, user_metadata: { age } }), true);
    for (const ai_access of [undefined, false, "true", 1, {}, []]) {
      assert.equal(isAiEligible({ app_metadata: { ai_access }, user_metadata: { age, ai_access: true } }), false);
    }
    assert.equal(isAiEligible({}), false);
    assert.equal(isAiEligible({ user_metadata: { ai_access: true, age } }), false);
  }
});

test("editable metadata cannot override the trusted grant", () => {
  const forged = { user_metadata: { age: 18, age_range: "18-24", ai_access: true, app_metadata: { ai_access: true } } };
  assert.equal(isAiEligible({ ...forged, app_metadata: { ai_access: true } }), true);
  assert.equal(isAiEligible({ ...forged, app_metadata: { ai_access: false } }), false);
  assert.equal(isAiEligible(forged), false);
});

test("age bands are derived only from valid numeric ages", () => {
  for (const [age, band] of [[13, "13-17"], [17, "13-17"], [18, "18-24"], [24, "18-24"], [25, "25-34"], [34, "25-34"], [35, "35-plus"]]) {
    assert.equal(ageRangeFor(age), band);
  }
  assert.throws(() => ageRangeFor(12));
});

async function loadServerModule(path, dependencies) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  runInNewContext(outputText, {
    exports, FormData, File,
    process: { env: {} },
    require(name) {
      if (!Object.hasOwn(dependencies, name)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

test("server AI guard never reads profiles, including missing age and schema failure", async () => {
  const user = { id: "synthetic-user", app_metadata: { ai_access: true } };
  const { requireAiAccess } = await loadServerModule("../src/lib/ai-eligibility-server.ts", {
    "server-only": {},
    "@/lib/eligibility": { isAiEligible },
    "@/lib/learning-server": { database() {
      assert.fail("AI authorization must not depend on profile/database schema");
    } },
  });
  assert.equal(await requireAiAccess(user), undefined);
  await assert.rejects(requireAiAccess({ ...user, app_metadata: {}, user_metadata: { ai_access: true } }), /External AI requires/);
  for (const age of [undefined, null, 13, 17, 18, 120]) {
    assert.equal(await requireAiAccess({ ...user, user_metadata: { age } }), undefined);
  }
  await assert.rejects(requireAiAccess({ ...user, app_metadata: { ai_access: "true" } }), /^Error: External AI requires administrator-approved AI access\.$/);
});

test("admin grants minors/missing profiles only with consent review; rejects tampering and preserves metadata on revoke",async()=>{
  const actorId=randomUUID(),targetId=randomUUID();
  let actor={id:actorId,app_metadata:{role:"admin"}};
  let target={id:targetId,app_metadata:{role:"learner",other:"preserved"},user_metadata:{age:17}};
  const writes=[];
  const {updateAccount}=await loadServerModule("../src/app/admin/accounts/actions.ts",{
    "next/cache":{revalidatePath(){}},zod:{z},"@/lib/account-directory":{},
    "@/lib/learning-server":{
      currentUser:async()=>actor,isAdmin:u=>u.app_metadata?.role==="admin",
      database:()=>({
        from(){assert.fail("Admin AI grant must not look up profiles");},
        auth:{admin:{
          getUserById:async id=>{assert.equal(id,targetId);return {data:{user:target},error:null};},
          updateUserById:async(id,patch)=>{assert.equal(id,targetId);writes.push(patch);return {error:null};},
        }},
      }),
    },
  });
  function form(confirm=true,grant=true){
    const f=new FormData();f.set("accountId",targetId);f.set("role","instructor");
    if(grant)f.set("aiAccess","on");if(confirm)f.set("confirmAi","on");return f;
  }
  for(const age of [13,17,18,120,null,undefined]){
    target.user_metadata={age};
    assert.match((await updateAccount({},form())).success,/permissions saved/);
    assert.deepEqual(JSON.parse(JSON.stringify(writes.at(-1))),{app_metadata:{role:"instructor",ai_access:true,other:"preserved"}});
  }
  const count=writes.length;
  assert.match((await updateAccount({},form(false))).error,/consent review/);
  actor={id:actorId,app_metadata:{role:"learner"},user_metadata:{role:"admin"}};
  assert.match((await updateAccount({},form())).error,/Administrator access required/);
  actor={id:actorId,app_metadata:{role:"admin"}};target.app_metadata.role="admin";
  assert.match((await updateAccount({},form())).error,/Administrator accounts/);
  target.app_metadata.role="learner";actor.id=targetId;
  assert.match((await updateAccount({},form())).error,/Administrator accounts/);actor.id=actorId;
  const invalid=form();invalid.set("accountId","forged-id");
  assert.ok((await updateAccount({},invalid)).error);
  const badRole=form();badRole.set("role","admin");assert.ok((await updateAccount({},badRole)).error);
  const savedTarget=target;target=null;assert.match((await updateAccount({},form())).error,/Account not found/);target=savedTarget;
  assert.equal(writes.length,count);
  assert.ok((await updateAccount({},form(false,false))).success);
  assert.deepEqual(JSON.parse(JSON.stringify(writes.at(-1))),{app_metadata:{role:"instructor",ai_access:false,other:"preserved"}});
});

test("signup validates numeric age and never writes a trusted AI grant or guardian consent", async () => {
  let signup;
  const { signUp } = await loadServerModule("../src/app/auth/actions.ts", {
    "node:crypto": { randomUUID },
    "next/navigation": { redirect() { throw new Error("Synthetic redirect"); } },
    zod: { z },
    "@/lib/eligibility": { isDemoAge, ageRangeFor },
    "@/lib/public-config": { publicConfig: () => ({ siteOrigin: "https://example.test" }) },
    "@/lib/supabase/server": { async createClient() { return { auth: { async signUp(value) { signup = value; return { error: null }; } } }; } },
  });
  function signupForm(age) {
    const form = new FormData();
    for (const [name, value] of Object.entries({ name: "Demo Learner", email: "demo@example.test", password: "Synthetic1", ai_access: "true", consent: "on", ageRange: "18-24" })) form.set(name, value);
    if (age !== undefined) form.set("age", age);
    return form;
  }
  for (const age of [undefined, "", "12", "13.5", "invalid", "121"]) {
    const result = await signUp({}, signupForm(age));
    assert.ok(result.fieldErrors.age);
    assert.equal(signup, undefined);
  }
  for (const age of [13, 17, 18]) {
    await assert.rejects(signUp({}, signupForm(String(age))), /Synthetic redirect/);
    assert.equal(signup.options.data.age, age);
    assert.equal(signup.options.data.age_range, ageRangeFor(age));
    assert.equal(signup.options.data.ai_access, undefined);
    assert.equal(signup.options.data.guardian_consent_self_attested, undefined);
    assert.equal(signup.app_metadata, undefined);
  }
});

test("profile saves enforce age and cannot grant AI access or silently promote known underage accounts", async () => {
  const userId = "synthetic-user";
  const setupRevision = 7;
  let saved;
  let savedId = userId;
  const writes = [];
  let existing = { age: null, age_range: "18-24", learning_setup_revision: setupRevision };
  let profileError = null;
  const { updateProfile } = await loadServerModule("../src/app/profile/actions.ts", {
    "next/navigation": { redirect() { throw new Error("Synthetic redirect"); } },
    "next/cache": { revalidatePath() {} },
    zod: { z }, sharp: {}, "@supabase/supabase-js": {}, "@/lib/public-config": {},
    "@/lib/eligibility": { isDemoAge, ageRangeFor },
    "@/lib/supabase/server": { async createClient() { return {
      auth: { async getUser() { return { data: { user: { id: userId } }, error: null }; } },
      from(table) {
        assert.equal(table, "profiles");
        const filters = [];
        let columns, patch;
        return {
          select(value) { columns = value; return this; },
          eq(column, value) { filters.push([column, value]); return this; },
          update(value) { patch = value; return this; },
          async maybeSingle() {
            if (patch) {
              assert.equal(columns, "id");
              assert.deepEqual(filters, [["id", userId], ["learning_setup_revision", setupRevision]]);
              saved = patch;
              writes.push({ filters, savedId });
              return { data: { id: savedId }, error: null };
            }
            assert.equal(columns, "age, age_range, learning_setup_revision");
            assert.deepEqual(filters, [["id", userId]]);
            return { data: existing, error: profileError };
          },
        };
      },
    }; } },
  });
  function profileForm(age) {
    const form = new FormData();
    for (const [name, value] of Object.entries({ displayName: "Demo Learner", level: "foundation", subjects: "", goals: "", ai_access: "true", setupRevision: String(setupRevision) })) form.set(name, value);
    if (age !== undefined) form.set("age", age);
    return form;
  }
  for (const age of [undefined, "", "12", "17.5", "invalid"]) {
    assert.ok((await updateProfile({}, profileForm(age))).fieldErrors.age);
    assert.equal(saved, undefined);
  }
  for (const legacy of [{ age: null, age_range: "under-13" }, { age: 12, age_range: "18-24" }]) {
    existing = { ...legacy, learning_setup_revision: setupRevision };
    assert.match((await updateProfile({}, profileForm("18"))).error, /administrator review/);
    assert.equal(saved, undefined);
  }
  existing = { age: 17, age_range: "13-17", learning_setup_revision: setupRevision };
  profileError = new Error("Synthetic lookup failure");
  assert.match((await updateProfile({}, profileForm("18"))).error, /Could not verify/);
  assert.equal(saved, undefined);
  profileError = null;
  for (const age of [13, 17, 18]) {
    await assert.rejects(updateProfile({}, profileForm(String(age))), /Synthetic redirect/);
    assert.equal(saved.age, age);
    assert.equal(saved.age_range, ageRangeFor(age));
    assert.equal(saved.ai_access, undefined);
    assert.equal(saved.app_metadata, undefined);
    assert.deepEqual(writes.at(-1).filters, [["id", userId], ["learning_setup_revision", setupRevision]]);
    assert.equal(writes.at(-1).savedId, userId);
  }
  savedId = "another-user";
  assert.match((await updateProfile({}, profileForm("18"))).error, /Could not confirm/);
});

test("age migration rejects invalid direct signups and new profile writes while preserving legacy rows for review", async () => {
  const database = new PGlite();
  try {
    await database.exec(`create schema auth;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql as 'select null::uuid';`);
    await database.exec(await readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8"));
    const legacy = "00000000-0000-4000-8000-000000000001";
    const adultLegacy = "00000000-0000-4000-8000-000000000002";
    const candidate = "00000000-0000-4000-8000-000000000003";
    await database.query("insert into auth.users(id,raw_user_meta_data) values($1,$2)", [legacy, JSON.stringify({ age_range: "under-13" })]);
    await database.query("insert into auth.users(id) values($1)", [adultLegacy]);
    await database.exec(await readFile(new URL("../supabase/migrations/20260929_age_eligibility_ran.sql", import.meta.url), "utf8"));
    const legacyProfiles = (await database.query("select age from profiles where id in ($1,$2)", [legacy, adultLegacy])).rows;
    assert.equal(legacyProfiles.length, 2);
    assert.ok(legacyProfiles.every(profile => profile.age === null));
    const constraints = (await database.query("select convalidated from pg_constraint where conname in ('profiles_age_eligibility','profiles_age_range_consistent')")).rows;
    assert.equal(constraints.length, 2);
    assert.ok(constraints.every(constraint => constraint.convalidated === false));
    await assert.rejects(database.query("update profiles set display_name='Demo Learner' where id=$1", [legacy]), /profiles_age_eligibility/);
    for (const metadata of [null, {}, { age_range: "18-24" }, { age: null }, { age: "18" }, { age: true }, { age: [] }, { age: {} }, { age: 12, guardian_consent_self_attested: true }, { age: 17.5 }, { age: 121 }]) {
      await assert.rejects(database.query("insert into auth.users(id,raw_user_meta_data) values($1,$2)", [candidate, JSON.stringify(metadata)]), /whole-number age/);
      assert.equal((await database.query("select count(*)::integer as count from auth.users where id=$1", [candidate])).rows[0].count, 0);
    }
    for (const age of [13, 17, 18, 35, 120]) {
      await database.query("insert into auth.users(id,raw_user_meta_data) values($1,$2)", [candidate, JSON.stringify({ age, age_range: "under-13", ai_access: true })]);
      const profile = (await database.query("select age,age_range from profiles where id=$1", [candidate])).rows[0];
      assert.deepEqual(profile, { age, age_range: ageRangeFor(age) });
      for (const invalid of [null, 12, 121]) {
        await assert.rejects(database.query("update profiles set age=$2 where id=$1", [candidate, invalid]), /profiles_age_eligibility/);
      }
      await assert.rejects(database.query("update profiles set age_range='under-13' where id=$1", [candidate]), /profiles_age_range_consistent/);
      await database.query("delete from profiles where id=$1", [candidate]);
      await assert.rejects(database.query("insert into profiles(id,display_name,age_range) values($1,'Demo Learner','18-24')", [candidate]), /profiles_age_eligibility/);
      await database.query("delete from auth.users where id=$1", [candidate]);
    }
  } finally { await database.close(); }
});