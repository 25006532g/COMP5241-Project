"use server";

import {generateAiSuggestions,checkAiApply} from "@/lib/presentation-ai-server";

export async function generatePresentationSuggestions(request:unknown){
  return generateAiSuggestions(request);
}
export async function authorizePresentationAiApply(binding:unknown){
  return checkAiApply(binding);
}
