import { beforeEach, describe, expect, it, vi } from "vitest";
const mocked = vi.hoisted(() => ({ createClient: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({createClient: mocked.createClient}));
vi.mock("next/cache", () => ({revalidatePath: mocked.revalidatePath}));
import { saveDictionaryEntry } from "@/lib/dictionary/actions";
import { glossaryTerms } from "@/data/glossary";

beforeEach(() => vi.clearAllMocks());
describe("confirmed dictionary saves", () => {
  const draft = {term: "quorum", definition: "", definitionOrigin: "unset" as const};
  it("does not claim success when accounts are unconfigured", async () => {
    mocked.createClient.mockResolvedValue(null);
    expect((await saveDictionaryEntry(draft)).ok).toBe(false);
    expect(mocked.revalidatePath).not.toHaveBeenCalled();
  });
  it("asks for authentication on an expired session without saving", async () => {
    const rpc=vi.fn(); mocked.createClient.mockResolvedValue({auth:{getUser:async()=>({data:{user:null},error:{}})},rpc});
    expect(await saveDictionaryEntry(draft)).toMatchObject({ok:false,requiresAuth:true});
    expect(rpc).not.toHaveBeenCalled();
  });
  it("does not claim success on a failed database transaction", async () => {
    mocked.createClient.mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:"verified-owner"}},error:null})},rpc:async()=>({data:null,error:{message:"private transport details"}})});
    const result=await saveDictionaryEntry(draft);
    expect(result.ok).toBe(false);expect(result.error).not.toContain("private transport");
    expect(mocked.revalidatePath).not.toHaveBeenCalled();
  });
  it("only confirms a returned entry ID and never sends a submitted owner", async () => {
    const rpc=vi.fn().mockResolvedValue({data:"entry-id",error:null});
    mocked.createClient.mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:"verified-owner"}},error:null})},rpc});
    const result=await saveDictionaryEntry({...draft,owner_id:"forged-owner"} as typeof draft);
    expect(result).toEqual({ok:true,id:"entry-id"});
    expect(rpc.mock.calls[0][1]).not.toHaveProperty("owner_id");
    expect(mocked.revalidatePath).toHaveBeenCalledWith("/dictionary");
  });
  it("does not accept a forged curated definition attribution", async () => {
    const rpc=vi.fn().mockResolvedValue({data:"entry-id",error:null});
    mocked.createClient.mockResolvedValue({auth:{getUser:async()=>({data:{user:{id:"verified-owner"}},error:null})},rpc});
    const term=glossaryTerms[0];
    await saveDictionaryEntry({term:term.term,definition:"My own invented meaning",definitionOrigin:"curated",glossaryId:term.id,definitionSourceUrl:term.sourceUrl});
    expect(rpc.mock.calls[0][1]).toMatchObject({p_definition_origin:"personal",p_definition_source_url:null});
  });
});
