'use client'

import { useState } from 'react'
import { importarDoLoyverse } from '@/actions/cantina-importar-actions'
import { Download, Loader2, CheckCircle2 } from 'lucide-react'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'

export default function BotaoImportarLoyverse() {
    const [loading, setLoading] = useState(false)
    const [resultado, setResultado] = useState<any>(null)
    const confirmar = useConfirm()
    const toast = useToast()

    async function handleImportar() {
        if (!await confirmar({ mensagem: 'Isto vai importar todas as categorias e produtos do Loyverse. Produtos existentes serao atualizados. Continuar?', tipo: 'aviso' })) return
        setLoading(true)
        setResultado(null)

        const res = await importarDoLoyverse()

        if (res.error) {
            toast(res.error, 'erro')
        } else {
            setResultado(res.resumo)
        }

        setLoading(false)
    }

    return (
        <div className="space-y-3">
            <button
                onClick={handleImportar}
                disabled={loading}
                className="inline-flex items-center gap-2 bg-bg border border-soft text-fg px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-figueira/30 transition-all active:scale-95 disabled:opacity-50"
            >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {loading ? 'A importar...' : 'Importar do Loyverse'}
            </button>

            {resultado && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex items-start gap-3 animate-in fade-in duration-300">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 space-y-1">
                        <p>Importacao concluida com sucesso!</p>
                        <p className="text-emerald-600/70">
                            {resultado.categorias} categorias novas
                            {' · '}{resultado.produtosNovos} produtos novos
                            {' · '}{resultado.produtosAtualizados} atualizados
                            {' · '}{resultado.totalLoyverse} total Loyverse
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
