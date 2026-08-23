#!/usr/bin/env node
/**
 * AquaLink PH — Discord support-bot listener (two-way bridge, Aug 18).
 *
 * A small, dependency-free, long-lived process (Node >= 22: global WebSocket +
 * fetch). It connects to the Discord Gateway for the guild's support channel
 * and does two things:
 *
 *   1. THREAD + BIND: when it sees the app's ticket message (posted by the
 *      channel webhook, tagged `[ticket:<disputeId>]`) it spins it into a
 *      thread and POSTs a `bind` event to /api/webhooks/discord so the app
 *      stores discordThreadId on the dispute.
 *   2. FORWARD: when support staff reply inside a thread, it POSTs a `message`
 *      event to /api/webhooks/discord with the threadId + content, and the app
 *      appends a DisputeMessage (authorRole=STAFF) visible 3-party in-app.
 *
 * Runs as:  node scripts/discord-bot.mjs
 * Env:      DISCORD_BOT_TOKEN          (bot token — REQUIRED to connect)
 *           DISCORD_SUPPORT_CHANNEL_ID (support channel id — REQUIRED)
 *           DISCORD_WEBHOOK_SECRET     (shared secret for /api/webhooks/discord)
 *           DISCORD_APP_BASE_URL       (app base URL; falls back to
 *                                      NEXT_PUBLIC_APP_URL / NEXTAUTH_URL)
 *           DISCORD_BOT_SELF_ID        (optional; bot's own user id to skip
 *                                      echoes — defaults to the connected user)
 *
 * Robustness: heartbeat, reconnect-on-drop with exponential backoff, ignores
 * the bot's own messages. Any failure to reach the app webhook is logged and
 * does not crash the loop.
 */

const TOKEN = process.env.DISCORD_BOT_TOKEN?.trim();
const SUPPORT_CHANNEL = process.env.DISCORD_SUPPORT_CHANNEL_ID?.trim();
const SECRET = process.env.DISCORD_WEBHOOK_SECRET?.trim();
const APP_BASE =
  process.env.DISCORD_APP_BASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  process.env.NEXTAUTH_URL?.trim();

const TICKET_MARKER_RE = /\[ticket:([A-Za-z0-9]+)\]/;

if (!TOKEN || !SUPPORT_CHANNEL) {
  console.error(
    "[discord-bot] DISCORD_BOT_TOKEN and DISCORD_SUPPORT_CHANNEL_ID are required."
  );
  process.exit(1);
}
if (!SECRET || !APP_BASE) {
  console.error(
    "[discord-bot] DISCORD_WEBHOOK_SECRET and an app base URL are required to sync replies back to the app."
  );
  process.exit(1);
}

const API = "https://discord.com/api/v10";
const GATEWAY = "wss://gateway.discord.gg/?v=10&encoding=json";
// intents: GUILDS(1) + GUILD_MESSAGES(512) + MESSAGE_CONTENT(32768)
const INTENTS = 1 | 512 | 32768;

let ws = null;
let heartbeatTimer = null;
let shouldRun = true;
let selfId = process.env.DISCORD_BOT_SELF_ID?.trim() || null;

function log(...a) {
  console.log(new Date().toISOString(), ...a);
}

async function discordFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bot ${TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`discord ${options.method || "GET"} ${path} -> ${res.status} ${text.slice(0, 200)}`);
  }
  return res.status === 204 ? null : res.json();
}

async function postToApp(payload) {
  try {
    const res = await fetch(`${APP_BASE.replace(/\/$/, "")}/api/webhooks/discord`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SECRET}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      log(`[discord-bot] app webhook -> ${res.status}`, (await res.text().catch(() => ""))?.slice(0, 200));
    }
  } catch (e) {
    log("[discord-bot] app webhook error:", e.message);
  }
}

/** Create a public thread from an existing message via REST. */
async function createThreadFromMessage(channelId, messageId, name) {
  const body = await discordFetch(
    `/channels/${channelId}/messages/${messageId}/threads`,
    { method: "POST", body: JSON.stringify({ name: name.slice(0, 100), auto_archive_duration: 1440 }) }
  );
  return body;
}

