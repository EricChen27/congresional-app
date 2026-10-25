# Release checks and demonstration

## Local verification

The included automated tests exercise official-data parsing, bill search and versions, glossary aliases, safe rendering, draft restoration rules, server save outcomes, and the SQL ownership policies with two separate users. Run:

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

All automated tests, lint, and type checks passed locally.

Browser checks performed on the local production build: featured-bill navigation, manual word entry, glossary definition prefilling, draft recovery after reload, selecting a word from the summary, full legislative text and version switching, timeline, exact-number search, combined-filter empty states, glossary search, and keyboard opening/Escape dismissal with focus restored. Reader and glossary were also checked at a 390-pixel phone viewport. This is a browser viewport check, not a physical touch-device test.

## Required after connecting accounts

These are release gates, not claims of completed live tests. Follow SETUP.md first.

- [ ] Apply the migration in the real Supabase project.
- [ ] Select a word while signed out, sign in with Google, confirm the restored draft, save, and reload My dictionary.
- [ ] Cancel Google sign-in and retry; confirm the draft remains available.
- [ ] Save a known term, an unknown term, and a term without a definition. Search and filter Defined/To define.
- [ ] Save the same term from another bill. Confirm the original definition is retained and both exact document versions are linked.
- [ ] Edit a definition, reload, delete a disposable test entry, and reload again.
- [ ] Sign out and use another Google account in a separate browser profile. Confirm the first account's words are inaccessible. Test direct database read/update/delete/context-attachment requests as the other user as well.
- [ ] Expire the test session, attempt a save, sign in again, and verify draft recovery without a false Saved message.
- [ ] Sign in on another device and confirm persistence.
- [ ] Test the production URL using a Google account outside the developer/test-user list.
- [ ] Confirm the Supabase project is active before recording and submission.
- [ ] Check keyboard-only navigation, Escape to close dialogs, visible focus, and text selection/manual Add word on a physical phone.
- [ ] Deploy the final build, verify current featured records against their official sources, and record the demonstration.

## Suggested demonstration

1. Explain the problem: congressional bills are public, but their vocabulary and versions can be hard to follow.
2. Search for “H.R. 164” and open the POWER Act. Point out the official CRS summary and its date.
3. Open an underlined legislative term and show its definition and source.
4. Switch to Bill text, show version choices, and open the Timeline.
5. Select a word, add your meaning, and save to the private dictionary. Show the source passage and the link back to its exact document version.
6. Reload the dictionary to demonstrate persistence. Briefly show the public glossary's search.
7. Explain that the app imports official material and uses authored, sourced definitions; it does not depend on paid AI.

Do not demonstrate account saving as working until Supabase and Google are connected and tested. Record only accounts and test entries you are comfortable showing publicly. Check the submission portal's current rules and video requirements before recording.

## Learn update

Check Learn search for Social Security, Medicare, HHS, FDA, and DOE. Verify summary filters and sorting, five-page navigation with first/last buttons, and click-operated dropdowns with keyboard access. Verify the dark-mode preference survives reload and that Rubik/Mukta Vaani/Hind Siliguri render for headings/subheadings/body. With real accounts configured, save a preset and a custom term, then remove a saved term from its definition popup. Apply the second SQL migration before testing the expanded sources. Study sessions are available at `/learn/study`.


## Study sessions

- Start a public vocabulary session; verify the definition and rating buttons are hidden until the card is clicked or activated with Enter/Space.
- Rate Again (1 minute), Hard (5 minutes), Good (initially 1 day), and Easy (initially 4 days). Confirm saved feedback and that future-due cards leave the queue. Due cards are prioritized over new ones.
- Reload and confirm the new/due counts retain the saved schedule. Due cards return automatically during an open session. Successful reviews lengthen intervals, capped at one year; Again/Hard return to short learning intervals.
- Test topic filters, personal deck empty states, keyboard interaction, mobile layout, and dark mode. Personal words without definitions are excluded; removed dictionary words disappear after reload.
- Browser storage failures must retain the card and show an error, never claim Saved. Malformed stored schedules are rejected without overwriting existing data.
- Schedules are local to this browser, separate for guests and each signed-in account. No personal definitions are copied to local storage. Clearing browser data loses the schedule. Account dictionaries still require Supabase setup and live account acceptance testing.

## Forum acceptance

- `/forum` lists searchable bill discussions; bill readers link to their corresponding thread.
- Without Supabase, show a clear unavailable state without fake comments or save confirmations.
- With configured accounts, comments require verified sign-in and enter pending review. Only the author and moderators can see pending content. Public reads expose aliases, never emails or owner IDs.
- An ordinary user cannot publish, moderate, read reports, promote themselves, remove another user’s comment, or write tables directly.
- Moderator approval publishes comments; hiding removes them from public view; reports are deduplicated and resolved by moderator decisions. Deleted comments cannot be republished.
- Enforce one-minute spacing and 20 posts/day in database functions, including direct RPC calls. Keep drafts after failed saves. Apply both new migrations and assign a moderator before live acceptance testing.
- Check plain-text rendering of untrusted comments, mobile navigation with the Forum item, report menus, author removal confirmation, comment pagination, and source links back to bills.
- Vocabulary: 199 terms including the requested government/election terms, plus constitutional powers and civil liberties. Verify aliases such as “elastic clause” and “battleground state” and longest matching phrases such as “Bill of Rights.”

## October 25 launch hardening

- Production build verified with the documented TypeScript 6 compiler-API checker (`experimental.useTypeScriptCli: false`), retaining build-time type checking. The CLI subprocess returned empty configuration output in the local environment.
- Global headers prevent framing and embedded objects, restrict base URLs to this site, disable unused camera/microphone/geolocation permissions, and set MIME-sniffing/referrer protections. This is a limited CSP, not a complete script-src policy.
- Saved-bill and forum responses explicitly prohibit shared caching, including moderation and authentication-outage responses.
- 116 tests, lint, type checks, and production build passed. Production HTTP responses verified on localhost:3001. The npm production dependency audit reported zero known vulnerabilities on this date; this is not a comprehensive security audit.
- Public deployment, real-project migration status, public Google OAuth access, two-account isolation and moderator workflows still need live acceptance testing. No production database migration was applied during this check.
