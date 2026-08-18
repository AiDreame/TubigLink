import type { CapacitorConfig } from '@capacitor/cli';

/**
 * AquaLink native shell — Capacitor config (REMOTE-URL mode).
 *
 * The V3 web app is API-heavy (NextAuth sessions, Prisma routes, PayMongo
 * webhooks, the server-side maintenance scheduler) and CANNOT be statically
 * exported. Production = a native shell that loads the real web app from the
 * owner's custom domain. See CAPACITOR.md for the full architecture notes.
 *
 * ⚠️ CONFIG IS EMBEDDED INTO THE NATIVE PROJECT AT SYNC TIME — any change here
 * requires `npx cap sync` before building (CI does this on every run).
 */
const config: CapacitorConfig = {
  appId: 'ph.aqualink.app', // globally-unique Android applicationId / iOS bundle id (spike §6, decision #1)
  appName: 'AquaLink',
  // Placeholder web assets (www/). With server.url set, the WebView loads the
  // remote app and these bundled files are only a fallback/loading page.
  webDir: 'www',
  server: {
    // TESTING ONLY: current public tunnel so the shell is installable and
    // testable TODAY. MUST be swapped to the production custom domain
    // (Plus plan) before any store submission — tunnels are unacceptable
    // to the stores and break the GCash deep-link return.
    url: 'https://151ddcb0324ec849a5e3e6c1f3692000.ctonew.app',
    // Required so the WebView origin is https://localhost — keeps NextAuth
    // cookie/secure-storage semantics working inside the app.
    androidScheme: 'https',
    cleartext: false, // no insecure traffic
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {},
};

export default config;
