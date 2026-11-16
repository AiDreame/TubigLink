import { createFileRoute } from "@tanstack/react-router";
import {
  LegalPage,
  LegalSection,
  SUPPORT_EMAIL,
  type LegalSection as LegalSectionData,
} from "~/components/LegalLayout";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund & Cancellation Policy — AquaLink PH" },
      {
        name: "description",
        content:
          "How refunds, issue reports, disputes, and cancellations work for AquaLink PH physical water deliveries.",
      },
    ],
  }),
  component: RefundPolicyPage,
});

const SECTIONS: LegalSectionData[] = [
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
      "If your order is wrong, damaged, incomplete, or never arrived, report it from the order page in the AquaLink PH app.",
      "You have 36 hours from delivery confirmation to report an issue. Delivery is confirmed either when you confirm it yourself in the app, or automatically 24 hours after the station marks the order as delivered.",
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
      `For questions about a refund, a cancellation, or an open dispute, email us at ${SUPPORT_EMAIL}, or use the in-app Support button on any order page — a report opens a support conversation that we reply to inside the app.`,
    ],
  },
];

function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund & Cancellation Policy"
      intro="This policy explains cancellations, issue reports, disputes with stations, and how refunds are paid for physical water deliveries ordered through AquaLink PH."
      lastUpdated="September 2026"
    >
      {SECTIONS.map((s) => (
        <LegalSection key={s.heading} section={s} />
      ))}

      <p className="pt-2 text-center text-sm text-slate-600">
        Need help with an order? Email us at{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
        >
          {SUPPORT_EMAIL}
        </a>
        , or read our{" "}
        <a
          href="/terms"
          className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
        >
          Terms of Service
        </a>{" "}
        and{" "}
        <a
          href="/privacy"
          className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
        >
          Privacy Policy
        </a>
        .
      </p>
    </LegalPage>
  );
}
