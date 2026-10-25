"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { glossaryTerms } from "@/data/glossary";
import { definitionSchema, dictionaryDraftSchema, entryIdSchema, normalizeTerm } from "./validation";
import type { ActionResult, DictionaryDraft } from "./types";

async function authenticatedClient() {
  const client = await createClient();
  if (!client) return { client: null, error: "Account services are not connected yet. Your draft has not been saved." };
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return { client: null, requiresAuth: true, error: "Sign in again to save your dictionary. Your draft is still here." };
  return { client, user: data.user };
}

export async function saveDictionaryEntry(draft: DictionaryDraft): Promise<ActionResult> {
  const parsed = dictionaryDraftSchema.safeParse(draft);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message || "Check your word and definition." };
  try {
    const auth = await authenticatedClient();
    if (!auth.client) return { ok: false, error: auth.error, requiresAuth: auth.requiresAuth };
    const value = parsed.data;
    const canonical = glossaryTerms.find((term) => term.id === value.glossaryId && [term.term, ...term.aliases].some((alias) => normalizeTerm(alias) === normalizeTerm(value.term)));
    const isCurated = value.definitionOrigin === "curated" && canonical && canonical.definition === value.definition;
    const { data, error } = await auth.client.rpc("save_dictionary_entry", {
      p_term: value.term.normalize("NFKC").replace(/\s+/gu, " "),
      p_definition: value.definition,
      p_definition_origin: !value.definition ? "unset" : isCurated ? "curated" : "personal",
      p_glossary_id: canonical?.id || null,
      p_definition_source_url: isCurated ? canonical.sourceUrl : null,
      p_context: value.context || null,
    });
    if (error || typeof data !== "string") return { ok: false, error: "Your word wasn’t saved. Please check your connection and try again." };
    revalidatePath("/dictionary");
    return { ok: true, id: data };
  } catch { return { ok: false, error: "Your word wasn’t saved. The dictionary service is temporarily unavailable. Your draft is still here." }; }
}

export async function updateDictionaryEntry(id: string, definition: string): Promise<ActionResult> {
  const validatedId = entryIdSchema.safeParse(id);
  const validatedDefinition = definitionSchema.safeParse(definition);
  if (!validatedId.success || !validatedDefinition.success) return { ok: false, error: "Enter a definition of up to 4,000 characters." };
  try {
    const auth = await authenticatedClient();
    if (!auth.client) return { ok: false, error: auth.error, requiresAuth: auth.requiresAuth };
    const { data, error } = await auth.client.from("dictionary_entries").update({
      definition: validatedDefinition.data,
      definition_origin: validatedDefinition.data ? "personal" : "unset",
      definition_source_url: null,
    }).eq("id", validatedId.data).eq("owner_id", auth.user!.id).select("id").maybeSingle();
    if (error || !data) return { ok: false, error: "This definition couldn’t be updated. It may have been removed. Your draft is still here." };
    revalidatePath("/dictionary");
    return { ok: true };
  } catch { return { ok: false, error: "The update didn’t save. Please try again; your draft is still here." }; }
}

export async function deleteDictionaryEntry(id: string): Promise<ActionResult> {
  const parsed = entryIdSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: "This dictionary entry could not be found." };
  try {
    const auth = await authenticatedClient();
    if (!auth.client) return { ok: false, error: auth.error, requiresAuth: auth.requiresAuth };
    const { data, error } = await auth.client.from("dictionary_entries").delete().eq("id", parsed.data).eq("owner_id", auth.user!.id).select("id").maybeSingle();
    if (error || !data) return { ok: false, error: "This word wasn’t deleted. Please reload and try again." };
    revalidatePath("/dictionary");
    return { ok: true };
  } catch { return { ok: false, error: "This word wasn’t deleted. Please try again." }; }
}
