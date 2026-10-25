import { load } from "cheerio";

/** Never send source markup to the browser: parsing to text removes executable content. */
export function officialMarkupToText(markup: string, xml = false): string {
  const $ = load(markup, xml ? { xml: true } : undefined);
  $("script,style,iframe,object,embed,noscript,svg,math,head").remove();
  const pre = $("pre").first();
  if (!xml && pre.length) return pre.text().replace(/\r\n/g, "\n").replace(/\u00a0/g, " ").trim();
  $("br").replaceWith("\n");
  $("p,li,div,section,article,h1,h2,h3,h4,h5,header,table,tr,enum,header,text,short-title,official-title").each((_, element) => { $(element).append("\n\n"); });
  return $.root().text().replace(/\u00a0/g, " ").replace(/[\t ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

const OFFICIAL_HOSTS = new Set(["clerk.house.gov", "www.senate.gov", "api.congress.gov", "www.congress.gov", "congress.gov", "www.govinfo.gov", "govinfo.gov"]);

export function assertOfficialUrl(input: string, apiOnly = false): URL {
  const url = new URL(input);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || !OFFICIAL_HOSTS.has(url.hostname) || (apiOnly && url.hostname !== "api.congress.gov")) {
    throw new Error("Unsupported official source URL.");
  }
  return url;
}

export class OfficialSourceError extends Error {
  constructor(public status: number, message = "The official source is temporarily unavailable.") { super(message); }
}

/** Explicit redirect validation prevents an official URL redirecting into internal services. */
export async function fetchOfficialText(input: string, options: { apiKey?: string; maxBytes?: number } = {}): Promise<string> {
  let url = assertOfficialUrl(input, Boolean(options.apiKey));
  const signal = AbortSignal.timeout(20_000);
  const maxBytes = options.maxBytes ?? 8_000_000;
  for (let redirect = 0; redirect <= 3; redirect++) {
    const response = await fetch(url, {
      cache: "no-store", redirect: "manual", signal,
      headers: { Accept: "application/json, application/xml, text/html, text/plain;q=0.9", ...(options.apiKey ? { "X-Api-Key": options.apiKey } : {}) },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new OfficialSourceError(response.status);
      url = assertOfficialUrl(new URL(location, url).href, Boolean(options.apiKey));
      continue;
    }
    if (!response.ok) throw new OfficialSourceError(response.status);
    if (Number(response.headers.get("content-length")) > maxBytes) throw new Error("Official document exceeds the reader size limit.");
    if (response.headers.get("content-type")?.includes("application/pdf")) throw new Error("This version is available as a PDF. Open the official document to read it.");
    if (!response.body) return "";
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let size = 0;
    let text = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new Error("Official document exceeds the reader size limit."); }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  }
  throw new Error("The official source redirected too many times.");
}
