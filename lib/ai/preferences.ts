import type { AIPersonality, AIResponseLength } from "@/types/database";

export const PERSONALITIES: { id: AIPersonality; label: string; description: string; sample: string }[] = [
  {
    id: "default",
    label: "Balanced",
    description: "Neutral and helpful. Direct, no fluff.",
    sample: "You hit 92g of protein today — 58g to go.",
  },
  {
    id: "coach",
    label: "Coach",
    description: "Motivational. Push you to stick with it.",
    sample: "Let's go — 58g protein left and you've got dinner to crush it.",
  },
  {
    id: "friendly",
    label: "Friendly",
    description: "Warm and conversational, like a buddy.",
    sample: "Nice work today! Just 58g more protein to hit your goal — easy.",
  },
  {
    id: "clinical",
    label: "Clinical",
    description: "Precise and evidence-based.",
    sample: "Protein intake: 92g / 150g (61%). Deficit: 58g.",
  },
];

export const RESPONSE_LENGTHS: { id: AIResponseLength; label: string; description: string }[] = [
  { id: "auto",     label: "Auto",     description: "Let the assistant choose." },
  { id: "concise",  label: "Concise",  description: "1–3 sentences max." },
  { id: "standard", label: "Standard", description: "Short paragraphs." },
  { id: "detailed", label: "Detailed", description: "Thorough, long-form answers." },
];

export function personalityInstruction(p: AIPersonality): string {
  switch (p) {
    case "coach":    return "Adopt an energetic motivational-coach voice. Use direct, action-oriented language and occasional callouts ('let's go', 'lock in') — never cheesy or generic.";
    case "friendly": return "Adopt a warm, casual buddy voice. Be conversational, encouraging, and human.";
    case "clinical": return "Adopt a precise clinical voice. Use numbers, percentages, and evidence-based phrasing. Avoid emotional language.";
    default:         return "Use a neutral, professional voice. Direct, helpful, no filler.";
  }
}

export function lengthInstruction(l: AIResponseLength): string {
  switch (l) {
    case "concise":  return "Hard cap each reply at 3 sentences.";
    case "standard": return "Keep replies to short paragraphs (4–6 sentences max).";
    case "detailed": return "Provide thorough, well-structured answers when the topic warrants it.";
    default:         return "Adapt length to question complexity. Short for simple questions; longer when explaining.";
  }
}
