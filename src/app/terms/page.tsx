import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUPPORT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms of Service — AquaLink PH",
  description:
    "The terms that govern your use of the AquaLink PH marketplace, as a customer or as a water station provider.",
};

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "What these terms cover",
    body: [
      "AquaLink PH is a two-sided marketplace: customers order drinking water from water refilling stations near them, and stations fulfill and deliver those orders. AquaLink is the platform that connects the two — we handle ordering, payment, disputes, and station payouts. We are not the delivery carrier, and we do not own or operate the water stations.",
      "By creating an account, listing a station, or placing an order through AquaLink PH, you agree to these terms. If you do not agree, please do not use the app.",
    ],
  },
  {
    heading: "Accounts",
    body: [
      "Create an account with accurate, current information — your name and mobile number must be real, and owned or used by you. One person per account: do not create accounts for others or share your sign-in.",
      "You are responsible for everything done through your account, so keep your password to yourself and tell us right away if you believe your account was accessed without your permission.",
      "We verify accounts and can suspend, restrict, or deactivate accounts that are used fraudulently, abusively, or in violation of these terms (see Prohibited conduct).",
      "Station accounts go through verification: you submit the required business documents, and your station must be verified before it appears to customers in the app.",
    ],
  },
  {
    heading: "Orders & delivery",
    body: [
      "Placing an order works like this: browse the station list to find a station near you, add the products you want (purified, mineral, or alkaline), go to checkout with your delivery address, and pay with GCash. The station then prepares your order and delivers it to your door.",
      "Orders move through these statuses: Pending → Accepted → Preparing → Out for delivery → Delivered. Orders can also be cancelled before they are delivered. You can follow the status of any order on its order page.",
      "Delivery is performed by the station's own driver or rider. AquaLink connects you with the station, but the station is responsible for preparing, handing off, and delivering your order.",
      "When your order arrives you can confirm delivery in the app. If you don't confirm, the delivery is automatically confirmed 24 hours after the station marks it as delivered — that is what starts the clock for reporting an issue (see Refunds & disputes).",
    ],
  },
  {
    heading: "Payment",
    body: [
      "Orders are paid online, today via GCash through PayMongo's secure checkout. The full order total is charged at checkout — there are no hidden charges and nothing extra is billed for the order afterward.",
      "Your order total is the product subtotal plus the station's delivery fee, if the station charges one. Each station sets its own delivery fee, shown at checkout before you pay.",
      "Your payment credentials stay inside the GCash app — AquaLink never sees or stores your e-wallet PIN or card numbers.",
      "Customer payments land in AquaLink's account. Station earnings are paid out weekly, as described under Water station terms.",
    ],
  },
  {
    heading: "Refunds & disputes",
    body: [
      "If your order is wrong, damaged, or never arrived, report it on the order page within 36 hours of the delivery being confirmed (your confirmation, or the automatic confirmation 24 hours after delivery). The report opens a dispute with the station.",
      "The station has 24 hours to respond. If the station's response does not resolve the issue, the AquaLink team reviews the report.",
      "If a report is upheld, you get a refund to your original payment method through PayMongo — AquaLink resolves upheld reports with refunds, not re-deliveries. The refund lands according to PayMongo's and GCash's processing times.",
      "While a dispute is open, the disputed amount is held from the station's payout. If the report is rejected, the hold is released back to the station's earnings.",
      "Report issues honestly and only when something is actually wrong — deliberately false or abusive reports are prohibited (see Prohibited conduct).",
    ],
  },
  {
    heading: "Water station terms",
    body: [
      "To list a station, complete station onboarding: station details, the required documents, and your location. Your station must be verified before it appears in the customer app, and we may ask you to re-verify from time to time.",
      "The provider dashboard lets you manage your products, process orders, coordinate staff, track earnings and payouts, and update payout settings — your station's online storefront lives there.",
      "Staff you invite are your responsibility: they act on your station's account, and you are accountable for what they do in it.",
      "Fees: AquaLink's commission is 1.5% of the order total (including the delivery fee), applied to every payment method. PayMongo's payment processing fees are the station's cost. Each payout transfer costs ₱10, with one free transfer per week, deducted from the payout. There are no other fees.",
      "Payouts: customer payments land in AquaLink's account, and your net earnings are paid out weekly to your bank account or GCash. Your net for an order is the order total minus the PayMongo processing fee and the 1.5% AquaLink commission. Amounts under an open dispute are held until the issue is resolved.",
      "If you delete your account, your station is taken offline (deactivated) and stops accepting new orders; its past orders and payout records are kept for legal purposes.",
    ],
  },
  {
    heading: "Prohibited conduct",
    body: [
      "Fraud and deception: fake accounts, stolen or misused payment methods, deliberately false issue reports, or chargeback abuse.",
      "Abuse: harassing, threatening, or defrauding customers, station staff, delivery riders, or other users.",
      "Unsafe or unauthorized selling: offering water that isn't what you advertise, or using the platform to sell anything other than drinking-water delivery from a verified station.",
      "Bulk reselling: ordering through AquaLink to resell water commercially outside the app instead of using your station's own storefront or a wholesale arrangement.",
      "Interfering with the service: tampering with orders, payments, or delivery statuses; scraping; automated abuse; or anything that disrupts the app for other users.",
      "Breaking these rules can lead to suspension or termination of your account, and upheld refunds where applicable.",
    ],
  },
  {
    heading: "Limitation of liability",
    body: [
      "AquaLink is the platform, not the delivery carrier. Stations are responsible for their own products, staff, and deliveries — including the quality and safety of the water they sell and whether they deliver on time.",
      "To the fullest extent permitted by law, AquaLink is not liable for a station's products, delivery delays or failures, or the conduct of station staff or riders.",
      "Nothing in these terms limits liability that cannot be limited under applicable law.",
      "These terms are governed by the laws of the Republic of the Philippines, and any disputes are subject to the jurisdiction of its courts.",
    ],
  },
  {
    heading: "Termination & account deletion",
    body: [
      "You can delete your account at any time from Profile → Settings → Delete Account by typing DELETE to confirm. Deletion takes effect immediately.",
      "If your account has no order or transaction history, it is fully deleted along with your addresses, saved payment methods, notifications, and reviews.",
      "If you have order, dispute, refund, payout, or support history, we keep those business records as required for accounting, tax, and legal purposes — but your personal details are removed from them and your sign-in is disabled, so the account can never be used again.",
      "We may suspend or terminate accounts that violate these terms, and we may refuse service if you have been abusive or fraudulent toward other users.",
    ],
  },
  {
    heading: "Changes to these terms",
    body: [
      "We may update these terms as the service evolves. The \u201cLast updated\u201d date at the top of this page always reflects the current version, and meaningful changes are communicated in the app.",
      "Continuing to use AquaLink PH after an update means you accept the revised terms. If you don't agree with a change, you can stop using the app and delete your account at any time.",
    ],
  },
  {
    heading: "Contact",
    body: [
      "For questions about these terms, your account, or an order, use the in-app Support button on any order page or your station dashboard — reporting an issue opens a support conversation that we reply to inside the app.",
      "You can also reach us by email: " + SUPPORT_EMAIL + ".",
    ],
  },
];

export default function TermsPage() {
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
          Terms of Service
        </h1>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-6">
        <p className="text-sm text-muted-foreground">
          Last updated: September 2026. These terms describe how AquaLink PH
          works and what we expect from customers and water stations. They are
          a factual description of this app — not legal advice.
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
          Questions? Email us at{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
          , or use the in-app Support button on any order page.
        </p>
      </main>
    </div>
  );
}