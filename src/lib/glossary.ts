import { glossaryTerms, type GlossaryTerm } from "@/data/glossary";

export type GlossaryTextPart = { text: string; term?: GlossaryTerm };

export function normalizeGlossaryText(text: string): string {
  return text.normalize("NFKC").replace(/[\u2010-\u2015]/g, "-").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

const termByAlias = new Map<string, GlossaryTerm>();
for (const term of glossaryTerms) {
  for (const alias of [term.term, ...term.aliases]) {
    termByAlias.set(normalizeGlossaryText(alias), term);
  }
}

export function findGlossaryTerm(text: string): GlossaryTerm | undefined {
  return termByAlias.get(normalizeGlossaryText(text));
}

function aliasPattern(alias: string): string {
  return alias.split(/\s+/).map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/-/g, "[-\\u2010-\\u2015]")).join("\\s+");
}

const aliases = [...termByAlias.keys()].sort((left, right) => right.length - left.length);
const glossaryPattern = `(?<![\\p{L}\\p{N}\\p{M}_])(?:${aliases.map(aliasPattern).join("|")})(?![\\p{L}\\p{N}\\p{M}_])`;

/** Splits plain text without changing its content or treating it as markup. */
export function splitGlossaryText(text: string): GlossaryTextPart[] {
  if (!text) return [];
  const parts: GlossaryTextPart[] = [];
  const matcher = new RegExp(glossaryPattern, "giu");
  let cursor = 0;

  for (const match of text.matchAll(matcher)) {
    const start = match.index;
    if (start > cursor) parts.push({ text: text.slice(cursor, start) });
    parts.push({ text: match[0], term: findGlossaryTerm(match[0]) });
    cursor = start + match[0].length;
  }

  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts;
}

export function glossarySourceLabel(sourceUrl: string): string {
  const hostname = new URL(sourceUrl).hostname;
  if (hostname === "www.oxfordlearnersdictionaries.com") return "Oxford Learner’s Dictionaries";
  if (hostname === "apcentral.collegeboard.org") return "College Board · AP U.S. Government";
  if (hostname === "constitution.congress.gov") return "Constitution Annotated";
  if (hostname === "www.archives.gov") return "National Archives";
  if (hostname === "www.eac.gov") return "U.S. Election Assistance Commission";
  if (hostname === "www.congress.gov") return "Congress.gov glossary";
  if (hostname === "www.appropriations.senate.gov") return "Senate Appropriations Committee";
  if (hostname.endsWith("senate.gov")) return "U.S. Senate";
  return hostname.replace(/^www\./, "");
}
