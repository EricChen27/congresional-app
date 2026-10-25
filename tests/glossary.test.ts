import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { glossaryTerms } from "../src/data/glossary";
import { findGlossaryTerm, splitGlossaryText } from "../src/lib/glossary";
import { GlossaryText } from "../src/components/glossary-text";

vi.mock("@/lib/dictionary/actions",()=>({saveDictionaryEntry:vi.fn(),deleteDictionaryEntry:vi.fn()}));

describe("legislative glossary", () => {
  it("has reviewed civic terms and an official source for every explanation", () => {
    expect(glossaryTerms.length).toBeGreaterThanOrEqual(100);
    expect(new Set(glossaryTerms.map((term) => term.id)).size).toBe(glossaryTerms.length);
    for (const term of glossaryTerms) {
      expect(term.definition).not.toBe("");
      expect(new URL(term.sourceUrl).hostname).toMatch(/(^|\.)(congress\.gov|senate\.gov|house\.gov|usa\.gov|ssa\.gov|medicare\.gov|hhs\.gov|fda\.gov|energy\.gov|archives\.gov|eac\.gov|apcentral\.collegeboard\.org|oxfordlearnersdictionaries\.com)$/);
      expect(term.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("finds exact terms and explicit aliases with normalized case, spacing, and hyphens", () => {
    expect(findGlossaryTerm("  COSPONSORS  ")?.id).toBe("cosponsor");
    expect(findGlossaryTerm("Co‑sponsor")?.id).toBe("cosponsor");
    expect(findGlossaryTerm("ROLL\nCALL   VOTE")?.id).toBe("roll-call-vote");
    expect(findGlossaryTerm("  enrolled BILL ")?.id).toBe("enrolled");
    expect(findGlossaryTerm("A bill about schools")).toBeUndefined();
    expect(findGlossaryTerm("unknown")).toBeUndefined();
  });

  it("uses complete words, including beside Unicode letters and combining marks", () => {
    const text = "bill billing billé ébill bill\u0301 bill_2 Bill. subcommittee committee cosponsor sponsor";
    expect(splitGlossaryText(text).filter((part) => part.term).map((part) => part.term?.id)).toEqual([
      "bill", "bill", "subcommittee", "committee", "cosponsor", "sponsor",
    ]);
  });

  it("prefers the longest matching phrase over component terms", () => {
    const parts = splitGlossaryText("An engrossed bill awaits a veto override and a roll\ncall vote.");
    expect(parts.filter((part) => part.term).map((part) => [part.text, part.term?.id])).toEqual([
      ["engrossed bill", "engrossed"],
      ["veto override", "override"],
      ["roll\ncall vote", "roll-call-vote"],
    ]);
  });

  it("preserves punctuation, whitespace, and untrusted markup as literal text", () => {
    const text = '<img src=x onerror="alert(1)">\n“Amendment” & a Co‑sponsor; $bill (hearing).';
    expect(splitGlossaryText(text).map((part) => part.text).join("")).toBe(text);
    const html = renderToStaticMarkup(createElement(GlossaryText, { text }));
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
    expect(html).toContain("aria-haspopup=\"dialog\"");
  });

  it("keeps empty and unmatched text intact and does not reuse regex state", () => {
    expect(splitGlossaryText("")).toEqual([]);
    expect(splitGlossaryText("hello & goodbye")).toEqual([{ text: "hello & goodbye" }]);
    expect(splitGlossaryText("Bill")).toEqual(splitGlossaryText("Bill"));
  });
});

describe('government curriculum vocabulary',()=>{
  it('recognizes new aliases and does not split longer constitutional terms',()=>{
    expect(findGlossaryTerm('elastic clause')?.id).toBe('necessary-and-proper-clause');
    expect(findGlossaryTerm('battleground state')?.id).toBe('swing-state');
    expect(splitGlossaryText('The Bill of Rights protects civil liberties.').filter(part=>part.term).map(part=>part.term?.id)).toEqual(['bill-of-rights','civil-liberties']);
    expect(glossaryTerms.filter(term=>term.id==='filibuster')).toHaveLength(1);
    expect(glossaryTerms.filter(term=>term.id==='electoral-college')).toHaveLength(1);
  });
});

it('matches specialized legislative phrases without treating ordinary words as terms',()=>{
 expect(splitGlossaryText('The conference report and motion to table followed a quorum call.').filter(p=>p.term).map(p=>p.term?.id)).toEqual(['conference-report','motion-to-table','quorum-call']);
 expect(findGlossaryTerm('suspend the rules')?.id).toBe('suspension-of-the-rules');
 for(const word of ['table','report','short','private'])expect(findGlossaryTerm(word)).toBeUndefined();
});
it('keeps every new legislative alias unambiguous and preserves source text',()=>{
 const seen=new Map<string,string>();
 for(const term of glossaryTerms)for(const name of [term.term,...term.aliases]){
  const key=name.toLowerCase();expect(!seen.has(key)||seen.get(key)===term.id).toBe(true);seen.set(key,term.id);
 }
 const text='An amendment in the nature of a substitute followed the committee report.';
 expect(splitGlossaryText(text).map(p=>p.text).join('')).toBe(text);
 expect(splitGlossaryText(text).filter(p=>p.term).map(p=>p.term?.id)).toEqual(['substitute-amendment','committee-report']);
});

it('covers every heading in the Congress.gov legislative glossary reviewed on 2026-10-23',async()=>{
 const {default:headings}=await import('./fixtures/congress-glossary-headings.json');
 for(const heading of headings)expect(findGlossaryTerm(heading),heading).toBeDefined();
 expect(findGlossaryTerm('ping-pong')?.id).toBe('amendment-exchange');
 expect(findGlossaryTerm('engrossed measure')?.id).toBe('engrossed');
});
