import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, database, displayName } from "@/lib/learning-server";
import { attemptOutcome } from "@/lib/learning";

function escape(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;"); }

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = await currentUser(); } catch { return NextResponse.json({ error: "Authentication required." }, { status: 401 }); }
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const { data, error } = await database().from("forge_attempts").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Certificate unavailable." }, { status: 503 });
  if (!data || !Array.isArray(data.questions) || !Array.isArray(data.answers) || !attemptOutcome(data).passed) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const total = attemptOutcome(data).total;
  const type = data.certificate_kind === "public" ? "Public Published Lesson" : "Private Self-Learning";
  const name = await displayName(user);
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Forge Certificate</title><style>body{font:18px Georgia,serif;color:#17201d;margin:3rem;line-height:1.6}main{border:3px solid #1f6b52;padding:3rem;max-width:900px;margin:auto}h1{font-size:36px}h2{overflow-wrap:anywhere}small{display:block;overflow-wrap:anywhere}@media print{body{margin:0}main{border-width:2px}}</style><main><p>FORGE LEARNING STUDIO</p><h1>Certificate of Completion</h1><p>${type}</p><h2>${escape(name)}</h2><p>Completed ${escape(data.lesson_title)} (version ${data.lesson_version})</p><p>Score: ${data.score}/${total} (${Math.round(data.score / total * 100)}%). Passing threshold: 60%.</p><p>${data.certificate_kind === "private" ? "Self-directed learning; not administrator-reviewed." : "Administrator-published learning content."}</p><small>Issued: ${escape(new Date(data.completed_at).toISOString())}</small><small>Certificate ID: ${escape(id)}</small></main></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `attachment; filename="forge-${data.certificate_kind}-${id}.html"`, "Cache-Control": "private, no-store", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" } });
}