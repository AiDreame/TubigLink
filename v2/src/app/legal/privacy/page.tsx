"use client";

import Link from "next/link";
import { ArrowLeft, Droplets, Shield, AlertTriangle, Eye, Database, Share2, Clock, Lock, Cookie, Mail, FileText, RefreshCcw, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
  const sections = [
    {
      icon: Shield,
      title: "Data Controller",
      content: (
        <p>
          <strong>AquaLink PH</strong> is the data controller for the personal information collected through the Platform. We are committed to protecting your privacy in compliance with the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong> and its Implementing Rules and Regulations issued by the National Privacy Commission (NPC).
        </p>
      ),
    },
    {
      icon: Eye,
      title: "Information We Collect",
      content: (
        <div className="space-y-2">
          <p>We collect the following types of information:</p>
          <h4 className="font-semibold mt-2">Personal Information You Provide</h4>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Full Name</strong> — to identify you and address you properly</li>
            <li><strong>Phone Number</strong> — for account authentication, order notifications, and delivery coordination</li>
            <li><strong>Email Address</strong> — for account verification, receipts, and important updates (optional but recommended)</li>
            <li><strong>Delivery Address</strong> — including street, barangay, city, province, and landmarks for order delivery</li>
            <li><strong>Payment Information</strong> — processed by third-party payment gateways; we do not store full card details</li>
            <li><strong>Account Credentials</strong> — hashed password for secure authentication</li>
          </ul>
          <h4 className="font-semibold mt-3">Information Collected Automatically</h4>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Device Information</strong> — device type, operating system, browser type, IP address</li>
            <li><strong>Usage Data</strong> — pages viewed, actions taken, order history, search queries</li>
            <li><strong>Location Data</strong> — approximate location based on IP address or city selection</li>
            <li><strong>Cookies & Similar Technologies</strong> — as described in our Cookie section below</li>
          </ul>
          <h4 className="font-semibold mt-3">Information from Third Parties</h4>
          <ul className="list-disc pl-6 space-y-1">
            <li>Payment confirmation data from our payment processors</li>
            <li>Account verification data if you use linked authentication services</li>
          </ul>
        </div>
      ),
    },
    {
      icon: Database,
      title: "How We Use Your Information",
      content: (
        <div className="space-y-2">
          <p>Your information is used for the following purposes:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Order Processing & Fulfillment</strong> — processing orders, coordinating delivery, and facilitating payment</li>
            <li><strong>Communication</strong> — sending order updates, delivery notifications, and responding to inquiries</li>
            <li><strong>Account Management</strong> — creating and maintaining your account</li>
            <li><strong>Platform Improvement</strong> — analyzing usage patterns to improve our services and user experience</li>
            <li><strong>Fraud Prevention</strong> — detecting and preventing fraudulent or unauthorized activity</li>
            <li><strong>Legal Compliance</strong> — complying with applicable laws, regulations, and legal processes</li>
            <li><strong>Customer Support</strong> — providing assistance and resolving issues</li>
            <li><strong>Service Communications</strong> — sending important notices about changes to our terms or policies</li>
          </ul>
        </div>
      ),
    },
    {
      icon: FileText,
      title: "Legal Basis for Processing",
      content: (
        <div className="space-y-2">
          <p>Under the Data Privacy Act of 2012, we process your personal information based on the following legal grounds:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Consent</strong> — you have given clear consent for us to process your personal data for specific purposes</li>
            <li><strong>Contract Necessity</strong> — processing is necessary for the performance of a contract (e.g., fulfilling your orders)</li>
            <li><strong>Legal Obligation</strong> — processing is necessary for compliance with legal obligations</li>
            <li><strong>Legitimate Interest</strong> — processing is necessary for our legitimate interests (e.g., fraud prevention, platform security) provided these do not override your rights</li>
          </ul>
        </div>
      ),
    },
    {
      icon: Share2,
      title: "Data Sharing & Disclosure",
      content: (
        <div className="space-y-2">
          <p className="font-semibold text-green-700 dark:text-green-400">We do NOT sell your personal information to third parties.</p>
          <p>We may share your information with the following categories of recipients:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Water Refilling Stations</strong> — your name, phone number, and delivery address are shared with the Station you order from, solely for order fulfillment and delivery coordination</li>
            <li><strong>Payment Processors</strong> — payment information is securely transmitted to our third-party payment processing partners (GCash, PayMaya, etc.)</li>
            <li><strong>Delivery Partners</strong> — where applicable, limited information for delivery coordination</li>
            <li><strong>Service Providers</strong> — trusted third-party vendors who help us operate the Platform (cloud hosting, analytics, customer support tools)</li>
            <li><strong>Legal Authorities</strong> — when required by law, court order, or government directive</li>
          </ul>
          <p className="mt-2">
            All third-party service providers are contractually bound to protect your data and may only use it for the specific services they provide to us.
          </p>
        </div>
      ),
    },
    {
      icon: Clock,
      title: "Data Retention",
      content: (
        <div className="space-y-2">
          <p>
            We retain your personal information for as long as your account is active and for a period of <strong>three (3) years</strong> after account closure or last activity, for legitimate business purposes and legal compliance.
          </p>
          <p>
            Anonymized and aggregated data that cannot identify you personally may be retained indefinitely for analytical purposes.
          </p>
          <p>
            Upon expiration of the retention period, your personal data will be securely deleted or anonymized in accordance with NPC guidelines.
          </p>
        </div>
      ),
    },
    {
      icon: UserCheck,
      title: "Your Data Subject Rights (RA 10173)",
      content: (
        <div className="space-y-2">
          <p>Under the Data Privacy Act of 2012, you have the following rights:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Right to be Informed</strong> — to know what personal data is being collected and how it is used</li>
            <li><strong>Right to Access</strong> — to request a copy of the personal data we hold about you</li>
            <li><strong>Right to Rectify</strong> — to correct inaccurate or incomplete personal data</li>
            <li><strong>Right to Erasure or Blocking</strong> — to request deletion of your personal data, subject to legal retention requirements</li>
            <li><strong>Right to Data Portability</strong> — to receive your data in a structured, commonly used format</li>
            <li><strong>Right to Object</strong> — to object to the processing of your personal data for specific purposes</li>
            <li><strong>Right to Withdraw Consent</strong> — to withdraw your consent at any time, without affecting the lawfulness of processing based on consent before its withdrawal</li>
            <li><strong>Right to Damages</strong> — to claim compensation for damages resulting from violation of your data privacy rights</li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, please contact our Data Protection Officer using the details below. We will respond to your request within the timeframes prescribed by the NPC.
          </p>
        </div>
      ),
    },
    {
      icon: Lock,
      title: "Security Measures",
      content: (
        <div className="space-y-2">
          <p>
            We implement appropriate technical and organizational security measures to protect your personal information, including:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Encryption</strong> — data transmitted via SSL/TLS (HTTPS); sensitive data encrypted at rest</li>
            <li><strong>Access Controls</strong> — strict role-based access to personal data on a need-to-know basis</li>
            <li><strong>Regular Audits</strong> — periodic security assessments and vulnerability testing</li>
            <li><strong>Authentication</strong> — secure password hashing and optional two-factor authentication</li>
            <li><strong>Data Minimization</strong> — we only collect data that is necessary for the stated purposes</li>
            <li><strong>Staff Training</strong> — regular data privacy and security training for all personnel</li>
          </ul>
          <p className="mt-2">
            While we strive to protect your data, no method of transmission or storage is 100% secure. We cannot guarantee absolute security but will promptly notify you and the NPC in the event of a data breach as required by law.
          </p>
        </div>
      ),
    },
    {
      icon: Cookie,
      title: "Cookies",
      content: (
        <div className="space-y-2">
          <p>
            We use cookies and similar tracking technologies to enhance your experience on the Platform. Cookies are small text files stored on your device that help us:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Essential Cookies</strong> — required for the Platform to function (session management, authentication)</li>
            <li><strong>Preference Cookies</strong> — remember your preferences (selected city, theme, language)</li>
            <li><strong>Analytics Cookies</strong> — help us understand how you use the Platform to improve it</li>
            <li><strong>Functional Cookies</strong> — enable certain features and personalization</li>
          </ul>
          <p className="mt-2">
            You can manage or disable cookies through your browser settings. Please note that disabling certain cookies may affect the functionality of the Platform.
          </p>
        </div>
      ),
    },
    {
      icon: Mail,
      title: "NPC Complaint Process",
      content: (
        <div className="space-y-2">
          <p>
            If you believe that your data privacy rights have been violated, you have the right to file a complaint with the <strong>National Privacy Commission (NPC)</strong> of the Philippines.
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Website:</strong> privacy.gov.ph</li>
            <li><strong>Email:</strong> complaints@privacy.gov.ph</li>
            <li><strong>Address:</strong> 5th Floor, Philippine International Convention Center, Vicente Sotto St., Pasay City, Philippines</li>
          </ul>
          <p className="mt-2">
            We encourage you to first contact our Data Protection Officer to resolve any concerns before filing a complaint with the NPC.
          </p>
        </div>
      ),
    },
    {
      icon: RefreshCcw,
      title: "Updates to This Policy",
      content: (
        <div className="space-y-2">
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of material changes through the Platform or via email at least 15 days before the changes take effect.
          </p>
          <p>
            We encourage you to review this Privacy Policy periodically. The date of the latest update will be indicated at the top of this page.
          </p>
        </div>
      ),
    },
    {
      icon: Mail,
      title: "Contact — Data Protection Officer",
      content: (
        <div className="space-y-2">
          <p>If you have any questions, concerns, or requests regarding your privacy or this policy, please contact our Data Protection Officer:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Email:</strong> dpo@aqualink.ph</li>
            <li><strong>Phone:</strong> (02) 8-XXX-XXXX</li>
            <li><strong>Address:</strong> AquaLink PH — Data Protection Office, Makati City, Metro Manila, Philippines</li>
          </ul>
          <p className="mt-2">
            We aim to acknowledge receipt of your request within 5 business days and resolve it within the timeframes prescribed by the NPC.
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
            <Shield className="h-7 w-7 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground">Compliant with the Data Privacy Act of 2012 (RA 10173)</p>
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

        {/* Privacy Content */}
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