import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { GlossaryExplorer } from "@/components/glossary-explorer";
import styles from "@/components/glossary.module.css";

export const metadata: Metadata = {
  title: "Legislative glossary",
  description: "Understand common civic and congressional terms with clear, sourced definitions. Find the language you need to follow a bill.",
};

export default function GlossaryPage() {
  return (
    <div className="page-container">
      <header className={`page-heading ${styles.pageHeading}`}>
        <p className="eyebrow"><BookOpen size={16} aria-hidden="true" /> THE LANGUAGE OF CONGRESS</p>
        <h1>A little clarity goes a long way.</h1>
        <p className="muted">From amendment to voice vote, get to know the words behind the legislative process.</p>
      </header>
      <aside className={styles.introNote}>
        <BookOpen size={20} aria-hidden="true" />
        <p>These are general explanations based on official congressional sources. A bill may give a word its own specific meaning. While reading, select an underlined term to see its definition.</p>
      </aside>
      <GlossaryExplorer />
    </div>
  );
}
