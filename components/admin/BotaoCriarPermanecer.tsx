'use client'

import { useState } from 'react'
import { BookOpen, Loader2, CheckCircle2 } from 'lucide-react'
import { criarCursoPermanecer } from '@/actions/admin-actions'
import { useConfirm } from '@/components/ui/ConfirmDialog'

export default function BotaoCriarPermanecer() {
    const confirmar = useConfirm()
    const [loading, setLoading] = useState(false)
    const [resultado, setResultado] = useState<{ ok: boolean; msg: string } | null>(null)

    const handleCriar = async () => {
        const ok = await confirmar({ mensagem: 'Criar o curso Permanecer com 10 perguntas baseadas na apostila? Novos membros serão auto-matriculados.', tipo: 'info' })
        if (!ok) return
        setLoading(true)
        const res = await criarCursoPermanecer()
        setLoading(false)
        if (res.ok) {
            setResultado({ ok: true, msg: 'Curso Permanecer criado com sucesso! Novos membros serao auto-matriculados.' })
        } else {
            setResultado({ ok: false, msg: res.error || 'Erro ao criar curso.' })
        }
    }

    if (resultado?.ok) {
        return (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-4">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <p className="text-xs font-bold text-emerald-600">{resultado.msg}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <div className="bg-figueira/5 border border-figueira/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-figueira/20 flex items-center justify-center shrink-0">
                        <BookOpen size={18} className="text-figueira" />
                    </div>
                    <div>
                        <p className="text-sm font-black uppercase italic tracking-tighter text-fg">Curso Permanecer</p>
                        <p className="text-[9px] text-muted font-bold uppercase tracking-widest mt-0.5">
                            Cria o curso de integracao com questionario baseado na apostila.
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleCriar}
                    disabled={loading}
                    className="shrink-0 flex items-center justify-center gap-2 px-5 py-3 bg-figueira text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 shadow-sm"
                >
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <BookOpen size={13} />}
                    {loading ? 'A criar...' : 'Criar Curso Permanecer'}
                </button>
            </div>
            {resultado && !resultado.ok && (
                <p className="text-xs text-red-400 font-bold mt-2 px-2">{resultado.msg}</p>
            )}
        </div>
    )
}
