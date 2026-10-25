import type { Bill, BillType } from "./types";
import type { RawAction, RawBill, RawSummary, RawTextVersion } from "./normalize";
import { normalizeBill, parseBulkBill } from "./normalize";
import { assertOfficialUrl, fetchOfficialText } from "./content";

export function bulkBillUrl(congress: number, type: BillType, number: string): string {
  return `https://www.govinfo.gov/bulkdata/BILLSTATUS/${congress}/${type}/BILLSTATUS-${congress}${type}${number}.xml`;
}

type ApiResponse<T> = { pagination?: { next?: string }; [key: string]: T[] | { next?: string } | undefined };

export async function fetchApiCollection<T>(url: string, key: string, field: string): Promise<T[]> {
  const results: T[] = [];
  const visited = new Set<string>();
  let next: string | undefined = url;
  while (next) {
    const safe = assertOfficialUrl(next, true);
    // Credentials stay in request headers, never in saved sources or console output.
    safe.searchParams.delete("api_key");
    safe.searchParams.set("format", "json");
    safe.searchParams.set("limit", "250");
    if (visited.has(safe.href) || visited.size >= 40) throw new Error("Official pagination could not be completed.");
    visited.add(safe.href);
    const data = JSON.parse(await fetchOfficialText(safe.href, { apiKey: key })) as ApiResponse<T>;
    const items = data[field];
    if (!Array.isArray(items)) throw new Error("Unexpected official API response.");
    results.push(...items);
    next = data.pagination?.next;
  }
  return results;
}

export async function fetchBillFromOfficial(congress: number, type: BillType, number: string, key = process.env.CONGRESS_API_KEY): Promise<Bill> {
  if (!Number.isInteger(congress) || congress < 93 || congress > 200 || !["hr", "s"].includes(type) || !/^[1-9]\d{0,5}$/.test(number)) throw new Error("Invalid bill identity.");
  const retrievedAt = new Date().toISOString();
  if (!key) {
    const source = bulkBillUrl(congress, type, number);
    return parseBulkBill(await fetchOfficialText(source), retrievedAt, source);
  }
  const base = `https://api.congress.gov/v3/bill/${congress}/${type}/${number}`;
  const details = JSON.parse(await fetchOfficialText(`${base}?format=json`, { apiKey: key })) as { bill: RawBill };
  if (!details.bill) throw new Error("Official bill data could not be read.");
  const [summaries, textVersions, actions] = await Promise.all([
    fetchApiCollection<RawSummary>(`${base}/summaries`, key, "summaries"),
    fetchApiCollection<RawTextVersion>(`${base}/text`, key, "textVersions"),
    fetchApiCollection<RawAction>(`${base}/actions`, key, "actions"),
  ]);
  return normalizeBill(details.bill, { summaries, textVersions, actions }, retrievedAt, base);
}
