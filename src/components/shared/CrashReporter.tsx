"use client";

/**
 * App-wide client crash capture (owner request, Sep 2026).
 *
 * Mounted once in the root layout. Three capture paths, all fire-and-forget:
 *   1. window.onerror            — uncaught runtime errors
 *   2. window.onunhandledrejection — unhandled promise rejections
 *   3. CrashBoundary             — React render errors (class boundary; wraps
 *                                  the page tree so a crashed page shows a
 *                                  small fallback instead of a blank screen)
 *
 * Every event is POSTed to /api/telemetry/crash as JSON. Hard guarantees:
 *   - NEVER affects UX: no blocking, no console spam, no retry loops.
 *   - Burst-deduped: max 1 report/second per tab.
 *   - Self-silencing: after 5 consecutive transport failures the reporter
 *     stops for the session (server unreachable → don't hammer it).
 *   - 429/413 from the server reset the failure counter (endpoint is alive,
 *     just throttling us — dedupe already keeps us well under the limit).
 */
import { Component, useEffect, useRef, type ErrorInfo, type ReactNode } from "react";
import { useSession } from "next-auth/react";

const ENDPOINT = "/api/telemetry/crash";
const MIN_INTERVAL_MS = 1000; // max 1 report per second
const MAX_CONSECUTIVE_FAILURES = 5;

interface CrashPayload {
  message?: string;
  stack?: string;
  route?: string;
  userAgent?: string;
  userId?: string | null;
  at?: string;
}

let lastSentAt = 0;
let consecutiveFailures = 0;
let silenced = false;
/** Session user id, kept module-level so the class boundary can read it. */
let currentUserId: string | null = null;
export function setCrashReporterUserId(id: string | null) {
  currentUserId = id;
}

function cap(v: string, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function sendReport(payload: CrashPayload) {
  if (silenced) return;
  const now = Date.now();
  if (now - lastSentAt < MIN_INTERVAL_MS) return; // dedupe bursts
  lastSentAt = now;

  const body = JSON.stringify({
    message: cap(payload.message ?? "", 2000),
    stack: cap(payload.stack ?? "", 8000),
    route: cap(payload.route ?? "", 1000),
    userAgent: cap(payload.userAgent ?? "", 500),
    userId: payload.userId ? cap(payload.userId, 200) : null,
    at: new Date().toISOString(),
  });

  // keepalive so the report survives page unload; silently ignored either way.
  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  })
    .then((r) => {
      if (r.ok || r.status === 429 || r.status === 413) {
        consecutiveFailures = 0; // server reachable (or throttling us) — not a transport failure
      } else {
        consecutiveFailures += 1;
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) silenced = true;
      }
    })
    .catch(() => {
      consecutiveFailures += 1;
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) silenced = true;
    });
}

/** The hook component: syncs the session user id and installs window handlers. */
export function CrashReporter() {
  const { data: session } = useSession();
  const sessionUserId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const userIdRef = useRef<string | null>(sessionUserId);
  useEffect(() => {
    userIdRef.current = sessionUserId;
    setCrashReporterUserId(sessionUserId);
  }, [sessionUserId]);

  useEffect(() => {
    const route = () =>
      typeof window !== "undefined" ? window.location.pathname : "";
    const ua = () =>
      typeof navigator !== "undefined" ? navigator.userAgent : "";

    const onError = (event: ErrorEvent) => {
      sendReport({
        message: event.message || "Uncaught error",
        stack: event.error instanceof Error ? event.error.stack || "" : "",
        route: route(),
        userAgent: ua(),
        userId: userIdRef.current,
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason: unknown = event.reason;
      let message = "Unhandled promise rejection";
      let stack = "";
      if (reason instanceof Error) {
        message = reason.message || message;
        stack = reason.stack || "";
      } else if (typeof reason === "string") {
        message = reason;
      } else if (reason && typeof reason === "object") {
        try {
          const m = (reason as { message?: unknown }).message;
          message =
            typeof m === "string"
              ? m
              : JSON.stringify(reason).slice(0, 200) || message;
        } catch {
          /* keep default message */
        }
      }
      sendReport({
        message: cap(message, 2000),
        stack: cap(stack, 8000),
        route: route(),
        userAgent: ua(),
        userId: userIdRef.current,
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}

interface CrashBoundaryState {
  crashed: boolean;
  message: string;
}

/**
 * React error boundary for render errors. Wraps the page tree in the root
 * layout; on a render crash it reports to telemetry and swaps in a small
 * recovery screen (the app chrome — nav, toaster — stays alive outside it).
 */
export class CrashBoundary extends Component<
  { children: ReactNode },
  CrashBoundaryState
> {
  state: CrashBoundaryState = { crashed: false, message: "" };

  static getDerivedStateFromError(error: Error): CrashBoundaryState {
    return { crashed: true, message: error.message || "Render error" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    sendReport({
      message: error.message || "Render error",
      stack: `${error.stack || ""}\n--- component stack ---\n${info.componentStack || ""}`,
      route: typeof window !== "undefined" ? window.location.pathname : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      userId: currentUserId,
    });
  }

  render() {
    if (this.state.crashed) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30">
            <span className="text-3xl" aria-hidden>
              💥
            </span>
          </div>
          <h3 className="text-lg font-bold text-foreground">
            May nangyaring error
          </h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            Hindi natapos ang page na ito. Naabisuhan na ang team — subukan
            muli, o bumalik sa home.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ crashed: false, message: "" })}
            className="mt-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
          >
            Subukan Muli
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}