"use client";

import { useId, useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, Search, X } from "lucide-react";
import { glossaryTerms } from "@/data/glossary";
import { glossarySourceLabel, normalizeGlossaryText } from "@/lib/glossary";
import { TermDictionaryButton } from "./dictionary-terms";
import styles from "./glossary.module.css";

const sortedTerms = [...glossaryTerms].sort((left, right) => left.term.localeCompare(right.term, "en"));
const letters = [...new Set(sortedTerms.map((term) => term.term[0].toUpperCase()))];

export function GlossaryExplorer() {
  const [search, setSearch] = useState("");
  const [letter, setLetter] = useState<string | null>(null);
  const searchId = useId();
  const searchQuery = normalizeGlossaryText(search);
  const matchingTerms = useMemo(() => sortedTerms.filter((term) => {
    if (letter && !term.term.startsWith(letter)) return false;
    return !searchQuery || normalizeGlossaryText([term.term, ...term.aliases, term.definition].join(" ")).includes(searchQuery);
  }), [letter, searchQuery]);

  function resetFilters() {
    setSearch("");
    setLetter(null);
  }

  return (
    <div className={styles.explorer}>
      <div className={styles.searchPanel}>
        <label className={styles.searchLabel} htmlFor={searchId}>Find a term</label>
        <div className={styles.searchInputWrap}>
          <Search size={21} aria-hidden="true" className={styles.searchIcon} />
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={`field ${styles.searchInput}`}
            placeholder="Try amendment, cloture, or funding…"
            autoComplete="off"
          />
          {search && <button type="button" className={styles.clearSearch} onClick={() => setSearch("")} aria-label="Clear search"><X size={17} aria-hidden="true" /></button>}
        </div>
        <div className={styles.alphabet} role="group" aria-label="Filter terms by first letter">
          <button type="button" className={`${styles.letterButton} ${letter === null ? styles.activeLetter : ""}`} aria-pressed={letter === null} onClick={() => setLetter(null)}>All terms</button>
          {letters.map((initial) => (
            <button type="button" key={initial} className={`${styles.letterButton} ${letter === initial ? styles.activeLetter : ""}`} aria-label={`Terms beginning with ${initial}`} aria-pressed={letter === initial} onClick={() => setLetter(initial)}>{initial}</button>
          ))}
        </div>
      </div>

      <div className={styles.resultsHeader}>
        <p role="status" aria-live="polite" className="muted">{matchingTerms.length} {matchingTerms.length === 1 ? "term" : "terms"}{searchQuery || letter ? ` of ${glossaryTerms.length}` : " to help you read with confidence"}</p>
        {(searchQuery || letter) && <button type="button" className={styles.resetButton} onClick={resetFilters}>Reset filters</button>}
      </div>

      {matchingTerms.length ? (
        <div className={styles.termGrid}>
          {matchingTerms.map((term) => (
            <article key={term.id} id={term.id} className={`card ${styles.termCard}`}>
              <div className={styles.cardHeading}>
                <h2>{term.term}</h2>
                <span className={styles.initial} aria-hidden="true">{term.term[0]}</span>
              </div>
              <p className={styles.cardDefinition}>{term.definition}</p>
              <TermDictionaryButton term={term}/>
              <div className={styles.cardFooter}>
                <a className={styles.sourceLink} href={term.sourceUrl} target="_blank" rel="noreferrer">{glossarySourceLabel(term.sourceUrl)} <ArrowUpRight size={15} aria-hidden="true" /></a>
                <span className={styles.reviewDate}>Reviewed {term.verifiedAt}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={`card ${styles.emptyState}`}>
          <BookOpen size={32} aria-hidden="true" />
          <h2>No matching terms yet</h2>
          <p className="muted">Try another word or clear the letter filter. You can save unfamiliar words from a bill to your own dictionary.</p>
          <button type="button" onClick={resetFilters} className="button button-secondary">Show all terms</button>
        </div>
      )}
    </div>
  );
}

export default GlossaryExplorer;
