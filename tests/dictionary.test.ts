import { describe, expect, it } from "vitest";
import { dictionaryDraftSchema, normalizeTerm, safeReturnPath, isOfficialSource, contextReaderPath } from "@/lib/dictionary/validation";
import { glossaryTerms } from "@/data/glossary";
import { makeDictionaryDraft, parseStoredDraft } from "@/lib/reader";

describe("private dictionary input boundaries", () => {
  it("normalizes Unicode forms and whitespace without erasing phrase boundaries", () => {
    expect(normalizeTerm("  ＶＯＴＥ\t  Count \n")).toBe("vote count");
    expect(normalizeTerm("roll-call vote")).not.toBe(normalizeTerm("roll call vote"));
  });
  it("rejects external and disguised return destinations", () => {
    for (const path of ["https://evil.test", "//evil.test", "/\\evil.test", "/%2fexample.test", "/%5cevil.test", "/auth/callback?next=/", "/bad\npath"]) expect(safeReturnPath(path)).toBe("/dictionary");
    expect(safeReturnPath("/bills/119/hr/164?tab=text&version=BILLS-119hr164ih")).toBe("/bills/119/hr/164?tab=text&version=BILLS-119hr164ih");
  });
  it("prefills every curated source including official Senate definitions", () => {
    for (const term of glossaryTerms) {
      const draft = makeDictionaryDraft(term.term);
      expect(draft.definition).toBe(term.definition);
      expect(dictionaryDraftSchema.safeParse(draft).success, term.term).toBe(true);
    }
    expect(makeDictionaryDraft("unfamiliar phrase").definitionOrigin).toBe("unset");
  });
  it("permits a blank definition and bounds selected phrases", () => {
    expect(dictionaryDraftSchema.safeParse(makeDictionaryDraft("new word")).success).toBe(true);
    expect(dictionaryDraftSchema.safeParse(makeDictionaryDraft("x".repeat(101))).success).toBe(false);
    expect(dictionaryDraftSchema.safeParse(makeDictionaryDraft("word ".repeat(13))).success).toBe(false);
    expect(dictionaryDraftSchema.safeParse({...makeDictionaryDraft("word"), definition:"x".repeat(4001)}).success).toBe(false);
  });
  it("rejects forged government source hosts and non-HTTPS sources", () => {
    expect(isOfficialSource("https://www.govinfo.gov/content/pkg/BILLS-119hr164ih/html/BILLS-119hr164ih.htm")).toBe(true);
    for(const url of ["https://congress.gov.evil.test/bill", "http://congress.gov/bill", "javascript:alert(1)", "https://evil@congress.gov/bill"]) expect(isOfficialSource(url)).toBe(false);
  });
  it("restores valid drafts only on their original reader and before expiry", () => {
    const draft = makeDictionaryDraft("committee");
    const raw = JSON.stringify({path:"/bills/119/hr/164?tab=text",expires:2000,draft});
    expect(parseStoredDraft(raw,"/bills/119/hr/164?tab=text",1000)).toEqual(draft);
    expect(parseStoredDraft(raw,"/bills/119/hr/224?tab=text",1000)).toBeNull();
    expect(parseStoredDraft(raw,"/bills/119/hr/164?tab=text",2001)).toBeNull();
    expect(parseStoredDraft("not json","/",0)).toBeNull();
  });
  it("retains the exact source version in dictionary reader links", () => {
    expect(contextReaderPath({congress:119,billType:"hr",billNumber:"164",documentKind:"text",versionId:"BILLS-119hr164ih"})).toBe("/bills/119/hr/164?tab=text&version=BILLS-119hr164ih");
  });
});
