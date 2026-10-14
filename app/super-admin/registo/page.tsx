// /super-admin/registo — tudo o que se fez no Cloud: quem, o quê, quando e de onde.
import Link from 'next/link'
import prismaGlobal from '@/lib/prisma'
import { requireSAAuth } from '@/lib/sa-auth'
import { ScrollText } from 'lucide-react'

const POR_PAGINA = 50

export default async function RegistoSAPage({ searchParams }: { searchParams: Promise<{ sa?: string; acao?: string; p?: string }> }) {
    await requireSAAuth()
    const { sa, acao, p } = await searchParams
    const pagina = Math.max(1, Number(p) || 1)
    const where = {
        ...(sa && /^\d+$/.test(sa) ? { sa_id: Number(sa) } : {}),
        ...(acao ? { acao } : {}),
    }

    const [admins, acoes, total, linhas] = await Promise.all([
        prismaGlobal.superAdmin.findMany({ select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
        prismaGlobal.superAdminLog.findMany({ distinct: ['acao'], select: { acao: true }, orderBy: { acao: 'asc' } }),
        prismaGlobal.superAdminLog.count({ where }),
        prismaGlobal.superAdminLog.findMany({
            where,
            include: { sa: { select: { nome: true } } },
            orderBy: { criado_em: 'desc' },
            skip: (pagina - 1) * POR_PAGINA,
            take: POR_PAGINA,
        }),
    ])
    const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))
    const link = (mudar: { p?: number }) => {
        const q = new URLSearchParams()
        if (sa) q.set('sa', sa)
        if (acao) q.set('acao', acao)
        if (mudar.p && mudar.p > 1) q.set('p', String(mudar.p))
        return `?${q.toString()}`
    }
    const campo = 'bg-[#0A0A0A] border border-[#333] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500'

    return (
        <main className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="border-b border-[#222] pb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Gestão</p>
                <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3 mt-2">
                    <ScrollText size={32} className="text-violet-400" /> Registo de ações
                </h1>
                <p className="text-xs text-gray-500 mt-2">Tudo o que se faz no Cloud fica aqui: entradas, alterações e quem entrou nas igrejas (com o motivo).</p>
            </div>

            <form method="get" className="flex flex-wrap items-end gap-3">
                <label className="space-y-1">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-gray-500">Quem</span>
                    <select name="sa" defaultValue={sa ?? ''} className={campo}>
                        <option value="">Todos</option>
                        {admins.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                    </select>
                </label>
                <label className="space-y-1">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-gray-500">Ação</span>
                    <select name="acao" defaultValue={acao ?? ''} className={campo}>
                        <option value="">Todas</option>
                        {acoes.map(a => <option key={a.acao} value={a.acao}>{a.acao}</option>)}
                    </select>
                </label>
                <button type="submit" className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest">Filtrar</button>
                {(sa || acao) && <Link href="?" className="px-2 py-2.5 text-xs font-bold text-gray-400 hover:text-white">Limpar</Link>}
                <span className="ml-auto text-xs text-gray-500">{total} registo{total !== 1 ? 's' : ''}</span>
            </form>

            <div className="bg-[#111] border border-[#222] rounded-2xl overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-[#222] text-[10px] font-black uppercase tracking-widest text-gray-500">
                            <th className="px-4 py-3">Quando</th>
                            <th className="px-4 py-3">Quem</th>
                            <th className="px-4 py-3">Ação</th>
                            <th className="px-4 py-3">Detalhes</th>
                            <th className="px-4 py-3 hidden md:table-cell">IP</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1c1c1c]">
                        {linhas.length === 0 && (
                            <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-600 text-xs font-bold uppercase tracking-widest">Nada registado</td></tr>
                        )}
                        {linhas.map(l => (
                            <tr key={l.id} className="align-top hover:bg-white/[0.02]">
                                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                    {l.criado_em.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' })}
                                </td>
                                <td className="px-4 py-3 text-xs text-white whitespace-nowrap">{l.sa?.nome ?? `#${l.sa_id}`}</td>
                                <td className="px-4 py-3">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${l.acao === 'IMPERSONAR' || l.acao === 'LOGIN_FALHADO' ? 'bg-orange-500/10 text-orange-400' : 'bg-violet-500/10 text-violet-400'}`}>{l.acao}</span>
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-300 break-words max-w-xl">{l.detalhes}</td>
                                <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{l.ip ?? '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {paginas > 1 && (
                <nav aria-label="Páginas" className="flex items-center justify-center gap-3 text-xs font-bold">
                    {pagina > 1 ? <Link href={link({ p: pagina - 1 })} className="px-3 py-2 rounded-lg border border-[#333] text-gray-300 hover:text-white">← Mais recentes</Link> : <span />}
                    <span className="text-gray-500">Página {pagina} de {paginas}</span>
                    {pagina < paginas ? <Link href={link({ p: pagina + 1 })} className="px-3 py-2 rounded-lg border border-[#333] text-gray-300 hover:text-white">Mais antigos →</Link> : <span />}
                </nav>
            )}
        </main>
    )
}
