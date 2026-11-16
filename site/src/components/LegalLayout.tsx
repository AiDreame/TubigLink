import type { ReactNode } from "react";

export const APP_URL = "https://151ddcb0324ec849a5e3e6c1f3692000.ctonew.app";
export const SUPPORT_EMAIL = "aqualink-ph-6b48799d@ctomail.io";

export type LegalSection = { heading: string; body: string[] };

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

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

/* ────────────────────────────── legal page shell ─────────────────────────── */

export function LegalPage({
  title,
  intro,
  lastUpdated,
  backHref = "/",
  backLabel = "Back to AquaLink PH",
  children,
}: {
  title: string;
  intro: string;
  lastUpdated: string;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-sky-50/60 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-sky-100 bg-sky-50/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="/" className="flex items-center gap-2.5">
            <BrandMark className="h-9 w-9 rounded-xl shadow-sm ring-1 ring-sky-100" />
            <span className="text-lg font-bold tracking-tight text-sky-950">
              AquaLink&nbsp;PH
            </span>
          </a>
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

      <main className="mx-auto max-w-3xl px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
        <a
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 transition-colors hover:text-sky-900"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {backLabel}
        </a>

        <h1 className="mt-5 text-3xl font-bold tracking-tight text-sky-950 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-600">{intro}</p>
        <p className="mt-4 text-sm text-slate-500">
          Last updated: {lastUpdated}. This page describes how AquaLink PH works
          and is a factual description of this service — not legal advice.
        </p>

        <div className="mt-8 space-y-5">{children}</div>
      </main>

      <LegalFooter />
    </div>
  );
}

export function LegalSection({ section }: { section: LegalSection }) {
  return (
    <section
      aria-label={section.heading}
      className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 className="text-base font-bold text-sky-950 sm:text-lg">
        {section.heading}
      </h2>
      <ul className="mt-3 list-disc space-y-2.5 pl-5">
        {section.body.map((p, i) => (
          <li key={i} className="text-sm leading-relaxed text-slate-600">
            {p}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LegalFooter() {
  return (
    <footer className="bg-sky-950 pb-10 pt-12 text-sky-200">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <p className="text-center text-xs leading-relaxed text-sky-300/80">
          AquaLink PH is a Philippine marketplace operated by AquaLink
          Philippines OPC (SEC registration pending).
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-medium text-sky-300 transition-colors hover:text-white"
          >
            {SUPPORT_EMAIL}
          </a>
          <span
            className="hidden h-3 w-px bg-sky-700 sm:block"
            aria-hidden="true"
          />
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
        <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-sky-300/70">
          © 2026 AquaLink PH. Tubig, delivered!
        </div>
      </div>
    </footer>
  );
}
