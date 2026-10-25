import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeReturnPath } from '@/lib/dictionary/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const next = safeReturnPath(request.nextUrl.searchParams.get('next'));
  const callback = new URL('/auth/callback', request.nextUrl.origin);
  // The local server may report its bind address rather than its browser address.
  if (callback.hostname === '0.0.0.0') callback.hostname = 'localhost';
  callback.searchParams.set('next', next);
  try {
    const client = await createClient();
    if (client) {
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callback.toString(),
          skipBrowserRedirect: true,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (!error && data.url) {
        // Supabase SSR writes the PKCE verifier cookie before this redirect.
        return new NextResponse(null, { status: 302, headers: {
          Location: data.url, 'Cache-Control': 'private, no-store',
        } });
      }
    }
  } catch { /* Keep provider details out of the public error page. */ }
  const query = new URLSearchParams({ next, error: 'start' });
  return new NextResponse(null, { status: 302, headers: {
    Location: `/auth/sign-in?${query}`, 'Cache-Control': 'private, no-store',
  } });
}
