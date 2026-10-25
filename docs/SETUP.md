# Connect Supabase and Google sign-in

The application and database migration are ready. You do not need to write an authentication system yourself. You will create the accounts below and connect their settings. Keep secrets in your own service dashboards and `.env.local`, never in chat or Git.

## 1. Create the database

1. Create a project at [Supabase](https://supabase.com/dashboard). Choose an appropriate region, save the database password privately, and wait for the project to become ready.
2. Open the project's **SQL Editor**. Paste the entire contents of `supabase/migrations/202610220001_dictionary.sql` and run it once on the new project. Then run `supabase/migrations/202610220002_civic_sources.sql` to enable the expanded government vocabulary sources. If the first migration is already installed, run only the second.
3. Confirm Table Editor shows `dictionary_entries` and `dictionary_contexts`, with row-level security enabled. The migration also creates the atomic `save_dictionary_entry` function. Do not remove the ownership policies.
4. From the project's Connect/API settings, copy its project URL and **publishable** key into `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

The publishable key is designed for browser use with row-level security. Do not use a secret key or service-role key. The application does not need a database password. Older projects can use their legacy anon key as the publishable-key value. [Supabase client setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client)

## 2. Enable Google

1. In Supabase Authentication, open the Google provider configuration. Copy the callback URL it displays, normally `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
2. In [Google Cloud Console](https://console.cloud.google.com/), select/create a project and configure its OAuth consent screen (Google Auth Platform). Use an **External** audience for ordinary Google users. Provide the app name and required support/developer contacts. Use only basic sign-in scopes: email, profile, and openid.
3. Create an OAuth client with application type **Web application**. Add `http://localhost:3000` as a JavaScript origin and the Supabase callback from step 1 as an authorized redirect URI. Add your production origin when deployed.
4. Copy the Google client ID and client secret into Supabase's Google provider settings, enable the provider, and save. The Google secret belongs in Supabase, not the Next.js environment file.
5. While Google is in Testing mode, add each tester's Google address to the test-user list. Before public submission, complete Google's publication requirements and move the app to Production so ordinary users outside your test list can sign in. Check the actual consent-screen status rather than assuming a developer login proves public access.

These settings follow [Supabase's Google provider instructions](https://supabase.com/docs/guides/auth/social-login/auth-google).

## 3. Allow the app's callback

In Supabase **Authentication → URL Configuration**:

- For local development, set Site URL to `http://localhost:3000`.
- Add `http://localhost:3000/auth/callback**` to the redirect allow list. The suffix permits the app's `?next=` parameter, which returns readers to the correct bill.
- For production, set Site URL to your final HTTPS address and add `https://YOUR-APP.vercel.app/auth/callback**`.
- If testing a preview deployment, allow that exact preview host with the same callback pattern. Avoid allowing arbitrary hosts.

Google's redirect points to **Supabase**. Supabase's allowed redirect points to **your app**. Both are needed. See [Supabase redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls).

Restart the development server after changing `.env.local`. Open a bill, choose Add word, enter a term, and continue with Google. You should return to that same reader with the draft open. Press Save word to confirm, then reload My dictionary to verify persistence.

## 4. Optional Congress.gov key

Obtain a key from the [Congress.gov API signup](https://api.congress.gov/sign-up/) and put it in `.env.local` as `CONGRESS_API_KEY`. It is used only on the server. The included public snapshot and GovInfo fallback already work without it.

## 5. Deploy to Vercel

1. Push the project to your Git repository and import it in Vercel. Choose Next.js and Node.js 22.x or a newer compatible runtime. The build command is `npm run build`; output settings should use the Next.js defaults.
2. In the project's environment settings, add the Supabase URL and publishable key for the environments you will use. Add the Congress.gov key if desired. Never prefix the Congress key with `NEXT_PUBLIC_`.
3. Deploy, then add the deployed URL to the Supabase and Google settings above. Public environment values are bundled at build time, so redeploy after changing them.
4. Confirm the production Site URL is correct. Test the final public URL with a Google account outside your development team and from another device.

Vercel separates [Development, Preview, and Production environments](https://vercel.com/docs/deployments/environments); setting a value only for Development will not configure Production.

## If something fails

| Symptom | Check |
| --- | --- |
| Sign-in button disabled | Both public Supabase values are present; restart/rebuild after editing them. |
| Google says redirect mismatch | Its authorized redirect exactly matches the Supabase callback, including scheme and path. |
| Google blocks a tester | External audience and testing-user list, or production publication status. |
| Returned to the wrong URL | Supabase Site URL and callback allow list, including the `next` query parameter. |
| Sign-in works but saving fails | Migration completed in the same project as the configured URL; tables and RPC exist; RLS policies are intact. |
| Previously working project is unavailable | Check Supabase project status and restore a paused project. Check before a demonstration. |
| Public catalog looks old | Run the import again and redeploy the updated snapshot. |

Supabase's free plan can pause inactive projects; check the current [plan details](https://supabase.com/pricing) before release. No live project, OAuth credentials, or hosted deployment was created as part of the local implementation. Finish the [release checks](RELEASE.md) after connecting them.

## Enable bill discussions

Apply `supabase/migrations/202610220003_forum.sql`, then `202610220004_government_sources.sql` after the existing migrations. The latter allows the new constitutional, election, and education citations in personal dictionary entries.

The forum requires the same Supabase and Google sign-in configuration as the dictionary. Have the designated moderator sign in once, then find their user UUID under Supabase Authentication → Users. In the SQL editor, replace the placeholder with that exact UUID:

```sql
insert into public.forum_moderators(user_id)
values ('REPLACE-WITH-MODERATOR-USER-UUID');
```

This is an administrative database step, never a public registration option. No service-role secret belongs in the app. Remove a moderator's row to revoke their role. Posting is disabled at the database level until at least one moderator exists.

Visit `/forum/moderation` while signed in as that moderator. Review comments regularly: new comments are private pending approval, then visible to everyone when approved. Reports go to this queue; keep or hide a reported comment to resolve its reports. Moderation decisions are recorded. Authors can remove their own comments. Their comment body is replaced, and the row is retained for rate limits and moderation history.

Use two ordinary Google accounts plus a moderator account to test submission → pending visibility → approval → public display → report → moderation → author removal against your real Supabase project. Verify Google sign-in works outside the development team. The automated database tests exercise access control locally; they do not replace this live OAuth check.

Posts require a verified account, 10–3,000 characters, at least one minute between comments, and at most 20 comments per day per account. Reports are deduplicated per account/comment and limited to 20 daily. Comments render as plain text; emails and account UUIDs are not sent to public readers. Public aliases are generated automatically. There are no direct messages, images, clickable user links, nested replies, or public user profiles in this first version.

## Upgrade: profiles and forum filters

For a project that already ran the initial setup, run only
`supabase/migrations/202610230001_profiles.sql` in the Supabase SQL Editor.
Do not rerun `supabase/setup.sql` on an existing project.

This adds owner-protected profiles and safe public profile/comment queries.
Profile names, bios, and photos are public; comment history is opt-in and includes
only approved comments. Photos are resized to 192px JPEG thumbnails in the browser
and saved with the profile (no extra Storage bucket or secret key required).
After applying the update, open `/account` to create a profile. Moderators get a
“Review comments” button on the forum and each discussion. Assigning moderators
still requires the existing administrator SQL step; users cannot assign themselves.

Verify with two accounts: B cannot modify A’s profile, opted-out history is empty,
and pending/hidden/deleted comments never appear on a public profile.

## Upgrade: threaded replies and bill references

After the profiles migration, run `supabase/migrations/202610230002_threads.sql`
once in the Supabase SQL Editor. Existing comments become root threads. Replies
are moderated like comments, limited to eight levels, and paginated with their
root thread. Removing/hiding a parent preserves visible replies with a neutral
placeholder; its private body, author identity, and reference are not exposed.

References retain the official text version URL and a reader-supplied location
and quote. They are not automatically verified or presented as generated line
numbers. The moderation queue includes references for review.

## Upgrade: unique usernames

Run `supabase/migrations/202610230003_usernames.sql` after the profiles and threads
updates. Existing profiles receive a unique `member_…` username; choose a shorter
one in Account settings. Names are normalized to lowercase and uniqueness is
checked atomically by PostgreSQL, including simultaneous saves. Display names
remain independent. Public URLs are `/users/username`; old `/profile/id` links
redirect to the current username. Changing a username releases the old handle.

## Catalog search architecture

Explore Bills and the forum share `GET /api/bills`. The server applies keyword,
chamber, policy area, summary, and sorting options to the complete imported
snapshot before selecting a fixed page of 18 records. Only compact cards and
bounded summary excerpts reach the browser; bill text and timelines are loaded
on their detail views. Public searches do not depend on Supabase authentication.
Search requests are debounced and canceled when superseded, with retry feedback.

The public catalog currently remains a server-side JSON snapshot, separate from
private Supabase data. This change does not import additional bills or enable
scheduled imports. Increasing coverage still requires running the importer and
rebuilding the deployment; a database-backed catalog can later replace the query
implementation without changing the browser API.

### Catalog expansion and voting records
The public snapshot covers all H.R. and S. bills present in the official GovInfo BILLSTATUS indexes for the 119th Congress when the import starts. Resolutions and older Congresses are excluded. New bills or source updates require a refresh; this is not a live feed. Refresh with `npm run import:bills -- --limit=all --metadata-only --refresh`. The importer discovers the target count from the indexes, validates unique identities, and publishes only after every selected record succeeds. Omit `--refresh` to resume an interrupted import. Imports use four concurrent requests, retries and resumable checkpoints; the published snapshot is replaced only after the full import succeeds. Metadata-only imports retain matching existing text snapshots and load other bill texts on demand.

The Votes tab follows recorded-vote references supplied in official bill actions. House totals come from the Clerk's official XML; Senate totals are grouped from each member's recorded party and vote in Senate XML. The official motion and result are preserved: procedural votes, amendments and passage are not conflated. Independents remain separate. The tab loads up to eight vote breakdowns on demand and links every available recorded vote. Successful totals are cached for one hour in a bounded server cache. Source outages or blocked requests show an explicit unavailable message and an official link, never estimated totals. Voice votes and unanimous consent have no party totals. No Supabase migration is needed for this feature.

The catalog is a server-only JSON data asset read once per server process; deployment tracing explicitly includes it. After refreshing an import, restart the server (or redeploy) to load it. Only paginated card records are sent to the browser; normalized keyword text is cached in server memory and exact bill lookup uses an identity index.

### Bookmarks and favorite bills
For an existing Supabase project, run `supabase/migrations/202610230004_saved_bills.sql` once in the SQL editor. It is independent of forum/profile migrations. Do not rerun the combined setup file on an existing database. New projects can use the updated `supabase/setup.sql` instead.

Open a bill and use **Keep this bill → Bookmark** or **Favorite**. Favorites also belong to the bookmarked list. Unfavoriting keeps the bookmark; removing a bookmark removes the favorite too. **Saved bills** in navigation opens private, paginated lists. Google sign-in returns to the original bill, where the user can choose the action. No success is shown until the database confirms the write. If the migration is missing, the controls explain the load error and offer reload rather than displaying an incorrect saved state.

Release check after applying SQL: bookmark a bill, reload, favorite it, open Saved bills → Favorites on another device, then unfavorite and remove it. Verify a second account cannot see the first account's list. Automated local Postgres tests enforce read/write/delete ownership and reject forged owners.
