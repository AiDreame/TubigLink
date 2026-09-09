#!/usr/bin/env node
/**
 * AquaLink PH — Discord support-bot listener (two-way bridge, Aug 18;
 * per-ticket channels Phase 2a, Sep 9).
 *
 * A small, dependency-free, long-lived process (Node >= 22: global WebSocket +
 * fetch). It connects to the Discord Gateway for the guild's support channel
 * and does three things:
 *
 *   1. THREAD + BIND (legacy, kept for records created before Phase 2a): when
 *      it sees the app's ticket message (posted by the channel webhook,
 *      tagged `[ticket:<disputeId>]`) it spins it into a private/public
 *      thread and POSTs a `bind` event to /api/webhooks/discord so the app
 *      stores discordThreadId on the dispute.
 *   2. FORWARD (legacy): when support staff reply inside a thread, it POSTs a
 *      `message` event to /api/webhooks/discord with the threadId + content,
 *      and the app appends a DisputeMessage (authorRole=STAFF) visible 3-party
 *      in-app.
 *   3. DOC DECISION (station-docs review, Sep 9): when staff click the
 *      Approve/Reject buttons on a station-document embed (customId
 *      `doc_approve:<docId>` / `doc_reject:<docId>`), the bot POSTs a
 *      `doc_decision` event to /api/webhooks/discord and acks the click by
 *      disabling the buttons. The app flips the StationDocument row, audits,
 *      notifies, and PATCHes the embed (recolor). Ticket/dispute flows below
 *      are untouched by this path.
 *
 *   4. CHANNEL FORWARD (Phase 2a): when support staff post in any `ticket-*`
 *      channel (the per-ticket channels the app creates via the bot REST API),
 *      it POSTs a `channel_message` event to /api/webhooks/discord with the
 *      channelId + content, and the app reverse-maps discordChannelId ->
 *      dispute/ticket and appends the same STAFF DisputeMessage.
 *
 * Runs as:  node scripts/discord-bot.mjs
 * Env:      DISCORD_BOT_TOKEN          (bot token — REQUIRED to connect)
 *           DISCORD_SUPPORT_CHANNEL_ID (support channel id — REQUIRED)
 *           DISCORD_WEBHOOK_SECRET     (shared secret for /api/webhooks/discord)
 *           DISCORD_APP_BASE_URL       (app base URL; falls back to
 *                                      NEXT_PUBLIC_APP_URL / NEXTAUTH_URL)
 *           DISCORD_BOT_SELF_ID        (optional; bot's own user id to skip
 *                                      echoes — defaults to the connected user
 *                                      resolved via GET /users/@me)
 *
 * Robustness: heartbeat, reconnect-on-drop with exponential backoff, ignores
 * the bot's own messages. Any failure to reach the app webhook is logged and
 * does not crash the loop. Restart this process after every deploy that
 * touches this file (the lead restarts it post-merge; it is run manually, not
 * by the app server).
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
// intents: GUILDS(1) + GUILD_MESSAGES(512) + MESSAGE_CONTENT(32768).
// Button clicks arrive as INTERACTION_CREATE dispatches, which need no
// extra privileged intent.
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

/** Channel-name prefix for Phase 2a per-ticket channels. */
const TICKET_CHANNEL_RE = /^ticket-[A-Za-z0-9]+$/;

/** Cached map of channel id -> channel name (for ticket-* detection). */
const channelNames = new Map();

async function refreshChannelName(channelId) {
  try {
    const ch = await discordFetch(`/channels/${channelId}`);
    if (ch && typeof ch.name === "string") channelNames.set(String(channelId), ch.name);
  } catch (e) {
    log("[discord-bot] channel lookup failed:", e.message);
  }
}

/** Resolve + cache the bot's own user id so own messages are never echoed. */
async function resolveSelfId() {
  if (selfId) return selfId;
  try {
    const me = await discordFetch("/users/@me");
    if (me && me.id) {
      selfId = String(me.id);
      log(`[discord-bot] resolved self id ${selfId} (${me.username || "bot"})`);
    }
  } catch (e) {
    log("[discord-bot] /users/@me failed:", e.message);
  }
  return selfId;
}

