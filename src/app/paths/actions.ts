"use server";

import { z } from "zod";
import { currentUser, database, visibleLessons } from "@/lib/learning-server";
import { requireAiAccess } from "@/lib/ai-eligibility-server";
import { collectRows } from "@/lib/learning";
import { completion, OpenRouterError } from "@/lib/openrouter-client";
import { buildPathRequest, derivePreferences, GOALS, TOPICS, validatePathResponse, type Recommendation } from "@/lib/recommendations";

export type PathState = { error?: string; path?: Recommendation[]; selectionKey?: string };

async function passedLessonIds(userId: string) {
  const client = database();
  const rows = await collectRows((start, end) => client.from("forge_attempts").select("original_lesson_id")
    .eq("user_id", userId).gte("score", 6).order("id").range(start, end));
  return rows.map(row => String(row.original_lesson_id));
}

export async function generateLearningPath(_previous: PathState, form: FormData): Promise<PathState> {
  try {
    const user = await currentUser().catch(() => null);
    if (!user) return { error: "Your session could not be verified. Log in again before explicitly requesting another path. Local recommendations remain available." };
    try { await requireAiAccess(user); }
    catch { return { error: "External AI requires administrator-approved AI access. Access could not be confirmed. Local recommendations remain available." }; }
    const topic = z.enum(["profile", ...TOPICS]).parse(form.get("topic"));
    const goal = z.enum(["profile", ...GOALS]).parse(form.get("goal"));
    if (form.get("shareCourseContent") !== "on") return { error: "Confirm sharing course titles, audience/difficulty metadata and coarse curriculum preferences before generating a path." };
    const client = database();
    const [profileResult, catalog, completedIds] = await Promise.all([
      client.from("profiles").select("learning_level,preferred_subjects,learning_goals").eq("id", user.id).maybeSingle(),
      visibleLessons(user),
      passedLessonIds(user.id),
    ]);
    if (profileResult.error) return { error: "Could not load your learning preferences. Try again later." };
    const profile = profileResult.data;
    const preferences = derivePreferences({ level: profile?.learning_level, subjects: Array.isArray(profile?.preferred_subjects) ? profile.preferred_subjects.join(", ") : "", goals: profile?.learning_goals }, { topic, goal });
    const request = buildPathRequest(catalog, preferences, completedIds);
    const { data: allowed, error } = await client.rpc("forge_claim_request", { request_user: user.id });
    if (error || allowed !== true) return { error: "AI generation is unavailable or your shared daily generation allowance has been used. Local recommendations remain available." };
    const text = await completion(request.messages, request.schema);
    // The original User is a snapshot: reauthenticate before reading/accepting anything.
    const freshUser = await currentUser();
    if (freshUser.id !== user.id) return { error: "Your account changed. No AI path was accepted. Request a new path only from your current account." };
    await requireAiAccess(freshUser);
    const [currentCatalog, currentCompletedIds] = await Promise.all([visibleLessons(freshUser), passedLessonIds(freshUser.id)]);
    const path = validatePathResponse(text, request.candidates, currentCatalog, currentCompletedIds);
    return { path, selectionKey: `${topic}:${goal}` };
  } catch (error) {
    if (error instanceof z.ZodError) return { error: "Choose a listed curriculum topic and learning goal." };
    if (error instanceof OpenRouterError) return { error: "The free AI service could not complete this request. The request may have used your shared allowance. No automatic retry was made. Local recommendations remain available." };
    return { error: "No AI path was accepted. Lessons may be unavailable, completed, or outside the curriculum, or the response could not be validated. Local recommendations remain available." };
  }
}