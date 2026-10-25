import { load } from "cheerio";
import type { Bill, BillAction, BillSummary, BillType, TextVersion } from "./types";
import { officialBillUrl } from "./search";
import { assertOfficialUrl, officialMarkupToText } from "./content";

export interface RawSummary { versionCode?: string; actionDate?: string; actionDesc?: string; updateDate?: string; text?: string }
export interface RawAction { recordedVotes?: {url?:string; chamber?:string; date?:string; rollNumber?:string|number}[]; actionDate?: string; text?: string; actionCode?: string }
export interface RawTextVersion { type?: string; date?: string | null; formats?: { type?: string; url?: string }[] }
export interface RawBill {
  number: string | number; congress: number | string; type: string; title?: string; introducedDate?: string;
  updateDateIncludingText?: string; updateDate?: string; policyArea?: { name?: string };
  sponsors?: { fullName?: string }[]; latestAction?: { actionDate?: string; text?: string };
}

function validSourceUrl(url: string | undefined): string | null {
  if (!url) return null;
  try { return assertOfficialUrl(url).href; } catch { return null; }
}

export function normalizeBill(raw: RawBill, parts: { summaries: RawSummary[]; textVersions: RawTextVersion[]; actions: RawAction[] }, retrievedAt: string, sourceUrl: string): Bill {
  const congress = Number(raw.congress);
  const billType = raw.type.toLowerCase() as BillType;
  const number = String(raw.number);
  if (!Number.isInteger(congress) || congress < 93 || congress > 200 || !["hr", "s"].includes(billType) || !/^[1-9]\d{0,5}$/.test(number)) throw new Error("Unsupported official bill identity.");
  const id = `${congress}-${billType}-${number}`;
  const officialUrl = officialBillUrl(congress, billType, number);
  const summaries: BillSummary[] = parts.summaries.filter((summary) => summary.text && summary.actionDate).map((summary) => ({
    id: `${summary.versionCode ?? "summary"}-${summary.actionDate}-${summary.updateDate ?? "undated"}`,
    text: officialMarkupToText(summary.text!), actionDate: summary.actionDate!, updatedAt: summary.updateDate ?? "",
    versionLabel: summary.actionDesc ?? "Official summary", sourceUrl: `${officialUrl}/summaries`,
  }));
  const textVersions: TextVersion[] = parts.textVersions.flatMap((version) => {
    const formats = version.formats?.filter((format) => validSourceUrl(format.url)) ?? [];
    const preferred = formats.find((format) => /formatted text|html/i.test(format.type ?? "") || /\.htm[l]?$/i.test(format.url!))
      ?? formats.find((format) => /xml/i.test(format.type ?? "") || /\.xml$/i.test(format.url!))
      ?? formats.find((format) => /\.txt$/i.test(format.url!)) ?? formats[0];
    if (!preferred?.url) return [];
    const format = /\.pdf$/i.test(preferred.url) ? "pdf" : /\.xml$/i.test(preferred.url) ? "xml" : /\.txt$/i.test(preferred.url) ? "text" : "html";
    const packageMatch = preferred.url.match(/\/pkg\/(BILLS-[^/]+)\//);
    return [{ id: packageMatch?.[1] ?? `${version.type ?? "text"}-${version.date ?? "undated"}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"), type: version.type ?? "Official text", date: version.date ?? "", url: preferred.url, format } satisfies TextVersion];
  }).sort((a, b) => b.date.localeCompare(a.date));
  const seen = new Set<string>();
  const actions: BillAction[] = parts.actions.filter((action) => action.actionDate && action.text).flatMap((action) => {
    const key = `${action.actionDate}:${action.text}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ recordedVotes: (action.recordedVotes ?? []).flatMap(v => { const url=validSourceUrl(v.url); return url && ["clerk.house.gov","www.senate.gov"].includes(new URL(url).hostname) ? [{url,chamber:v.chamber ?? "",date:v.date ?? action.actionDate!,rollNumber:String(v.rollNumber ?? "")}] : []; }), date: action.actionDate!, text: action.text!, ...(action.actionCode ? { code: action.actionCode } : {}), sourceUrl: `${officialUrl}/all-actions` }];
  }).sort((a, b) => b.date.localeCompare(a.date));
  return {
    id, congress, billType, number, title: raw.title || `${billType === "hr" ? "H.R." : "S."} ${number}`,
    category: raw.policyArea?.name ?? "Not yet assigned", introducedDate: raw.introducedDate ?? "",
    sponsor: raw.sponsors?.[0]?.fullName ?? "Sponsor information unavailable",
    latestAction: { date: raw.latestAction?.actionDate ?? "", text: raw.latestAction?.text ?? "No action information available." },
    officialUrl, retrievedAt, sourceUpdatedAt: raw.updateDateIncludingText ?? raw.updateDate,
    sourceUrl, summaries, textVersions, actions,
  };
}

/** GPO republishes Congress.gov bill metadata as official, public, key-free XML. */
export function parseBulkBill(xml: string, retrievedAt: string, sourceUrl: string): Bill {
  const $ = load(xml, { xml: true });
  const bill = $("billStatus > bill").first();
  if (!bill.length) throw new Error("Official bill data could not be read.");
  const get = (path: string) => path.split(">").reduce((node, part) => node.children(part.trim()).first(), bill).text();
  const summaries: RawSummary[] = bill.children("summaries").children("summary").toArray().map((item) => ({
    versionCode: $(item).find("versionCode").text(), actionDate: $(item).find("actionDate").text(),
    actionDesc: $(item).find("actionDesc").text(), updateDate: $(item).find("updateDate").text(), text: $(item).find("text").text(),
  }));
  const textVersions: RawTextVersion[] = bill.children("textVersions").children("item").toArray().map((item) => ({
    type: $(item).children("type").text(), date: $(item).children("date").text(),
    formats: $(item).find("formats > item").toArray().map((format) => ({ type: $(format).children("type").text(), url: $(format).children("url").text() })),
  }));
  const actions: RawAction[] = bill.children("actions").children("item").toArray().map((item) => ({
    recordedVotes: $(item).find("recordedVotes > recordedVote").toArray().map(v=>({url:$(v).children("url").text(),chamber:$(v).children("chamber").text(),date:$(v).children("date").text(),rollNumber:$(v).children("rollNumber").text()})),
    actionDate: $(item).children("actionDate").text(), text: $(item).children("text").text(), actionCode: $(item).children("actionCode").text(),
  }));
  return normalizeBill({
    congress: get("congress"), type: get("type"), number: get("number"), title: get("title"), introducedDate: get("introducedDate"),
    updateDateIncludingText: get("updateDateIncludingText"), updateDate: get("updateDate"), policyArea: { name: get("policyArea > name") || undefined },
    sponsors: bill.children("sponsors").children("item").toArray().map((item) => ({ fullName: $(item).children("fullName").text() })),
    latestAction: { actionDate: get("latestAction > actionDate"), text: get("latestAction > text") },
  }, { summaries, textVersions, actions }, retrievedAt, sourceUrl);
}
