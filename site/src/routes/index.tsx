import { createFileRoute } from "@tanstack/react-router";

// ─── Static site facts (only claims sourced from the product brief) ──────────
const APP_URL = "https://151ddcb0324ec849a5e3e6c1f3692000.ctonew.app";
const SUPPORT_EMAIL = "aqualink-ph-6b48799d@ctomail.io";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

/* ─────────────────────────── tiny inline icon set ────────────────────────── */

type IconProps = { className?: string };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function MapPinIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function CreditCardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}

function TruckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </svg>
  );
}

function DashboardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

function CalendarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function PercentIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      <line x1="19" x2="5" y1="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}

function ShieldCheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function EyeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SmartphoneIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}

function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...stroke} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/* ─────────────────────────────── page ────────────────────────────────────── */

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#for-stations", label: "For stations" },
  { href: "#faq", label: "FAQ" },
] as const;

function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src="/aqualink-icon.svg"
      alt="AquaLink PH brand mark — a water droplet threaded between two chain links"
      className={className}
      width={1024}
      height={1024}
      loading="eager"
    />
  );
}

function LandingPage() {
  return (
    <div className="min-h-dvh bg-white text-slate-900">
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <TrustStrip />
        <ForStations />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}

/* ─────────────────────────────── nav ─────────────────────────────────────── */

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-sky-100 bg-sky-50/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2.5">
          <BrandMark className="h-9 w-9 rounded-xl shadow-sm ring-1 ring-sky-100" />
          <span className="text-lg font-bold tracking-tight text-sky-950">
            AquaLink&nbsp;PH
          </span>
        </a>
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="transition-colors hover:text-sky-700"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <a
          href={APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-200 transition-colors hover:bg-sky-600"
        >
          Open the app
        </a>
      </div>
    </header>
  );
}

/* ─────────────────────────────── hero ────────────────────────────────────── */

