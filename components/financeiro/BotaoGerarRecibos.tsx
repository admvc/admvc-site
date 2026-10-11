'use client'

import { useState } from 'react'
import { Loader2, FileStack, CheckCircle2 } from 'lucide-react'
import { gerarRecibosLote } from '@/actions/recibo-actions'
import { useConfirm } from '@/components/ui/ConfirmDialog'

export default function BotaoGerarRecibos({ ano }: { ano: number }) {
    const [loading, setLoading] = useState(false)
    const [resultado, setResultado] = useState<{ total?: number; error?: string } | null>(null)
    const confirmar = useConfirm()

    async function handleGerar() {
        if (!await confirmar({ mensagem: `Gerar recibos para todos os membros contribuintes de ${ano}? Recibos existentes serao atualizados.`, tipo: 'aviso' })) {
            return
        }

        setLoading(true)
        setResultado(null)

        try {
            const res = await gerarRecibosLote(ano)
            if (res.success) {
                setResultado({ total: res.total })
                // Recarregar a pagina para atualizar dados
                setTimeout(() => window.location.reload(), 1500)
            } else {
                setResultado({ error: res.error })
            }
        } catch (err: any) {
            setResultado({ error: err.message || 'Erro inesperado.' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center gap-3">
            <button
                onClick={handleGerar}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-figueira text-white rounded-xl text-sm font-semibold hover:bg-figueira/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        A gerar...
                    </>
                ) : (
                    <>
                        <FileStack className="w-4 h-4" />
                        Gerar em Lote
                    </>
                )}
            </button>

            {resultado && (
                <span className={`text-xs font-medium ${resultado.error ? 'text-red-400' : 'text-emerald-400'}`}>
                    {resultado.error ? (
                        resultado.error
                    ) : (
                        <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {resultado.total} recibos gerados com sucesso
                        </span>
                    )}
                </span>
            )}
        </div>
    )
}
