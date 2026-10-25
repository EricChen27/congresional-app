export type BillType = "hr" | "s";

export interface BillSummary {
  id: string;
  text: string;
  actionDate: string;
  updatedAt: string;
  versionLabel: string;
  sourceUrl: string;
}

export interface TextVersion {
  id: string;
  type: string;
  date: string;
  url: string;
  format?: "html" | "xml" | "pdf" | "text";
  /** A complete, plain-text snapshot extracted from this exact official version. */
  text?: string;
  retrievedAt?: string;
}

export interface RecordedVote { url: string; chamber: string; date: string; rollNumber: string }

export interface BillAction {
  recordedVotes?: RecordedVote[];
  date: string;
  text: string;
  code?: string;
  sourceUrl?: string;
}

export interface Bill {
  id: string;
  congress: number;
  billType: BillType;
  number: string;
  title: string;
  category: string;
  introducedDate: string;
  sponsor: string;
  latestAction: { date: string; text: string };
  officialUrl: string;
  retrievedAt: string;
  sourceUpdatedAt?: string;
  sourceUrl?: string;
  summaries: BillSummary[];
  textVersions: TextVersion[];
  actions: BillAction[];
  featured?: boolean;
}

export interface BillSearch {
  voting?: string;
  year?: string;
  query?: string;
  category?: string;
  chamber?: string;
  sort?: string;
  summary?: string;
}

export interface BillCatalog {
  retrievedAt: string;
  congress: number;
  source: string;
  selection: string;
  targetCount: number;
  bills: Bill[];
}
