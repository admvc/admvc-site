// components/ui/BrandingProvider.tsx
// Server component que injecta CSS variables do tenant no portal

import { getTenantBranding, gerarCorDeep, gerarBg2, gerarBorder, gerarFg, gerarMuted, gerarMuted2, hexToRgb } from '@/lib/branding'

export default async function BrandingProvider({ children }: { children: React.ReactNode }) {
    const branding = await getTenantBranding()

    const cssVars = {
        // Cores primarias
        '--g-figueira': branding.corPrimaria,
        '--g-deep': gerarCorDeep(branding.corPrimaria),
        '--g-soft': branding.corSecundaria,
        // Fundos
        '--bg': branding.corFundo,
        '--bg2': gerarBg2(branding.corFundo),
        '--border': gerarBorder(branding.corFundo),
        // Textos (derivados do fundo)
        '--fg': gerarFg(branding.corFundo),
        '--muted': gerarMuted(branding.corFundo),
        '--muted2': gerarMuted2(branding.corFundo),
        // RGB channels para Tailwind opacity
        '--figueira-rgb': hexToRgb(branding.corPrimaria),
        '--soft-rgb': hexToRgb(branding.corSecundaria),
    } as React.CSSProperties

    return (
        <div style={cssVars} className="contents">
            {children}
        </div>
    )
}
