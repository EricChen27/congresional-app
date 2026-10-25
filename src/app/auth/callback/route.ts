import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeReturnPath } from "@/lib/dictionary/validation";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeReturnPath(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  let succeeded = false;
  if (code && !url.searchParams.has("error")) {
    try {
      const client = await createClient();
      if (client) {
        const { error } = await client.auth.exchangeCodeForSession(code);
        succeeded = !error;
      }
    } catch { /* Return a friendly error without exposing the provider response. */ }
  }
  if (!succeeded) {
    const failure = new URL("/auth/sign-in", url.origin);
    failure.searchParams.set("next", next);
    failure.searchParams.set("error", url.searchParams.get("error") === "access_denied" ? "cancelled" : "failed");
    const response = redirectWithinApp(failure.pathname + failure.search);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  const response = redirectWithinApp(next);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

// Relative Location preserves the browser's origin, even when Next.js sees an
// internal bind address such as 0.0.0.0 behind the server or reverse proxy.
function redirectWithinApp(path: string) {
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}
