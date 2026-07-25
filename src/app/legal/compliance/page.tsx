"use client";

import Link from "next/link";
import { ArrowLeft, Droplets, AlertTriangle, FileText, Scale, ShoppingBag, CreditCard, FlaskConical, Building2, Gavel, Globe, Shield, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";

export default function CompliancePage() {
  const sections = [
    {
      icon: ShoppingBag,
      title: "DTI Fair Trade Rules Compliance",
      content: (
        <div className="space-y-2">
          <p>
            AquaLink PH complies with the <strong>Fair Trade Rules</strong> of the Department of Trade and Industry (DTI). We are committed to:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Transparent Pricing</strong> — All prices displayed on the Platform include applicable taxes and fees. No hidden charges.</li>
            <li><strong>Accurate Advertising</strong> — Product descriptions, images, and specifications are represented accurately and truthfully.</li>
            <li><strong>Fair Competition</strong> — We do not engage in anti-competitive practices, price fixing, or deceptive trade practices.</li>
            <li><strong>Truthful Labeling</strong> — Water products are described with accurate information regarding type (purified, mineral, alkaline), volume, and source.</li>
            <li><strong>Consumer Protection</strong> — We maintain fair return, cancellation, and refund policies as described in our Terms of Service.</li>
          </ul>
          <p className="mt-2">
            For concerns regarding DTI trade regulations, you may contact the <strong>DTI Consumer Protection Group</strong> at <strong>1-384 (DTI Hotline)</strong> or visit <strong>dti.gov.ph</strong>.
          </p>
        </div>
      ),
    },
    {
      icon: FileText,
      title: "E-Commerce Act Compliance (RA 8792)",
      content: (
        <div className="space-y-2">
          <p>
            AquaLink PH complies with the <strong>E-Commerce Act of 2000 (Republic Act No. 8792)</strong>, which recognizes the validity and enforceability of electronic contracts, signatures, and transactions. Our compliance includes:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Electronic Contracts</strong> — Agreements formed through the Platform (orders, service listings, and terms acceptance) are legally binding electronic contracts.</li>
            <li><strong>Data Integrity</strong> — We maintain the integrity and authenticity of electronic records and transactions.</li>
            <li><strong>Evidence in Electronic Form</strong> — Electronic records of transactions, communications, and agreements are preserved as evidence.</li>
            <li><strong>Consumer Confidence</strong> — We implement security measures to ensure safe and reliable electronic transactions.</li>
            <li><strong>Non-Repudiation</strong> — Our platform maintains audit trails and transaction logs to prevent denial of electronic transactions.</li>
          </ul>
          <p className="mt-2">
            All transaction records are retained in compliance with the E-Commerce Act and may be made available for legal or regulatory purposes.
          </p>
        </div>
      ),
    },
    {
      icon: Scale,
      title: "Consumer Act Compliance (RA 7394)",
      content: (
        <div className="space-y-2">
          <p>
            AquaLink PH complies with the <strong>Consumer Act of the Philippines (Republic Act No. 7394)</strong>. Our commitments under this act include:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Product Quality and Safety</strong> — All water products listed on the Platform must meet FDA and DOH quality standards. Stations are required to certify compliance.</li>
            <li><strong>Consumer Rights</strong> — We uphold the right to: accurate information, choice among products, safety, redress, consumer education, and representation.</li>
            <li><strong>Prohibition on Deceptive Practices</strong> — We prohibit false, misleading, or deceptive advertisements and product descriptions.</li>
            <li><strong>Warranty Against Defects</strong> — Stations are responsible for product quality. Defective or substandard products may be subject to replacement or refund.</li>
            <li><strong>Price Tag Requirements</strong> — All products display clear pricing with no hidden surcharges.</li>
          </ul>
          <p className="mt-2">
            Consumers may file complaints with the <strong>DTI</strong> for violations of the Consumer Act. AquaLink PH cooperates fully with DTI investigations and consumer protection efforts.
          </p>
        </div>
      ),
    },
    {
      icon: CreditCard,
      title: "BSP Regulations for Digital Payments",
      content: (
        <div className="space-y-2">
          <p>
            AquaLink PH complies with the regulations of the <strong>Bangko Sentral ng Pilipinas (BSP)</strong> governing digital payments and electronic money. Our compliance includes:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Payment Gateway Security</strong> — All digital payments are processed through BSP-accredited payment gateways (GCash, PayMaya, and others).</li>
            <li><strong>Anti-Money Laundering (AMLA)</strong> — We comply with the Anti-Money Laundering Act (RA 9160, as amended) and report covered transactions to the Anti-Money Laundering Council (AMLC).</li>
            <li><strong>Data Privacy</strong> — Financial data is handled in accordance with BSP Circular No. 982 on data privacy and security.</li>
            <li><strong>Financial Consumer Protection</strong> — We adhere to BSP regulations on transparency, disclosure, and consumer protection in financial services.</li>
            <li><strong>Transaction Monitoring</strong> — Suspicious transactions are monitored and reported as required by law.</li>
          </ul>
          <p className="mt-2">
            All digital payment transactions are governed by the terms and conditions of our respective payment partners. For payment-related concerns, please contact our support team.
          </p>
        </div>
      ),
    },
    {
      icon: FlaskConical,
      title: "FDA Rules for Food / Drinking Water Products",
      content: (
        <div className="space-y-2">
          <p>
            AquaLink PH requires all water Stations to comply with the regulations of the <strong>Food and Drug Administration (FDA)</strong> of the Philippines:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>FDA License to Operate (LTO)</strong> — All Stations must possess a valid FDA License to Operate as a water refilling station or water manufacturer.</li>
            <li><strong>Product Registration</strong> — Water products must have proper FDA Certificates of Product Registration (CPR) where required.</li>
            <li><strong>Compliance with DOH AO on Water Refilling Stations</strong> — Stations must comply with DOH Administrative Order No. 2007-0012 (Revised Guidelines on Water Refilling Stations).</li>
            <li><strong>Quality Testing</strong> — Regular water quality testing and certification from accredited laboratories is required.</li>
            <li><strong>Labeling Requirements</strong> — Products must comply with FDA labeling guidelines, including proper product names, net content, and manufacturer information.</li>
            <li><strong>Good Manufacturing Practices (GMP)</strong> — Stations must adhere to GMP standards for water handling and container sanitation.</li>
          </ul>
          <p className="mt-2">
            AquaLink PH reserves the right to verify FDA compliance documentation from registered Stations and may suspend Stations that fail to maintain valid certifications.
          </p>
        </div>
      ),
    },
    {
      icon: Building2,
      title: "LGU Permit Requirements for Water Stations",
      content: (
        <div className="space-y-2">
          <p>
            All water refilling Stations listed on AquaLink PH are required to secure and maintain the following Local Government Unit (LGU) permits and clearances:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Mayor's Permit / Business Permit</strong> — Annual business permit issued by the city or municipality where the Station operates.</li>
            <li><strong>Barangay Clearance</strong> — Clearance from the barangay where the Station is located.</li>
            <li><strong>Sanitary Permit</strong> — Permit issued by the City/Municipal Health Office certifying compliance with sanitation standards.</li>
            <li><strong>Certificate of Compliance (from DOH)</strong> — Certification from the DOH that the water refilling station meets the required health standards.</li>
            <li><strong>Fire Safety Inspection Certificate</strong> — From the Bureau of Fire Protection (BFP).</li>
            <li><strong>Environmental Compliance Certificate</strong> — If required by the LGU or DENR for the Station's specific operations.</li>
          </ul>
          <p className="mt-2">
            Stations are responsible for keeping all permits and licenses current. AquaLink PH may request proof of compliance and may temporarily suspend Stations with expired or missing permits.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Back Navigation */}
      <div className="bg-background/80 backdrop-blur-md sticky top-0 z-40 border-b border-border">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline min-h-[44px] inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-2 ml-auto">
            <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center">
              <Droplets className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-blue-900 dark:text-blue-100">
              AquaLink <span className="text-blue-600 dark:text-blue-400">PH</span>
            </span>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-8 pb-20">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mx-auto mb-4">
            <Globe className="h-7 w-7 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Compliance & Regulatory Information</h1>
          <p className="text-muted-foreground">Philippine regulatory standards for e-commerce, water products, and consumer protection</p>
          <p className="text-muted-foreground text-sm">Last updated: July 17, 2026</p>
        </div>

        {/* Disclaimer */}
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 p-4 mb-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Important Legal Notice
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                This document is for informational purposes and does not constitute legal advice. For full legal protection, consult with a qualified Philippine attorney.
              </p>
            </div>
          </div>
        </Card>

        {/* Intro */}
        <Card className="p-6 border-border shadow-sm mb-6 bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-card-foreground mb-2">Our Commitment to Compliance</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                AquaLink PH is committed to operating in full compliance with all applicable Philippine laws and regulations. This page outlines the key regulatory frameworks that govern our platform and our compliance measures. We continuously monitor regulatory developments to ensure ongoing compliance. All water Stations listed on the Platform are required to adhere to these standards as a condition of their continued participation.
              </p>
            </div>
          </div>
        </Card>

        {/* Compliance Content */}
        <div className="space-y-6">
          {sections.map((section, index) => (
            <Card key={index} className="p-6 border-border shadow-sm">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <section.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-card-foreground mb-3">{section.title}</h2>
                  <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
                    {section.content}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-6 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-4 mb-3">
            <Link href="/legal/terms" className="text-blue-600 dark:text-blue-400 hover:underline">Terms of Service</Link>
            <Separator orientation="vertical" className="h-4" />
            <Link href="/legal/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</Link>
            <Separator orientation="vertical" className="h-4" />
            <Link href="/legal/compliance" className="text-blue-600 dark:text-blue-400 hover:underline">Compliance</Link>
          </div>
          <p>© 2026 AquaLink PH. Tubig, delivered! 🇵🇭</p>
        </div>
      </footer>
    </div>
  );
}