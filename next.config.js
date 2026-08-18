/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  experimental: { instrumentationHook: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  // Serve uploaded files from /uploads/ path
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/uploads/:path*",
      },
    ];
  },
  // PWA support via Service Worker + baseline security headers (S-09)
  async headers() {
    return [
      {
        // S-09 (security audit 2026-08-14): baseline security headers for all
        // routes. NO Content-Security-Policy yet — the inline scripts in
        // src/app/layout.tsx (SW registration + theme pre-hydration) need
        // nonces; CSP lands in its own PR. HSTS max-age is intentionally short
        // (1 day): the tunnel is https so it applies, but a short max-age
        // avoids browser lock-in if the app ever moves domains.
        // NOTE: geolocation is (self) rather than () because the app ships a
        // "use my location" pin-drop (LocationPicker/StationMap) — () would
        // break it. (self) still blocks third-party frames from using it.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=86400" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
