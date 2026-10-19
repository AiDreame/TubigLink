import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUPPORT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — AquaLink PH",
  description:
    "How refunds, issue reports, disputes, and cancellations work for AquaLink PH physical water deliveries.",
};

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "What this policy covers",
    body: [
      "AquaLink PH delivers physical goods: drinking water (purified, mineral, or alkaline) in containers, sold by water refilling stations and delivered to your door by the station's own driver or rider.",
      "This policy explains when you can cancel an order, how to report a problem with a delivery, how a dispute with a station is resolved, and how refunds are paid. It applies to every order placed through AquaLink PH.",
      "Refunds are always returned to your original payment method through PayMongo. AquaLink resolves upheld issue reports with refunds, not with re-deliveries or store credit.",
    ],
  },
  {
    heading: "Cancellations",
    body: [
      "You can cancel an order any time before it is delivered. Cancelling before delivery refunds the full order total — products and delivery fee — to your original payment method.",
      "Once an order has been delivered, it can no longer be cancelled. If something is wrong with a delivered order, report it as an issue instead (see Reporting an issue).",
      "If a station cancels or cannot fulfil an order, the full order total is refunded to you automatically.",
      "There are no cancellation charges, and there are no restocking fees for water orders — a cancellation never costs you a fee.",
    ],
  },
  {
    heading: "Reporting an issue",
    body: [
      "If your order is wrong, damaged, incomplete, or never arrived, report it from the order page.",
      "You have 36 hours from delivery confirmation to report an issue. Delivery is confirmed either when you confirm it yourself, or automatically 24 hours after the station marks the order as delivered.",
      "The report opens a dispute with the station. Include what went wrong and, where you can, a photo — evidence helps us resolve the report quickly.",
    ],
  },
  {
    heading: "How a dispute is resolved",
    body: [
      "Once you report an issue, the station has 24 hours to respond. Many problems are settled directly between you and the station at this stage.",
      "If the station's response does not resolve the issue, the AquaLink team reviews the report, the station's response, and any evidence attached.",
      "If the report is upheld, you receive a refund to your original payment method through PayMongo. AquaLink resolves upheld reports with refunds, not re-deliveries.",
      "If the report is rejected, you keep the order and no refund is issued.",
    ],
  },
  {
    heading: "Refund timing",
    body: [
      "Approved refunds are issued to your original payment method through PayMongo — the same GCash account, card, or wallet you paid with.",
      "PayMongo and GCash then take their own processing time to move the funds back to you, which is outside AquaLink's control. The refund appears in your account according to those processing times, not instantly.",
      "Because refunds are paid back to the original payment method, we cannot send a refund to a different account, number, or person.",
    ],
  },
  {
    heading: "Station payouts during a dispute",
    body: [
      "While a dispute is open, the disputed amount is held back from the station's payout, so the money is not paid out before the issue is settled.",
      "If the report is upheld, the held amount funds your refund. If the report is rejected, the hold is released back to the station's earnings.",
      "This hold applies only to the amount in dispute — it does not freeze the rest of the station's earnings or its ability to receive new orders.",
    ],
  },
  {
    heading: "Report issues honestly",
    body: [
      "Please report an issue only when something is genuinely wrong with your delivery.",
      "Deliberately false or abusive reports — including fabricated damage claims, claims for orders that arrived correctly, or repeated reporting to obtain free water — are prohibited by our Terms of Service and can lead to suspension or termination of your account.",
    ],
  },
  {
    heading: "Contact",
    body: [
      "For questions about a refund, a cancellation, or an open dispute, use the in-app Support button on any order page — a report opens a support conversation that we reply to inside the app.",
      "You can also reach us by email: " + SUPPORT_EMAIL + ".",
    ],
  },
];

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card sticky top-0 z-30 border-b border-border px-4 py-4 flex items-center gap-4">
        <Link href="/" aria-label="Back to home">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full min-h-[44px] min-w-[44px]"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-card-foreground">
          Refund &amp; Cancellation Policy
        </h1>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        <p className="text-sm text-muted-foreground">
          Last updated: September 2026. This policy explains cancellations,
          issue reports, disputes, and how refunds are paid for physical water
          deliveries ordered through AquaLink PH. It is a factual description of
          this app — not legal advice.
        </p>

        {SECTIONS.map((s) => (
          <section
            key={s.heading}
            className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-3"
            aria-label={s.heading}
          >
            <h2 className="text-base font-bold text-card-foreground">
              {s.heading}
            </h2>
            <ul className="space-y-2 list-disc pl-5">
              {s.body.map((p, i) => (
                <li
                  key={i}
                  className="text-sm text-muted-foreground leading-relaxed"
                >
                  {p}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className="text-center text-sm text-muted-foreground">
          Need help with an order? Email us at{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
          , or read our{" "}
          <Link
            href="/terms"
            className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
