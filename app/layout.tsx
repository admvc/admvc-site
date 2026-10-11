// app/layout.tsx — ADMVC Cloud (plataforma SaaS)
import type { Metadata } from "next";
import "./globals.css";

import { SITE_NAME } from "@/lib/constants";
import BrandingProvider from "@/components/ui/BrandingProvider";
import ServiceWorkerRegister from "@/components/ui/ServiceWorkerRegister";
import PWAInstallPrompt from "@/components/ui/PWAInstallPrompt";
import { ConfirmProvider, ToastProvider } from "@/components/ui/ConfirmDialog";

export const metadata: Metadata = {
  title: `${SITE_NAME} Cloud`,
  description: "Plataforma de gestao integrada para igrejas.",
  metadataBase: new URL("https://app.igrejaadmvc.org"),
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: "/images/favicon.ico" },
      { url: "/images/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/images/apple-touch-icon.png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ADMVC',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport = {
  themeColor: '#3F6B4F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover' as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" className="dark">
      <body className="min-h-dvh bg-bg text-fg antialiased">
        <ConfirmProvider>
          <ToastProvider>
            <BrandingProvider>
              {children}
            </BrandingProvider>
          </ToastProvider>
        </ConfirmProvider>
        <ServiceWorkerRegister />
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
