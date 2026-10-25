import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ claims: vi.fn() }));
vi.mock('@/lib/supabase/config', () => ({ getSupabaseConfig: () => ({ url: 'https://example.supabase.co', key: 'test' }) }));
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: { getClaims: mocks.claims } }) }));
import { updateSession } from '@/lib/supabase/proxy';
beforeEach(() => { mocks.claims.mockResolvedValue({ data: null }); });
it.each(['/saved', '/saved?view=favorites', '/forum', '/forum/moderation', '/forum/119/hr/164', '/dictionary', '/account'])(
  'prevents shared caching of personalized responses at %s even without refreshed cookies', async path => {
    const response = await updateSession(new NextRequest(`https://example.com${path}`));
    expect(response.headers.get('Cache-Control')).toBe('private, no-store, max-age=0');
  },
);
it('retains no-store protection when the authentication service fails', async () => {
  mocks.claims.mockRejectedValue(new Error('offline'));
  const response = await updateSession(new NextRequest('https://example.com/forum/moderation'));
  expect(response.headers.get('Cache-Control')).toContain('no-store');
});