function avatarUrl(author) {
  if (!author?.id || !author?.avatar) return undefined;
  return `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.png`;
}

/** Doc-review button customIds: `doc_approve:<docId>` / `doc_reject:<docId>`. */
const DOC_DECISION_RE = /^doc_(approve|reject):([A-Za-z0-9]+)$/;

/**
 * Acknowledge a doc-review button click: disable both buttons on the original
 * message so nobody double-clicks, then POST the decision to the app (the app
 * is authoritative — it flips the row, audits, and PATCHes the embed with the
 * final color). Failures are logged, never thrown.
 */
async function handleDocDecision(interaction) {
  const data = interaction?.data || {};
  const customId = String(data.custom_id || "");
  const m = customId.match(DOC_DECISION_RE);
  if (!m) return;
  const decision = m[1]; // approve | reject
  const member = interaction.member || {};
  const user = member.user || interaction.user || {};
  const userName = String(user.username || member.nick || "Discord staff").slice(0, 80);
  const userId = String(user.id || "");
  log(`[discord-bot] doc ${decision} by @${userName} (${customId})`);

  // 1) Ack the click immediately: disable the buttons on the source message.
  try {
    const msg = interaction.message || {};
    const comps = Array.isArray(msg.components) ? msg.components : [];
    const disabled = comps.map((row) => ({
      ...row,
      components: (row.components || []).map((c) => ({ ...c, disabled: true })),
    }));
    const content =
      (decision === "approve" ? `\u2713 Approved by @${userName}` : `\u2717 Rejected by @${userName}`) +
      (msg.content ? `\n${msg.content}`.slice(0, 1900) : "");
    await discordFetch(
      `/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
      {
        method: "PATCH",
        body: JSON.stringify({
          content: content.slice(0, 2000),
          ...(disabled.length ? { components: disabled } : {}),
        }),
      }
    );
  } catch (e) {
    log("[discord-bot] doc ack edit failed:", e.message);
  }

  // 2) Forward the decision to the app (authoritative flip + embed PATCH).
  await postToApp({
    action: "doc_decision",
    customId,
    userId,
    userName,
  });
}

async function handleEvent(payload) {
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

  // 2) Ignore our own bot / webhook messages (self id preferred; the `bot`
  //    flag covers the rest, e.g. the channel webhook's posts).
  if (selfId && String(m.author?.id || "") === selfId) return;
  if (m.author?.bot) return;

  // 3) Phase 2a: a human message in a `ticket-*` channel (but not the flat
  //    support channel) -> forward as `channel_message`. The name is resolved
  //    via GET /channels/{id} and cached; unknown channels are looked up once.
  if (channelId !== SUPPORT_CHANNEL && content.trim()) {
    let name = channelNames.get(channelId);
    if (name === undefined) {
      await refreshChannelName(channelId);
      name = channelNames.get(channelId);
    }
    if (name && TICKET_CHANNEL_RE.test(name)) {
      log(`[discord-bot] ticket channel message in #${name} -> forwarding`);
      postToApp({
        action: "channel_message",
        channelId,
        content: content.slice(0, 4000),
        authorName: (m.author?.username || (m.member?.nick) || "Support").slice(0, 80),
        authorAvatar: avatarUrl(m.author),
        authorId: String(m.author?.id || ""),
        timestamp: m.timestamp || undefined,
      });
      return;
    }
  }

  // 4) Legacy: a human reply inside a thread (not the flat support channel).
  //    The app reverse-maps threadId -> dispute and ignores unknown threads,
  //    so stray messages are harmless.
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
      if (t === "INTERACTION_CREATE") {
        // Button clicks (MESSAGE_COMPONENT, type 3). Doc-review buttons are
        // handled here; anything else is ignored (ticket flows use messages).
        if (d?.type === 3) handleDocDecision(d).catch((e) => log("[discord-bot] doc decision failed:", e.message));
      } else if (t === "READY") {
        // Prefer the env override, else the connected user; ALSO resolve via
        // /users/@me so restarts pick up the real id even when the env var is
        // stale (Phase 2a echo guard).
        selfId = selfId || String(d.user?.id || "");
        log(`[discord-bot] READY as ${d.user?.username || selfId}`);
        resolveSelfId();
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
