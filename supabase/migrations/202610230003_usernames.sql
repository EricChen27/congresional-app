begin;
alter table public.member_profiles add column username text;
-- Existing profiles retain a working public address until their owner chooses a handle.
update public.member_profiles set username='member_'||replace(id::text,'-','');
alter table public.member_profiles alter column username set not null;
alter table public.member_profiles add constraint member_profiles_username_format check(username ~ '^[a-z0-9_]{3,40}$');
alter table public.member_profiles add constraint member_profiles_username_key unique(username);
create function public.normalize_profile_username() returns trigger language plpgsql set search_path='' as $$
begin new.username:=lower(btrim(new.username));return new;end;
$$;
create trigger normalize_profile_username before insert or update of username on public.member_profiles for each row execute function public.normalize_profile_username();

create function public.member_by_username(p_username text)
returns table(id uuid,username text,display_name text,bio text,avatar text,show_comments boolean)
language sql stable security definer set search_path='' as $$
 select id,username,display_name,bio,avatar,show_comments from public.member_profiles where username=lower(btrim(p_username));
$$;
create function public.member_username_for_id(p_id uuid) returns text
language sql stable security definer set search_path='' as $$select username from public.member_profiles where id=p_id;$$;
create function public.forum_username_page(p_bill text,p_page integer default 1) returns jsonb
language sql stable security definer set search_path='' as $$
 with page as (select public.forum_thread_page(p_bill,p_page) data)
 select jsonb_set(data,'{comments}',coalesce((select jsonb_agg(c.value||jsonb_build_object('username',p.username) order by c.ordinality)
 from jsonb_array_elements(data->'comments') with ordinality c(value,ordinality)
 left join public.member_profiles p on p.id::text=c.value->>'profile_id'),'[]'::jsonb)) from page;
$$;
revoke all on function public.normalize_profile_username(),public.member_by_username(text),public.member_username_for_id(uuid),public.forum_username_page(text,integer) from public;
grant execute on function public.member_by_username(text),public.member_username_for_id(uuid),public.forum_username_page(text,integer) to anon,authenticated;
commit;
