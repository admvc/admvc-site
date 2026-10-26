// app/layout.tsx — ADMVC Cloud (plataforma SaaS)
import type { Metadata } from "next";
import "./globals.css";

import { SITE_NAME } from "@/lib/constants";
import { getTenantBranding } from "@/lib/branding";
import ServiceWorkerRegister from "@/components/ui/ServiceWorkerRegister";
import IndicadorNavegacao from "@/components/ui/IndicadorNavegacao";
import { Suspense } from "react";
import PWAInstallPrompt from "@/components/ui/PWAInstallPrompt";
import AtualizarAoVoltar from "@/components/AtualizarAoVoltar";
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Tema da igreja (um so para todo o portal); claro/escuro segue o telemovel
  const { tema } = await getTenantBranding()
  return (
    <html lang="pt-PT" data-tema={tema} suppressHydrationWarning>
      <head>
        {/* Claro/escuro escolhido neste aparelho: aplica-se antes de desenhar, para não piscar */}
        <script dangerouslySetInnerHTML={{ __html: "try{var m=localStorage.getItem('modo');if(m==='claro'||m==='escuro')document.documentElement.setAttribute('data-modo',m)}catch(e){}" }} />
      </head>
      <body className="min-h-dvh bg-bg text-fg antialiased">
        <ConfirmProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ConfirmProvider>
        <ServiceWorkerRegister />
        <Suspense fallback={null}><IndicadorNavegacao /></Suspense>
        <PWAInstallPrompt />
        <AtualizarAoVoltar />
      </body>
    </html>
  );
}
