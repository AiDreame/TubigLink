#!/usr/bin/env bash
#
# restore-runtime.sh — one-command recovery for the AquaLink PH local runtime
# after a sandbox machine replacement (which wipes /tmp: the node_modules
# install target and the npm cache die with it).
#
# Turns the recurring ~30-60 min manual recovery into a single ~2-5 min command.
# Safe to run at ANY time: every step is idempotent and makes no destructive
# change when the runtime is already healthy (it doubles as a health check).
#
# After a machine replacement, run:
#     bash /home/team/shared/aqualink-v2/scripts/restore-runtime.sh
#
# Guarantees:
#   * Never touches git state (no git commands at all)
#   * Never modifies source files; next.config.js is only ever swapped for a
#     memory-safe build config and restored byte-identical afterwards (verified
#     with cmp; a trap restores it even on build failure / Ctrl-C)
#   * Never re-seeds the database (only a read-only User-count sanity check)
#   * Never installs node_modules on /home (install target lives on /tmp; the
#     project dir only holds a symlink)
#   * Starts the app on port 3000, NEVER port 80 (the sandbox exports PORT=80)
#
# Env overrides (useful for QA / scratch runs):
#   APP_DIR=...      app checkout to operate on (default: repo root of this script)
#   SITE_DIR=...     TanStack site checkout (default: /home/team/shared/site)
#   INSTALL_DIR=...  dir that holds node_modules (default: /tmp/aqualink-v2)
#   DRY_RUN=1        print the plan, change nothing
#   DRY_FORCE_RECOVERY=1   (with DRY_RUN) pretend the app is down so the
#                          port-recovery plan is printed
#
set -u   # note: no -e — failures are handled explicitly with clear messages

log()  { printf '[restore] %s\n' "$*"; }
loge() { printf '[restore] %s\n' "$*" >&2; }   # for functions that must only print their result on stdout
fail() { printf '[restore] ERROR: %s\n' "$*" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_APP_DIR="$(dirname "$SCRIPT_DIR")"
APP_DIR="${APP_DIR:-$DEFAULT_APP_DIR}"
SITE_DIR="${SITE_DIR:-/home/team/shared/site}"
# Install target: /tmp/aqualink-v2 for the real checkout; an isolated target
# for scratch/QA APP_DIR overrides so scratch runs never touch the real one.
DEFAULT_INSTALL="/tmp/aqualink-v2"
[ "$APP_DIR" = "$DEFAULT_APP_DIR" ] || DEFAULT_INSTALL="/tmp/aqualink-v2-$(basename "$APP_DIR")"
INSTALL_DIR="${INSTALL_DIR:-$DEFAULT_INSTALL}"
TMP_ROOT="$(dirname "$INSTALL_DIR")"
APP_LOG="${APP_LOG:-/tmp/aqualink-server.log}"
BUILD_LOG="${BUILD_LOG:-/tmp/aqualink-build.log}"
DRY_RUN="${DRY_RUN:-}"
DRY_FORCE_RECOVERY="${DRY_FORCE_RECOVERY:-}"
APP_PORT=3000
SITE_PORT=3001
NEXT_RE='^14\.2\.[0-9]+$'
SWC_MIN_BYTES=100000000
TUNNEL_FALLBACK="https://151ddcb0324ec849a5e3e6c1f3692000.ctonew.app"

[ -d "$APP_DIR" ] || fail "app dir not found: $APP_DIR"
[ -f "$APP_DIR/package.json" ] || fail "no package.json in $APP_DIR (not an app checkout?)"

log "=== AquaLink PH runtime restore ==="
log "APP_DIR=$APP_DIR  INSTALL_DIR=$INSTALL_DIR  SITE_DIR=$SITE_DIR"
[ -n "$DRY_RUN" ] && log "DRY-RUN is ON — printing the plan, changing nothing"

# ---------------------------------------------------------------------------
# tiny helpers
# ---------------------------------------------------------------------------

http_code() { # url, max-time
  curl -s -o /dev/null -w "%{http_code}" --max-time "${2:-8}" "$1" 2>/dev/null || echo 000
}

title_matches() { case "$1" in *"AquaLink PH"*) return 0 ;; *) return 1 ;; esac; }

