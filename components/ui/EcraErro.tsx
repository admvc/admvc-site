'use client'

// Ecrã de erro partilhado (app/error.tsx, app/membros/error.tsx, app/global-error.tsx):
// diz ao membro o que aconteceu, mostra um código e regista o erro no Cloud.
import { useEffect, useMemo, useRef } from 'react'
import { AlertTriangle, RotateCcw, Home, RefreshCw, WifiOff } from 'lucide-react'
import { classificarErro, codigoErro, TEXTO_ERRO } from '@/lib/erros-tipos'

export default function EcraErro({
    error,
    reset,
    voltar = { href: '/', texto: 'Início' },
}: {
    error: Error & { digest?: string }
    reset?: () => void
    voltar?: { href: string; texto: string }
}) {
    // um código novo por erro (o mesmo enquanto este erro estiver no ecrã)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const codigo = useMemo(() => codigoErro(), [error])
    const tipo = classificarErro(error, typeof navigator === 'undefined' ? true : navigator.onLine)
    const enviado = useRef<Error | null>(null)

    useEffect(() => {
        console.error('[ERRO]', codigo, error)
        if (enviado.current === error) return
        enviado.current = error
        fetch('/api/erros', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
            body: JSON.stringify({
                codigo,
                nome: error?.name,
                mensagem: String(error?.message ?? error).slice(0, 1000),
                stack: String(error?.stack ?? '').slice(0, 6000),
                digest: error?.digest,
                url: window.location.href,
                online: navigator.onLine,
            }),
        }).catch(() => {})
    }, [error, codigo])

    const { titulo, texto } = TEXTO_ERRO[tipo]
    const Icone = tipo === 'REDE' ? WifiOff : AlertTriangle
    const botao = 'flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all active:scale-95'

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <Icone size={32} className="text-red-500" />
                </div>

                <div>
                    <h1 className="text-xl font-bold text-fg">{titulo}</h1>
                    <p className="text-sm text-muted mt-2">{texto}</p>
                    <p className="text-xs text-muted mt-4">
                        Se continuar, diga este código a quem o ajuda: <span className="font-mono font-bold text-fg tracking-widest">{codigo}</span>
                    </p>
                </div>

                <div className="flex flex-wrap gap-3 justify-center">
                    {tipo === 'VERSAO' ? (
                        <button onClick={() => window.location.reload()} className={`${botao} bg-figueira text-white hover:brightness-110`}>
                            <RefreshCw size={14} /> Atualizar a app
                        </button>
                    ) : (
                        <button onClick={() => (reset ? reset() : window.location.reload())} className={`${botao} bg-figueira text-white hover:brightness-110`}>
                            <RotateCcw size={14} /> Tentar novamente
                        </button>
                    )}
                    <a href={voltar.href} className={`${botao} bg-bg2 border border-soft text-fg hover:border-figueira`}>
                        <Home size={14} /> {voltar.texto}
                    </a>
                </div>
            </div>
        </div>
    )
}
