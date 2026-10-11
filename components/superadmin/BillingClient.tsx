'use client'

import { useState } from 'react'
import {
    CreditCard, Building, Crown, Globe, Zap, Rocket,
    TrendingUp, Calendar, Edit3, History
} from 'lucide-react'
import FormBilling from './FormBilling'
import BotaoSuspender from './BotaoSuspender'

interface Tenant {
    id: number
    nome: string
    slug: string
    plano: string
    status: string
    valor_mensal: number | null
    plano_inicio: string | null
    plano_fim: string | null
}

interface HistoricoEntry {
    id: number
    tenant_id: number
    plano_anterior: string
    plano_novo: string
    alterado_por: string | null
    criado_em: string
    tenantNome?: string
}

interface Props {
    tenants: Tenant[]
    historico: HistoricoEntry[]
}

const PLANO_COLORS: Record<string, { text: string; bg: string; border: string; icon: any }> = {
    FREE: { text: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-600/30', icon: Globe },
    BASIC: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Zap },
    PRO: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: Rocket },
    ENTERPRISE: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: Crown },
}

const STATUS_COLORS: Record<string, string> = {
    ATIVO: 'text-green-400 bg-green-500/10',
    SUSPENSO: 'text-red-400 bg-red-500/10',
    INATIVO: 'text-gray-400 bg-gray-500/10',
    TRIAL: 'text-cyan-400 bg-cyan-500/10',
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '---'
    try {
        return new Date(dateStr).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
        return '---'
    }
}

function formatCurrency(val: number | null): string {
    if (val === null || val === undefined) return '---'
    return val.toFixed(2) + ' EUR'
}

export default function BillingClient({ tenants, historico }: Props) {
    const [editingId, setEditingId] = useState<number | null>(null)

    // Revenue calculations
    const totalMensal = tenants.reduce((acc, t) => acc + (t.valor_mensal || 0), 0)
    const byPlan = (plan: string) => {
        const filtered = tenants.filter(t => t.plano === plan)
        return {
            count: filtered.length,
            total: filtered.reduce((acc, t) => acc + (t.valor_mensal || 0), 0),
        }
    }

    const free = byPlan('FREE')
    const basic = byPlan('BASIC')
    const pro = byPlan('PRO')
    const enterprise = byPlan('ENTERPRISE')

    const editingTenant = editingId ? tenants.find(t => t.id === editingId) : null

    return (
        <div className="space-y-8">
            {/* Revenue cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-[#111] border border-[#222] rounded-2xl p-5 space-y-2">
                    <div className="flex items-center gap-2">
                        <TrendingUp size={16} className="text-green-400" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Total Mensal</p>
                    </div>
                    <p className="text-2xl font-black text-green-400">{totalMensal.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-500">EUR / mes</p>
                </div>

                {[
                    { label: 'FREE', data: free, ...PLANO_COLORS.FREE },
                    { label: 'BASIC', data: basic, ...PLANO_COLORS.BASIC },
                    { label: 'PRO', data: pro, ...PLANO_COLORS.PRO },
                    { label: 'ENTERPRISE', data: enterprise, ...PLANO_COLORS.ENTERPRISE },
                ].map(p => {
                    const Icon = p.icon
                    return (
                        <div key={p.label} className={`${p.bg} border ${p.border} rounded-2xl p-5 space-y-2`}>
                            <div className="flex items-center gap-2">
                                <Icon size={16} className={p.text} />
                                <p className={`text-[9px] font-black uppercase tracking-widest ${p.text}`}>{p.label}</p>
                            </div>
                            <p className={`text-2xl font-black ${p.text}`}>{p.data.count}</p>
                            <p className="text-[10px] text-gray-500">{p.data.total.toFixed(2)} EUR</p>
                        </div>
                    )
                })}
            </div>

            {/* Billing table */}
            <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#222] flex items-center gap-3">
                    <CreditCard size={18} className="text-blue-400" />
                    <h2 className="text-sm font-black uppercase tracking-widest text-white">Igrejas ({tenants.length})</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-[#222]">
                                <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-gray-500">Igreja</th>
                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-500">Plano</th>
                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-500">Valor/Mes</th>
                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-500">Inicio</th>
                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-500">Fim</th>
                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-500">Status</th>
                                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-500">Acoes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tenants.map(t => {
                                const planoCfg = PLANO_COLORS[t.plano] || PLANO_COLORS.FREE
                                const PlanoIcon = planoCfg.icon
                                return (
                                    <tr key={t.id} className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A] transition-colors">
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                <Building size={14} className="text-gray-500 shrink-0" />
                                                <div>
                                                    <p className="text-sm font-bold text-white">{t.nome}</p>
                                                    <p className="text-[10px] text-gray-500">{t.slug}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${planoCfg.text} ${planoCfg.bg}`}>
                                                <PlanoIcon size={10} /> {t.plano}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-white font-mono">{formatCurrency(t.valor_mensal)}</td>
                                        <td className="px-4 py-3 text-xs text-gray-400">{formatDate(t.plano_inicio)}</td>
                                        <td className="px-4 py-3 text-xs text-gray-400">{formatDate(t.plano_fim)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${STATUS_COLORS[t.status] || 'text-gray-400 bg-gray-500/10'}`}>
                                                {t.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setEditingId(t.id)}
                                                    className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all flex items-center gap-1.5"
                                                >
                                                    <Edit3 size={12} /> Editar
                                                </button>
                                                <BotaoSuspender tenantId={t.id} status={t.status} />
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* History section */}
            {historico.length > 0 && (
                <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#222] flex items-center gap-3">
                        <History size={18} className="text-amber-400" />
                        <h2 className="text-sm font-black uppercase tracking-widest text-white">Historico de Alteracoes</h2>
                    </div>
                    <div className="divide-y divide-[#1A1A1A]">
                        {historico.map(h => (
                            <div key={h.id} className="px-6 py-3 flex items-center gap-4">
                                <Calendar size={14} className="text-gray-500 shrink-0" />
                                <div className="flex-1 flex items-center gap-3 flex-wrap">
                                    <span className="text-xs font-bold text-white">{h.tenantNome || `Tenant #${h.tenant_id}`}</span>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${(PLANO_COLORS[h.plano_anterior] || PLANO_COLORS.FREE).text} ${(PLANO_COLORS[h.plano_anterior] || PLANO_COLORS.FREE).bg}`}>
                                        {h.plano_anterior}
                                    </span>
                                    <span className="text-gray-500 text-xs">-&gt;</span>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${(PLANO_COLORS[h.plano_novo] || PLANO_COLORS.FREE).text} ${(PLANO_COLORS[h.plano_novo] || PLANO_COLORS.FREE).bg}`}>
                                        {h.plano_novo}
                                    </span>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[10px] text-gray-500">{formatDate(h.criado_em)}</p>
                                    {h.alterado_por && <p className="text-[9px] text-gray-600">{h.alterado_por}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Edit modal */}
            {editingTenant && (
                <FormBilling
                    igreja={editingTenant}
                    onClose={() => setEditingId(null)}
                />
            )}
        </div>
    )
}
