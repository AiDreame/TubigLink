"use client";

/**
 * CapNativeBridge — mounted once in the root layout. It ONLY acts inside the
 * Capacitor native shell; on web it renders nothing and registers nothing.
 *
 * Job: listen for `aqualink://` deep links (the GCash checkout return) and
 * route the WebView to the EXISTING server-authoritative return page. The
 * bridge never trusts a status carried in the link — it only extracts the
 * order reference and hands it to /payment/gcash/return, which polls
 * GET /api/payments/orders/:orderId (PayMongo intent + webhook state machine).
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { isNativePlatform } from "@/lib/native";

const AQUALINK_SCHEME = "aqualink:";

/**
 * Parse an aqualink:// deep link into a return-page route, or null.
 *
 * Accepted shapes (both handled because the manifest documents
 * `aqualink://orders/<id>?payment=...` and the server emits the same form):
 *   aqualink://orders/<orderId>?payment=success|cancelled|failed
 *   aqualink://payment/return?order_id=<orderId>
 * Any other aqualink:// path is ignored (returns null). Non-aqualink URLs are
 * always ignored.
 */
export function parseAqualinkDeepLink(rawUrl: string): string | null {
  if (typeof rawUrl !== "string") return null;
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== AQUALINK_SCHEME) return null;

  // aqualink://orders/<orderId>[?payment=...]  — host is "orders", path is /<id>
  if (url.host === "orders") {
    const orderId = url.pathname.replace(/^\/+/, "");
    if (orderId) return `/payment/gcash/return?order_id=${encodeURIComponent(orderId)}`;
    return null;
  }
  // aqualink://payment/return?order_id=<orderId> — host is "payment", path /return
  if (url.host === "payment" && url.pathname === "/return") {
    const orderId = url.searchParams.get("order_id");
    if (orderId) return `/payment/gcash/return?order_id=${encodeURIComponent(orderId)}`;
    return null;
  }
  return null;
}

export default function CapNativeBridge() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativePlatform()) return; // web: render nothing, register nothing

    let removeListener: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      // Cold start: the app may have been launched BY a deep link (GCash
      // finishing while AquaLink wasn't running). getLaunchUrl() covers that;
      // appUrlOpen covers warm starts below.
      const launch = await App.getLaunchUrl().catch(() => null);
      if (cancelled) return;
      if (launch?.url) {
        const target = parseAqualinkDeepLink(launch.url);
        if (target) router.replace(target);
      }
      const handle = await App.addListener("appUrlOpen", (event) => {
        const target = parseAqualinkDeepLink(event.url);
        if (target) router.push(target);
      });
      if (cancelled) {
        void handle.remove();
        return;
      }
      removeListener = () => void handle.remove();
    })();

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [router]);

  return null;
}