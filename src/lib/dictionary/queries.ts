import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DefinitionOrigin, DictionaryEntry } from "./types";

interface ContextRow {
  id: string; bill_id: string; bill_title: string; congress: number; bill_type: string;
  bill_number: string; document_kind: "summary" | "text"; version_id: string; version_label: string;
  version_date: string; selected_text: string; excerpt: string; source_url: string;
}
interface EntryRow {
  id: string; term: string; normalized_term: string; definition: string; definition_origin: DefinitionOrigin;
  glossary_id: string | null; definition_source_url: string | null; created_at: string; updated_at: string;
  dictionary_contexts: ContextRow[];
}

export async function getDictionaryEntries(): Promise<{ entries: DictionaryEntry[]; error?: string }> {
  try {
    const client = await createClient();
    if (!client) return { entries: [], error: "Account services are not connected yet." };
    const { data: account, error: accountError } = await client.auth.getUser();
    if (accountError || !account.user) return { entries: [], error: "Sign in to view your dictionary." };
    const { data, error } = await client.from("dictionary_entries")
      .select("id,term,normalized_term,definition,definition_origin,glossary_id,definition_source_url,created_at,updated_at,dictionary_contexts(id,bill_id,bill_title,congress,bill_type,bill_number,document_kind,version_id,version_label,version_date,selected_text,excerpt,source_url)")
      .eq("owner_id", account.user.id).order("term", { ascending: true });
    if (error) return { entries: [], error: "We couldn’t load your dictionary. Your saved words haven’t been changed. Please try reloading." };
    return { entries: (data as EntryRow[]).map((entry) => ({
      id: entry.id, term: entry.term, normalizedTerm: entry.normalized_term,
      definition: entry.definition, definitionOrigin: entry.definition_origin,
      glossaryId: entry.glossary_id || undefined, definitionSourceUrl: entry.definition_source_url || undefined,
      createdAt: entry.created_at, updatedAt: entry.updated_at,
      contexts: entry.dictionary_contexts.map((context) => ({
        id: context.id, billId: context.bill_id, billTitle: context.bill_title, congress: context.congress,
        billType: context.bill_type, billNumber: context.bill_number, documentKind: context.document_kind,
        versionId: context.version_id, versionLabel: context.version_label, versionDate: context.version_date,
        selectedText: context.selected_text, excerpt: context.excerpt, sourceUrl: context.source_url,
      })),
    })) };
  } catch { return { entries: [], error: "The dictionary service is temporarily unavailable. Please try reloading." }; }
}
