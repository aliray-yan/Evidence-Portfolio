// Gateway origin the browser is allowed to fetch() — must match
// NEXT_PUBLIC_GATEWAY_URL (see lib/api.ts) for connect-src to actually work.
const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8080";

// script-src allows 'unsafe-inline': a stricter nonce-based CSP (the
// textbook-correct approach) was tried via middleware.ts and reverted —
// this Next.js/Turbopack build didn't reliably apply the same nonce to
// its own hydration script across requests, which blanked the entire
// app. Confirmed by loading it, not assumed. Every other directive here
// still meaningfully restricts the attack surface (no framing, no
// foreign script/object sources, fetches confined to the gateway).
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ${gatewayUrl}; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
