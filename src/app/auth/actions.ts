"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/dictionary/types";

export async function signOut(): Promise<ActionResult> {
  try {
    const client = await createClient();
    if (!client) return { ok: false, error: "Account services are not connected yet." };
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) return { ok: false, error: "We couldn’t sign you out. Please try again." };
    revalidatePath("/", "layout");
    return { ok: true };
  } catch { return { ok: false, error: "We couldn’t sign you out. Please try again." }; }
}
