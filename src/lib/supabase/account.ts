import "server-only";
import { createClient } from "./server";
import type { AccountState } from "@/lib/dictionary/types";

export async function getAccountState(): Promise<AccountState> {
  const client = await createClient();
  if (!client) return { configured: false, user: null };
  try {
    const { data, error } = await client.auth.getUser();
    if (error) {
      if (error.name === "AuthSessionMissingError") return { configured: true, user: null };
      return { configured: true, user: null, error: "We couldn’t check your account. Public bills and the glossary are still available." };
    }
    return { configured: true, user: data.user ? { id: data.user.id, email: data.user.email } : null };
  } catch { return { configured: true, user: null, error: "The account service is temporarily unavailable." }; }
}
