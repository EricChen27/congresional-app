import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocked = vi.hoisted(() => ({ createClient: vi.fn(), exchange: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocked.createClient }));
import { GET } from "@/app/auth/callback/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocked.exchange.mockResolvedValue({ error: null });
  mocked.createClient.mockResolvedValue({ auth: { exchangeCodeForSession: mocked.exchange } });
});

describe("sign-in return address", () => {
  it.each(["http://0.0.0.0:3000", "http://localhost:3000", "https://billbreakdown.example"])(
    "keeps the browser origin when the server sees %s", async (origin) => {
      const next = "/bills/119/hr/10844?tab=text";
      const response = await GET(new NextRequest(`${origin}/auth/callback?code=test-code&next=${encodeURIComponent(next)}`));
      expect(mocked.exchange).toHaveBeenCalledWith("test-code");
      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toBe(next);
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    },
  );
  it("returns cancellation to the same browser origin without exchanging a code", async () => {
    const response = await GET(new NextRequest("http://0.0.0.0:3000/auth/callback?error=access_denied&next=/"));
    expect(response.headers.get("Location")).toBe("/auth/sign-in?next=%2F&error=cancelled");
    expect(mocked.exchange).not.toHaveBeenCalled();
  });
  it("returns exchange failures to sign-in", async () => {
    mocked.exchange.mockResolvedValue({ error: { message: "private details" } });
    const response = await GET(new NextRequest("http://0.0.0.0:3000/auth/callback?code=expired&next=/dictionary"));
    expect(response.headers.get("Location")).toBe("/auth/sign-in?next=%2Fdictionary&error=failed");
  });
  it("rejects external destinations and ignores forged forwarded hosts", async () => {
    const response = await GET(new NextRequest("http://0.0.0.0:3000/auth/callback?code=test&next=//evil.example", {
      headers: { "x-forwarded-host": "evil.example" },
    }));
    expect(response.headers.get("Location")).toBe("/dictionary");
  });
});
