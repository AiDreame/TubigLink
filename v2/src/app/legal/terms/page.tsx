"use client";

import Link from "next/link";
import { ArrowLeft, Droplets, FileText, Shield, Scale, Ban, AlertTriangle, Gavel, XCircle, Info, HelpCircle, UserCheck, Handshake, CreditCard, RefreshCcw, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";

export default function TermsOfServicePage() {
  const sections = [
    {
      icon: Info,
      title: "1. Introduction & Acceptance",
      content: (
        <div className="space-y-2">
          <p>
            Welcome to <strong>AquaLink PH</strong> ("we," "our," or "us"). By accessing or using the AquaLink PH website, mobile application, or any related services (collectively, the "Platform"), you agree to be bound by these Terms of Service (the "Terms"). If you do not agree to these Terms, please do not use the Platform.
          </p>
          <p>
            These Terms constitute a legally binding agreement between you ("User," "Customer," "Provider," or "Station") and AquaLink PH. By creating an account, placing an order, or listing services on the Platform, you acknowledge that you have read, understood, and accepted these Terms.
          </p>
          <p>
            AquaLink PH reserves the right to modify these Terms at any time. Changes will be effective immediately upon posting on the Platform. Your continued use of the Platform after any modifications constitutes acceptance of the updated Terms. We will notify users of material changes via email or in-app notification at least 15 days before they take effect.
          </p>
        </div>
      ),
    },
    {
      icon: FileText,
      title: "2. Description of Service",
      content: (
        <div className="space-y-2">
          <p>
            AquaLink PH operates as a <strong>two-sided marketplace</strong> that connects end-users (Customers) with local water refilling stations (Providers/Stations) for the on-demand delivery of purified, mineral, and alkaline drinking water, primarily in 5-gallon containers.
          </p>
          <p>
            The Platform facilitates:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Discovery and selection of water refilling stations based on location, pricing, and availability</li>
            <li>Order placement, tracking, and management</li>
            <li>Payment processing through available payment methods</li>
            <li>Communication between Customers and Stations</li>
            <li>Scheduling of recurring deliveries</li>
          </ul>
          <p>
            <strong>Important:</strong> AquaLink PH is a technology platform and marketplace only. We are not a water distributor, refilling station, delivery service, or logistics provider. All water products are provided, sold, and delivered solely by independent third-party Stations listed on the Platform.
          </p>
        </div>
      ),
    },
    {
      icon: UserCheck,
      title: "3. User Accounts & Responsibilities",
      content: (
        <div className="space-y-2">
          <p>To use certain features of the Platform, you must create an account. You agree to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Provide accurate, current, and complete information during registration</li>
            <li>Maintain and promptly update your account information to keep it accurate</li>
            <li>Keep your account credentials confidential and secure</li>
            <li>Be at least 18 years of age or have parental/guardian consent to use the Platform</li>
            <li>Accept full responsibility for all activities that occur under your account</li>
            <li>Notify AquaLink PH immediately of any unauthorized use of your account</li>
          </ul>
          <p>
            You are solely responsible for maintaining the confidentiality of your password and login credentials. AquaLink PH will not be liable for any loss or damage arising from your failure to safeguard your account.
          </p>
        </div>
      ),
    },
    {
      icon: Handshake,
      title: "4. Customer Responsibilities",
      content: (
        <div className="space-y-2">
          <p>As a Customer using AquaLink PH to order water, you agree to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Provide accurate and complete delivery address details, including barangay, street, and landmark information</li>
            <li>Ensure someone is available at the delivery address to receive and pay for orders</li>
            <li>Pay all amounts due for orders placed, including applicable delivery fees</li>
            <li>Not abuse the cancellation policy by placing fraudulent or frivolous orders</li>
            <li>Treat Station personnel with respect and dignity</li>
            <li>Comply with all applicable laws and regulations</li>
          </ul>
          <p>
            Customers are encouraged to communicate directly with Stations regarding specific delivery instructions, timing preferences, or special requests through the Platform's messaging features.
          </p>
        </div>
      ),
    },
    {
      icon: Store,
      title: "5. Station / Provider Responsibilities",
      content: (
        <div className="space-y-2">
          <p>As a water refilling Station registered on AquaLink PH, you agree to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Product Quality:</strong> Ensure all water products meet or exceed the standards set by the Food and Drug Administration (FDA) of the Philippines and the Department of Health (DOH)</li>
            <li><strong>Pricing Accuracy:</strong> Maintain accurate and up-to-date pricing on the Platform. Prices must include all applicable taxes and fees</li>
            <li><strong>Timely Delivery:</strong> Fulfill accepted orders within the promised delivery time window</li>
            <li><strong>Regulatory Compliance:</strong> Secure and maintain all necessary permits, licenses, and certifications required by the Local Government Unit (LGU), FDA, DOH, and other regulatory bodies</li>
            <li><strong>Food Safety:</strong> Comply with the DOH Administrative Order on Water Refilling Stations and all applicable sanitary codes</li>
            <li><strong>Accuracy:</strong> Ensure product descriptions, images, and specifications displayed on the Platform are accurate and not misleading</li>
            <li><strong>Customer Service:</strong> Respond to customer inquiries and concerns promptly and professionally</li>
            <li><strong>Insurance:</strong> Maintain appropriate business insurance coverage for your operations</li>
          </ul>
          <p>
            Failure to meet these responsibilities may result in suspension or removal from the Platform.
          </p>
        </div>
      ),
    },
    {
      icon: CreditCard,
      title: "6. Payment Terms",
      content: (
        <div className="space-y-2">
          <p>AquaLink PH supports the following payment methods:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Cash on Delivery (COD)</strong> — Payment in cash upon delivery of the order</li>
            <li><strong>GCash</strong> — Digital wallet payment processed through our payment gateway</li>
            <li><strong>PayMaya</strong> — Digital wallet payment processed through our payment gateway</li>
            <li><strong>Credit/Debit Cards</strong> — Where available through our payment partners</li>
          </ul>
          <p>
            All payments are processed securely by our third-party payment processors. AquaLink PH does not store full payment card details on its servers.
          </p>
          <p>
            <strong>Phase 1 (Scaling):</strong> The Platform is currently free for both Customers and Stations — zero commission, zero fees.
          </p>
          <p>
            <strong>Phase 2 (Monetization):</strong> We may introduce a transparent commission structure (5–7%) and optional featured listing fees. Stations will be notified at least 30 days in advance of any fee changes.
          </p>
        </div>
      ),
    },
    {
      icon: RefreshCcw,
      title: "7. Cancellation & Refund Policy",
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Order Cancellation</h4>
          <ul className="list-disc pl-6 space-y-1">
            <li>Customers may cancel an order while it is in <strong>PENDING</strong> status</li>
            <li>Once an order has been accepted by the Station and is in <strong>PREPARING</strong> or later status, cancellation is at the Station's discretion</li>
            <li>Stations may cancel orders due to stock unavailability, delivery area restrictions, or other valid reasons</li>
          </ul>
          <h4 className="font-semibold mt-3">Refund Conditions</h4>
          <ul className="list-disc pl-6 space-y-1">
            <li>Full refund for orders cancelled while in PENDING status</li>
            <li>Partial or full refund for undelivered or defective products, at the Station's discretion</li>
            <li>Refunds for GCash/PayMaya payments will be processed back to the original payment method within 5–10 business days</li>
            <li>COD cancellations require no refund processing</li>
          </ul>
          <p className="mt-2">
            AquaLink PH may facilitate dispute resolution but is not responsible for issuing refunds directly. Refunds are the responsibility of the Station.
          </p>
        </div>
      ),
    },
    {
      icon: Scale,
      title: "8. Limitation of Liability",
      content: (
        <div className="space-y-2">
          <p>
            <strong>AquaLink PH is a marketplace platform, not a water distributor, delivery service, or logistics provider.</strong> To the fullest extent permitted by Philippine law:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>AquaLink PH shall not be liable for any product quality issues, including but not limited to water contamination, container defects, or product misrepresentation. These are the sole responsibility of the Station.</li>
            <li>AquaLink PH shall not be liable for delivery delays, missed deliveries, or failure to deliver caused by Station actions, force majeure, traffic conditions, or third-party factors.</li>
            <li>AquaLink PH shall not be liable for any acts, omissions, or misconduct of Stations or their personnel.</li>
            <li>AquaLink PH shall not be liable for any issues arising from third-party payment processing, including transaction failures, delays, or unauthorized charges.</li>
            <li>In no event shall AquaLink PH's aggregate liability exceed the total amount paid by the Customer for the specific order giving rise to the claim.</li>
            <li>AquaLink PH shall not be liable for any indirect, incidental, special, consequential, or punitive damages.</li>
          </ul>
        </div>
      ),
    },
    {
      icon: Gavel,
      title: "9. Dispute Resolution",
      content: (
        <div className="space-y-2">
          <h4 className="font-semibold">Between Customers and Stations</h4>
          <p>
            Disputes between Customers and Stations should first be resolved through direct communication via the Platform. If resolution cannot be reached, AquaLink PH may, at its discretion, facilitate mediation. AquaLink PH's role is limited to facilitating communication and does not include adjudication.
          </p>
          <h4 className="font-semibold mt-3">Between Users and AquaLink PH</h4>
          <p>
            Any dispute, claim, or controversy arising out of or relating to these Terms or the use of the Platform shall first be attempted to be resolved through informal negotiation. If the dispute cannot be resolved within 30 days, either party may pursue remedies available under the laws of the Republic of the Philippines.
          </p>
        </div>
      ),
    },
    {
      icon: Ban,
      title: "10. Prohibited Uses",
      content: (
        <div className="space-y-2">
          <p>You agree not to use the Platform for any unlawful purpose or in violation of these Terms. Prohibited activities include:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Fraudulent activities, including fake orders, identity theft, or payment fraud</li>
            <li>Abusing the cancellation or refund policies</li>
            <li>Harassing, threatening, or abusing other users, Station personnel, or AquaLink PH staff</li>
            <li>Misrepresenting your identity, affiliation, or qualifications</li>
            <li>Attempting to manipulate the Platform's systems, rankings, or ratings</li>
            <li>Using bots, scrapers, or automated tools to access the Platform without authorization</li>
            <li>Uploading malicious code, viruses, or harmful content</li>
            <li>Engaging in any activity that disrupts or interferes with the Platform's operations</li>
            <li>Violating any applicable law, regulation, or ordinance</li>
          </ul>
          <p>
            Violation of these prohibitions may result in immediate account suspension or termination without notice.
          </p>
        </div>
      ),
    },
    {
      icon: AlertTriangle,
      title: "11. Intellectual Property",
      content: (
        <div className="space-y-2">
          <p>
            The AquaLink PH name, logo, branding, design, website layout, and all related intellectual property are owned exclusively by AquaLink PH. You may not use, reproduce, distribute, or create derivative works from our intellectual property without prior written consent.
          </p>
          <p>
            All content posted by Stations (product descriptions, images, pricing) remains the property of the respective Station. By posting content on the Platform, Stations grant AquaLink PH a non-exclusive, royalty-free license to display, distribute, and promote such content in connection with the operation of the Platform.
          </p>
        </div>
      ),
    },
    {
      icon: XCircle,
      title: "12. Termination",
      content: (
        <div className="space-y-2">
          <p>
            AquaLink PH reserves the right to suspend or terminate any user account at any time, without prior notice, for violations of these Terms, fraudulent activity, or any conduct that we deem harmful to the Platform or its users.
          </p>
          <p>
            Users may terminate their account at any time by contacting support or using available account settings. Upon termination, you remain liable for any outstanding obligations, including payment for orders placed prior to termination.
          </p>
          <p>
            Provisions that by their nature should survive termination shall survive, including but not limited to Sections 8 (Limitation of Liability), 9 (Dispute Resolution), 11 (Intellectual Property), and 13 (Governing Law).
          </p>
        </div>
      ),
    },
    {
      icon: Scale,
      title: "13. Governing Law",
      content: (
        <div className="space-y-2">
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the <strong>Republic of the Philippines</strong>. Any legal action or proceeding arising out of or relating to these Terms shall be brought exclusively in the courts of <strong>Makati City, Philippines</strong>.
          </p>
          <p>
            The parties acknowledge that these Terms are entered into in the Philippines and that venue shall be in Makati City, Metro Manila.
          </p>
        </div>
      ),
    },
    {
      icon: HelpCircle,
      title: "14. Contact Information",
      content: (
        <div className="space-y-2">
          <p>
            For questions, concerns, or inquiries regarding these Terms of Service, please contact us:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Email:</strong> support@aqualink.ph</li>
            <li><strong>Phone:</strong> (02) 8-XXX-XXXX</li>
            <li><strong>Address:</strong> AquaLink PH, Makati City, Metro Manila, Philippines</li>
          </ul>
          <p>
            We aim to respond to all inquiries within 1–2 business days.
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
            <FileText className="h-7 w-7 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: July 17, 2026</p>
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

        {/* TOS Content */}
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