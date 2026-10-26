// /super-admin/erros — os erros que os membros encontram ("Algo correu mal") e os do servidor.
// Agrupados por mensagem (para ver se é um caso ou se está a alastrar) + a lista dos últimos.
import Link from 'next/link'
import prismaGlobal from '@/lib/prisma'
import { requireSAAuth } from '@/lib/sa-auth'
import { Bug } from 'lucide-react'

const TIPOS: Record<string, { nome: string; cor: string }> = {
    VERSAO: { nome: 'Versão antiga', cor: 'bg-sky-500/10 text-sky-400' },
    REDE: { nome: 'Sem rede', cor: 'bg-gray-500/10 text-gray-400' },
    SERVIDOR: { nome: 'Servidor', cor: 'bg-red-500/10 text-red-400' },
    APP: { nome: 'No aparelho', cor: 'bg-orange-500/10 text-orange-400' },
}

const quando = (d: Date) =>
    d.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' })

/** "iOS 15.4 · Safari 15" a partir do user agent (só para ler depressa). */
function aparelho(ua: string | null): string {
    if (!ua) return '—'
    const so = /iPhone|iPad/.test(ua) ? `iOS ${ua.match(/OS (\d+)[_.](\d+)/)?.slice(1).join('.') ?? ''}`
        : /Android/.test(ua) ? `Android ${ua.match(/Android ([\d.]+)/)?.[1] ?? ''}`
        : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : 'Outro'
    const versao = (re: RegExp) => ua.match(re)?.[1]
    const nav = versao(/SamsungBrowser\/(\d+)/) ? `Samsung ${versao(/SamsungBrowser\/(\d+)/)}`
        : versao(/EdgA?\/(\d+)/) ? `Edge ${versao(/EdgA?\/(\d+)/)}`
        : versao(/(?:Chrome|CriOS)\/(\d+)/) ? `Chrome ${versao(/(?:Chrome|CriOS)\/(\d+)/)}`
        : /FxiOS|Firefox/.test(ua) ? 'Firefox'
        : versao(/Version\/([\d.]+).*Safari/) ? `Safari ${versao(/Version\/([\d.]+).*Safari/)}` : ''
    return `${so.trim()}${nav ? ` · ${nav}` : ''}`
}

