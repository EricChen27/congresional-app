import { readFile, rename, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { load } from "cheerio";
import type { Bill, BillCatalog, BillType } from "../src/lib/bills/types";
import { fetchBillFromOfficial } from "../src/lib/bills/fetch";
import { fetchOfficialText, officialMarkupToText } from "../src/lib/bills/content";

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => args.find((arg) => arg.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? fallback;
const all = option("limit", "all") === "all";
let target = all ? 0 : Number(option("limit", "all"));
const congress = Number(option("congress", "119"));
const output = path.resolve(option("output", "src/data/bills.json"));
const checkpoint = path.resolve(".cache", `bill-import-${congress}-${all ? "all" : target}-${createHash("sha256").update(output).digest("hex").slice(0, 12)}.json`);
const force = args.includes("--refresh");
const metadataOnly = args.includes("--metadata-only");
const featured = congress === 119 ? ["119-hr-164", "119-hr-224", "119-s-146"] : [];

if ((!all && (!Number.isInteger(target) || target < 3 || target > 100000)) || !Number.isInteger(congress) || congress < 93 || congress > 200) {
  throw new Error("Use --limit=all or --limit=3 through 100000 and a supported --congress number.");
}

async function atomicWrite(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temp, file);
}

interface Candidate { id: string; type: BillType; number: string; modified: number }

async function recentBulkCandidates(): Promise<Candidate[]> {
  const output: Candidate[] = [];
  for (const type of ["hr", "s"] as const) {
    const before = output.length;
    const content = await fetchOfficialText(`https://www.govinfo.gov/bulkdata/BILLSTATUS/${congress}/${type}`, { maxBytes: 25_000_000 });
    const $ = load(content);
    $("tr[data-name]").each((_, row) => {
      const match = $(row).attr("data-name")?.match(new RegExp(`^BILLSTATUS-${congress}${type}(\\d+)\\.xml$`));
      if (!match) return;
      const modifiedText = $(row).find('td[data-label="Last Modified (GMT)"]').text().trim();
      const modified = Date.parse(`${modifiedText} GMT`);
      output.push({ id: `${congress}-${type}-${match[1]}`, type, number: match[1], modified: Number.isNaN(modified) ? 0 : modified });
    });
    if (output.length === before) throw new Error("One chamber index could not be read.");
  }
  if (new Set(output.map(row => row.id)).size !== output.length) throw new Error("Duplicate index identities");
  if (all) target = output.length;
  if (target < 3) throw new Error("The official index is empty or incomplete.");
  if (output.length < target) throw new Error("The official bulk-data index could not supply the requested coverage.");
  output.sort((a, b) => b.modified - a.modified || a.id.localeCompare(b.id));
  const featuredRows = featured.map((id) => output.find((row) => row.id === id)).filter((row): row is Candidate => Boolean(row));
  return [...featuredRows, ...output.filter((row) => !featured.includes(row.id))].slice(0, target);
}

async function attachOfflineText(bill: Bill) {
  // Cache the current exact version for every bill, and every version for featured examples.
  const versions = bill.featured ? bill.textVersions : bill.textVersions.slice(0, 1);
  for (const version of versions) {
    if (version.format === "pdf") continue;
    try {
      // The GPO formatted-text representation preserves bill layout better than raw XML.
      const htmlUrl = version.url.replace(/\/xml\/(BILLS-[^/]+)\.xml$/, "/html/$1.htm");
      let markup: string;
      try {
        markup = await fetchOfficialText(htmlUrl);
        version.url = htmlUrl;
        version.format = "html";
      } catch { markup = await fetchOfficialText(version.url); }
      const text = officialMarkupToText(markup, version.format === "xml");
      if (text && text.length <= 600_000) { version.text = text; version.retrievedAt = new Date().toISOString(); }
    } catch {
      // The official source link remains available. Missing text never becomes invented content.
      console.warn(`Text snapshot unavailable: ${bill.id}, ${version.id}`);
    }
  }
}

async function main() {
  const candidates = await recentBulkCandidates();
  console.log(`Official index coverage: ${candidates.length} bills (${candidates.filter(c=>c.type==="hr").length} House, ${candidates.filter(c=>c.type==="s").length} Senate).`);
  const cachedText = new Map<string, Bill>();
  if (metadataOnly) {
    try { const previous = JSON.parse(await readFile(output, "utf8")) as BillCatalog; previous.bills.forEach((bill) => cachedText.set(bill.id, bill)); } catch { /* No existing text cache. */ }
  }
  let completed: Bill[] = [];
  let writes = Promise.resolve();
  if (!force) {
    try {
      const saved = JSON.parse(await readFile(checkpoint, "utf8")) as BillCatalog;
      if (saved.congress === congress && saved.targetCount === target) completed = saved.bills;
    } catch { /* A fresh import has no checkpoint. */ }
  }
  const selected = new Set(candidates.map((candidate) => candidate.id));
  completed = completed.filter((bill) => selected.has(bill.id));
  const snapshot = (): BillCatalog => ({
    congress, targetCount: target, retrievedAt: new Date().toISOString(), source: `https://www.govinfo.gov/bulkdata/BILLSTATUS/${congress}`,
    selection: all ? `All ${target} H.R. and S. bills available in the official GPO index when this import began. Resolutions and other Congresses are not included. This is a dated snapshot, not a live feed.` : `${completed.length} House and Senate bills: three featured examples plus records most recently updated in the official GPO index. Updates are metadata changes, not necessarily new legislative actions.`,
    bills: [...completed].sort((a, b) => a.id.localeCompare(b.id)),
  });
  let cursor = 0;
  let failed = false;
  const pending = candidates.filter(c => !completed.some(b => b.id === c.id));
  await Promise.all(Array.from({length: 4}, async () => {
  while (cursor < pending.length && !failed) {
    const candidate = pending[cursor++];
    if (completed.some((bill) => bill.id === candidate.id)) continue;
    try {
      let bill: Bill | undefined;
      for (let attempt=0; attempt<3; attempt++) {
        try { bill = await fetchBillFromOfficial(congress, candidate.type, candidate.number, ""); break; }
        catch { if(attempt===2) throw new Error("Import failed"); await new Promise(r=>setTimeout(r,1000*(attempt+1))); }
      }
      if (!bill || bill.id !== candidate.id) throw new Error("Missing or mismatched bill");
      bill.featured = featured.includes(bill.id);
      if (metadataOnly) {
        for (const version of bill.textVersions) {
          const saved = cachedText.get(bill.id)?.textVersions.find((item) => item.id === version.id && item.text);
          if (saved) { version.text = saved.text; version.retrievedAt = saved.retrievedAt; version.url = saved.url; version.format = saved.format; }
        }
      } else await attachOfflineText(bill);
      completed.push(bill);
      if (completed.length % 250 === 0) { const copy = snapshot(); writes = writes.then(()=>atomicWrite(checkpoint, copy)); await writes; }
      if(completed.length % 100 === 0 || completed.length === target) console.log(`Imported ${completed.length}/${target}: ${bill.id}`);
    } catch {
      // Avoid logging transport errors, which may include request credentials.
      console.error(`Import stopped at ${candidate.id}. The previous catalog is unchanged; rerun to resume from the checkpoint.`);
      process.exitCode = 1;
      failed = true;
      return;
    }
  }
  }));
  await writes;
  await atomicWrite(checkpoint, snapshot());
  if(failed) return;
  if (completed.length !== target || new Set(completed.map(b=>b.id)).size !== target) throw new Error("Incomplete catalog");
  await atomicWrite(output, snapshot());
  console.log(`Saved ${completed.length} verified bill records to ${output}.`);
}

main().catch(() => { console.error("The official catalog could not be imported. Check network access and API configuration; existing data was retained."); process.exitCode = 1; });
