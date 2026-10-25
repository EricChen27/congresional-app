import type { Bill, BillSearch, BillSummary, BillType } from "./types";

export function billLabel(bill: Pick<Bill, "billType" | "number">): string {
  return `${bill.billType === "hr" ? "H.R." : "S."} ${bill.number}`;
}

export function billPath(bill: Pick<Bill, "congress" | "billType" | "number">): string {
  return `/bills/${bill.congress}/${bill.billType}/${bill.number}`;
}

export function officialBillUrl(congress: number, type: BillType, number: string): string {
  return `https://www.congress.gov/bill/${congress}th-congress/${type === "hr" ? "house" : "senate"}-bill/${number}`;
}

/** Legislative action date, not publication date, determines the version summarized. */
export function getDefaultSummary(bill: Pick<Bill, "summaries">): BillSummary | null {
  return [...bill.summaries].sort((a, b) => b.actionDate.localeCompare(a.actionDate) || b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}

export function parseBillQuery(input: string, defaultCongress = 119): { congress: number; type: BillType; number: string } | null {
  const match = input.trim().match(/^(?:(\d{1,3})(?:th)?(?:\s+congress)?[\s:/-]+)?(h\.?\s*r\.?|s\.?)[\s-]*(\d{1,6})$/i);
  if (!match) return null;
  const congress = match[1] ? Number(match[1]) : defaultCongress;
  const number = String(Number(match[3]));
  if (congress < 93 || congress > 200 || Number(number) < 1) return null;
  return { congress, type: match[2].toLowerCase().startsWith("h") ? "hr" : "s", number };
}

/** A documented vote at any stage, or passage without objection; not a prediction of passage. */
export function hasDocumentedVote(bill: Pick<Bill, "actions">): boolean {
  return bill.actions.some(action => Boolean(action.recordedVotes?.length)
    || /\bby (?:a )?voice vote\b|\bby (?:the )?(?:yeas and nays|recorded vote|roll call vote)\b/i.test(action.text)
    || /^(?:Passed\/agreed to in (?:House|Senate):|Passed (?:House|Senate)\b)/i.test(action.text)
    || /\b(?:Agreed to|Not agreed to|Failed|Rejected|Ordered to be Reported)\b.*\b(?:Yeas and Nays|[Rr]ecorded [Vv]ote|[Rr]oll (?:no\.|call)|\d+\s*-\s*\d+)\b/i.test(action.text));
}

// Public snapshot records are immutable; reuse normalized text across keystrokes.
const searchableText = new WeakMap<Bill, string>();

export function searchBills(bills: Bill[], options: BillSearch = {}): Bill[] {
  const query = options.query?.trim() ?? "";
  const exact = parseBillQuery(query);
  const tokens = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const chamber = options.chamber?.toLowerCase();
  const matches = bills.filter((bill) => {
    if (options.category && options.category !== "all" && options.category !== "All topics" && bill.category !== options.category) return false;
    if (["house", "hr"].includes(chamber ?? "") && bill.billType !== "hr") return false;
    if (["senate", "s"].includes(chamber ?? "") && bill.billType !== "s") return false;
    if (options.voting === "voted" && !hasDocumentedVote(bill)) return false;
    if (options.voting === "not-voted" && hasDocumentedVote(bill)) return false;
    if (["2025", "2026"].includes(options.year ?? "") && !bill.introducedDate.startsWith(`${options.year}-`)) return false;
    const hasSummary = bill.summaries.some(s => s.text.trim());
    if (options.summary === "with" && !hasSummary) return false;
    if (options.summary === "without" && hasSummary) return false;
    if (exact) return bill.congress === exact.congress && bill.billType === exact.type && bill.number === exact.number;
    if (!tokens.length) return true;
    let haystack = searchableText.get(bill);
    if (haystack === undefined) {
      haystack = `${bill.title} ${bill.category} ${bill.sponsor} ${billLabel(bill)} ${bill.summaries.map((summary) => summary.text).join(" ")}`.toLocaleLowerCase();
      searchableText.set(bill, haystack);
    }
    return tokens.every((token) => haystack.includes(token));
  });
  return matches.sort((a, b) => {
    if (options.sort === "summary-first" || options.sort === "no-summary-first") {
      const difference = Number(b.summaries.some(s => s.text.trim())) - Number(a.summaries.some(s => s.text.trim()));
      if (difference) return options.sort === "summary-first" ? difference : -difference;
    }
    if (options.sort === "introduced-oldest") return a.introducedDate.localeCompare(b.introducedDate) || a.id.localeCompare(b.id);
    return options.sort === "title" ? a.title.localeCompare(b.title) : options.sort === "introduced" ? b.introducedDate.localeCompare(a.introducedDate) || a.id.localeCompare(b.id) : b.latestAction.date.localeCompare(a.latestAction.date) || a.id.localeCompare(b.id);
  });
}
