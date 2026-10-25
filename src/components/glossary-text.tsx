"use client";

import { useEffect, useId, useMemo, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { BookOpen, ExternalLink, X } from "lucide-react";
import type { GlossaryTerm } from "@/data/glossary";
import { glossarySourceLabel, splitGlossaryText } from "@/lib/glossary";
import { TermDictionaryButton } from "./dictionary-terms";
import styles from "./glossary.module.css";

export function GlossaryText({ text }: { text: string }) {
  const parts = useMemo(() => splitGlossaryText(text), [text]);
  const [activeTerm, setActiveTerm] = useState<GlossaryTerm | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!activeTerm) return;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, [activeTerm]);

  function openDefinition(event: MouseEvent<HTMLButtonElement>, term: GlossaryTerm) {
    // A drag or long-press selection belongs to the reader's dictionary action.
    const selection = window.getSelection();
    if (event.detail !== 0 && selection && !selection.isCollapsed && selection.toString().trim()) return;
    setActiveTerm(term);
  }

  return (
    <>
      {parts.map((part, index) => part.term ? (
        <button
          className={styles.term}
          key={index}
          type="button"
          aria-haspopup="dialog"
          aria-label={`Define ${part.text}`}
          onClick={(event) => openDefinition(event, part.term!)}
        >
          {part.text}
        </button>
      ) : part.text)}
      {activeTerm && createPortal(
        <dialog
          ref={dialogRef}
          className={styles.dialog}
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          onClose={() => setActiveTerm(null)}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
              event.currentTarget.close();
            }
          }}
        >
          <div className={styles.dialogTop}>
            <span className={styles.definitionLabel}><BookOpen size={16} aria-hidden="true" /> LEGISLATIVE GLOSSARY</span>
            <button type="button" className={styles.closeButton} aria-label="Close definition" onClick={() => dialogRef.current?.close()}>
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <h2 id={titleId} className={styles.dialogTitle}>{activeTerm.term}</h2>
          <p id={descriptionId} className={styles.dialogDefinition}>{activeTerm.definition}</p>
          <p className={styles.contextNote}>A general civic meaning. A bill may define a term differently.</p>
          <TermDictionaryButton term={activeTerm}/>
          <div className={styles.dialogFooter}>
            <a href={activeTerm.sourceUrl} target="_blank" rel="noreferrer" className={styles.sourceLink}>
              {glossarySourceLabel(activeTerm.sourceUrl)} <ExternalLink size={14} aria-hidden="true" />
            </a>
            <span className={styles.reviewDate}>Reviewed {activeTerm.verifiedAt}</span>
          </div>
        </dialog>,
        document.body,
      )}
    </>
  );
}

export default GlossaryText;
