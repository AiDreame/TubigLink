# AquaLink Native Shell (Capacitor)

The product ships as a native app on the **iOS App Store** and **Google Play** (owner
direction, Aug 13 2026). This repo contains the native shell: a **Capacitor 8**
wrapper around the existing V3 web app, running in **remote-URL mode**.

## Architecture: why remote-URL mode

The V3 app **cannot be statically exported** — it is API-heavy and server-bound:

- Auth is NextAuth credentials + OTP (JWT, cookies, middleware).
- Orders, stations, disputes, payouts, payments and webhooks are Prisma-backed
  API routes and server components.
- The maintenance scheduler (`src/instrumentation.ts`) and PayMongo
  PaymentIntent/disbursement calls run only on the server.

So the production shape is: **a native shell that loads the real web app from the
owner's custom domain** (owner is on the Plus plan — custom domain included, no
upgrade). The shell adds what the web can't: store presence, native push (later,
FCM/APNs), deep links, splash screen, app icon, offline/error page.

## Layout

| Path | Purpose |
|---|---|
| `capacitor.config.ts` | Shell config: `appId ph.aqualink.app`, `appName AquaLink`, remote `server.url` |
| `www/` | Placeholder web assets (unused in remote mode; needed for `cap sync`) |
| `android/` | **Generated native Android project — committed as source** (manifest, icons, gradle edited by hand) |
| `ios/` | Generated native iOS project — committed (builds require macOS; CI or a Mac) |
| `.github/workflows/android-build.yml` | CI: `cap sync` + Gradle `assembleDebug`/`assembleRelease`/`bundleRelease` on a GitHub runner |
| `npm run cap:*` | Convenience scripts (sync, add, open) |

## ⚠️ The config is embedded at sync time

`npx cap sync` bakes `capacitor.config.ts` (including `server.url`) into
`android/app/src/main/assets/capacitor.config.json`. **Every config change requires
a re-sync before building** — CI runs `npx cap sync android` after checkout for
this reason. Manifest edits, however, survive `cap sync`.

## server.url — tunnel now, real domain before store submission

`capacitor.config.ts` points `server.url` at the current public tunnel so the shell
is installable and testable today. **Store submission MUST use the owner's real
custom domain** — a tunnel URL is unacceptable to both stores and would break the
GCash deep-link return. Swap it in `capacitor.config.ts`, then `npm run cap:sync`.

## GCash payment return (deep links)

The web flow sends the customer to PayMongo's GCash hosted checkout and redirects
back via `return_url` (built server-side in `src/app/api/payments/gcash/intent/route.ts`).
In the shell, the return must land back in the app. Two mechanisms are pre-wired:

