import "server-only";
import type { User } from "@supabase/supabase-js";
import { isAiEligible } from "@/lib/eligibility";

export async function requireAiAccess(user: User): Promise<void> {
  if (isAiEligible(user)) return;
  throw new Error("External AI requires administrator-approved AI access.");
}