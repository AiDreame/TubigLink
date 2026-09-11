/**
 * Native-shell bridge helpers (Capacitor).
 *
 * All of these are safe no-ops in a plain web browser and during SSR: none of
 * the Capacitor API surface is touched unless the current runtime is actually
 * the native WebView (Capacitor.isNativePlatform() === true). The web app keeps
 * its exact current behavior — these helpers only add native behavior on top.
 */
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

/** True when running inside the Capacitor native shell (Android/iOS). */
export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false; // SSR — never native
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Open the PayMongo GCash checkout URL.
 *
 * - Native: opens in the in-app browser (system browser / custom tab) so the
 *   return redirect can fire as an intent (aqualink://) back into the app.
 * - Web: unchanged behavior — full-page navigation to the hosted checkout.
 *
 * Returns true when it opened the in-app browser (callers may want to register
 * a `browserFinished` watcher to reset transient "redirecting" UI).
 */
export async function openExternalCheckout(url: string): Promise<boolean> {
  if (isNativePlatform()) {
    await Browser.open({ url });
    return true;
  }
  window.location.href = url;
  return false;
}

/**
 * Subscribe to the in-app browser being closed (native only). On web this
 * never fires and the returned unsubscribe is a no-op. Use it to clear
 * "redirecting to GCash…" UI when the customer closes the tab without paying.
 */
export function watchBrowserClosed(callback: () => void): () => void {
  if (!isNativePlatform()) return () => {};
  let unsubscribe: (() => void) | undefined;
  void Browser.addListener("browserFinished", () => callback()).then(
    (handle) => {
      unsubscribe = () => void handle.remove();
    },
  );
  return () => unsubscribe?.();
}