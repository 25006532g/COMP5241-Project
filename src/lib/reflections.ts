import { z } from "zod";

export const dailyReflectionsEnabled = false;
export const reflectionLimit = 2000;
export const reflectionFields = [
  { key: "delegation", label: "Delegation", prompt: "What did you choose to do yourself, or delegate? Why?", example: "I kept the final decision and asked a tool to suggest test cases. Or: not used today." },
  { key: "description", label: "Description", prompt: "How did you describe the task and its boundaries?", example: "I stated the goal, inputs and what must not change. Or: not used today." },
  { key: "discernment", label: "Discernment", prompt: "How did you judge whether the result was useful and correct?", example: "I compared the suggestion with the requirements and checked an example. Or: not used today." },
  { key: "diligence", label: "Diligence", prompt: "What did you verify, improve, or decide to check next?", example: "I tested an edge case and noted a remaining uncertainty. Or: not used today." },
] as const;
export type ReflectionField = typeof reflectionFields[number]["key"];
export function hongKongDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map(key => parts.find(part => part.type === key)!.value).join("-");
}
export const reflectionDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const [y, m, d] = value.split("-").map(Number);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  return y >= 1 && m >= 1 && m <= 12 && d >= 1 && d <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}, "Choose a real date (YYYY-MM-DD).");
const text = z.string().refine(value => value.trim().length > 0 && Array.from(value).length <= reflectionLimit, "Enter 1–2000 characters; “not used today” is fine.").refine(value => !value.includes("\0"), "Remove the unsupported null character.");
export const reflectionTextsSchema = z.object({ delegation: text, description: text, discernment: text, diligence: text }).strict();
export const reflectionCreateSchema = reflectionTextsSchema.extend({ date: reflectionDateSchema }).strict();
export const reflectionVersionSchema = z.object({ id: z.uuid(), date: reflectionDateSchema, revision: z.number().int().positive().max(2147483647) }).strict();
export const reflectionUpdateSchema = reflectionCreateSchema.extend(reflectionVersionSchema.shape).strict().refine(value => value.revision < 2147483647);
export const reflectionReadSchema = z.object({ date: reflectionDateSchema }).strict();
const timestamps = { created_at: z.iso.datetime({ offset: true }), updated_at: z.iso.datetime({ offset: true }) };
export const reflectionMetadataSchema = reflectionVersionSchema.extend(timestamps).strict();
export const reflectionRowSchema = reflectionMetadataSchema.extend({ owner_id: z.uuid(), ...reflectionTextsSchema.shape }).strict();
export const reflectionCursorSchema = z.object({ date: reflectionDateSchema, id: z.uuid() }).strict().nullable();
export const reflectionHistorySchema = z.object({ rows: z.array(reflectionMetadataSchema).max(20), cursor: reflectionCursorSchema }).strict();
export const reflectionFailureSchema = z.object({ code: z.enum(["invalid", "auth", "unavailable", "conflict", "missing", "unconfirmed"]) }).strict();
export const reflectionResultSchema = z.union([
  z.object({ code: z.literal("ok"), row: reflectionRowSchema.nullable() }).strict(),
  z.object({ code: z.literal("deleted") }).strict(),
  reflectionFailureSchema,
]);
export const reflectionListResultSchema = z.union([
  reflectionHistorySchema.extend({ code: z.literal("ok") }).strict(), reflectionFailureSchema,
]);
export type ReflectionRow = z.infer<typeof reflectionRowSchema>;
export type ReflectionTexts = z.infer<typeof reflectionTextsSchema>;
export type ReflectionHistory = z.infer<typeof reflectionHistorySchema>;
export type ReflectionResult = z.infer<typeof reflectionResultSchema>;
export type ReflectionListResult = z.infer<typeof reflectionListResultSchema>;
export type ReflectionCursor = z.infer<typeof reflectionCursorSchema>;
export const reflectionMessages = {
  invalid: "Check the date and all four fields (1–2000 characters each).",
  auth: "Please sign in again. Your draft is still here.",
  unavailable: "Reflections are unavailable. This is not an empty history. Your draft is still here.",
  conflict: "This date already exists or a newer edit was saved. Inspect the canonical entry before continuing.",
  missing: "The selected entry no longer exists. Inspect this date before continuing.",
  unconfirmed: "The result is unconfirmed. Do not repeat the write. Inspect the canonical entry to reconcile; your draft is still here.",
} as const;
