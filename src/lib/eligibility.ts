export function isDemoAge(age: unknown): age is number {
  return typeof age === "number" && Number.isInteger(age) && age >= 13 && age <= 120;
}

export function isAiEligible(user: { app_metadata?: Record<string, unknown>; user_metadata?: unknown }): boolean {
  return user.app_metadata?.ai_access === true;
}

export function ageRangeFor(age: number): string {
  if (!isDemoAge(age)) throw new Error("Enter a whole-number age from 13 to 120.");
  if (age < 18) return "13-17";
  if (age < 25) return "18-24";
  if (age < 35) return "25-34";
  return "35-plus";
}