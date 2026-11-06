import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { importFileSchema } from "../src/lib/interviews-v2.ts";

const expected = {
  "cs_degree.json": { profile: "cs_degree", prefix: "ug-" },
  "cs_master.json": { profile: "cs_master", prefix: "ms-" },
  "software_engineer.json": { profile: "software_engineer", prefix: "se-" },
  "frontend_engineer.json": { profile: "frontend_engineer", prefix: "fe-" },
  "backend_engineer.json": { profile: "backend_engineer", prefix: "be-" },
  "data_analyst.json": { profile: "data_analyst", prefix: "da-" },
};

test("interview-v2 import JSON assets each match importFileSchema with 40 unique keys", async () => {
  const dir = new URL("../docs/interview-bank/import/", import.meta.url);
  const names = (await readdir(dir)).filter(name => name.endsWith(".json")).sort();
  assert.deepEqual(names, Object.keys(expected).sort());
  for (const name of names) {
    const spec = expected[name];
    const file = JSON.parse(await readFile(new URL(name, dir), "utf8"));
    const parsed = importFileSchema.safeParse(file);
    assert.equal(parsed.success, true, parsed.success ? name : `${name}: ${parsed.error.issues.map(issue => issue.message).join("; ")}`);
    assert.equal(parsed.data.profile, spec.profile);
    assert.equal(parsed.data.questions.length, 40);
    const keys = parsed.data.questions.map(question => question.key);
    assert.equal(new Set(keys).size, 40, name);
    assert.deepEqual(keys, keys.map((_, index) => `${spec.prefix}${String(index + 1).padStart(2, "0")}`));
    for (const question of parsed.data.questions) {
      for (const related of question.relatedKeys) assert.ok(keys.includes(related), `${name} ${question.key} -> ${related}`);
    }
  }
});
