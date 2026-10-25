import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ client: vi.fn(), oauth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.client }));
import { GET } from '@/app/auth/start/route';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.client.mockResolvedValue({ auth: { signInWithOAuth: mocks.oauth } });
  mocks.oauth.mockResolvedValue({ data: { url: 'https://example.supabase.co/auth/v1/authorize?provider=google' }, error: null });
});
it('starts OAuth on the server and preserves the requested document version', async () => {
  const next = '/bills/119/hr/164?tab=text&version=enr';
  const response = await GET(new NextRequest(`https://billbreakdown-seven.vercel.app/auth/start?next=${encodeURIComponent(next)}`));
  const options = mocks.oauth.mock.calls[0][0].options;
  expect(options.skipBrowserRedirect).toBe(true);
  const callback = new URL(options.redirectTo);
  expect(callback.origin).toBe('https://billbreakdown-seven.vercel.app');
  expect(callback.pathname).toBe('/auth/callback');
  expect(callback.searchParams.get('next')).toBe(next);
  expect(response.status).toBe(302);
  expect(response.headers.get('Location')).toContain('https://example.supabase.co/auth/v1/authorize');
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
});
it('rejects external return destinations and ignores forwarded-host spoofing', async () => {
  await GET(new NextRequest('https://billbreakdown-seven.vercel.app/auth/start?next=//evil.example', { headers: { 'x-forwarded-host': 'evil.example' } }));
  const callback = new URL(mocks.oauth.mock.calls[0][0].options.redirectTo);
  expect(callback.origin).toBe('https://billbreakdown-seven.vercel.app');
  expect(callback.searchParams.get('next')).toBe('/dictionary');
});
it.each(['missing', 'provider', 'exception'])('returns a retry page for %s failures without exposing details', async failure => {
  if (failure === 'missing') mocks.client.mockResolvedValue(null);
  if (failure === 'provider') mocks.oauth.mockResolvedValue({ data: { url: null }, error: { message: 'private detail' } });
  if (failure === 'exception') mocks.client.mockRejectedValue(new Error('private detail'));
  const response = await GET(new NextRequest('https://example.com/auth/start?next=/saved'));
  expect(response.headers.get('Location')).toBe('/auth/sign-in?next=%2Fsaved&error=start');
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
});
