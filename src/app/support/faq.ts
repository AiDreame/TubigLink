// Hardcoded FAQ content for the Help & Support hub (/support).
// Copy is grounded in the implemented product behavior (verified against
// src/lib/delivery.ts, src/app/api/orders/[id]/disputes/route.ts,
// src/app/api/admin/disputes/route.ts, src/app/api/me/route.ts,
// src/lib/paymongo-disbursement.ts, src/lib/earnings.ts). No db fields.

export type FaqItem = { id: string; q: string; a: string };
export type FaqGroup = { id: string; title: string; items: FaqItem[] };

export const FAQ_GROUPS: FaqGroup[] = [
  {
    id: "orders-delivery",
    title: "Orders & Delivery",
    items: [
      {
        id: "how-to-order",
        q: "How do I order drinking water?",
        a: "Browse the station list to find a water refilling station near you, add the products you want (purified, mineral, or alkaline) to your basket, then go to checkout. Choose your delivery address and pay with GCash. The station prepares your order and delivers it to your door.",
      },
      {
        id: "who-delivers",
        q: "Who delivers my order?",
        a: "Delivery is handled by the water station's own driver or rider — AquaLink connects you with the station, and the station fulfills and delivers the order itself. For questions about a specific delivery, reach out to the station from your order page.",
      },
      {
        id: "track-order",
        q: "How do I track my order?",
        a: "Open the order from your Orders page to see its current status. Orders move through these statuses: Pending → Accepted → Preparing → Out for delivery → Delivered. The order page is your one place for status updates.",
      },
      {
        id: "confirm-delivery",
        q: "What happens if I don't confirm my delivery?",
        a: "Once your order is delivered you can confirm it in the app. If you don't confirm, it is automatically confirmed 24 hours after the delivery was marked done.",
      },
      {
        id: "schedule-delivery",
        q: "Can I set up scheduled or recurring deliveries?",
        a: "Scheduled and recurring deliveries are supported in the app. You can view and manage your scheduled deliveries under My Account → Scheduled.",
      },
    ],
  },
  {
    id: "payment",
    title: "Payment (GCash)",
    items: [
      {
        id: "how-to-pay",
        q: "How do I pay for my order?",
        a: "Orders are paid online with GCash through PayMongo's secure checkout. At checkout, choose GCash and approve the payment in the GCash app — you'll be brought back to AquaLink once it's done.",
      },
      {
        id: "paid-in-full",
        q: "Is the full amount charged at checkout?",
        a: "Yes. The full order total is charged when you pay at checkout — there are no hidden charges and nothing extra is billed for the order afterward.",
      },
      {
        id: "whats-in-total",
        q: "What does my order total include?",
        a: "Your order total is the product subtotal plus the station's delivery fee, if the station charges one. The full amount is what you pay via GCash at checkout.",
      },
      {
        id: "is-payment-safe",
        q: "Is paying with GCash safe?",
        a: "Yes. Payments are processed by PayMongo through its secure checkout, and your GCash credentials stay inside the GCash app — AquaLink never sees or stores them.",
      },
    ],
  },
  {
    id: "refunds-disputes",
    title: "Refunds & Disputes",
    items: [
      {
        id: "report-issue-order",
        q: "What if my order is wrong, damaged, or never arrived?",
        a: "You can report an issue on the order within 36 hours of delivery. If you confirm the delivery earlier, the 36-hour window starts from your confirmation. Open the order and choose to report an issue, describe what went wrong, and the station has 24 hours to respond. If it isn't resolved, the AquaLink team reviews the report.",
      },
      {
        id: "refund-or-redelivery",
        q: "If my report is upheld, do I get a refund or a re-delivery?",
        a: "You get a refund. When a report is upheld, the amount is refunded back to your payment method through PayMongo — AquaLink resolves upheld reports with refunds rather than re-deliveries.",
      },
      {
        id: "while-reviewing",
        q: "What happens while my issue is being reviewed?",
        a: "The disputed amount is held from the station's payout while the issue is open, and the station is notified right away. If the report is rejected, the hold is released back to the station's earnings.",
      },
    ],
  },
  {
    id: "account",
    title: "Account",
    items: [
      {
        id: "update-profile",
        q: "How do I update my profile or address?",
        a: "Go to Profile → Edit Profile to update your name and contact details, and Profile → Addresses to manage your saved delivery addresses.",
      },
      {
        id: "delete-account",
        q: "How do I delete my account?",
        a: "Go to Profile → Settings → Delete Account. Type DELETE to confirm. This permanently deletes your account and personal data and cannot be undone.",
      },
      {
        id: "data-after-delete",
        q: "What happens to my data when I delete my account?",
        a: "Your personal details are removed or anonymized. Orders and business records are kept only for legal purposes, with your personal information removed. If you own a water station, it is deactivated and stops accepting new orders. After deletion you can't sign back in, and your phone number can be used to register a new account.",
      },
    ],
  },
  {
    id: "providers",
    title: "For Water Stations (Providers)",
    items: [
      {
        id: "add-station",
        q: "How do I put my water station on AquaLink?",
        a: "Register an account as a station owner and complete station onboarding — station details, required documents, and your location. Your station must be verified before it appears in the customer app; the onboarding flow in the app walks you through each step.",
      },
      {
        id: "provider-dashboard",
        q: "What can I do in the provider dashboard?",
        a: "The provider dashboard lets you manage your products, view and process orders, coordinate staff, track earnings and payouts, and update your payout settings — everything for running your online storefront in one place.",
      },
      {
        id: "fees",
        q: "What fees apply to stations?",
        a: "AquaLink's commission is 1.5% of the order total (including the delivery fee). PayMongo's payment processing fees are also the station's cost. Each payout transfer costs ₱10, with one free transfer per week, deducted from the payout. There are no other fees.",
      },
      {
        id: "payouts",
        q: "How do payouts work?",
        a: "Customer payments land in AquaLink's account and your net earnings are paid out weekly to your bank account or GCash. Your net for an order is the order total minus the PayMongo processing fee and the 1.5% AquaLink commission. Amounts under active dispute are held until the issue is resolved, and the ₱10 transfer fee (one free per week) is deducted from each payout.",
      },
    ],
  },
  {
    id: "general",
    title: "General",
    items: [
      {
        id: "contact-support",
        q: "How do I contact support?",
        a: "Tap \u201cReport an issue\u201d on this page (or the floating button on any app page), choose a category, optionally link the order involved, and describe the problem. Your report opens a support conversation — the AquaLink team replies inside it, and your tickets stay listed under \u201cYour tickets\u201d below for reference.",
      },
      {
        id: "areas-served",
        q: "What areas do you serve?",
        a: "AquaLink works wherever there is an active water station in the app that delivers to you. Browse the station list to see which stations are available in your area — coverage grows as more stations join.",
      },
      {
        id: "delivery-fee",
        q: "Is there a delivery fee?",
        a: "Each station sets its own delivery fee — some stations charge none. If there is one, it's included in your order total and shown at checkout before you pay.",
      },
    ],
  },
];