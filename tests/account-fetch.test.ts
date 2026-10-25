import { afterEach, expect, it, vi } from "vitest";
import { accountFetch } from "@/lib/supabase/fetch";
afterEach(() => {vi.unstubAllGlobals(); vi.restoreAllMocks();});
it("uses private fetches and forwards cancellation with an eight-second deadline", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response("ok"));
  const timeout = vi.spyOn(AbortSignal, "timeout");
  vi.stubGlobal("fetch", fetchMock);
  const controller = new AbortController();
  await accountFetch("https://example.supabase.co/auth/v1/user", {signal:controller.signal});
  const options=fetchMock.mock.calls[0][1];
  expect(options.cache).toBe("no-store");
  expect(timeout).toHaveBeenCalledWith(8000);
  controller.abort();
  expect(options.signal.aborted).toBe(true);
});
