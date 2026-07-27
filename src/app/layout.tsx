import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { Providers } from "@/components/shared/Providers";
import { BottomNav } from "@/components/shared/BottomNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "AquaLink PH — Tubig, delivered!",
    template: "%s | AquaLink PH",
  },
  description:
    "Order purified, mineral, and alkaline drinking water for delivery. Find local water refilling stations near you anywhere in the Philippines.",
  keywords: [
    "water delivery",
    "drinking water",
    "Philippines",
    "nationwide water delivery",
    "water refilling station",
    "purified water",
    "mineral water",
    "alkaline water",
    "aqualink",
  ],
  authors: [{ name: "AquaLink PH" }],
  creator: "AquaLink PH",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {/* Register service worker for PWA offline support */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js');
              }
            `,
          }}
        />
        {/* Prevent flash of unstyled theme on load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('aqualink-ph-theme');
                  if (!theme) {
                    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    if (prefersDark) document.documentElement.classList.add('dark');
                  } else if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} pb-20 md:pb-0`}>
        <Providers>
          {children}
          <BottomNav />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                borderRadius: "12px",
                background: "#333",
                color: "#fff",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}