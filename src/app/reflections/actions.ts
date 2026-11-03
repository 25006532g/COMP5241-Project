"use server";

import { currentUser } from "@/lib/learning-server";
import { ownedReflection, reflectionHistory, removeReflection, writeReflection } from "@/lib/reflections-server";
import { dailyReflectionsEnabled, reflectionCreateSchema, reflectionCursorSchema, reflectionReadSchema, reflectionUpdateSchema, reflectionVersionSchema, type ReflectionListResult, type ReflectionResult } from "@/lib/reflections";

export async function listReflections(cursor: unknown = null): Promise<ReflectionListResult> {
  if (!dailyReflectionsEnabled) return { code: "unavailable" };
  const parsed = reflectionCursorSchema.safeParse(cursor);
  if (!parsed.success) return { code: "invalid" };
  const user = await currentUser().catch(() => null);
  if (!user) return { code: "auth" };
  try { return { code: "ok", ...await reflectionHistory(user.id, parsed.data) }; }
  catch { return { code: "unavailable" }; }
}
export async function readReflection(input: unknown): Promise<ReflectionResult> {
  if (!dailyReflectionsEnabled) return { code: "unavailable" };
  const parsed = reflectionReadSchema.safeParse(input);
  if (!parsed.success) return { code: "invalid" };
  const user = await currentUser().catch(() => null);
  if (!user) return { code: "auth" };
  try { return { code: "ok", row: await ownedReflection(user.id, parsed.data.date) }; }
  catch { return { code: "unavailable" }; }
}
export async function createReflection(input: unknown): Promise<ReflectionResult> {
  if (!dailyReflectionsEnabled) return { code: "unavailable" };
  const parsed = reflectionCreateSchema.safeParse(input);
  if (!parsed.success) return { code: "invalid" };
  const user = await currentUser().catch(() => null);
  if (!user) return { code: "auth" };
  try { return await writeReflection(user.id, parsed.data); }
  catch { return { code: "unconfirmed" }; }
}
export async function updateReflection(input: unknown): Promise<ReflectionResult> {
  if (!dailyReflectionsEnabled) return { code: "unavailable" };
  const parsed = reflectionUpdateSchema.safeParse(input);
  if (!parsed.success) return { code: "invalid" };
  const user = await currentUser().catch(() => null);
  if (!user) return { code: "auth" };
  try { return await writeReflection(user.id, parsed.data); }
  catch { return { code: "unconfirmed" }; }
}
export async function deleteReflection(input: unknown): Promise<ReflectionResult> {
  if (!dailyReflectionsEnabled) return { code: "unavailable" };
  const parsed = reflectionVersionSchema.safeParse(input);
  if (!parsed.success) return { code: "invalid" };
  const user = await currentUser().catch(() => null);
  if (!user) return { code: "auth" };
  try { return await removeReflection(user.id, parsed.data); }
  catch { return { code: "unconfirmed" }; }
}
