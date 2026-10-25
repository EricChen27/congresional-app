"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Check, ExternalLink, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { SelectMenu } from "./select-menu";
import { glossaryTerms } from "@/data/glossary";
import { deleteDictionaryEntry, saveDictionaryEntry, updateDictionaryEntry } from "@/lib/dictionary/actions";
import { contextReaderPath, normalizeTerm } from "@/lib/dictionary/validation";
import type { ActionResult, DictionaryEntry } from "@/lib/dictionary/types";

export function DictionaryManager({ entries }: { entries: DictionaryEntry[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [busy, startTransition] = useTransition();
  const filtered = useMemo(() => entries.filter((entry) => {
    const matchesQuery = `${entry.term} ${entry.definition}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (filter === "all" || (filter === "defined" ? !!entry.definition : !entry.definition));
  }), [entries, query, filter]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("billbreakdown:manager-draft:v1");
      if (!raw) return;
      const draft = JSON.parse(raw);
      sessionStorage.removeItem("billbreakdown:manager-draft:v1");
      if (draft.expires < Date.now()) return;
      if (typeof draft.term === "string" && typeof draft.definition === "string") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- recover a user-authored draft after sign-in
        setTerm(draft.term.slice(0, 100)); setDefinition(draft.definition.slice(0, 4000)); setAdding(!!draft.adding);
      }
      if (typeof draft.editing === "string" && entries.some(entry => entry.id === draft.editing) && typeof draft.editDraft === "string") {
        setEditing(draft.editing); setEditDraft(draft.editDraft.slice(0, 4000));
      }
    } catch { /* Browser storage is optional. */ }
  }, [entries]);
  function preserveDraft() {
    try { sessionStorage.setItem("billbreakdown:manager-draft:v1", JSON.stringify({term, definition, adding, editing, editDraft, expires: Date.now() + 30 * 60 * 1000})); } catch { /* Keep the active form available. */ }
  }
  async function attempt(action: () => Promise<ActionResult>): Promise<ActionResult> {
    try { return await action(); } catch { return {ok: false, error: "Your change wasn’t saved. Check your connection and try again; your draft is still here."}; }
  }
  function report(result: ActionResult): boolean {
    if (!result.ok) { setError(result.error || "Your change wasn’t saved. Please try again."); setRequiresAuth(!!result.requiresAuth); return false; }
    setError(""); setRequiresAuth(false); router.refresh(); return true;
  }
  function addWord(event: React.FormEvent) {
    event.preventDefault(); setError(""); setNotice("");
    startTransition(async () => {
      const canonical = glossaryTerms.find((item) => [item.term, ...item.aliases].some((alias) => normalizeTerm(alias) === normalizeTerm(term)));
      const result = await attempt(() => saveDictionaryEntry({ term, definition, definitionOrigin: definition ? canonical?.definition === definition ? "curated" : "personal" : "unset", glossaryId: canonical?.id, definitionSourceUrl: canonical?.definition === definition ? canonical.sourceUrl : undefined }));
      if (report(result)) { setTerm(""); setDefinition(""); setAdding(false); setNotice("Word saved. If it was already in your dictionary, its existing meaning was kept."); }
    });
  }
  return <div className="dictionary-manager">
    <div className="dictionary-toolbar" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 24 }}>
      <div className="search-field" style={{ flex: "1 1 240px" }}>
        <label className="sr-only" htmlFor="dictionary-search">Search your dictionary</label>
        <Search size={18} aria-hidden="true" />
        <input id="dictionary-search" className="field" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your words and definitions" />
      </div>
      <SelectMenu label="Definition status" value={filter} onChange={setFilter} options={[{value:"all",label:`All words (${entries.length})`},{value:"defined",label:"Defined"},{value:"undefined",label:"To define"}]}/>
      <button className="button button-primary" type="button" onClick={() => setAdding(!adding)} aria-expanded={adding}><Plus size={17} aria-hidden="true" /> Add word</button>
    </div>
    {error && <div role="alert" className="notice notice-error">{error}{requiresAuth && <p><Link href="/auth/sign-in?next=%2Fdictionary" onClick={preserveDraft}>Sign in again</Link></p>}</div>}
    {notice && <p role="status" className="notice">{notice}</p>}
    {adding && <form className="card" onSubmit={addWord} style={{ padding: 24, marginBottom: 24 }}>
      <h2>Add a word or phrase</h2>
      <label className="label" htmlFor="new-term">Word or phrase</label>
      <input id="new-term" className="field" required maxLength={100} value={term} onChange={(event) => {
        const value = event.target.value; setTerm(value);
        const canonical = glossaryTerms.find((item) => [item.term, ...item.aliases].some((alias) => normalizeTerm(alias) === normalizeTerm(value)));
        if (canonical && !definition) setDefinition(canonical.definition);
      }} />
      <label className="label" htmlFor="new-definition">Your definition <span className="muted">(optional)</span></label>
      <textarea id="new-definition" className="field" rows={4} maxLength={4000} value={definition} onChange={(event) => setDefinition(event.target.value)} />
      <p className="muted">Leave the definition blank to come back to it later.</p>
      <div style={{ display: "flex", gap: 8 }}><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Save word"}</button><button className="button button-secondary" type="button" onClick={() => setAdding(false)}>Cancel</button></div>
    </form>}
    {filtered.length === 0 ? <div className="card empty-state" style={{ padding: "3rem", textAlign: "center" }}>
      <BookOpen size={32} aria-hidden="true" style={{ margin: "0 auto 16px" }} />
      <h2>{entries.length ? "No words match your search" : "Your next discovery starts here."}</h2>
      <p className="muted">{entries.length ? "Try another word or change the definition filter." : "Highlight a word while reading a bill, or add one here. Give it a meaning in your own words."}</p>
      {!entries.length && <Link href="/bills" className="button button-secondary">Explore bills</Link>}
    </div> : <div style={{ display: "grid", gap: 16 }}>
      {filtered.map((entry) => <article className="card dictionary-entry" key={entry.id} style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16 }}>
          <div><h2 style={{ marginBottom: 8 }}>{entry.term}</h2><span className={`badge ${entry.definition ? "badge-green" : "badge-amber"}`}>{entry.definition ? "Defined" : "To define"}</span></div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="button button-secondary" aria-label={`Edit ${entry.term}`} disabled={busy} onClick={() => { setEditing(entry.id); setEditDraft(entry.definition); setConfirmDelete(null); }}><Pencil size={15} aria-hidden="true" /></button>
            <button className="button button-secondary" aria-label={`Remove ${entry.term} from dictionary`} disabled={busy} onClick={() => setConfirmDelete(entry.id)}><Trash2 size={15} aria-hidden="true" /></button>
          </div>
        </div>
        {editing === entry.id ? <form onSubmit={(event) => {
          event.preventDefault(); setNotice("");
          startTransition(async () => { if (report(await attempt(() => updateDictionaryEntry(entry.id, editDraft)))) { setEditing(null); setNotice("Definition updated."); } });
        }} style={{ marginTop: 16 }}>
          <label className="label" htmlFor={`edit-${entry.id}`}>Your definition</label>
          <textarea id={`edit-${entry.id}`} className="field" rows={4} maxLength={4000} value={editDraft} onChange={(event) => setEditDraft(event.target.value)} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}><button className="button button-primary" disabled={busy}><Check size={16} aria-hidden="true" />{busy ? "Saving…" : "Save definition"}</button><button type="button" className="button button-secondary" onClick={() => setEditing(null)}><X size={16} aria-hidden="true" />Cancel</button></div>
        </form> : <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", marginTop: 16 }}>{entry.definition || <span className="muted">No definition yet. Add a meaning when you’re ready.</span>}</p>}
        {entry.definitionSourceUrl && <p className="muted" style={{ fontSize: ".85rem" }}>Definition from the public glossary · <a href={entry.definitionSourceUrl} target="_blank" rel="noreferrer">Reference source <ExternalLink size={12} aria-hidden="true" style={{ display: "inline" }} /></a></p>}
        {confirmDelete === entry.id && <div className="notice" role="alert" style={{ marginTop: 16 }}><p>Remove “{entry.term}” and its saved bill references from your dictionary?</p><div style={{ display: "flex", gap: 8 }}><button className="button button-secondary" disabled={busy} onClick={() => {
          startTransition(async () => { if (report(await attempt(() => deleteDictionaryEntry(entry.id)))) { setConfirmDelete(null); setNotice("Word deleted."); } });
        }}>{busy ? "Deleting…" : "Remove word"}</button><button className="button button-secondary" onClick={() => setConfirmDelete(null)}>Keep word</button></div></div>}
        {entry.contexts.length > 0 && <details style={{ marginTop: 20 }}><summary className="text-link" style={{ cursor: "pointer" }}>Found in {entry.contexts.length} saved {entry.contexts.length === 1 ? "passage" : "passages"}</summary>
          <div style={{ display: "grid", gap: 16, marginTop: 16 }}>{entry.contexts.map((context) => <div key={context.id} style={{ borderLeft: "3px solid var(--border, #e2e5e0)", paddingLeft: 16 }}>
            <Link href={contextReaderPath(context)} className="text-link">{context.billTitle}</Link>
            <p className="muted" style={{ fontSize: ".8rem" }}>{context.congress}th Congress · {context.billType.toUpperCase()} {context.billNumber} · {context.documentKind === "text" ? "Bill text" : "Summary"} · {context.versionLabel}{context.versionDate ? ` · ${context.versionDate}` : ""}</p>
            <blockquote style={{ margin: "8px 0", fontSize: ".9rem", overflowWrap: "anywhere" }}>{context.excerpt || context.selectedText}</blockquote>
            <a href={context.sourceUrl} className="text-link" target="_blank" rel="noreferrer" style={{ fontSize: ".8rem" }}>Official source <ExternalLink size={12} aria-hidden="true" style={{ display: "inline" }} /></a>
          </div>)}</div>
        </details>}
      </article>)}
    </div>}
  </div>;
}
