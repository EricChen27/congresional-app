# BillBreakdown: revised implementation scope

Updated October 22, 2026. This replaces the earlier plan that excluded accounts and databases. The application is now implemented locally; setup and live release checks remain in `docs/SETUP.md` and `docs/RELEASE.md`.

## Agreed release

- Discover 250 imported recent 119th Congress bills; keyword/number search, category and chamber filters, exact official lookup, truthful coverage/retrieval labels.
- Summary, bill text, and timeline tabs; independent summary/text versions; safe rendering, attribution, source links, and missing/PDF-only states.
- A public glossary of 20 verified legislative terms with aliases and mouse, touch, and keyboard access.
- Select short phrases in the reader or use Add word. Prefill a known glossary definition, write a personal meaning, or leave it To define.
- Google-only sign-in through Supabase. Private dictionary search, filters, editing, deletion, and source contexts across devices. One normalized term per account; later contexts never silently replace an existing meaning.
- Atomic saves, owner-derived server actions, database row-level security, server-validated sessions, safe redirects, temporary sign-in draft recovery, and honest failure states.
- Next.js, TypeScript, Tailwind, Supabase Auth/Postgres, and Vercel deployment target. Public snapshots remain usable without accounts or external services.

## Delivery order

| Day | Focus |
| --- | --- |
| October 22 | Scaffold; database and auth implementation; real bill to selection to dictionary journey. |
| October 23 | Public glossary, dictionary, draft recovery, import and search. |
| October 24 | Timeline, versions, mobile/keyboard review, failure states, hosted preview once services are configured. |
| October 25 | Live acceptance checks, defects, setup documentation, demonstration and submission preparation. |

The local implementation includes the first three days' code. Live Google login, a real Supabase migration, cross-device persistence, deployment, and recording need the user's service setup. Automated database isolation tests supplement, but do not replace, those live checks.

If time is tight, reduce catalog size and decoration first. Preserve glossary/dictionary behavior, source accuracy, and the reading journey. AI explanations, reading levels, quizzes, shared dictionaries, notifications, persistent highlights, PDF extraction, and historical full-text search remain deferred.
