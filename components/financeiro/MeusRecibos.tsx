'use client'

import { useState, useEffect } from 'react'
import { Loader2, Receipt, FileText } from 'lucide-react'
import { obterMeusRecibos } from '@/actions/recibo-actions'
import ReciboPDF from './ReciboPDF'

interface Recibo {
    id: number
    membro_id: number
    ano: number
    valor_total: number
    numero_recibo: string | null
    emitido_em: string
    dados_igreja: any
    dados_membro: any
}

const euro = (v: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v)

export default function MeusRecibos() {
    const [recibos, setRecibos] = useState<Recibo[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function carregar() {
            setLoading(true)
            try {
                const res = await obterMeusRecibos()
                if (res.success) {
                    setRecibos(res.recibos)
                } else {
                    setError(res.error || 'Erro ao carregar recibos.')
                }
            } catch (err: any) {
                setError(err.message || 'Erro ao carregar recibos.')
            } finally {
                setLoading(false)
            }
        }
        carregar()
    }, [])

    if (loading) {
        return (
            <div className="bg-card border border-soft rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-figueira/10 flex items-center justify-center">
                        <Receipt className="w-4 h-4 text-figueira" />
                    </div>
                    <h3 className="text-sm font-bold text-fg">Meus Recibos de Donativo</h3>
                </div>
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 text-muted animate-spin" />
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-card border border-soft rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-figueira/10 flex items-center justify-center">
                        <Receipt className="w-4 h-4 text-figueira" />
                    </div>
                    <h3 className="text-sm font-bold text-fg">Meus Recibos de Donativo</h3>
                </div>
                <p className="text-xs text-red-400">{error}</p>
            </div>
        )
    }

    return (
        <div className="bg-card border border-soft rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-figueira/10 flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-figueira" />
                </div>
                <h3 className="text-sm font-bold text-fg">Meus Recibos de Donativo</h3>
            </div>

            {recibos.length === 0 ? (
                <div className="text-center py-8">
                    <FileText className="w-10 h-10 text-muted/30 mx-auto mb-2" />
                    <p className="text-xs text-muted">Nenhum recibo disponivel.</p>
                    <p className="text-[10px] text-muted/60 mt-1">
                        Os recibos sao emitidos pela tesouraria apos o encerramento do ano fiscal.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {recibos.map(r => (
                        <div
                            key={r.id}
                            className="flex items-center justify-between p-3 bg-bg rounded-xl border border-soft hover:border-figueira/30 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                    <span className="text-xs font-bold text-emerald-500">{r.ano}</span>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-fg">
                                        {euro(r.valor_total)}
                                    </p>
                                    <p className="text-[10px] text-muted">
                                        {r.numero_recibo || 'Recibo'} &middot; Emitido em{' '}
                                        {new Date(r.emitido_em).toLocaleDateString('pt-PT')}
                                    </p>
                                </div>
                            </div>
                            <ReciboPDF recibo={r} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
