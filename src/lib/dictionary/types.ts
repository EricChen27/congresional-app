export type DefinitionOrigin = "curated" | "personal" | "unset";

export interface DictionaryContext {
  billId: string;
  billTitle: string;
  congress: number;
  billType: string;
  billNumber: string;
  documentKind: "summary" | "text";
  versionId: string;
  versionLabel: string;
  versionDate: string;
  selectedText: string;
  excerpt: string;
  sourceUrl: string;
}

export interface DictionaryDraft {
  term: string;
  definition: string;
  definitionOrigin: DefinitionOrigin;
  glossaryId?: string;
  definitionSourceUrl?: string;
  context?: DictionaryContext;
}

export interface DictionaryEntry {
  id: string;
  term: string;
  normalizedTerm: string;
  definition: string;
  definitionOrigin: DefinitionOrigin;
  glossaryId?: string;
  definitionSourceUrl?: string;
  createdAt: string;
  updatedAt: string;
  contexts: (DictionaryContext & { id: string })[];
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  requiresAuth?: boolean;
  id?: string;
}

export interface AccountState {
  configured: boolean;
  user: { id: string; email?: string } | null;
  error?: string;
}
