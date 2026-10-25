import { congressGlossaryAdditions, congressGlossaryAliases } from "./congress-glossary";
import { legislativeTerms } from "./legislative-terms";
import { governmentTerms } from './government-terms';
import { civicTerms } from "./civic-terms";
export type GlossaryTerm = {
  category?: "Legislative vocabulary" | "Government basics" | "Agencies & organizations" | "Public programs" | "Voting & elections" | "Rights & liberties" | "Political participation";
  id: string;
  term: string;
  aliases: string[];
  definition: string;
  sourceUrl: string;
  verifiedAt: string;
};

const congressGlossary = "https://www.congress.gov/help/legislative-glossary";
const senateVoting = "https://www.senate.gov/about/powers-procedures/voting.htm";
const senateCloture = "https://www.senate.gov/about/powers-procedures/filibusters-cloture/overview.htm";
const budgetProcess = "https://www.appropriations.senate.gov/about/budget-process";
const verifiedAt = "2026-10-22";

// Authored educational explanations, checked against the linked official sources.
// These are general meanings, not interpretations of any particular bill.
const existingTerms: GlossaryTerm[] = [
  ...legislativeTerms,
  ...civicTerms,
  ...governmentTerms,
  {
    id: "amendment",
    term: "Amendment",
    aliases: ["amendments"],
    definition: "A proposed edit to legislation or another text under consideration.",
    sourceUrl: congressGlossary,
    verifiedAt,
  },
  {
    id: "appropriation",
    term: "Appropriation",
    aliases: ["appropriations", "appropriation act", "appropriations act", "appropriations bill"],
    definition: "Funding provided by law for federal agencies or programs to use for specified purposes.",
    sourceUrl: budgetProcess,
    verifiedAt,
  },
  {
    id: "authorization",
    term: "Authorization",
    aliases: ["authorizations", "authorization act", "authorization bill"],
    definition: "A law that creates, continues, or changes a federal program and its operating rules. It may authorize later funding; some authorizations also provide funding directly.",
    sourceUrl: budgetProcess,
    verifiedAt,
  },
  {
    id: "bill",
    term: "Bill",
    aliases: ["bills"],
    definition: "A proposal in Congress to create or change a law.",
    sourceUrl: congressGlossary,
    verifiedAt,
  },
  {
    id: "cloture",
    term: "Cloture",
    aliases: [],
    definition: "A Senate procedure to limit further debate. For most legislation, invoking it requires three-fifths of the full Senate, usually 60 votes. Other matters can have different thresholds.",
    sourceUrl: senateCloture,
    verifiedAt,
  },
  {
    id: "committee",
    term: "Committee",
    aliases: ["committees"],
    definition: "A congressional panel that reviews legislation, holds hearings, and oversees government.",
    sourceUrl: congressGlossary,
    verifiedAt,
  },
  {
    id: "cosponsor",
    term: "Cosponsor",
    aliases: ["cosponsors", "co-sponsor", "co-sponsors"],
    definition: "Another member who formally adds their support to a measure.",
    sourceUrl: congressGlossary,
    verifiedAt,
  },
  {
    id: "engrossed",
    term: "Engrossed",
    aliases: ["engrossed bill", "engrossed measure", "engrossed in house", "engrossed in senate"],
    definition: "The official text after one chamber passes a measure, including its amendments.",
    sourceUrl: congressGlossary,
    verifiedAt,
  },
  {
    id: "enrolled",
    term: "Enrolled",
    aliases: ["enrolled bill", "enrolled measure"],
    definition: "The final text passed identically by both chambers, prepared for the president.",
    sourceUrl: congressGlossary,
    verifiedAt,
  },
  {
    id: "filibuster",
    term: "Filibuster",
    aliases: ["filibusters"],
    definition: "Senate tactics that delay or block a vote on a measure.",
    sourceUrl: congressGlossary,
    verifiedAt,
  },
  {
    id: "hearing",
    term: "Hearing",
    aliases: ["hearings"],
    definition: "A committee meeting to gather testimony and information from witnesses.",
    sourceUrl: congressGlossary,
    verifiedAt,
  },
  {
    id: "markup",
    term: "Markup",
    aliases: ["markups", "mark-up", "mark-ups"],
    definition: "A committee meeting to debate and vote on proposed legislative changes.",
    sourceUrl: congressGlossary,
    verifiedAt,
  },
  {
    id: "override",
    term: "Override",
    aliases: ["overrides", "veto override", "veto overrides", "override the veto"],
    definition: "Congress overcoming a presidential veto with a two-thirds majority in each chamber.",
    sourceUrl: congressGlossary,
    verifiedAt,
  },
  {
    id: "quorum",
    term: "Quorum",
    aliases: ["quorums"],
    definition: "The minimum attendance needed for a chamber or committee to conduct certain business.",
    sourceUrl: congressGlossary,
    verifiedAt,
  },
  {
    id: "referral",
    term: "Referral",
    aliases: ["referrals", "referred", "referred to"],
    definition: "Sending a measure to a committee or subcommittee for consideration.",
    sourceUrl: congressGlossary,
    verifiedAt,
  },
  {
    id: "roll-call-vote",
    term: "Roll-call vote",
    aliases: ["roll call vote", "roll-call votes", "roll call votes", "recorded vote", "recorded votes", "record vote"],
    definition: "A vote with a public record of how each participating member voted.",
    sourceUrl: congressGlossary,
    verifiedAt,
  },
  {
    id: "sponsor",
    term: "Sponsor",
    aliases: ["sponsors"],
    definition: "The member of Congress who formally introduces a measure.",
    sourceUrl: congressGlossary,
    verifiedAt,
  },
  {
    id: "subcommittee",
    term: "Subcommittee",
    aliases: ["subcommittees"],
    definition: "A smaller group within a committee assigned particular subjects or work.",
    sourceUrl: congressGlossary,
    verifiedAt,
  },
  {
    id: "veto",
    term: "Veto",
    aliases: ["vetoes", "vetoed"],
    definition: "The president’s formal rejection of legislation submitted for approval.",
    sourceUrl: congressGlossary,
    verifiedAt,
  },
  {
    id: "voice-vote",
    term: "Voice vote",
    aliases: ["voice votes"],
    definition: "Members call out their votes, and the presiding officer announces the result. Individual voting positions are not recorded.",
    sourceUrl: senateVoting,
    verifiedAt,
  },
];

export const glossaryTerms: GlossaryTerm[] = [...existingTerms, ...congressGlossaryAdditions].map(term => ({
  ...term, aliases: [...new Set([...term.aliases, ...(congressGlossaryAliases[term.id] ?? [])])],
}));