function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden bg-sky-50"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute -top-28 -right-24 h-80 w-80 rounded-full bg-sky-200/50 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-sky-300/30 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pt-14 pb-16 text-center sm:px-6 sm:pt-20 sm:pb-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/70 px-3.5 py-1 text-xs font-semibold tracking-wide text-sky-700 uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
          On-demand drinking water delivery · Philippines
        </span>

        <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-sky-950 sm:text-6xl">
          Fresh drinking water,{" "}
          <span className="bg-gradient-to-r from-sky-500 to-sky-700 bg-clip-text text-transparent">
            delivered to your door
          </span>
        </h1>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
          Order purified, mineral, or alkaline water from refilling stations
          near you — pay with GCash, then track your delivery right in the app.
          <span className="font-semibold text-sky-700"> Tubig, delivered!</span>
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <a
            href={APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-sky-200 transition-colors hover:bg-sky-600"
          >
            Order water now
            <ArrowRightIcon className="h-4 w-4" />
          </a>
          <a
            href="#for-stations"
            className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-7 py-3.5 text-base font-semibold text-sky-700 transition-colors hover:border-sky-300 hover:bg-sky-100/60"
          >
            Are you a station?
          </a>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheckIcon className="h-4 w-4 text-sky-500" />
            GCash via PayMongo secure checkout
          </span>
          <span className="inline-flex items-center gap-1.5">
            <EyeIcon className="h-4 w-4 text-sky-500" />
            No hidden charges
          </span>
          <span className="inline-flex items-center gap-1.5">
            <TruckIcon className="h-4 w-4 text-sky-500" />
            Track your delivery
          </span>
        </div>

        <div className="mt-12 sm:mt-14">
          <BrandMark className="h-44 w-44 rounded-[2.25rem] shadow-xl shadow-sky-200/70 ring-8 ring-white/70 sm:h-60 sm:w-60" />
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── how it works ────────────────────────────────── */

const STEPS = [
  {
    icon: MapPinIcon,
    title: "Browse stations near you",
    body: "Find water refilling stations around your area and pick your water type — purified, mineral, or alkaline — by the gallon or bottle.",
  },
  {
    icon: CreditCardIcon,
    title: "Order & pay with GCash",
    body: "Check out in a few taps. Pay securely through the PayMongo GCash checkout — cash-free, with the full total shown before you pay.",
  },
  {
    icon: TruckIcon,
    title: "Delivered, tracked in the app",
    body: "The station's own driver brings your water to your door. Follow your order in the app from dispatch to doorstep.",
  },
] as const;

function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-widest text-sky-600 uppercase">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-sky-950 sm:text-4xl">
            Water delivered in three easy steps
          </h2>
          <p className="mt-4 text-slate-600">
            No more hauling gallons or waiting on the phone — order from local
            refilling stations in minutes.
          </p>
        </div>

        <ol className="mt-14 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="relative rounded-3xl border border-sky-100 bg-sky-50/60 p-7 transition-shadow hover:shadow-md hover:shadow-sky-100"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-md shadow-sky-200">
                <step.icon className="h-6 w-6" />
              </div>
              <p className="mt-5 text-xs font-bold tracking-widest text-sky-500 uppercase">
                Step {i + 1}
              </p>
              <h3 className="mt-1.5 text-lg font-semibold text-sky-950">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ───────────────────────────── trust strip ───────────────────────────────── */

const TRUST_ITEMS = [
  {
    icon: ShieldCheckIcon,
    title: "Secure checkout",
    body: "Payments processed securely by PayMongo, the payment platform behind your GCash checkout.",
  },
  {
    icon: SmartphoneIcon,
    title: "GCash payments",
    body: "Pay the way you already pay — GCash, right inside the app.",
  },
  {
    icon: EyeIcon,
    title: "No hidden charges",
    body: "Your full total — water and delivery — is shown before you pay.",
  },
  {
    icon: TruckIcon,
    title: "Real-time tracking",
    body: "Watch your order move from the station to your door.",
  },
] as const;

function TrustStrip() {
  return (
    <section className="bg-sky-900 py-14 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_ITEMS.map((item) => (
            <div key={item.title} className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300">
                <item.icon className="h-5.5 w-5.5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-sky-200/90">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── for stations ────────────────────────────────── */

const STATION_POINTS = [
  {
    icon: DashboardIcon,
    title: "One dashboard for everything",
    body: "Manage your products, orders, staff, and earnings in a single place — no website needed.",
  },
  {
    icon: CalendarIcon,
    title: "Weekly payouts",
    body: "Earnings are transferred to you every week, with a simple ₱10 transfer fee — and one free transfer per week.",
  },
  {
    icon: PercentIcon,
    title: "Simple, transparent pricing",
    body: "AquaLink takes just 1.5% of each order total, including the delivery fee. PayMongo payment processing fees are the only other cost.",
  },
] as const;

const MOCK_ORDERS = [
  { id: "#1042", item: "Purified · 1 gallon", status: "Delivered", tone: "emerald" },
  { id: "#1043", item: "Mineral · 5L bottle", status: "Out for delivery", tone: "sky" },
  { id: "#1044", item: "Alkaline · 1 gallon", status: "Confirmed", tone: "amber" },
] as const;

function ForStations() {
  return (
    <section id="for-stations" className="bg-sky-50 py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="text-sm font-semibold tracking-widest text-sky-600 uppercase">
            For water stations
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-sky-950 sm:text-4xl">
            Turn your refilling station into an online storefront
          </h2>
          <p className="mt-4 text-slate-600">
            Thousands of homes already order water on the phone — put your
            station in front of them with a storefront, order management, and
            payouts that run themselves.
          </p>

          <ul className="mt-8 space-y-5">
            {STATION_POINTS.map((point) => (
              <li key={point.title} className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm ring-1 ring-sky-100">
                  <point.icon className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-sky-950">
                    {point.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {point.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-8 inline-flex items-start gap-2 text-sm text-slate-600">
            <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
            Every station is verified before going live on AquaLink.
          </p>

          <div className="mt-8">
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Put%20my%20station%20on%20AquaLink`}
              className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-sky-200 transition-colors hover:bg-sky-600"
            >
              Put your station on AquaLink
              <ArrowRightIcon className="h-4 w-4" />
            </a>
            <p className="mt-3 text-sm text-slate-500">
              Or email us at{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-800"
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>
        </div>

        {/* Stylized dashboard preview — illustrative UI only */}
        <div className="relative">
          <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-sky-200/60 to-sky-400/20 blur-xl" aria-hidden="true" />
          <div className="relative overflow-hidden rounded-3xl bg-white shadow-xl shadow-sky-200/60 ring-1 ring-sky-100">
            <div className="border-b border-sky-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <BrandMark className="h-8 w-8 rounded-lg" />
                  <div>
                    <p className="text-sm font-semibold text-sky-950">
                      Station dashboard
                    </p>
                    <p className="text-xs text-slate-400">
                      Sample view · weekly payouts
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                  Live
                </span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1 border-b border-sky-100 bg-sky-50/50 px-6 py-0 text-center text-[11px] font-semibold text-slate-500">
              {["Products", "Orders", "Staff", "Earnings"].map((t) => (
                <span key={t} className={`py-3 ${t === "Orders" ? "border-b-2 border-sky-500 text-sky-700" : ""}`}>
                  {t}
                </span>
              ))}
            </div>
            <div className="space-y-3 px-6 py-5">
              {MOCK_ORDERS.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-sky-100 bg-sky-50/40 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-sky-950">{o.id}</p>
                    <p className="text-xs text-slate-500">{o.item}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      o.tone === "emerald"
                        ? "bg-emerald-100 text-emerald-700"
                        : o.tone === "sky"
                          ? "bg-sky-100 text-sky-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {o.status}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-sky-100 bg-sky-50/50 px-6 py-3.5 text-xs text-slate-500">
              Payouts run every week · ₱10 per transfer, one free each week
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────── FAQ ─────────────────────────────────────── */

const FAQ_ITEMS = [
  {
    q: "How do I order?",
    a: "Open the AquaLink PH app, find a water refilling station near you, pick your water type (purified, mineral, or alkaline) and quantity, then check out. The station confirms your order and handles delivery.",
  },
  {
    q: "Where do you deliver?",
    a: "Wherever an active station delivers near you. Coverage grows station by station — check the app to see which stations and areas are available in your location.",
  },
  {
    q: "How do I pay?",
    a: "Pay securely in-app with GCash through the PayMongo checkout. The full total — water plus delivery — is always shown before you pay, and your payment is confirmed inside the app.",
  },
  {
    q: "What is the delivery fee?",
    a: "Each station sets its own delivery fee, and it's included in the total shown at checkout. No hidden charges, ever.",
  },
  {
    q: "How do stations get paid?",
    a: "Station earnings are paid out weekly. AquaLink takes a simple 1.5% commission per order; payment processing fees are the station's cost, and each payout transfer costs ₱10 (one free per week).",
  },
  {
    q: "How do I track my delivery?",
    a: "Your order is dispatched by the station's own rider, and you can follow its progress in the app until it reaches your door.",
  },
] as const;

function FAQ() {
  return (
    <section id="faq" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-widest text-sky-600 uppercase">
            FAQ
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-sky-950 sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-sky-100 bg-sky-50/40 transition-colors open:bg-white open:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-sky-950 [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 transition-transform group-open:rotate-45">
                  <PlusIcon className="h-4 w-4" />
                </span>
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600">
                {item.a}
              </p>
            </details>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          More help in the app&apos;s{" "}
          <span className="font-medium text-sky-700">Help &amp; Support hub</span>.
        </p>
      </div>
    </section>
  );
}

/* ─────────────────────────────── footer ──────────────────────────────────── */

function ComingSoonBadge({ label }: { label: string }) {
  return (
    <span
      title="Coming soon"
      className="inline-flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-sky-300" fill="currentColor" aria-hidden="true">
        <rect x="7" y="3" width="10" height="18" rx="2.5" />
        <path d="M10.5 18h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
      <span className="text-left leading-tight">
        <span className="block text-xs font-semibold text-white">{label}</span>
        <span className="block text-[11px] text-sky-200/70">Coming soon</span>
      </span>
    </span>
  );
}

function Footer() {
  return (
    <footer className="bg-sky-950 pb-10 pt-16 text-sky-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex items-center gap-3">
            <BrandMark className="h-11 w-11 rounded-2xl shadow-lg shadow-black/20" />
            <div className="text-left">
              <p className="text-lg font-bold tracking-tight text-white">
                AquaLink PH
              </p>
              <p className="text-sm text-sky-300">Tubig, delivered!</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <ComingSoonBadge label="App Store" />
            <ComingSoonBadge label="Google Play" />
          </div>
          <p className="text-xs text-sky-300/80">
            The AquaLink PH app is coming soon to iOS and Android.
          </p>

          <p className="max-w-2xl text-xs leading-relaxed text-sky-300/80">
            AquaLink PH is a Philippine marketplace operated by AquaLink
            Philippines OPC (SEC registration pending).
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-sky-300 transition-colors hover:text-white"
            >
              {SUPPORT_EMAIL}
            </a>
            <span className="hidden h-3 w-px bg-sky-700 sm:block" aria-hidden="true" />
            <a href="/privacy" className="transition-colors hover:text-white">
              Privacy Policy
            </a>
            <a href="/terms" className="transition-colors hover:text-white">
              Terms of Service
            </a>
            <a
              href="/refund-policy"
              className="transition-colors hover:text-white"
            >
              Refund &amp; Cancellation Policy
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs text-sky-300/70">
          © 2026 AquaLink PH. Tubig, delivered!
        </div>
      </div>
    </footer>
  );
}