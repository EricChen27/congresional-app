import { accountFetch } from "./fetch";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = getSupabaseConfig();
  if (!config) return response;
  const client = createServerClient(config.url, config.key, {
    global: { fetch: accountFetch },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  try { await client.auth.getClaims(); }
  catch { /* Public pages remain available if Auth is down; private actions validate again. */ }
  if (request.nextUrl.pathname.startsWith("/account") || request.nextUrl.pathname.startsWith("/users") || request.nextUrl.pathname.startsWith("/profile") || request.nextUrl.pathname.startsWith("/dictionary") || request.nextUrl.pathname.startsWith("/saved") || request.nextUrl.pathname.startsWith("/forum") || request.nextUrl.pathname.startsWith("/auth") || response.cookies.getAll().length) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("Pragma", "no-cache");
  }
  return response;
}
