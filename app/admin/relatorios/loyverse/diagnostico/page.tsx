// app/admin/loyverse/diagnostico/page.tsx
import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { getLoyverseTokenForTenant, getLoyverseCustomers } from '@/lib/loyverse-api'
import { ShieldCheck, RefreshCw, AlertTriangle, CheckCircle2, User, Link2 } from 'lucide-react'
import BotaoVincularLoyverse from '@/components/admin/BotaoVincularLoyverse'
import BotaoVincularManual from '@/components/admin/BotaoVincularManual'
import Breadcrumb from '@/components/ui/Breadcrumb'

export const dynamic = 'force-dynamic'

export default async function DiagnosticoLoyversePage() {
    const db = await getDb()
    const tenantId = await getTenantIdFromHeaders()
    const token = await getLoyverseTokenForTenant(tenantId)

    if (!token) {
        return (
            <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-700 pb-32">
                <div className="bg-orange-500/5 border border-orange-500/20 p-8 rounded-2xl text-center space-y-2">
                    <AlertTriangle className="mx-auto text-orange-500" size={32} />
                    <h2 className="text-lg font-black uppercase text-orange-700">Loyverse nao configurado</h2>
                    <p className="text-sm text-orange-600">Configure o token Loyverse nas definicoes do tenant para utilizar esta funcionalidade.</p>
                </div>
            </main>
        )
    }

    const [clientesLoyverse, membrosApp] = await Promise.all([
        getLoyverseCustomers(token),
        db.membro.findMany({
            select: { id: true, first_name: true, last_name: true, email: true, loyverse_id: true },
            orderBy: { first_name: 'asc' }
        })
    ])

    // ── CRUZAMENTO DE DADOS ───────────────────────────────────────────────────
    const matchesAutomaticos: any[] = []
    let jaVinculadosCount = 0

    if (clientesLoyverse) {
        clientesLoyverse.forEach((cliente: any) => {
            if (!cliente.email) return
            const membroMatch = membrosApp.find(
                m => m.email?.toLowerCase() === cliente.email.toLowerCase()
            )
            if (membroMatch) {
                if (!membroMatch.loyverse_id) {
                    matchesAutomaticos.push({ membro: membroMatch, loyverseCliente: cliente })
                } else if (membroMatch.loyverse_id === cliente.id) {
                    jaVinculadosCount++
                }
            }
        })
    }

    const semVinculo = membrosApp.filter(m => !m.loyverse_id)

    return (
        <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-700 pb-32">

            {/* HEADER */}
            <header className="flex flex-col md:flex-row justify-between md:items-end gap-6 pb-6 border-b border-soft">
                <div>
                    <span className="text-figueira font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-2 mb-2">
                        <ShieldCheck size={14} /> Integração Loyverse
                    </span>
                    <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-fg leading-none">
                        Sincronização <span className="text-muted/20">Cantina.</span>
                    </h1>
                </div>
                <div className="flex gap-3">
                    <StatBox label="Total Loyverse" value={clientesLoyverse?.length ?? 0} />
                    <StatBox label="Sincronizados" value={jaVinculadosCount} cor="emerald" />
                    <StatBox label="Sem Vínculo" value={semVinculo.length} cor={semVinculo.length > 0 ? 'orange' : 'emerald'} />
                </div>
            </header>

            {/* ── MATCHES AUTOMÁTICOS ───────────────────────────────────────── */}
            {matchesAutomaticos.length > 0 && (
                <section className="bg-orange-500/5 border border-orange-500/20 p-6 rounded-2xl space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center shrink-0">
                            <AlertTriangle size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase italic tracking-tighter text-orange-700 leading-none">
                                {matchesAutomaticos.length} match{matchesAutomaticos.length !== 1 ? 'es' : ''} automático{matchesAutomaticos.length !== 1 ? 's' : ''} encontrado{matchesAutomaticos.length !== 1 ? 's' : ''}
                            </h3>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-orange-600/80 mt-1">
                                Email coincide mas ainda não está vinculado — clica para confirmar
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {matchesAutomaticos.map(({ membro, loyverseCliente }) => (
                            <div key={membro.id} className="bg-bg border border-orange-500/20 rounded-2xl p-4 flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[7px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-600 border border-orange-500/20 px-2 py-0.5 rounded-full">
                                            Match por email
                                        </span>
                                    </div>
                                    <p className="text-sm font-black uppercase text-fg leading-none truncate">
                                        {membro.first_name} {membro.last_name}
                                    </p>
                                    <p className="text-[9px] font-bold text-muted lowercase tracking-widest mt-0.5 truncate">
                                        {membro.email}
                                    </p>
                                </div>
                                <BotaoVincularLoyverse
                                    membroId={membro.id}
                                    loyverseId={loyverseCliente.id}
                                    membroNome={membro.first_name}
                                />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {matchesAutomaticos.length === 0 && clientesLoyverse && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                        Todos os emails correspondentes já estão sincronizados.
                    </p>
                </div>
            )}

            {/* ── RELACIONAMENTO MANUAL ─────────────────────────────────────── */}
            {semVinculo.length > 0 && clientesLoyverse && (
                <section className="space-y-4">
                    <div className="flex items-center gap-3 pb-2 border-b border-soft">
                        <Link2 size={16} className="text-figueira" />
                        <h2 className="text-sm font-black uppercase tracking-widest text-fg">
                            Relacionamento Manual
                        </h2>
                        <span className="text-[9px] font-black bg-bg2 border border-soft px-2.5 py-1 rounded-lg text-muted">
                            {semVinculo.length} membro{semVinculo.length !== 1 ? 's' : ''} sem vínculo
                        </span>
                    </div>

                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest">
                        Liga manualmente cada membro da app ao seu cliente Loyverse correspondente.
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {semVinculo.map(membro => (
                            <div key={membro.id} className="bg-bg2 border border-soft rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-figueira/30 transition-all">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 bg-soft rounded-xl flex items-center justify-center shrink-0">
                                        <span className="text-[10px] font-black text-muted uppercase">
                                            {membro.first_name[0]}{membro.last_name[0]}
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-black uppercase text-fg leading-none truncate">
                                            {membro.first_name} {membro.last_name}
                                        </p>
                                        <p className="text-[8px] font-bold text-muted lowercase tracking-widest mt-0.5 truncate">
                                            {membro.email}
                                        </p>
                                    </div>
                                </div>
                                <BotaoVincularManual
                                    membroId={membro.id}
                                    membroNome={`${membro.first_name} ${membro.last_name}`}
                                    clientesLoyverse={clientesLoyverse}
                                />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── DIRETÓRIO COMPLETO ────────────────────────────────────────── */}
            <section className="space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-soft">
                    <User size={16} className="text-muted" />
                    <h2 className="text-sm font-black uppercase tracking-widest text-fg">Diretório Completo</h2>
                </div>

                <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[700px]">
                            <thead>
                                <tr className="border-b border-soft bg-bg2">
                                    <th className="px-6 py-4 text-[8px] font-black uppercase tracking-widest text-muted border-r border-soft/50 w-1/4">Nome Loyverse</th>
                                    <th className="px-6 py-4 text-[8px] font-black uppercase tracking-widest text-muted w-1/4">Membro App</th>
                                    <th className="px-6 py-4 text-[8px] font-black uppercase tracking-widest text-muted w-1/6">Estado</th>
                                    <th className="px-6 py-4 text-[8px] font-black uppercase tracking-widest text-muted">UUID Loyverse</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-soft/50">
                                {clientesLoyverse?.map((c: any) => {
                                    const membroVinculado = membrosApp.find(m => m.loyverse_id === c.id)
                                    const membroSugerido = membrosApp.find(
                                        m => m.email?.toLowerCase() === c.email?.toLowerCase() && !m.loyverse_id
                                    )
                                    const membroExibicao = membroVinculado || membroSugerido

                                    return (
                                        <tr key={c.id} className="hover:bg-soft/10 transition-colors">
                                            <td className="px-6 py-4 border-r border-soft/50">
                                                <p className="text-[11px] font-black uppercase text-fg leading-none">{c.name}</p>
                                                <p className="text-[9px] font-bold text-muted lowercase mt-0.5">{c.email || '—'}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                {membroExibicao ? (
                                                    <div>
                                                        <p className={`text-[11px] font-black uppercase leading-none ${membroVinculado ? 'text-fg' : 'text-orange-600'}`}>
                                                            {membroExibicao.first_name} {membroExibicao.last_name}
                                                        </p>
                                                        <p className="text-[9px] font-bold text-muted lowercase mt-0.5">{membroExibicao.email}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-[9px] font-bold text-muted/40 italic">Não encontrado</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {membroVinculado ? (
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                                                        Sincronizado
                                                    </span>
                                                ) : membroSugerido ? (
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-orange-600 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-lg">
                                                        Pendente
                                                    </span>
                                                ) : (
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-muted bg-soft px-2.5 py-1 rounded-lg">
                                                        Sem vínculo
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <code className="bg-bg border border-soft px-2.5 py-1 rounded-lg text-[9px] font-mono text-figueira select-all">
                                                    {c.id}
                                                </code>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {!clientesLoyverse && (
                        <div className="p-16 text-center space-y-3">
                            <RefreshCw className="mx-auto text-muted animate-spin" size={24} />
                            <p className="text-[10px] font-black uppercase text-muted tracking-widest">
                                A aguardar resposta da API Loyverse...
                            </p>
                        </div>
                    )}
                </div>
            </section>
        </main>
    )
}

// ── STAT BOX ──────────────────────────────────────────────────────────────────
function StatBox({ label, value, cor }: {
    label: string
    value: number
    cor?: 'emerald' | 'orange'
}) {
    const styles = {
        emerald: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600',
        orange: 'bg-orange-500/5 border-orange-500/20 text-orange-600',
    }
    const base = 'bg-bg2 border-soft text-fg'

    return (
        <div className={`px-5 py-4 rounded-2xl border text-right ${cor ? styles[cor] : base}`}>
            <p className="text-[8px] font-black uppercase tracking-widest opacity-70">{label}</p>
            <p className="text-2xl font-black italic leading-none mt-1">{value}</p>
        </div>
    )
}