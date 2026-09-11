# Android Release Signing (upload keystore + AAB)

Google Play **requires** an **App Bundle (AAB)** for new apps and picks up the release
APK only in legacy tracks. AABs must be signed with a real **upload key** — Google
Play App Signing then manages the actual app-signing key on their side.

CI builds **both** the release APK and the release AAB (`bundleRelease`) on every
push/PR to `v3`. Today, with no credentials set, both artifacts are signed with the
**debug key** (the Capacitor template fallback) — that is fine for smoke-testing the
pipeline but **NOT Play-uploadable**. This page is the checklist to make it uploadable.

## 1. Generate the upload keystore (on YOUR machine, once)

You need JDK installed locally (any recent JDK; `keytool` ships with it).
Open a terminal and run **exactly**:

```bash
keytool -genkeypair -v -keystore aqualink-upload.keystore -alias aqualink -keyalg RSA -keysize 4096 -validity 10000
```

`keytool` will prompt for:

- **Keystore password** — choose a long, random one (e.g. a 20+ char passphrase).
  You must enter it twice. This is `KEYSTORE_PASSWORD`.
- **Key password** — press Enter to let it default to the keystore password, or set
  a different one. This is `KEYSTORE_KEY_PASSWORD` (if it differs from the keystore
  password, keep both safe).
- Your **name/org details** — these are basically ignored by Play; anything truthful
  is fine (e.g. your name / AquaLink PH).
- Confirm with `y`.

The `-alias aqualink` becomes `KEYSTORE_KEY_ALIAS`. `-validity 10000` ≈ 27 years;
picking a very long validity avoids a mid-life expiry problem (Play requires ≥ 2033
for new upload keys anyway).

## 2. Encode it as base64 (still on YOUR machine)

```bash
base64 -w0 aqualink-upload.keystore
```

Copy the entire single line of output (it is long — one continuous string, no
newlines).

## 3. Add the 4 secrets on GitHub

Go to **repo Settings → Secrets and variables → Actions → New repository secret**
(repo = `AiDreame/TubigLink`). Add each as a new secret, exactly:

| Secret name              | Value                                                            |
| ------------------------ | ---------------------------------------------------------------- |
| `KEYSTORE_BASE64`        | the full base64 line from step 2 (no newlines/spaces)            |
| `KEYSTORE_PASSWORD`      | the keystore password                                            |
| `KEYSTORE_KEY_ALIAS`     | `aqualink`                                                       |
| `KEYSTORE_KEY_PASSWORD`  | the key password (defaults to the keystore password if you pressed Enter) |

When `KEYSTORE_BASE64` is set, CI decodes it to `android/keystore.jks`, writes
`android/keystore.properties`, and the release APK **and** AAB are signed with the
upload key. Both files are gitignored — never commit them. If the secret is absent
the build still succeeds but prints **`UNSIGNED — NOT Play-uploadable`** in the
"Write release signing config" step.

Trigger a run (push a commit or use the workflow's `workflow_dispatch`), then grab
the **`aqualink-release-aab`** artifact (`app-release.aab`) from the run's
Artifacts section — that is the file you upload to **Play Console → App bundle
explorer**. Play App Signing walks you through enrolling your upload key the first
time.

## 4. Keep the keystore safe ⚠️

- Store `aqualink-upload.keystore` + both passwords in two offline places (encrypted
  drive, printed copy in a safe). The Keystore file **is** the upload key.
- **If you lose the keystore or its passwords, your upload key is gone.** You can
  still ship updates by *re-uploading the app under a brand-new upload key*
  (Play support can reset it via the "reset upload key" flow), which is disruptive —
  avoidable by not losing it.
- Anyone with the base64 + passwords can sign releases as AquaLink — treat the
  secret values like account passwords.

## CI internals (for the team, not the owner)

- Secrets live only as GitHub Actions secrets; `KEYSTORE_BASE64` is decoded and the
  properties file written inside the `Write release signing config` step
  (`base64 -d > keystore.jks`, then `printf` the 4 keys into `keystore.properties`).
- `android/app/build.gradle` reads `android/keystore.properties` when present
  (`keyAlias` / `keyPassword` / `storeFile` / `storePassword`) and falls back to the
  debug signing config when absent — so `assembleRelease`/`bundleRelease` never fail
  just because the secrets are missing.
- Artifacts: `aqualink-debug-apk`, `aqualink-release-apk`, `aqualink-release-aab`,
  all uploaded with `actions/upload-artifact@v4`.