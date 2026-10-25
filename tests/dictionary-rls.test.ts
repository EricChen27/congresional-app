import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const A="11111111-1111-4111-8111-111111111111";
const B="22222222-2222-4222-8222-222222222222";
const db=new PGlite();
const context={billId:"119-hr-164",billTitle:"POWER Act of 2025",congress:119,billType:"hr",billNumber:"164",documentKind:"text",versionId:"BILLS-119hr164ih",versionLabel:"Introduced in House",versionDate:"2025-01-03",selectedText:"committee",excerpt:"a committee",sourceUrl:"https://www.govinfo.gov/content/pkg/BILLS-119hr164ih/html/BILLS-119hr164ih.htm"};
async function asUser(id:string){await db.exec("reset role; set role authenticated;");await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);}
async function save(term:string,definition="",ctx:unknown=null){const r=await db.query<{id:string}>("select public.save_dictionary_entry($1,$2,$3,null,null,$4::jsonb) as id",[term,definition,definition?"personal":"unset",ctx?JSON.stringify(ctx):null]);return r.rows[0].id;}

beforeAll(async()=>{
  await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated; insert into auth.users values ('${A}'),('${B}');`);
  await db.exec(await readFile(new URL("../supabase/migrations/202610220001_dictionary.sql",import.meta.url),"utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/202610220002_civic_sources.sql",import.meta.url),"utf8"));
  await db.exec(await readFile(new URL("../supabase/migrations/202610220004_government_sources.sql",import.meta.url),"utf8"));
},30000);
afterAll(async()=>{await db.close();});

describe("database-enforced dictionary isolation",()=>{
  let idA:string;
  it("saves an entry and its original version atomically",async()=>{
    await asUser(A);idA=await save("committee","My meaning",context);
    const entries=await db.query<{term:string;definition:string}>("select term,definition from public.dictionary_entries");
    expect(entries.rows).toEqual([{term:"committee",definition:"My meaning"}]);
    const contexts=await db.query<{version_id:string}>("select version_id from public.dictionary_contexts");expect(contexts.rows[0].version_id).toBe(context.versionId);
  });
  it("repeated saves keep the original definition and deduplicate context",async()=>{
    await asUser(A);expect(await save("  COMMITTEE  ","Replacement",context)).toBe(idA);
    expect((await db.query<{definition:string}>("select definition from public.dictionary_entries where id=$1",[idA])).rows[0].definition).toBe("My meaning");
    expect((await db.query("select id from public.dictionary_contexts")).rows).toHaveLength(1);
    await save("committee","",{...context,versionId:"BILLS-119hr164eh",versionLabel:"Engrossed in House"});
    expect((await db.query("select id from public.dictionary_contexts")).rows).toHaveLength(2);
  });
  it("does not expose account A's entries or contexts to B",async()=>{
    await asUser(B);
    expect((await db.query("select * from public.dictionary_entries")).rows).toHaveLength(0);
    expect((await db.query("select * from public.dictionary_contexts")).rows).toHaveLength(0);
    const idB=await save("committee","B's definition");expect(idB).not.toBe(idA);
  });
  it("rejects forged owners and cross-account context attachments",async()=>{
    await asUser(B);
    await expect(db.query("insert into public.dictionary_entries(owner_id,term) values($1,'forged')",[A])).rejects.toThrow();
    await expect(db.query("insert into public.dictionary_contexts(entry_id,owner_id,bill_id,bill_title,congress,bill_type,bill_number,document_kind,version_id,version_label,selected_text,source_url) values($1,$2,'119-hr-164','Bill',119,'hr','164','text','v1','Version','committee','https://www.congress.gov/bill/119th-congress/house-bill/164')",[idA,B])).rejects.toThrow();
    expect((await db.query("update public.dictionary_entries set definition='attack' where id=$1 returning id",[idA])).rows).toHaveLength(0);
    expect((await db.query("delete from public.dictionary_entries where id=$1 returning id",[idA])).rows).toHaveLength(0);
  });
  it("rolls back the entry if its context is invalid",async()=>{
    await asUser(A);
    await expect(save("should not exist","",{...context,sourceUrl:"https://evil.test"})).rejects.toThrow();
    expect((await db.query("select id from public.dictionary_entries where term='should not exist'")).rows).toHaveLength(0);
  });
  it("supports authentic Senate glossary citations",async()=>{
    await asUser(A);
    const r=await db.query("select public.save_dictionary_entry('cloture','A procedure','curated','cloture','https://www.senate.gov/about/powers-procedures/filibusters-cloture.htm',null)");expect(r.rows).toHaveLength(1);
  });
  it("accepts reviewed constitutional and AP learning sources",async()=>{
    await asUser(A);
    for(const [term,url] of [["Federalism","https://www.archives.gov/legislative/resources/education/constitution"],["Political efficacy","https://apcentral.collegeboard.org/media/pdf/ap-us-government-and-politics-course-and-exam-description.pdf"],["Swing state","https://www.oxfordlearnersdictionaries.com/us/definition/english/swing-state"]]) {
      expect((await db.query("select public.save_dictionary_entry($1,'Definition','curated',null,$2,null)",[term,url])).rows).toHaveLength(1);
    }
  });
  it("normalizes Unicode and leading whitespace consistently",async()=>{
    await asUser(A);const first=await save("\tＶＯＴＥ  Count\n");expect(await save("vote count")).toBe(first);
  });
  it("permits only owner edits and cascades owner deletion",async()=>{
    await asUser(A);
    expect((await db.query("update public.dictionary_entries set definition='Revised',definition_origin='personal' where id=$1 returning id",[idA])).rows).toHaveLength(1);
    await expect(db.query("update public.dictionary_entries set owner_id=$1 where id=$2",[B,idA])).rejects.toThrow();
    await db.query("delete from public.dictionary_entries where id=$1",[idA]);
    expect((await db.query("select id from public.dictionary_contexts where entry_id=$1",[idA])).rows).toHaveLength(0);
    await asUser(B);expect((await db.query("select id from public.dictionary_entries where term='committee'")).rows).toHaveLength(1);
  });
  it("denies anonymous writes and reads",async()=>{
    await db.exec("reset role; set role anon;");await db.query("select set_config('request.jwt.claim.sub','',false)");
    await expect(db.query("select * from public.dictionary_entries")).rejects.toThrow();
    await expect(save("anonymous")).rejects.toThrow();
  });
});
