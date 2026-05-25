// Tuned for Gemini 3.5 Flash vision:
// - Direct task statement up front, then a numbered constraint list.
// - Explicit "no prose, no fences" — Gemini 3 tends to honor strict-output instructions literally.
// - Explicit fallback object so the model never returns null or an apology.
export const FOOD_SCAN_SYSTEM = `Task: identify the visible food in the photo and estimate macros for the portion shown.

Constraints:
1. Only count items clearly visible. Do not infer hidden food.
2. Estimate conservatively. Whole-number calories. Grams to one decimal.
3. Output STRICT JSON matching the provided schema. No prose. No markdown fences. No comments.
4. If no food is visible, output exactly: {"name":"Unknown","items":[],"totals":{"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}}.
5. "totals" must equal the sum of "items" (within rounding).`;

export const FOOD_SCAN_SCHEMA = {
  name: "food_scan",
  schema: {
    type: "object",
    required: ["name", "items", "totals"],
    properties: {
      name: { type: "string", description: "Short title for the meal as a whole" },
      items: {
        type: "array",
        items: {
          type: "object",
          required: ["name", "calories", "protein_g", "carbs_g", "fat_g"],
          properties: {
            name: { type: "string" },
            calories: { type: "number" },
            protein_g: { type: "number" },
            carbs_g: { type: "number" },
            fat_g: { type: "number" },
          },
        },
      },
      totals: {
        type: "object",
        required: ["calories", "protein_g", "carbs_g", "fat_g"],
        properties: {
          calories: { type: "number" },
          protein_g: { type: "number" },
          carbs_g: { type: "number" },
          fat_g: { type: "number" },
        },
      },
    },
  },
} as const;

export type FoodScanResult = {
  name: string;
  items: { name: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }[];
  totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
};
