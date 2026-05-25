"use server";

import { createClient } from "@/lib/supabase/server";
import { complete } from "@/lib/ai/client";
import { FOOD_SCAN_SYSTEM, FOOD_SCAN_SCHEMA, type FoodScanResult } from "@/lib/ai/prompts/food-scan";

/**
 * Upload an image (as base64 data URL or Blob) and ask the model to identify it.
 * Returns parsed macros plus the storage path for later linking.
 */
export async function scanFood(input: { dataUrl: string; filename?: string }):
  Promise<{ data: { image_path: string; parsed: FoodScanResult } | null; error: string | null }>
{
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };
  if (!input.dataUrl?.startsWith("data:image/")) return { data: null, error: "Image required" };

  // Decode and upload to private storage bucket.
  const [meta, b64] = input.dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(meta)?.[1] ?? "image/jpeg";
  const ext = mime.includes("png") ? "png" : "jpg";
  const buf = Buffer.from(b64, "base64");
  const objectPath = `${user.id}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

  const { error: upErr } = await supabase.storage.from("food-scans").upload(objectPath, buf, {
    contentType: mime,
    upsert: false,
  });
  if (upErr) return { data: null, error: upErr.message };

  // Call vision model.
  let parsed: FoodScanResult | null = null;
  try {
    const { content } = await complete({
      temperature: 0.1,
      response_format: { type: "json_schema", json_schema: FOOD_SCAN_SCHEMA },
      messages: [
        { role: "system", content: FOOD_SCAN_SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: "Identify this meal and estimate the macronutrients shown." },
            { type: "image_url", image_url: { url: input.dataUrl } },
          ],
        },
      ],
    });
    parsed = JSON.parse(content) as FoodScanResult;
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Scan failed" };
  }

  // Persist raw scan row (meal will be created on confirmation).
  await supabase.from("food_scans").insert({
    user_id: user.id,
    image_path: objectPath,
    parsed,
  });

  return { data: { image_path: objectPath, parsed }, error: null };
}
