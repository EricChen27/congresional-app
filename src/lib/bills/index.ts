import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Bill, BillCatalog, BillType, TextVersion } from "./types";
import { fetchBillFromOfficial } from "./fetch";
import { fetchOfficialText, officialMarkupToText } from "./content";

export type { Bill, BillSummary, BillAction, BillType, TextVersion, BillSearch, BillCatalog } from "./types";
export { billLabel, billPath, getDefaultSummary, officialBillUrl, parseBillQuery, searchBills } from "./search";

// Read the server-only data asset once rather than compiling thousands of records into JS.
const catalog = JSON.parse(readFileSync(path.join(process.cwd(), "src/data/bills.json"), "utf8")) as BillCatalog;
const billsById = new Map(catalog.bills.map(bill => [bill.id, bill]));
// A bounded, short-lived cache only for public remote records. Private data never enters here.
const remoteBills = new Map<string, { expires: number; bill: Bill }>();

export async function listBills(): Promise<Bill[]> { return catalog.bills; }

export function getCatalogInfo() {
  return { count: catalog.bills.length, targetCount: catalog.targetCount, congress: catalog.congress, retrievedAt: catalog.retrievedAt, source: catalog.source, selection: catalog.selection };
}

export async function getBill(congress: number | string, type: string, number: string | number): Promise<Bill | null> {
  const parsedCongress = Number(congress);
  const parsedNumber = String(number);
  if (!Number.isInteger(parsedCongress) || parsedCongress < 93 || parsedCongress > 200 || !["hr", "s"].includes(type) || !/^[1-9]\d{0,5}$/.test(parsedNumber)) return null;
  const id = `${parsedCongress}-${type}-${parsedNumber}`;
  const saved = billsById.get(id);
  if (saved) return saved;
  const cached = remoteBills.get(id);
  if (cached && cached.expires > Date.now()) return cached.bill;
  try {
    const bill = await fetchBillFromOfficial(parsedCongress, type as BillType, parsedNumber);
    if (remoteBills.size >= 100) remoteBills.delete(remoteBills.keys().next().value!);
    remoteBills.set(id, { expires: Date.now() + 6 * 60 * 60 * 1000, bill });
    return bill;
  } catch { return null; }
}

export async function getBillText(bill: Bill, versionId?: string): Promise<{ text: string | null; version: TextVersion | null; error?: string }> {
  // Enrolled text is the final congressional version even when its publication date is missing.
  const version = versionId ? bill.textVersions.find((item) => item.id === versionId)
    : bill.textVersions.find(item => /enrolled/i.test(item.type)) ?? [...bill.textVersions].sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!version) return { text: null, version: null, error: versionId ? "That document version was not found." : "Readable text is not yet available for this bill." };
  if (version.text) return { text: version.text, version };
  if (version.format === "pdf" || /\.pdf(?:\?|$)/i.test(version.url)) return { text: null, version, error: "This version is available as a PDF. Open the official document to read it." };
  try {
    const content = await fetchOfficialText(version.url);
    const text = version.format === "text" ? content : officialMarkupToText(content, version.format === "xml");
    if (!text) throw new Error("Empty document");
    return { text, version };
  } catch { return { text: null, version, error: "The official text is temporarily unavailable. You can still open its source document." }; }
}
