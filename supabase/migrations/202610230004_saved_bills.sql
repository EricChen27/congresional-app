-- Run once in the existing project's SQL editor. Independent of forum migrations.
begin;
create table public.saved_bills (
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 bill_id text not null check (bill_id ~ '^[0-9]{2,3}-(hr|s)-[1-9][0-9]{0,5}$'),
 title text not null check (char_length(title) between 1 and 2000),
 favorite boolean not null default false,
 created_at timestamptz not null default now(),
 primary key(owner_id,bill_id)
);
alter table public.saved_bills enable row level security;
revoke all on public.saved_bills from public, anon;
grant select,insert,update,delete on public.saved_bills to authenticated;
create policy saved_bills_owner on public.saved_bills for all to authenticated
 using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
commit;
