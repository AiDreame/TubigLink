"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { MessageSquarePlus } from "lucide-react";
import { ReportIssueDialog } from "@/components/support/ReportIssueDialog";

/**
 * Floating "Report an issue" button (owner direction, Aug 19).
 *
 * A fixed-position button that never leaves the page on authenticated surfaces,
 * opening a GENERAL issue-reporting form (not order-only). The issue may
 * optionally be linked to one of the reporter's own orders. Submitting creates
 * a SupportTicket which spawns the Discord support thread (via the shared push
 * lib) and is visible in the customer's support conversation.
 *
 * Shown for CUSTOMER and PROVIDER roles on every app page; hidden on auth pages
 * and the admin console. Configurable role list below if the owner changes the
 * audience later. The dialog itself lives in
 * src/components/support/ReportIssueDialog (shared with /support).
 */
const FAB_ROLES = ["CUSTOMER", "PROVIDER"];

export function SupportFab() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAuthedFab = !!session && FAB_ROLES.includes(role);

  // Hide on auth pages + admin console (non-app-shell surfaces).
  const hidden =
    pathname.startsWith("/auth") || pathname.startsWith("/admin") || pathname.startsWith("/support");

  const [open, setOpen] = useState(false);

  if (!isAuthedFab || hidden) return null;

  return (
    <>
      {/* Persistent floating action button — never leaves the viewport */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Report an issue"
        className="fixed bottom-24 md:bottom-6 right-4 z-50 flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors"
      >
        <MessageSquarePlus className="h-5 w-5" aria-hidden="true" />
        <span className="text-sm font-semibold">Report an issue</span>
      </button>

      <ReportIssueDialog open={open} onOpenChange={setOpen} />
    </>
  );
}