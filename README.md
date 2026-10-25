# BillBreakdown

Understand the law before forming an opinion.

A working Next.js app for finding congressional bills, reading official summaries and legislative text, exploring timelines, and learning legislative vocabulary. Google sign-in connects a private personal dictionary to Supabase. No AI service is required.

## Run the app

Use Node.js 22.15 or newer.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Search, the reader, timelines, and the 100-term glossary work immediately with the included official snapshots. Account controls explain that sign-in is not connected until Supabase is configured. They never pretend a word has been saved.

**Start here for accounts:** [Supabase, Google sign-in, and deployment setup](docs/SETUP.md).

## What is included

- Searchable catalog covering all H.R. and S. bills available in the official GovInfo index for the 119th Congress at import time, with live search, policy-area/chamber/summary filters, sorting, five-page pagination, and exact-number lookup. Coverage and retrieval dates are visible.
- Separate summary, text, and timeline views, with version choices and official links. Summaries are ordered by legislative action date, with update date breaking ties.
- Safe plain-text rendering of official formatted documents; external scripts and markup never render. PDF-only or unavailable versions link to the official document.
- Searchable glossary with 199 sourced definitions, aliases, and keyboard-accessible in-context dialogs.
- Text selection and a manual Add word action. Known terms prefill a definition; other terms can be saved without a definition as “To define.”
- Private dictionary search, filters, editing, deletion, and retained source/version contexts. Repeated saves append contexts without overwriting an existing definition.
- Google OAuth, validated server sessions, database row-level security, and an atomic save operation. Temporary reader drafts survive sign-in in the same browser tab for 30 minutes.

## Data and refresh

`src/data/bills.json` contains a dated snapshot imported from official GPO GovInfo BILLSTATUS records and legislative text. It includes three featured examples plus recently updated records in the source index; an index update is not necessarily a new legislative action. Available summaries retain Congressional Research Service attribution. Search covers imported metadata and summaries, not all congressional history or full-text search.

```sh
# Refresh the entire catalog and readable text before a release.
npm run import:bills -- --refresh
# Refresh metadata while retaining already-downloaded matching text versions.
npm run import:bills -- --refresh --metadata-only
# Build a smaller separate snapshot for development.
npm run import:bills -- --limit=25 --output=.cache/small-catalog.json
```

Imports use public GovInfo without a key. If `CONGRESS_API_KEY` is set, bill enrichment and exact lookups use the Congress.gov API. The import is sequential, resumable through `.cache`, and replaces the published snapshot only after completion. Rerun an interrupted command without `--refresh` to resume. If an official source is unavailable, the existing catalog remains intact. No background schedule is enabled: refresh locally and redeploy to update bundled public data. Public data and private dictionaries are stored separately.

Sources: [Congress.gov API](https://github.com/LibraryOfCongress/api.congress.gov), [GovInfo bulk data](https://www.govinfo.gov/bulkdata), [Congress.gov glossary](https://www.congress.gov/help/legislative-glossary). Individual entries include their reference links.

## Checks

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm start
```

Tests cover bill identity/search, summary selection, safe source parsing, redirects, glossary matching, draft validation, and database isolation. Privacy tests execute the real SQL migration in local PostgreSQL-compatible PGlite with two authenticated identities. Live Google OAuth, another physical device, and a hosted deployment still require the account setup and the checks in [the release guide](docs/RELEASE.md).

## Project map

- `src/app`: public pages, reader, dictionary, OAuth callback.
- `src/components`: responsive interface, glossary dialogs, reader selection, dictionary forms.
- `src/lib/bills`: official source import, normalization, safe text extraction, search.
- `src/lib/dictionary` and `src/lib/supabase`: validation, authenticated actions, sessions, private reads.
- `src/data`: public bill snapshot and glossary content.
- `supabase/migrations`: tables, ownership policies, atomic dictionary save.
- `tests`: behavior and database privacy tests.

Personal dictionaries require Supabase; the public app does not. AI explanations, quizzes, notifications, shared dictionaries, persistent document highlights, and PDF extraction are outside this release. General glossary definitions do not replace definitions within a bill.

## Learn and appearance

Learn sits next to Explore bills and groups 199 sourced terms into government basics, agencies and organizations, public programs, elections, and legislative vocabulary. Signed-in users can add their own terms and remove saved terms from a definition popup or their dictionary. Learn → Start study session opens tap-to-reveal flashcards with Again, Hard, Good, and Easy scheduling. Choose public vocabulary by topic or your defined personal dictionary words. Review schedules persist in browser local storage (separate guest/account namespaces), not across devices. The scheduler is Anki-inspired, not FSRS.

The app serves Rubik headings, Mukta Vaani subheadings, and Hind Siliguri body text locally. The header theme button switches light/dark mode and remembers the preference on this browser. Dropdowns open on a click and support keyboard selection and Escape. Bill results update as you type or change a filter; summary availability is both filterable and sortable.

Existing Supabase installations must apply `supabase/migrations/202610220002_civic_sources.sql` after the original migration to allow the new official definition sources.


### Bill forum

Open `/forum` or “Discuss this bill” from a bill page. Each bill has one moderated discussion, with signed-in commenting, author removal, report reasons, and a protected moderator queue. New comments require approval before appearing publicly. The app never invents demo comments when the database is unavailable. Apply migrations 003 and 004 and assign a moderator as described in `docs/SETUP.md` before enabling posting.

The 100-term collection now includes government structure, constitutional powers, rights and liberties, elections, and political participation. It includes concepts taught in AP U.S. Government, with source links, but is not a complete exam course or a College Board-endorsed product. Existing study decks automatically include the additional terms.

The glossary covers every heading in the Congress.gov legislative glossary reviewed on October 23, 2026, alongside additional civic terms. Definitions use plain-language explanations with source links; source synonyms map to existing stable entries. The checked-in source-heading inventory is tested for coverage. This is a reviewed snapshot, not an automatic live sync.