1. **Custom scheme `aqualink://`** (works today, no domain needed) — **SHIPPED**
   - Android: intent filter in `android/app/src/main/AndroidManifest.xml`
   - iOS: `CFBundleURLTypes` in `ios/App/App/Info.plist`
   - Client handling is live in the web app:
     - `src/components/shared/CapNativeBridge.tsx` (mounted in `src/app/layout.tsx`)
       listens for `@capacitor/app`'s `appUrlOpen` (plus `getLaunchUrl` for cold
       starts) and routes `aqualink://orders/<id>` (or
       `aqualink://payment/return?order_id=<id>`) to the existing
       `/payment/gcash/return` page — the server state machine stays authoritative.
     - Native clients send `native: 1` to `/api/payments/gcash/intent`; the route
       then sets `return_url` to `aqualink://orders/<orderId>` (allowlist: the
       aqualink:// scheme or the https app origin — never arbitrary schemes).
       Web clients omit the flag and keep the https return URL.
     - The hosted checkout opens via `@capacitor/browser` on native
       (`src/lib/native.ts` `openExternalCheckout`, used by the cart + reorder
       flows); web keeps `window.location.href`.
   - Web-side caveat (unverified, sandbox test): PayMongo must honor a non-http(s)
     `return_url`. If it doesn't, use mechanism 2 (no web change needed).

2. **HTTPS App Links / universal links** (production path, no web change)
   - Android manifest has an `android:autoVerify="true"` filter with host
     `aqua.link` as a **placeholder** — replace with the real domain.
   - Before store submission, publish `https://<real-domain>/.well-known/assetlinks.json`:

     ```json
     [{
       "relation": ["delegate_permission/common.handle_all_urls"],
       "target": {
         "namespace": "android_app",
         "package_name": "ph.aqualink.app",
         "sha256_cert_fingerprints": ["<app signing cert SHA-256>"]
       }
     }]
     ```

     The SHA-256 comes from the signing keystore:
     `keytool -list -v -keystore <keystore> -alias <alias>`.
   - The GCash hosted checkout is an external https page — open it with
     `@capacitor/browser` (system browser/custom tab), never inside the WebView, so
     the return redirect fires as an intent back into the app. Client-side handling
     (`appUrlOpen` in `src/components/shared/CapNativeBridge.tsx`) is SHIPPED —
     sandbox-test it on a device before store submission.

## CI (Android APK + AAB)

`.github/workflows/android-build.yml` runs on push/PR to `v3` (and manually):
`npm ci` → `npx cap sync android` → JDK 21 → `./gradlew assembleDebug` +
`assembleRelease` + `bundleRelease`, uploading the debug APK, release APK, and the
**release AAB** (the Google Play upload artifact) as artifacts.

Release signing: set repo secrets `KEYSTORE_BASE64` (the upload keystore, base64),
`KEYSTORE_PASSWORD`, `KEYSTORE_KEY_ALIAS`, `KEYSTORE_KEY_PASSWORD` (see
`android/SIGNING.md` for generation + where to paste them). When present, CI
writes `android/keystore.properties` + `android/keystore.jks` and the release
APK/AAB are signed with the upload key. Without them the build still succeeds but
signs with the debug key and prints `UNSIGNED — NOT Play-uploadable`
(build.gradle fallback). `keystore.properties` and `*.jks` are gitignored — never
commit secrets.

Toolchain in the generated project: AGP 8.13.0, Gradle 8.14.3, minSdk 24,
compileSdk/targetSdk 36. `local.properties` (SDK path) is gitignored; on GitHub
runners `ANDROID_HOME` is provided by the preinstalled SDK.

## Owner-side prerequisites before store submission

- [ ] **Real domain** (Plus custom domain) with TLS — swap `server.url`, publish
      `assetlinks.json` with the signing cert SHA-256.
- [ ] **Apple Developer** ($99/yr) + **Google Play** ($25 one-time) accounts.
- [ ] **DTI/SEC entity registration** — unblocks Play org account (skips the
      20-tester wait), PayMongo wallet verification, and App Store seller identity.
- [ ] **Account-deletion flow in the app** — Apple guideline 5.1.1(v); no such flow
      exists yet. Store blocker.
- [ ] **Privacy policy** URL + Data Safety form (location, payment, account info).
- [ ] **Signing strategy**: Play App Signing (Google holds the key; upload with an
      upload keystore — keep it safe or as CI secrets).
- [ ] **iOS build**: needs macOS (CI runner or a Mac): `npm run cap:add:ios` was run
      here, but `xcodebuild` requires macOS.
- [ ] App icon/splash assets (currently Capacitor defaults).
- [ ] Device-test the GCash return flow in the shell (appUrlOpen handler +
      Browser plugin are shipped; see the GCash deep-link return PR for
      sandbox-test steps).
- [ ] Later: Firebase project → `google-services.json` → FCM push (replaces polling).

## Verified on the dev box (this PR)

- `npx cap add android` / `npx cap add ios` / `npx cap sync` — all pass (no SDK needed
  for file generation; full Gradle builds happen in CI).
- `npx tsc --noEmit` — passes.
- The web app itself is untouched: live app and tunnel return HTTP 200.

Not possible here (documented, not done): local APK build (needs ~2.5–4 GB +
2–4 GB RAM; this box has 3.9 GB total and hosts the live app), device/emulator
deep-link test, iOS build (macOS).
