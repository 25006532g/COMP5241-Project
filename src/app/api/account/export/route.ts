import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { database } from "@/lib/learning-server";
import { collectRows } from "@/lib/learning";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Not authenticated" }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
    const client = database();
    const tables = [["profiles", "id", "id"], ["enrollments", "user_id", "id"], ["lesson_progress", "user_id", "id"], ["quiz_results", "user_id", "id"], ["bookmarks", "user_id", "id"], ["achievements", "user_id", "id"], ["forge_lessons", "owner_id", "id"], ["forge_enrollments", "user_id", "lesson_id"], ["forge_attempts", "user_id", "id"], ["forge_bookmarks", "user_id", "lesson_id"], ["forge_resume", "user_id", "lesson_id"], ["forge_requests", "user_id", "day"], ["forge_reviewers", "user_id", "lesson_id"], ["forge_interviews", "owner_id", "id"], ["forge_lesson_generations", "owner_id", "id"], ["forge_reflections", "owner_id", "id"]];
    const records: Record<string, unknown[]> = {};
    tables.push(["forge_presentation_drafts","owner_id","id"],["forge_presentation_assets","owner_id","id"]);
    for (const [table, ownerColumn, orderColumn] of tables) {
      records[table] = await collectRows(async (start, end) => {
        const result = await client.from(table).select("*").eq(ownerColumn, user.id).order(orderColumn).range(start, end);
        if (result.error !== null || !Array.isArray(result.data)) throw new Error("Could not load complete export records.");
        return result;
      });
    }
    return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), presentationAssets:"Canonical JSON and private asset metadata are included. Image binaries are excluded; open each owned lesson in Studio and export editable PPTX to download its images.", account: { email: user.email, createdAt: user.created_at, metadata: user.user_metadata }, records }, null, 2), { headers: { "Content-Type": "application/json", "Content-Disposition": "attachment; filename=forge-learning-data.json", "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Data export requires a configured account." }, { status: 503, headers: { "Cache-Control": "private, no-store" } }); }
}