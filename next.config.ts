import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  // Keep build-time type checking, using the TypeScript 6 compiler API.
  // The CLI subprocess can return empty --showConfig output in this environment.
  experimental: { useTypeScriptCli: false },
  outputFileTracingIncludes: { "/*": ["./src/data/bills.json"] },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ] }];
  },
};
export default config;
