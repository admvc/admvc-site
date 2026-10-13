'use client'

// Barra fina no topo entre o toque num link e a pagina seguinte aparecer
// (no telemovel o servidor demora um instante e parecia que o toque nao pegou).

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function IndicadorNavegacao() {
    const pathname = usePathname()
    const params = useSearchParams()
    const [ativo, setAtivo] = useState(false)

    // Chegou a pagina nova: esconde
    useEffect(() => { setAtivo(false) }, [pathname, params])

    useEffect(() => {
        function aoClicar(e: MouseEvent) {
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
            const a = (e.target as HTMLElement).closest('a')
            if (!a || a.target === '_blank' || a.hasAttribute('download')) return
            const href = a.getAttribute('href')
            if (!href || href.startsWith('#')) return
            let url: URL
            try { url = new URL(href, location.href) } catch { return }
            if (url.origin !== location.origin) return
            if (url.pathname === location.pathname && url.search === location.search) return
            setAtivo(true)
        }
        // Captura: o Link do Next cancela o clique (preventDefault) antes de chegar ao document
        document.addEventListener('click', aoClicar, true)
        return () => document.removeEventListener('click', aoClicar, true)
    }, [])

    // Seguranca: nunca fica presa mais de 10 s
    useEffect(() => {
        if (!ativo) return
        const t = setTimeout(() => setAtivo(false), 10000)
        return () => clearTimeout(t)
    }, [ativo])

    return ativo ? <div className="barra-navegacao" role="progressbar" aria-label="A abrir" /> : null
}
