import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { PwaRegister } from "./components/PwaRegister";
import { SITE_NAME, SITE_URL } from "./lib/site-config";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Capital Gold Buyers | Sell Gold for Cash in Bengaluru",
    template: "%s | Capital Gold Buyers",
  },
  description: "Check today’s gold rate, estimate your gold value and book a transparent gold evaluation at Capital Gold Buyers in Basaveshwara Nagar, Bengaluru.",
  keywords: ["gold buyers Bengaluru", "sell gold for cash Bangalore", "gold rate today Bengaluru", "gold buyers Basaveshwara Nagar", "old gold buyers near me", "gold value calculator"],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Capital Gold Buyers | Transparent Gold Evaluation",
    description: "Live admin-managed gold rates, instant value estimates and convenient branch appointments in Bengaluru.",
    images: [{ url: "/images/hero-modern-trust.webp", width: 1600, height: 1000, alt: "Professional gold evaluation in a bright, trusted office" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Capital Gold Buyers",
    description: "Transparent gold evaluation and convenient appointments in Bengaluru.",
    images: ["/images/hero-modern-trust.webp"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    shortcut: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#fbf8f1",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN">
      <head>
        <script id="capital-pwa-install-capture" dangerouslySetInnerHTML={{ __html: `
          window.addEventListener("beforeinstallprompt", function (event) {
            event.preventDefault();
            window.__capitalInstallPrompt = event;
            window.dispatchEvent(new Event("capital-install-ready"));
          });
          window.addEventListener("appinstalled", function () {
            window.__capitalInstallPrompt = null;
          });
        ` }} />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-18340024414"
          strategy="afterInteractive"
        />
        <Script id="google-ads-global-tag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-18340024414');
          `}
        </Script>
      </head>
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
