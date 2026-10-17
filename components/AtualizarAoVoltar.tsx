'use client'

// Ao voltar à app (iPhone com a app no ecrã, separador escondido...), o browser mostra a
// página que tinha em memória. Se esteve fora mais de 30 s, pede os dados de novo ao servidor
// (ex.: uma escala nova aparece sem ter de refrescar à mão).

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AtualizarAoVoltar() {
    const router = useRouter()
    useEffect(() => {
        let saiu = 0
        const mudou = () => {
            if (document.visibilityState === 'hidden') saiu = Date.now()
            else if (saiu && Date.now() - saiu > 30_000) { saiu = 0; router.refresh() }
        }
        const voltou = (e: PageTransitionEvent) => { if (e.persisted) router.refresh() }
        document.addEventListener('visibilitychange', mudou)
        window.addEventListener('pageshow', voltou)
        return () => { document.removeEventListener('visibilitychange', mudou); window.removeEventListener('pageshow', voltou) }
    }, [router])
    return null
}
