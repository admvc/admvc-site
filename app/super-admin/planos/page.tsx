import { requireSAAuth } from '@/lib/sa-auth'
import { PLANOS, MODULOS, type PlanoId } from '@/lib/planos'
import prismaGlobal from '@/lib/prisma'
import {
    Crown, Check, X, Users, Building, Layers, Clock,
    Shield, Zap, Star, Sparkles
} from 'lucide-react'

const PLANO_CORES: Record<PlanoId, { bg: string; border: string; text: string; icon: typeof Crown }> = {
    FREE: { bg: 'bg-zinc-500/10', border: 'border-zinc-500/20', text: 'text-zinc-400', icon: Shield },
    BASIC: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: Zap },
    PRO: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: Star },
    ENTERPRISE: { bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20', text: 'text-fuchsia-400', icon: Sparkles },
}

const MODULO_LABELS: Record<string, string> = {
    escalas: 'Escalas de Servico',
    grupos: 'Grupos / Celulas',
    louvor: 'Louvor & Musica',
    financeiro: 'Financeiro',
    cantina: 'Cantina / POS',
    acolhimento: 'Acolhimento',
    inventario: 'Inventario',
    gabinete: 'Gabinete Pastoral',
    mural: 'Mural',
    personalizacao: 'Personalizacao',
    relatorios: 'Relatorios',
    auditoria: 'Auditoria',
    holyrics: 'Holyrics',
    mesa_som: 'Mesa de Som',
    cifras: 'Cifras',
    lumikit: 'Iluminacao (Lumikit)',
    pregacao: 'Pregacao',
    ebd: 'EBD / Cursos',
    boleia: 'Boleia Solidaria',
    assistencia: 'Assistencia Social',
}

export default async function PlanosPage() {
    await requireSAAuth()

    // Count churches per plan
    const tenants = await prismaGlobal.tenant.groupBy({
        by: ['plano'],
        _count: true,
    })
    const countByPlan: Record<string, number> = {}
    for (const t of tenants) countByPlan[t.plano] = t._count

    const todosModulos = Object.values(MODULOS)
    const planoIds: PlanoId[] = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE']

    return (
        <main className="max-w-7xl mx-auto py-10 px-6 lg:px-8 space-y-10 animate-in fade-in duration-700">

            {/* HEADER */}
            <header className="space-y-2">
                <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-none">
                    Configuracao de Planos
                </h1>
                <p className="text-sm text-zinc-400">
                    Visao geral dos planos disponíveis, módulos incluídos e limites por tier.
                </p>
            </header>

            {/* PLAN CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {planoIds.map(id => {
                    const plano = PLANOS[id]
                    const cores = PLANO_CORES[id]
                    const Icon = cores.icon
                    const count = countByPlan[id] || 0
                    const lim = plano.limites

                    return (
                        <div key={id} className={`${cores.bg} border ${cores.border} rounded-2xl p-6 space-y-5`}>
                            {/* Plan Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Icon size={20} className={cores.text} />
                                    <div>
                                        <h2 className={`text-lg font-black italic uppercase tracking-tighter ${cores.text}`}>
                                            {plano.nome}
                                        </h2>
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                            {plano.id}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs font-black text-zinc-500 bg-zinc-800 px-2.5 py-1 rounded-lg">
                                    {count} igreja{count !== 1 ? 's' : ''}
                                </span>
                            </div>

                            {/* Limits */}
                            <div className="space-y-2.5">
                                <h3 className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Limites</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <LimitItem icon={<Users size={12} />} label="Membros" value={lim.max_membros === 0 ? 'Ilimitado' : String(lim.max_membros)} />
                                    <LimitItem icon={<Building size={12} />} label="Congregacoes" value={lim.max_congregacoes === 0 ? 'Ilimitado' : String(lim.max_congregacoes)} />
                                    <LimitItem icon={<Layers size={12} />} label="Departamentos" value={lim.max_departamentos === 0 ? 'Ilimitado' : String(lim.max_departamentos)} />
                                    <LimitItem icon={<Clock size={12} />} label="Auditoria" value={lim.dias_auditoria === 0 ? 'Ilimitado' : `${lim.dias_auditoria}d`} />
                                </div>
                            </div>

                            {/* Modules */}
                            <div className="space-y-2.5">
                                <h3 className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                    Modulos ({plano.modulos.length}/{todosModulos.length})
                                </h3>
                                <div className="space-y-1">
                                    {todosModulos.map(mod => {
                                        const included = plano.modulos.includes(mod)
                                        return (
                                            <div key={mod} className={`flex items-center gap-2 py-1 px-2 rounded-lg text-[10px] font-bold ${
                                                included ? 'text-zinc-300' : 'text-zinc-600'
                                            }`}>
                                                {included
                                                    ? <Check size={10} className="text-green-500 shrink-0" />
                                                    : <X size={10} className="text-zinc-700 shrink-0" />
                                                }
                                                {MODULO_LABELS[mod] || mod}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* COMPARISON TABLE */}
            <section className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#222]">
                    <h2 className="text-sm font-black uppercase tracking-widest text-white">Comparacao de Modulos</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                        <thead>
                            <tr className="border-b border-[#222]">
                                <th className="text-left px-6 py-3 font-black uppercase tracking-widest text-zinc-500">Modulo</th>
                                {planoIds.map(id => (
                                    <th key={id} className={`px-4 py-3 font-black uppercase tracking-widest text-center ${PLANO_CORES[id].text}`}>
                                        {PLANOS[id].nome}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {todosModulos.map(mod => (
                                <tr key={mod} className="border-b border-[#191919] hover:bg-[#161616] transition-colors">
                                    <td className="px-6 py-2.5 font-bold text-zinc-400">{MODULO_LABELS[mod] || mod}</td>
                                    {planoIds.map(id => (
                                        <td key={id} className="px-4 py-2.5 text-center">
                                            {PLANOS[id].modulos.includes(mod)
                                                ? <Check size={14} className="text-green-500 mx-auto" />
                                                : <X size={14} className="text-zinc-700 mx-auto" />
                                            }
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    )
}

function LimitItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="bg-black/30 rounded-xl px-3 py-2 space-y-0.5">
            <div className="flex items-center gap-1.5 text-zinc-500">
                {icon}
                <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
            </div>
            <p className="text-sm font-black text-zinc-300">{value}</p>
        </div>
    )
}
