import { z } from "zod";

export function normalizeTerm(term: string): string {
  return term.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
}

export function safeReturnPath(value: unknown, fallback = "/dictionary"): string {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/u.test(value)) return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\\\u0000-\u001f]/u.test(decoded)) return fallback;
    const parsed = new URL(value, "https://billbreakdown.local");
    if (parsed.origin !== "https://billbreakdown.local" || parsed.pathname.startsWith("/auth/")) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch { return fallback; }
}

export function isOfficialSource(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && ["congress.gov", "www.congress.gov", "api.congress.gov", "govinfo.gov", "www.govinfo.gov"].includes(url.hostname);
  } catch { return false; }
}

const officialUrl = z.string().max(2000).refine(isOfficialSource, "Use an official Congress.gov or GovInfo source URL.");
const definitionSourceUrl = z.string().max(2000).refine((value) => {
  if (isOfficialSource(value)) return true;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && ["senate.gov", "house.gov", "ssa.gov", "medicare.gov", "usa.gov", "hhs.gov", "fda.gov", "energy.gov", "constitution.congress.gov", "archives.gov", "eac.gov", "apcentral.collegeboard.org", "www.oxfordlearnersdictionaries.com"].some(host => url.hostname === host || url.hostname.endsWith("." + host)); }
  catch { return false; }
}, "Use a recognized civic education definition source.");
const clean = (max: number) => z.string().trim().max(max).refine((value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value), "Remove unsupported control characters.");

export const dictionaryContextSchema = z.object({
  billId: clean(100).min(1), billTitle: clean(1000).min(1),
  congress: z.number().int().min(1).max(999),
  billType: z.enum(["hr", "s", "hjres", "sjres", "hconres", "sconres", "hres", "sres"]),
  billNumber: z.string().regex(/^\d{1,7}$/),
  documentKind: z.enum(["summary", "text"]),
  versionId: clean(200).min(1), versionLabel: clean(200).min(1), versionDate: clean(50),
  selectedText: clean(160).min(1), excerpt: clean(1200), sourceUrl: officialUrl,
});

export const dictionaryDraftSchema = z.object({
  term: clean(100).min(1, "Enter a word or short phrase.").refine((value) => value.split(/\s+/u).length <= 12, "Select a word or a short phrase of up to 12 words."),
  definition: clean(4000),
  definitionOrigin: z.enum(["curated", "personal", "unset"]),
  glossaryId: clean(100).optional(),
  definitionSourceUrl: definitionSourceUrl.optional(),
  context: dictionaryContextSchema.optional(),
});

export const definitionSchema = clean(4000);
export const entryIdSchema = z.string().uuid();

export function contextReaderPath(context: { congress: number; billType: string; billNumber: string; documentKind: string; versionId: string }): string {
  return `/bills/${context.congress}/${encodeURIComponent(context.billType)}/${encodeURIComponent(context.billNumber)}?tab=${context.documentKind === "text" ? "text" : "summary"}&version=${encodeURIComponent(context.versionId)}`;
}
