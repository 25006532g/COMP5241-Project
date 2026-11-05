import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {harness,presentation,slides,learning} from "./slide-authoring-harness.mjs";

test("additive SQL accepts canonical presentations, retains legacy/standard constraints and safely claims unused assets",async()=>{
  const h=await harness();
  try{
    const doc=presentation.blankPresentation();doc.title="Native presentation";doc.document.slides[0].elements.push(presentation.newText("中文"));
    const content=slides.toPresentationLesson(doc);
    const insert=async value=>h.db.query("insert into forge_lessons(owner_id,title,subject,summary,content) values($1,$2,$3,$4,$5) returning id",[h.owner,value.title,value.subject,value.summary,JSON.stringify(value)]);
    const row=(await insert(content)).rows[0];
    assert.ok(learning.storedLessonSchema.safeParse(content).success);
    for(const modify of [c=>c.width=1,c=>c.slides[0].elements[0].x=970,c=>c.slides=Array(31).fill(c.slides[0]),c=>c.questions=[{}],c=>c.slides[0].id=null]){
      const bad=structuredClone(content);modify(bad);await assert.rejects(()=>insert(bad),e=>e.code==="23514");
    }
    const draft=(await h.db.query("select forge_begin_presentation_draft($1,$2) id",[h.owner,row.id])).rows[0].id;
    const asset=crypto.randomUUID();
    await h.db.query("select forge_reserve_presentation_asset($1,$2,$2,$3,$4,20,10,10)",[draft,h.owner,asset,`${draft}/${asset}.png`]);
    content.slides[0].elements.push({id:crypto.randomUUID(),type:"image",assetId:asset,alt:"Synthetic diagram",ratio:1,x:10,y:10,w:100,h:100,rotation:0});
    await assert.rejects(()=>insert(content),e=>e.code==="23514","pending images cannot persist");
    await h.db.query("update forge_presentation_assets set status='ready' where id=$1",[asset]);
    await h.db.query("update forge_lessons set content=$2 where id=$1",[row.id,JSON.stringify(content)]);
    await h.db.query("update forge_presentation_drafts set expires_at=now()-interval '1 second' where id=$1",[draft]);
    assert.deepEqual((await h.db.query("select * from forge_claim_presentation_cleanup($1,false)",[h.owner])).rows,[],"saved image survives expired draft");
    await h.db.query("delete from forge_lessons where id=$1",[row.id]);
    assert.equal((await h.db.query("select * from forge_claim_presentation_cleanup($1,false)",[h.owner])).rows[0].id,asset);
    await assert.rejects(()=>insert(content),e=>e.code==="23514","GC claim blocks resurrection by an undo save");
    await h.db.exec(readFileSync("supabase/migrations/20261105140000_presentations_ran.sql","utf8"));
    await h.db.exec(`create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text);
      alter table storage.objects enable row level security;
      grant usage on schema storage to anon,authenticated;
      grant select,insert,update,delete on storage.objects to anon,authenticated;
      create policy broad_existing_policy on storage.objects for all to anon,authenticated using(true) with check(true);`);
    await h.db.exec(readFileSync("supabase/migrations/20261105140000_presentations_ran.sql","utf8"));
    assert.equal((await h.db.query("select public from storage.buckets where id='forge-presentation-images'")).rows[0].public,false);
    await h.db.exec("insert into storage.objects(bucket_id) values('forge-presentation-images'),('unrelated-bucket')");
    await h.db.exec("set role authenticated");
    assert.deepEqual((await h.db.query("select bucket_id from storage.objects")).rows,[{bucket_id:"unrelated-bucket"}]);
    await assert.rejects(()=>h.db.query("insert into storage.objects(bucket_id) values('forge-presentation-images')"),e=>e.code==="42501");
    await assert.rejects(()=>h.db.query("select * from forge_presentation_assets"),e=>e.code==="42501");
  }finally{await h.db.close();}
});
