import { beforeAll,afterAll,it,expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
const db=new PGlite();
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
let profileId:string;
async function user(id:string){await db.exec('reset role;set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);}
async function anonymous(){await db.exec('reset role;set role anon');await db.query("select set_config('request.jwt.claim.sub','',false)");}
beforeAll(async()=>{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;insert into auth.users values('${A}',now()),('${B}',now());`);
 for(const file of ['202610220003_forum.sql','202610230001_profiles.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
},30000);
afterAll(()=>db.close());
it('creates only the authenticated owner’s profile and defaults history to private',async()=>{
 await user(A);await expect(db.query("insert into public.member_profiles(owner_id,display_name) values($1,'Forged')",[B])).rejects.toThrow();
 const result=await db.query<{id:string;show_comments:boolean}>("insert into public.member_profiles(owner_id,display_name) values($1,'Civic Reader') returning id,show_comments",[A]);
 profileId=result.rows[0].id;expect(result.rows[0].show_comments).toBe(false);
});
it('prevents other members from reading private fields or editing a profile',async()=>{
 await user(B);expect((await db.query('select * from public.member_profiles')).rows).toEqual([]);
 expect((await db.query("update public.member_profiles set display_name='Changed' where owner_id=$1 returning id",[A])).rows).toEqual([]);
 await anonymous();await expect(db.query('select * from public.member_profiles')).rejects.toThrow();
 const rows=(await db.query('select * from public.public_member_profile($1)',[profileId])).rows;
 expect(rows[0]).toMatchObject({display_name:'Civic Reader',show_comments:false});expect(rows[0]).not.toHaveProperty('owner_id');
});
it('hides all history until opted in and exposes only published comments after opting in',async()=>{
 await db.exec('reset role');for(const status of ['published','pending','hidden','deleted'])await db.query("insert into public.forum_comments(owner_id,bill_id,body,status) values($1,'119-hr-10844',$2,$3)",[A,`A ${status} comment about legislation`,status]);
 await anonymous();expect((await db.query('select * from public.member_profile_comments($1)',[profileId])).rows).toEqual([]);
 await user(A);await db.query('update public.member_profiles set show_comments=true where owner_id=$1',[A]);
 await anonymous();const rows=(await db.query<{body:string}>('select * from public.member_profile_comments($1)',[profileId])).rows;expect(rows).toHaveLength(1);expect(rows[0].body).toContain('published');
 const forum=(await db.query("select * from public.forum_list_profile_comments('119-hr-10844')")).rows;expect(forum).toHaveLength(1);expect(forum[0]).toMatchObject({author_label:'Civic Reader',profile_id:profileId});expect(forum[0]).not.toHaveProperty('owner_id');
});
it('removes history immediately when disabled, retaining public discussion',async()=>{
 await user(A);await db.query('update public.member_profiles set show_comments=false where owner_id=$1',[A]);
 await anonymous();expect((await db.query('select * from public.member_profile_comments($1)',[profileId])).rows).toEqual([]);
 expect((await db.query("select * from public.forum_list_profile_comments('119-hr-10844')")).rows).toHaveLength(1);
});
it('rejects remote or executable avatar sources even through direct writes',async()=>{
 await user(A);for(const avatar of ['https://tracking.example/avatar','data:image/svg+xml,<svg/>'])await expect(db.query('update public.member_profiles set avatar=$1',[avatar])).rejects.toThrow();
});
