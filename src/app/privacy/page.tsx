import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Privacy Policy — AquaLink PH",
  description:
    "How AquaLink PH collects, uses, shares, retains, and deletes your personal data.",
};

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "What we collect",
    body: [
      "Account details you give us: your name, mobile number, email address (optional), and password (stored only as a one-way hash — we never see or store it in plain text).",
      "Delivery details: the addresses you save (street, barangay, city, province, contact name and number, landmarks) so stations can deliver your water.",
      "Order details: what you ordered, from which station, amounts paid, delivery status, and delivery confirmations.",
      "Station details (for providers): your storefront information, business documents you submit for verification, payout account details, and staff you invite.",
      "Support and dispute details: messages, photos, and evidence you attach to issue reports, disputes, and support tickets.",
      "Technical details: basic device, session, and security logs we need to keep the service running and prevent abuse.",
    ],
  },
  {
    heading: "How we use it",
    body: [
      "To run the marketplace: show nearby stations, place and route your orders, confirm deliveries, and handle refunds and disputes.",
      "To communicate: order updates, delivery status, payout notices, and responses to your support requests.",
      "To pay stations: compute commissions, prepare weekly payouts, and keep financial records.",
      "To keep everyone safe: verify accounts, prevent fraud and abuse, and enforce our community rules.",
    ],
  },
  {
    heading: "Sharing",
    body: [
      "Water refilling stations: when you order, the station sees your name, delivery address, contact number, and order contents so they can fulfill and deliver it.",
      "PayMongo (payments): when you pay with GCash, Maya, or a card, PayMongo processes the payment. Your payment credentials go directly to PayMongo — we never see or store your e-wallet PIN or card numbers.",
      "Delivery staff: the driver assigned to your order sees your delivery address and contact number.",
      "Authorities: we disclose records only when required by Philippine law or a valid legal order.",
      "We do not sell your personal data to anyone, and we do not share it for advertising.",
    ],
  },
  {
    heading: "Data retention & deletion",
    body: [
      "You can delete your account at any time from Profile → Settings → Delete Account. Deletion takes effect immediately.",
      "If your account has no order or transaction history, it is fully deleted along with your addresses, saved payment methods, notifications, and reviews.",
      "If you have order, dispute, refund, payout, or support history, we keep those business records as required for accounting, tax, and legal purposes — but your personal details are removed from them: your name becomes “Deleted User”, your contact details are cleared, and your sign-in is disabled so the account can never be used again.",
      "If you own a station, the station listing is taken offline (deactivated) when you delete your account, but its past orders and payout records are kept for the same legal reasons.",
      "Backups may retain copies for a limited time until they rotate out; they are not used to restore deleted personal data.",
    ],
  },
  {
    heading: "Security",
    body: [
      "Passwords are stored as bcrypt hashes. Sensitive payout settings require a one-time passcode (2FA). Payment webhooks are signature-verified, and sessions expire automatically.",
      "No system is perfectly secure. If you believe your account was accessed without permission, contact us right away using the details below.",
    ],
  },
  {
    heading: "Contact",
    body: [
      "For privacy questions or requests (including a copy of the data we hold about you), reach us through the in-app Support button on any order page or your station dashboard. We respond to deletion and access requests within a reasonable time as required by the Data Privacy Act of 2012 (Republic Act No. 10173).",
    ],
  },
];

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        <p className="text-sm text-muted-foreground">
          Last updated: September 2026. This policy describes what AquaLink PH
          collects and what happens to it. It is a factual description of this
          app — not legal advice.
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
          Want to leave? You can{" "}
          <Link
            href="/profile/settings"
            className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
          >
            delete your account
          </Link>{" "}
          at any time.
        </p>
      </main>
    </div>
  );
}
