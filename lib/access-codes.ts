import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Generate a 128-bit random access code, base32-encoded with dashes. */
export function generateCode(): string {
  const bytes = crypto.randomBytes(16); // 128 bits
  let code = "";
  for (let i = 0; i < bytes.length; i++) {
    code += BASE32[bytes[i] & 0x1f];
  }
  // Format: XXXX-XXXX-XXXX-XXXX (16 chars + 3 dashes)
  return code.replace(/(.{4})/g, "$1-").slice(0, -1);
}

/** Normalize user input: trim + uppercase. */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/**
 * Atomically reserve one use of an access code.
 * Returns true if the reservation succeeded, false if the code is
 * invalid, expired, or fully consumed.
 *
 * Delegates to the `reserve_access_code` SECURITY DEFINER RPC which does
 * a single conditional UPDATE — concurrent requests race safely.
 */
export async function reserveCode(code: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reserve_access_code", { p_code: code });
  if (error) throw new Error(`reserve_access_code failed: ${error.message}`);
  return (data as number) > 0;
}

/**
 * Release a previously reserved code use (call on signUp failure).
 */
export async function releaseCode(code: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("release_access_code", { p_code: code });
  if (error) {
    console.error("[access-codes] release_access_code failed:", error.message);
  }
}

/**
 * Record that a specific user consumed a code.
 * Called after successful signUp.
 */
export async function recordUse(code: string, userId: string | null): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("access_code_uses").insert({ code, user_id: userId });
  if (error) {
    console.error("[access-codes] recordUse failed:", error.message);
  }
}

/**
 * Create a new access code (admin utility).
 * Returns the generated code string.
 */
export async function createAccessCode(opts?: {
  maxUses?: number;
  expiresAt?: string | null;
}): Promise<string> {
  const admin = createAdminClient();
  const code = generateCode();
  const { error } = await admin.from("access_codes").insert({
    code,
    max_uses: opts?.maxUses ?? 1,
    expires_at: opts?.expiresAt ?? null,
  });
  if (error) throw new Error(`Failed to create access code: ${error.message}`);
  return code;
}