app_healthy() {
  local code title
  code=$(http_code "http://localhost:$APP_PORT/" 8)
  [ "$code" = "200" ] || return 1
  title=$(curl -s --max-time 8 "http://localhost:$APP_PORT/" 2>/dev/null | grep -o "<title>[^<]*</title>" | head -1)
  title_matches "$title"
}

site_healthy() { [ "$(http_code "http://localhost:$SITE_PORT/" 5)" = "200" ]; }

tunnel_url() {
  local u
  u=$(sed -n 's/^NEXT_PUBLIC_APP_URL=//p' "$APP_DIR/.env" 2>/dev/null | head -1 | tr -d '"' | tr -d "'")
  [ -n "$u" ] || u=$(sed -n 's/^NEXTAUTH_URL=//p' "$APP_DIR/.env" 2>/dev/null | head -1 | tr -d '"' | tr -d "'")
  [ -n "$u" ] || u="$TUNNEL_FALLBACK"
  printf '%s' "$u"
}

next_version() { node -e "console.log(require('$1/package.json').version)" 2>/dev/null; }

next_version_ok() { # node_modules dir
  local v; v=$(next_version "$1/next") || return 1
  [[ "$v" =~ $NEXT_RE ]]
}

swc_ok() { # node_modules dir
  local swc
  swc=$(ls "$1"/@next/swc-linux-x64-gnu/next-swc.linux-x64-gnu.node 2>/dev/null | head -1)
  [ -n "$swc" ] || return 1
  [ "$(stat -c %s "$swc" 2>/dev/null || echo 0)" -ge "$SWC_MIN_BYTES" ]
}

node_modules_valid() { # dir — next 14.2.x present AND SWC binary not truncated
  [ -d "$1" ] && next_version_ok "$1" && swc_ok "$1"
}

# Return an npm cache path that survives /tmp wipes (prefer one on /home),
# seeding it from the warm default cache the first time.
npm_cache() {
  local home_cache="/home/team/shared/.npm-cache"
  if [ -d "$home_cache" ] && [ -n "$(ls -A "$home_cache" 2>/dev/null)" ]; then
    printf '%s' "$home_cache"; return 0
  fi
  local def; def=$(npm config get cache 2>/dev/null || true)
  case "$def" in
    /tmp/*|/var/tmp/*) : ;;                    # wiped with /tmp — not usable
    "") : ;;
    *) if [ -d "$def" ] && [ -n "$(ls -A "$def" 2>/dev/null)" ]; then printf '%s' "$def"; return 0; fi ;;
  esac
  if [ -n "$DRY_RUN" ]; then printf '%s' "$home_cache"; return 0; fi
  if [ -d "$def" ] && [ -n "$(ls -A "$def" 2>/dev/null)" ] && [ "$def" != "$home_cache" ]; then
    local avail_mb; avail_mb=$(df -Pm /home 2>/dev/null | awk 'NR==2{print $4}')
    if [ -n "$avail_mb" ] && [ "$avail_mb" -gt 350 ]; then
      loge "seeding persistent npm cache $def -> $home_cache (keeps future recoveries warm)"
      mkdir -p "$home_cache" 2>/dev/null || true
      cp -a "$def/." "$home_cache/" 2>/dev/null || loge "WARN: could not seed npm cache (continuing with $home_cache)"
    else
      loge "WARN: not enough free space on /home (${avail_mb}MB) to seed the npm cache"
    fi
  fi
  printf '%s' "$home_cache"
}

# ---------------------------------------------------------------------------
# 1. node_modules — install on /tmp, project dir holds only a symlink
# ---------------------------------------------------------------------------

ensure_node_modules() {
  local nm="$APP_DIR/node_modules"
  if [ -L "$nm" ]; then
    local tgt; tgt=$(readlink "$nm")
    if node_modules_valid "$tgt"; then
      log "node_modules OK: symlink -> $tgt (next $(next_version "$tgt/next")) — skip install"
      return 0
    fi
    log "node_modules symlink invalid ($tgt missing or broken) — will reinstall"
    if [ -z "$DRY_RUN" ]; then rm -f "$nm"; else log "DRY-RUN: would remove symlink $nm"; fi
  elif [ -e "$nm" ]; then
    if node_modules_valid "$nm"; then
      log "node_modules is a REAL dir — moving it to $INSTALL_DIR to keep /home free"
      if [ -z "$DRY_RUN" ]; then
        mkdir -p "$INSTALL_DIR"
        if [ -e "$INSTALL_DIR/node_modules" ]; then
          log "install target already has node_modules — discarding the copy in the app dir"
          rm -rf "$nm"
        else
          mv "$nm" "$INSTALL_DIR/node_modules"
        fi
        ln -s "$INSTALL_DIR/node_modules" "$nm"
      else
        log "DRY-RUN: would mv $nm -> $INSTALL_DIR/node_modules and symlink"
      fi
      return 0
    fi
    log "node_modules is a REAL dir but invalid — removing it (frees /home)"
    if [ -z "$DRY_RUN" ]; then rm -rf "$nm"; else log "DRY-RUN: would rm -rf $nm"; fi
  fi
  # install target may already hold a valid copy (e.g. symlink was the only casualty)
  if node_modules_valid "$INSTALL_DIR/node_modules"; then
    log "node_modules already valid at $INSTALL_DIR/node_modules — linking"
    if [ -z "$DRY_RUN" ]; then ln -s "$INSTALL_DIR/node_modules" "$nm"; else log "DRY-RUN: would ln -s $INSTALL_DIR/node_modules $nm"; fi
    return 0
  fi
  local cache; cache=$(npm_cache)
  log "installing deps into $INSTALL_DIR (npm cache: $cache) — the slow step (~30-90s when warm)"
  if [ -z "$DRY_RUN" ]; then
    mkdir -p "$INSTALL_DIR" || fail "cannot create $INSTALL_DIR"
    rm -rf "$INSTALL_DIR/node_modules"
    cp -f "$APP_DIR/package.json" "$APP_DIR/package-lock.json" "$INSTALL_DIR/" \
      || fail "cannot copy package.json/package-lock.json into $INSTALL_DIR"
    ( cd "$INSTALL_DIR" \
        && npm install --cache "$cache" --prefer-offline --legacy-peer-deps --no-audit --no-fund --loglevel=error ) \
      || fail "npm install failed (see output above; check network / npm cache)"
    node_modules_valid "$INSTALL_DIR/node_modules" \
      || fail "npm install finished but node_modules is not valid (need next 14.2.x and a full ~131MB SWC binary)"
    ln -s "$INSTALL_DIR/node_modules" "$nm"
  else
    log "DRY-RUN: would npm install (--legacy-peer-deps --no-audit --no-fund, cache=$cache) in $INSTALL_DIR"
  fi
  log "node_modules ready: next $(next_version "$INSTALL_DIR/node_modules/next")"
}

# ---------------------------------------------------------------------------
# 2. .next — reuse a real build; rebuild only when absent/broken
# ---------------------------------------------------------------------------

ensure_next() {
  local next="$APP_DIR/.next"
  if [ -L "$next" ]; then
    local tgt; tgt=$(readlink "$next")
    if [ -d "$tgt" ] && [ -f "$tgt/BUILD_ID" ] && [ -s "$tgt/BUILD_ID" ]; then
      log ".next: symlink -> $tgt with BUILD_ID — reuse (no rebuild)"
      return 0
    fi
    log ".next: dangling symlink — removing"
    if [ -z "$DRY_RUN" ]; then rm -f "$next"; else log "DRY-RUN: would remove symlink $next"; fi
  elif [ -d "$next" ]; then
    if [ -f "$next/BUILD_ID" ] && [ -s "$next/BUILD_ID" ]; then
      log ".next: real dir with BUILD_ID — reuse (no rebuild)"
      return 0
    fi
    log ".next: real dir without BUILD_ID (partial/corrupt build) — removing"
    if [ -z "$DRY_RUN" ]; then rm -rf "$next"; else log "DRY-RUN: would rm -rf $next"; fi
  else
    log ".next: absent"
  fi
  rebuild_next
}

rebuild_next() {
  log "rebuilding .next (memory-safe config: experimental.cpus=1 + typescript.ignoreBuildErrors)"
  local saved="$TMP_ROOT/next.config.saved"
  if [ -z "$DRY_RUN" ]; then
    cp -f "$APP_DIR/next.config.js" "$saved" || fail "cannot back up next.config.js"
    restore_config() { cp -f "$saved" "$APP_DIR/next.config.js" 2>/dev/null; }
    trap restore_config EXIT
    # wrapper config: keep the real config untouched on disk as $saved, add only
    # the memory-safe flags. NEVER committed, removed/restored automatically.
    cat > "$APP_DIR/next.config.js" <<EOF
const orig = require("$saved");
orig.experimental = Object.assign({}, orig.experimental || {}, { cpus: 1 });
orig.typescript  = Object.assign({}, orig.typescript  || {}, { ignoreBuildErrors: true });
module.exports = orig;
EOF
    log "build started — log: $BUILD_LOG (takes ~5-6 min on this box; Ctrl-C is safe, config auto-restores)"
    ( cd "$APP_DIR" && npm run build ) >> "$BUILD_LOG" 2>&1
    local rc=$?
    restore_config
    trap - EXIT
    cmp -s "$APP_DIR/next.config.js" "$saved" \
      || fail "CRITICAL: next.config.js was NOT restored byte-identical — restore it manually from $saved"
    rm -f "$saved"
    [ $rc -eq 0 ] || fail "next build failed (exit $rc). Tail of $BUILD_LOG:\n$(tail -20 "$BUILD_LOG" 2>/dev/null | sed 's/^/  /')"
    [ -f "$APP_DIR/.next/BUILD_ID" ] && [ -s "$APP_DIR/.next/BUILD_ID" ] \
      || fail "build finished but $APP_DIR/.next/BUILD_ID is missing — .next may be corrupt"
  else
    log "DRY-RUN: would back up next.config.js, build with cpus=1 + ignoreBuildErrors, then restore it byte-identical"
    [ -f "$APP_DIR/.next/BUILD_ID" ] || log "DRY-RUN: NOTE: .next is absent — a real run would build here"
  fi
  log ".next ready: BUILD_ID=$(cat "$APP_DIR/.next/BUILD_ID" 2>/dev/null || echo n/a)"
}

# ---------------------------------------------------------------------------
# 3. prisma client — cheap, always safe
# ---------------------------------------------------------------------------

ensure_prisma() {
  log "running prisma generate (cheap, always safe)"
  if [ -z "$DRY_RUN" ]; then
    ( cd "$APP_DIR" && npx --no-install prisma generate ) \
      || ( cd "$APP_DIR" && "$APP_DIR/node_modules/.bin/prisma" generate ) \
      || fail "prisma generate failed"
  else
    log "DRY-RUN: would run npx prisma generate"
  fi
}

# ---------------------------------------------------------------------------
# 4. port 3000 — the site dev server (vite) grabs :3000 at boot when the app
#    is not already listening, and its supervisor loop respawns it within ~2s.
#    Kill loop + bun + vite together, start the app first, then bring the site
#    back the same way the platform does (it falls back to :3001).
# ---------------------------------------------------------------------------

site_pids() {
  ps -eo pid=,args= 2>/dev/null | grep -E "managed-server|bun run dev|vite dev" \
    | grep -v grep | awk '{print $1}' | sort -un
}

kill_site_stack() {
  local pids; pids=$(site_pids)
  if [ -z "$pids" ]; then log "no site dev server processes found — nothing to kill"; return 0; fi
  log "killing site dev server stack (supervisor loop + bun + vite): $pids"
  if [ -z "$DRY_RUN" ]; then
    local pat pl
    for pat in "managed-server" "bun run dev" "vite dev"; do     # supervisor FIRST
      pl=$(ps -eo pid=,args= 2>/dev/null | grep "$pat" | grep -v grep | awk '{print $1}')
      [ -n "$pl" ] && kill $pl 2>/dev/null
    done
    sleep 1
    for pat in "managed-server" "bun run dev" "vite dev"; do     # force-kill survivors
      pl=$(ps -eo pid=,args= 2>/dev/null | grep "$pat" | grep -v grep | awk '{print $1}')
      [ -n "$pl" ] && kill -9 $pl 2>/dev/null
    done
  else
    log "DRY-RUN: would kill: $pids"
  fi
}

start_app() {
  local detach="setsid nohup"
  command -v setsid >/dev/null 2>&1 || detach="nohup"
  log "starting AquaLink: cd $APP_DIR && $detach npm run start -- -p $APP_PORT > $APP_LOG 2>&1 &"
  [ -n "$DRY_RUN" ] && return 0
  ( cd "$APP_DIR" && $detach npm run start -- -p "$APP_PORT" > "$APP_LOG" 2>&1 < /dev/null & )
  local i=0 ok=""
  while [ $i -lt 120 ]; do
    grep -q "Ready" "$APP_LOG" 2>/dev/null && { ok=1; break; }
    sleep 2; i=$((i+2))
  done
  if [ -z "$ok" ] && grep -q "EADDRINUSE" "$APP_LOG" 2>/dev/null; then
    log "port $APP_PORT still held (EADDRINUSE) — killing stray next-server processes by PID, then retrying"
    local strays; strays=$(ps -eo pid=,args= 2>/dev/null | grep -E "next-server|next start" | grep -v grep | awk '{print $1}')
    [ -n "$strays" ] && kill $strays 2>/dev/null
    sleep 1
    ( cd "$APP_DIR" && $detach npm run start -- -p "$APP_PORT" > "$APP_LOG" 2>&1 < /dev/null & )
    i=0; ok=""
    while [ $i -lt 120 ]; do
      grep -q "Ready" "$APP_LOG" 2>/dev/null && { ok=1; break; }
      sleep 2; i=$((i+2))
    done
  fi
  if [ -z "$ok" ] && grep -q "EADDRINUSE" "$APP_LOG" 2>/dev/null; then
    log "port $APP_PORT still held after stray-kill — the site dev server may be on it; killing site stack and retrying"
    kill_site_stack
    ( cd "$APP_DIR" && $detach npm run start -- -p "$APP_PORT" > "$APP_LOG" 2>&1 < /dev/null & )
    i=0; ok=""
    while [ $i -lt 120 ]; do
      grep -q "Ready" "$APP_LOG" 2>/dev/null && { ok=1; break; }
      sleep 2; i=$((i+2))
    done
  fi
  if [ -z "$ok" ]; then
    log "FAIL: app did not become ready on :$APP_PORT. Tail of $APP_LOG:"
    tail -20 "$APP_LOG" 2>/dev/null | sed 's/^/  /'
    log "If .next is corrupt: remove $APP_DIR/.next and re-run to trigger a rebuild."
    return 1
  fi
  log "app Ready"
  if app_healthy; then log "app confirmed on :$APP_PORT (200 + AquaLink PH title)"; fi
  return 0
}

start_site_loop() {
  log "starting site dev server (platform bootstrap pattern; vite will fall back to :$SITE_PORT)"
  if [ -n "$DRY_RUN" ]; then
    log "DRY-RUN: would run: setsid nohup bash -c 'while [ \"\$(cat $SITE_DIR/.run/managed-server 2>/dev/null)\" = dev ]; do bun run dev >> $SITE_DIR/.run/dev.log 2>&1; sleep 2; done' &"
    return 0
  fi
  local loop_pids; loop_pids=$(ps -eo pid=,args= 2>/dev/null | grep "managed-server" | grep -v grep | awk '{print $1}')
  if [ -n "$loop_pids" ]; then
    log "site supervisor loop already running ($loop_pids) — not duplicating it"
    return 0
  fi
  local LOOP_CMD="while [ \"\$(cat $SITE_DIR/.run/managed-server 2>/dev/null)\" = dev ]; do bun run dev >> $SITE_DIR/.run/dev.log 2>&1; sleep 2; done"
  ( cd "$SITE_DIR" && setsid nohup bash -c "$LOOP_CMD" > /dev/null 2>&1 < /dev/null & )
  local i=0
  while [ $i -lt 90 ]; do
    site_healthy && { log "site dev server up on :$SITE_PORT"; return 0; }
    sleep 2; i=$((i+2))
  done
  log "WARN: site dev server did not answer on :$SITE_PORT within 90s. Tail of $SITE_DIR/.run/dev.log:"
  tail -15 "$SITE_DIR/.run/dev.log" 2>/dev/null | sed 's/^/  /'
  return 1
}

ensure_app_running() {
  if [ -n "$DRY_FORCE_RECOVERY" ] && [ -n "$DRY_RUN" ]; then
    log "DRY-RUN: app reported down (DRY_FORCE_RECOVERY=1) — port-recovery plan:"
    kill_site_stack
    log "DRY-RUN: would start the app (see start_app), wait for Ready, then restart the site loop"
    return 0
  fi
  if app_healthy; then
    log "app already healthy on :$APP_PORT — port recovery skipped"
    return 0
  fi
  log "app NOT healthy on :$APP_PORT — starting port recovery"
  local on3000; on3000=$(http_code "http://localhost:$APP_PORT/" 5)
  log "port :$APP_PORT currently answers: ${on3000:-none}"
  # Requirement flow: kill site stack (no-op if absent), start app, then site back.
  kill_site_stack
  start_app || return 1
  if ! site_healthy; then start_site_loop; else log "site dev server already healthy on :$SITE_PORT"; fi
  return 0
}

# ---------------------------------------------------------------------------
# 5. verification + summary
# ---------------------------------------------------------------------------

verify() {
  log "=== verification ==="
  local ok=1
  local code title
  code=$(http_code "http://localhost:$APP_PORT/" 8)
  title=$(curl -s --max-time 8 "http://localhost:$APP_PORT/" 2>/dev/null | grep -o "<title>[^<]*</title>" | head -1)
  if [ "$code" = "200" ] && title_matches "$title"; then
    log "PASS  app  :$APP_PORT -> $code, title '$title'"
  else
    log "FAIL  app  :$APP_PORT -> code=$code title='$title' (expected 200 + 'AquaLink PH')"; ok=0
  fi
  local turl tcode; turl=$(tunnel_url); tcode=$(http_code "$turl/" 20)
  if [ "$tcode" = "200" ]; then log "PASS  tunnel $turl -> 200"
  else log "FAIL  tunnel $turl -> $tcode"; ok=0; fi
  local scode; scode=$(http_code "http://localhost:$SITE_PORT/" 8)
  if [ "$scode" = "200" ]; then log "PASS  site  :$SITE_PORT -> 200"
  else log "FAIL  site  :$SITE_PORT -> $scode"; ok=0; fi
  # best-effort read-only DB sanity (never re-seeds)
  if [ -f "$APP_DIR/prisma/dev.db" ] && command -v sqlite3 >/dev/null 2>&1; then
    local users; users=$(sqlite3 "$APP_DIR/prisma/dev.db" "SELECT COUNT(*) FROM User;" 2>/dev/null || echo "?")
    log "DB sanity (read-only): User rows = $users"
    [ "$users" = "0" ] && log "WARN: User table is EMPTY — DB needs attention (script never re-seeds)"
  else
    log "DB sanity: skipped (no $APP_DIR/prisma/dev.db or sqlite3 missing)"
  fi
  if [ $ok -eq 1 ]; then
    log "ALL CHECKS PASSED"
  else
    log "SOME CHECKS FAILED — see above. App core on :$APP_PORT is $(app_healthy && echo UP || echo DOWN); tunnel/site failures may be transient platform state."
  fi
  return $((1-ok))
}

# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

npm_cache >/dev/null
ensure_node_modules
ensure_next
ensure_prisma
ensure_app_running
verify
