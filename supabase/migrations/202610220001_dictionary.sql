-- Run this migration in the Supabase SQL editor or with `supabase db push`.
-- All application calls use the publishable key and a verified user's JWT.
-- No service-role key is used by the app.

create function public.normalize_dictionary_term(value text)
returns text language sql immutable strict
set search_path = ''
as $$ select lower(btrim(regexp_replace(normalize(value, NFKC), '\s+', ' ', 'g'))); $$;

create table public.dictionary_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  term text not null check (char_length(btrim(term)) between 1 and 100),
  normalized_term text generated always as (public.normalize_dictionary_term(term)) stored,
  definition text not null default '' check (char_length(definition) <= 4000),
  definition_origin text not null default 'unset' check (definition_origin in ('curated', 'personal', 'unset')),
  glossary_id text check (char_length(glossary_id) <= 100),
  definition_source_url text check (char_length(definition_source_url) <= 2000 and definition_source_url ~ '^https://((www\.)?(congress\.gov|govinfo\.gov)|([a-z0-9-]+\.)*senate\.gov)/'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, normalized_term),
  unique (id, owner_id),
  check ((definition = '' and definition_origin = 'unset') or (definition <> '' and definition_origin <> 'unset'))
);

create table public.dictionary_contexts (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null,
  owner_id uuid not null default auth.uid(),
  bill_id text not null check (char_length(bill_id) between 1 and 100),
  bill_title text not null check (char_length(bill_title) between 1 and 1000),
  congress integer not null check (congress between 1 and 999),
  bill_type text not null check (bill_type in ('hr', 's', 'hjres', 'sjres', 'hconres', 'sconres', 'hres', 'sres')),
  bill_number text not null check (bill_number ~ '^\d{1,7}$'),
  document_kind text not null check (document_kind in ('summary', 'text')),
  version_id text not null check (char_length(version_id) between 1 and 200),
  version_label text not null check (char_length(version_label) between 1 and 200),
  version_date text not null default '' check (char_length(version_date) <= 50),
  selected_text text not null check (char_length(selected_text) between 1 and 160),
  excerpt text not null default '' check (char_length(excerpt) <= 1200),
  source_url text not null check (char_length(source_url) <= 2000 and source_url ~ '^https://(www\.|api\.)?(congress\.gov|govinfo\.gov)/'),
  created_at timestamptz not null default now(),
  foreign key (entry_id, owner_id) references public.dictionary_entries(id, owner_id) on delete cascade,
  unique (entry_id, bill_id, document_kind, version_id, selected_text)
);

create index dictionary_contexts_owner on public.dictionary_contexts(owner_id);

create function public.touch_dictionary_entry()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger dictionary_entry_updated before update on public.dictionary_entries
for each row execute function public.touch_dictionary_entry();

alter table public.dictionary_entries enable row level security;
alter table public.dictionary_entries force row level security;
alter table public.dictionary_contexts enable row level security;
alter table public.dictionary_contexts force row level security;

create policy "Read own dictionary entries" on public.dictionary_entries for select to authenticated
using ((select auth.uid()) = owner_id);
create policy "Create own dictionary entries" on public.dictionary_entries for insert to authenticated
with check ((select auth.uid()) = owner_id);
create policy "Edit own dictionary entries" on public.dictionary_entries for update to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Delete own dictionary entries" on public.dictionary_entries for delete to authenticated
using ((select auth.uid()) = owner_id);

create policy "Read own dictionary contexts" on public.dictionary_contexts for select to authenticated
using ((select auth.uid()) = owner_id);
create policy "Create own dictionary contexts" on public.dictionary_contexts for insert to authenticated
with check ((select auth.uid()) = owner_id);
create policy "Edit own dictionary contexts" on public.dictionary_contexts for update to authenticated
using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Delete own dictionary contexts" on public.dictionary_contexts for delete to authenticated
using ((select auth.uid()) = owner_id);

revoke all on public.dictionary_entries, public.dictionary_contexts from anon;
grant select, insert, update, delete on public.dictionary_entries, public.dictionary_contexts to authenticated;

-- An RPC is one database transaction: invalid context means no orphan entry.
-- Conflict preserves an existing definition and merely appends source context.
create function public.save_dictionary_entry(
  p_term text,
  p_definition text default '',
  p_definition_origin text default 'unset',
  p_glossary_id text default null,
  p_definition_source_url text default null,
  p_context jsonb default null
)
returns uuid
language plpgsql security invoker
set search_path = ''
as $$
declare
  current_owner uuid := auth.uid();
  saved_id uuid;
begin
  if current_owner is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  insert into public.dictionary_entries (owner_id, term, definition, definition_origin, glossary_id, definition_source_url)
  values (current_owner, btrim(p_term), coalesce(btrim(p_definition), ''),
    case when coalesce(btrim(p_definition), '') = '' then 'unset' else p_definition_origin end,
    p_glossary_id, p_definition_source_url)
  on conflict (owner_id, normalized_term) do update
    set updated_at = dictionary_entries.updated_at
  returning id into saved_id;

  if p_context is not null then
    insert into public.dictionary_contexts (
      entry_id, owner_id, bill_id, bill_title, congress, bill_type, bill_number,
      document_kind, version_id, version_label, version_date, selected_text, excerpt, source_url
    ) values (
      saved_id, current_owner, p_context->>'billId', p_context->>'billTitle', (p_context->>'congress')::integer,
      p_context->>'billType', p_context->>'billNumber', p_context->>'documentKind',
      p_context->>'versionId', p_context->>'versionLabel', coalesce(p_context->>'versionDate', ''),
      p_context->>'selectedText', coalesce(p_context->>'excerpt', ''), p_context->>'sourceUrl'
    ) on conflict (entry_id, bill_id, document_kind, version_id, selected_text) do nothing;
  end if;
  return saved_id;
end;
$$;

revoke all on function public.save_dictionary_entry(text,text,text,text,text,jsonb) from public, anon;
grant execute on function public.save_dictionary_entry(text,text,text,text,text,jsonb) to authenticated;