function handleEvent(payload) {
  if (!payload || payload.t !== "MESSAGE_CREATE" || payload.d?.type !== 0) return;
  const m = payload.d;
  const channelId = String(m.channel_id || "");
  const content = typeof m.content === "string" ? m.content : "";

  // 1) The app's ticket marker -> thread it + bind it back to the app.
  const marker = content.match(TICKET_MARKER_RE);
  if (marker && channelId === SUPPORT_CHANNEL) {
    const disputeId = marker[1];
    log(`[discord-bot] ticket marker for dispute ${disputeId} -> creating thread`);
    createThreadFromMessage(channelId, m.id, `Issue report — ${disputeId.slice(0, 8)}`)
      .then((thread) => {
        log(`[discord-bot] thread created ${thread.id} for dispute ${disputeId}`);
        return postToApp({
          action: "bind",
          disputeId,
          threadId: String(thread.id),
          channelId: String(thread.parent_id || channelId),
        });
      })
      .catch((e) => log("[discord-bot] thread create failed:", e.message));
    return;
  }

  // 2) Ignore our own bot / webhook messages.
  if (m.author?.bot) return;

  // 3) A human reply. Forward it if it's inside a thread (not the flat support
  //    channel). The app reverse-maps threadId -> dispute and ignores unknown
  //    threads, so stray messages are harmless.
  if (channelId !== SUPPORT_CHANNEL && content.trim()) {
    postToApp({
      action: "message",
      threadId: channelId,
      content: content.slice(0, 4000),
      authorName: (m.author?.username || "Support").slice(0, 80),
      authorId: String(m.author?.id || ""),
    });
  }
}

function startHeartbeat(intervalMs) {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ op: 1, d: null }));
    }
  }, intervalMs);
}
function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function connect(attempt) {
  log(`[discord-bot] connecting (attempt ${attempt})`);
  ws = new WebSocket(GATEWAY);
  let helloInterval = null;

  ws.onopen = () => {
    log("[discord-bot] gateway socket open");
  };

  ws.onmessage = (ev) => {
    let data;
    try {
      data = JSON.parse(ev.data);
    } catch {
      return;
    }
    const { op, d, t } = data;
    if (op === 10) {
      // Hello: send IDENTIFY, start heartbeat.
      ws.send(
        JSON.stringify({
          op: 2,
          d: {
            token: TOKEN,
            intents: INTENTS,
            properties: { $os: "linux", $browser: "aqualink-support-bot", $device: "aqualink-support-bot" },
          },
        })
      );
      startHeartbeat(Math.max(1000, d.heartbeat_interval - 2000));
      log("[discord-bot] IDENTIFY sent");
    } else if (op === 1) {
      ws.send(JSON.stringify({ op: 1, d: null }));
    } else if (op === 7) {
      log("[discord-bot] reconnect requested by gateway");
      ws.close();
    } else if (op === 0) {
      if (t === "READY") {
        selfId = selfId || String(d.user?.id || "");
        log(`[discord-bot] READY as ${d.user?.username || selfId}`);
      } else if (t === "MESSAGE_CREATE") {
        handleEvent({ t, d });
      }
    }
  };

  ws.onerror = (e) => {
    log("[discord-bot] websocket error", e?.message || "");
  };

  ws.onclose = (e) => {
    stopHeartbeat();
    log(`[discord-bot] connection closed (code=${e?.code})`);
    if (!shouldRun) return;
    const delay = Math.min(30000, 1000 * Math.pow(2, Math.min(attempt, 5)));
    log(`[discord-bot] reconnecting in ${Math.round(delay / 1000)}s`);
    setTimeout(() => connect(attempt + 1), delay);
  };
}

function shutdown() {
  shouldRun = false;
  stopHeartbeat();
  if (ws) {
    try {
      ws.close();
    } catch {}
  }
  setTimeout(() => process.exit(0), 200);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

connect(0);
