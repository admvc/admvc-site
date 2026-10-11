'use client'

import { useState, useEffect } from 'react'
import { HeartHandshake, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { obterMeusPledges, cancelarPledge } from '@/actions/pledge-actions'
import { useConfirm } from '@/components/ui/ConfirmDialog'

const euro = (v: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v)

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    ATIVO: { label: 'Ativo', color: 'bg-blue-500/10 text-blue-500', icon: Clock },
    ATRASADO: { label: 'Atrasado', color: 'bg-red-500/10 text-red-500', icon: AlertTriangle },
    CUMPRIDO: { label: 'Cumprido', color: 'bg-green-500/10 text-green-500', icon: CheckCircle2 },
    CANCELADO: { label: 'Cancelado', color: 'bg-gray-500/10 text-gray-400', icon: XCircle },
}

export default function MeusPledges() {
    const [pledges, setPledges] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [cancelando, setCancelando] = useState<number | null>(null)
    const confirmar = useConfirm()

    async function carregar() {
        setLoading(true)
        try {
            const res = await obterMeusPledges()
            if (res.ok) {
                setPledges(res.pledges)
            }
        } catch {
            // silently fail
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        carregar()
    }, [])

    async function handleCancelar(id: number) {
        if (!await confirmar({ mensagem: 'Tem a certeza que deseja cancelar esta promessa?', tipo: 'perigo' })) return
        setCancelando(id)
        try {
            const res = await cancelarPledge(id)
            if (res.ok) {
                carregar()
            }
        } catch {
            // silently fail
        } finally {
            setCancelando(null)
        }
    }

    if (loading) {
        return (
            <div className="bg-bg2 border border-soft rounded-2xl p-6 space-y-3">
                <div className="flex items-center gap-2">
                    <HeartHandshake size={16} className="text-figueira" />
                    <h3 className="text-sm font-black italic uppercase tracking-tighter text-fg">Minhas Promessas</h3>
                </div>
                <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-figueira border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        )
    }

    return (
        <div className="bg-bg2 border border-soft rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <HeartHandshake size={16} className="text-figueira" />
                    <h3 className="text-sm font-black italic uppercase tracking-tighter text-fg">Minhas Promessas</h3>
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-muted">
                    {pledges.length} promessa(s)
                </span>
            </div>

            {pledges.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                    <HeartHandshake size={28} className="text-muted mx-auto" />
                    <p className="text-[10px] font-bold text-muted">Nenhuma promessa de contribuicao.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {pledges.map((pledge) => {
                        const cfg = statusConfig[pledge.status] || statusConfig.ATIVO
                        const Icon = cfg.icon
                        const progresso = pledge.duracao_meses > 0
                            ? Math.min(100, Math.round((pledge.meses_cumpridos / pledge.duracao_meses) * 100))
                            : 0

                        return (
                            <div key={pledge.id} className="bg-bg border border-soft rounded-2xl p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <p className="text-xs font-black uppercase tracking-tight text-fg">
                                            {pledge.fundo?.nome || 'Fundo Geral'}
                                        </p>
                                        <p className="text-lg font-black italic tracking-tighter text-fg">
                                            {euro(pledge.valor_mensal)}<span className="text-[9px] font-bold text-muted">/mes</span>
                                        </p>
                                    </div>
                                    <span className={`flex items-center gap-1 text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${cfg.color}`}>
                                        <Icon size={10} />
                                        {cfg.label}
                                    </span>
                                </div>

                                {/* Barra de progresso */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-muted">
                                            {pledge.meses_cumpridos}/{pledge.duracao_meses} meses
                                        </span>
                                        <span className="text-[8px] font-black uppercase tracking-widest text-muted">
                                            {progresso}%
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-soft rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${
                                                pledge.status === 'ATRASADO' ? 'bg-red-500' :
                                                pledge.status === 'CUMPRIDO' ? 'bg-green-500' :
                                                'bg-figueira'
                                            }`}
                                            style={{ width: `${progresso}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-1 border-t border-soft">
                                    <span className="text-[9px] text-muted">
                                        Cumprido: <span className="font-bold text-fg">{euro(pledge.valor_cumprido)}</span>
                                        {' / '}
                                        <span className="font-bold text-fg">{euro(pledge.valor_mensal * pledge.duracao_meses)}</span>
                                    </span>
                                    {(pledge.status === 'ATIVO' || pledge.status === 'ATRASADO') && (
                                        <button
                                            onClick={() => handleCancelar(pledge.id)}
                                            disabled={cancelando === pledge.id}
                                            className="text-[8px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-all disabled:opacity-50"
                                        >
                                            {cancelando === pledge.id ? 'A cancelar...' : 'Cancelar'}
                                        </button>
                                    )}
                                </div>

                                {pledge.observacao && (
                                    <p className="text-[9px] text-muted italic">{pledge.observacao}</p>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
