/** Keep a stalled account service from indefinitely blocking public pages. */
export const accountFetch: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(8_000);
  const inherited = init?.signal || (input instanceof Request ? input.signal : null);
  return fetch(input, {
    ...init,
    cache: "no-store",
    signal: inherited ? AbortSignal.any([inherited, timeout]) : timeout,
  });
};