export default async function ErrosSAPage({ searchParams }: { searchParams: Promise<{ dias?: string; tipo?: string; q?: string }> }) {
    await requireSAAuth()
    const { dias: d, tipo, q: qBruto } = await searchParams
    const q = qBruto?.trim().slice(0, 100)
    const dias = [1, 7, 30, 90].includes(Number(d)) ? Number(d) : 7
    const where = {
        criado_em: { gte: new Date(Date.now() - dias * 86400000) },
        ...(tipo && TIPOS[tipo] ? { tipo } : {}),
        ...(q ? {
            OR: [
                { codigo: q.toUpperCase() },
                { digest: q },
                { membro_nome: { contains: q, mode: 'insensitive' as const } },
                { mensagem: { contains: q, mode: 'insensitive' as const } },
            ],
        } : {}),
    }

    const [grupos, linhas, total, pessoas, ultimas24] = await Promise.all([
        prismaGlobal.erroApp.groupBy({
            by: ['tipo', 'mensagem'],
            where,
            _count: { _all: true },
            _max: { criado_em: true },
            orderBy: { _count: { id: 'desc' } },
            take: 15,
        }),
        prismaGlobal.erroApp.findMany({ where, orderBy: { criado_em: 'desc' }, take: 100 }),
        prismaGlobal.erroApp.count({ where }),
        prismaGlobal.erroApp.findMany({ where: { ...where, membro_id: { not: null } }, distinct: ['membro_id'], select: { membro_id: true } }),
        prismaGlobal.erroApp.count({ where: { ...where, criado_em: { gte: new Date(Date.now() - 86400000) } } }),
    ])
    const campo = 'bg-[#0A0A0A] border border-[#333] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500'

    return (
        <main className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="border-b border-[#222] pb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Gestão</p>
                <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3 mt-2">
                    <Bug size={32} className="text-red-400" /> Erros da app
                </h1>
                <p className="text-xs text-gray-500 mt-2">
                    Cada vez que alguém vê o ecrã de erro fica aqui, com o código que lhe aparece. Os erros do servidor também. Guardados 90 dias.
                </p>
            </div>

            <form method="get" className="flex flex-wrap items-end gap-3">
                <label className="space-y-1">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-gray-500">Período</span>
                    <select name="dias" defaultValue={String(dias)} className={campo}>
                        <option value="1">Últimas 24 h</option>
                        <option value="7">7 dias</option>
                        <option value="30">30 dias</option>
                        <option value="90">90 dias</option>
                    </select>
                </label>
                <label className="space-y-1">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-gray-500">Tipo</span>
                    <select name="tipo" defaultValue={tipo ?? ''} className={campo}>
                        <option value="">Todos</option>
                        {Object.entries(TIPOS).map(([k, t]) => <option key={k} value={k}>{t.nome}</option>)}
                    </select>
                </label>
                <label className="space-y-1">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-gray-500">Código, nome ou texto</span>
                    <input name="q" defaultValue={q ?? ''} maxLength={100} className={campo} />
                </label>
                <button type="submit" className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest">Filtrar</button>
                {(tipo || q || d) && <Link href="?" className="px-2 py-2.5 text-xs font-bold text-gray-400 hover:text-white">Limpar</Link>}
            </form>

            <div className="grid grid-cols-3 gap-3">
                {[
                    { n: total, t: 'erros no período' },
                    { n: pessoas.length, t: 'pessoas afetadas' },
                    { n: ultimas24, t: 'nas últimas 24 h' },
                ].map(c => (
                    <div key={c.t} className="bg-[#111] border border-[#222] rounded-2xl p-4">
                        <p className="text-2xl font-black text-white">{c.n}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">{c.t}</p>
                    </div>
                ))}
            </div>

            <section className="space-y-2">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Os que mais se repetem</h2>
                <div className="bg-[#111] border border-[#222] rounded-2xl divide-y divide-[#1c1c1c]">
                    {grupos.length === 0 && <p className="px-4 py-10 text-center text-gray-600 text-xs font-bold uppercase tracking-widest">Nenhum erro neste período</p>}
                    {grupos.map(g => (
                        <div key={`${g.tipo}|${g.mensagem}`} className="px-4 py-3 flex items-start gap-3">
                            <span className="text-lg font-black text-white w-12 text-right shrink-0">{g._count._all}×</span>
                            <div className="min-w-0 flex-1">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${TIPOS[g.tipo]?.cor ?? ''}`}>{TIPOS[g.tipo]?.nome ?? g.tipo}</span>
                                <p className="text-xs text-gray-300 break-words mt-1">{g.mensagem}</p>
                            </div>
                            <span className="text-[10px] text-gray-500 whitespace-nowrap">último {g._max.criado_em ? quando(g._max.criado_em) : ''}</span>
                        </div>
                    ))}
                </div>
            </section>

            <section className="space-y-2">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Últimos {linhas.length} (toque para ver os detalhes)</h2>
                <div className="space-y-2">
                    {linhas.map(l => (
                        <details key={l.id} className="bg-[#111] border border-[#222] rounded-2xl">
                            <summary className="px-4 py-3 cursor-pointer list-none flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                <span className="text-gray-400 whitespace-nowrap">{quando(l.criado_em)}</span>
                                <span className="font-mono font-bold text-white tracking-widest">{l.codigo}</span>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${TIPOS[l.tipo]?.cor ?? ''}`}>{TIPOS[l.tipo]?.nome ?? l.tipo}</span>
                                <span className="text-white">{l.membro_nome ?? (l.origem === 'SERVIDOR' ? 'servidor (sem sessão)' : 'sem sessão')}</span>
                                <span className="text-gray-500">{aparelho(l.user_agent)}</span>
                                <span className="text-gray-300 truncate basis-full">{l.mensagem}</span>
                            </summary>
                            <div className="px-4 pb-4 space-y-2 text-xs text-gray-400 break-words">
                                <p><b className="text-gray-300">Página:</b> {l.url ?? '—'}</p>
                                <p>
                                    <b className="text-gray-300">Origem:</b> {l.origem === 'SERVIDOR' ? 'servidor' : 'telemóvel/browser'}
                                    {l.digest && <> · digest <span className="font-mono">{l.digest}</span> (<Link className="text-blue-400" href={`?dias=${dias}&q=${encodeURIComponent(l.digest)}`}>ver os dois lados</Link>)</>}
                                </p>
                                <p><b className="text-gray-300">Aparelho:</b> {l.user_agent ?? '—'}</p>
                                {l.stack && <pre className="bg-[#0A0A0A] border border-[#222] rounded-xl p-3 overflow-x-auto whitespace-pre-wrap text-[11px] text-gray-500">{l.stack}</pre>}
                            </div>
                        </details>
                    ))}
                </div>
            </section>
        </main>
    )
}
