// Pregações: quem pregou, o quê e quando (a Palavra de cada rotina + os
// esboços), com pesquisa por tema/texto e por pregador.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, FileText, Search } from 'lucide-react'
import { getSessionData } from '@/lib/auth-utils'
import { podeGerirSermoes } from '@/lib/cursos-permissoes'
import { filtrarPregacoes, historicoDePregacoes, type Pregacao } from '@/lib/pregacoes'
import { membrosParaEscolher } from '@/lib/rotina-culto-dados'
import { quandoPorExtenso, responsavel } from '@/lib/rotina-culto'
import NovoEsboco from '@/components/pregacao/NovoEsboco'

export const dynamic = 'force-dynamic'

function Cartao({ p }: { p: Pregacao }) {
    return (
        <li className="a-card space-y-1 p-4">
            <p className="text-[15px] a-suave">{quandoPorExtenso(p.data)} · {p.culto}{p.congregacao ? ` · ${p.congregacao}` : ''}</p>
            <p className="text-[18px] font-semibold leading-snug">{p.tema || 'Sem tema'}</p>
            {p.texto && <p className="text-[16px] font-semibold" style={{ color: 'var(--a-destaque)' }}>{p.texto}</p>}
            {p.quem && <p className="text-[16px]">{p.quem}</p>}
            <div className="flex flex-wrap gap-3 pt-1">
                {p.esboco && (
                    <Link href={`/pregacao/sermao/${p.esboco.id}`} className="a-foco inline-flex min-h-[44px] items-center gap-2 text-[15px] font-semibold" style={{ color: 'var(--a-destaque)' }}>
                        <FileText size={17} aria-hidden /> {p.esboco.publicado ? 'Ler o esboço' : 'Esboço (por publicar)'}
                    </Link>
                )}
                {p.eventoId && (
                    <Link href={`/pregacao/culto/${p.eventoId}`} className="a-foco inline-flex min-h-[44px] items-center text-[15px] font-semibold a-suave">
                        Rotina do culto
                    </Link>
                )}
            </div>
        </li>
    )
}

export default async function HistoricoPage({ searchParams }: { searchParams: Promise<{ q?: string; pregador?: string }> }) {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login?volta=/pregacao/historico')
    const params = await searchParams
    const [todas, gere] = await Promise.all([historicoDePregacoes(sessao), podeGerirSermoes(sessao.membroId, sessao.role)])
    const pregador = Number(params.pregador) || undefined
    const lista = filtrarPregacoes(todas, { pregador, q: params.q })
    const marcadas = lista.filter((p) => p.futura).reverse() // a mais próxima primeiro
    const feitas = lista.filter((p) => !p.futura)

    // Os pregadores que aparecem no histórico (para o filtro)
    const pregadores = new Map<number, string>()
    for (const p of todas) if (p.pregadorId && p.quem) pregadores.set(p.pregadorId, p.quem)
    const membros = gere ? await membrosParaEscolher(sessao.tenantId) : []
    const mapa = new Map(membros.map((m) => [m.id, m]))

    const campo = 'a-foco min-h-[48px] w-full rounded-[14px] border px-3 text-[16px]'
    const estilo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }
    const filtrado = !!(pregador || params.q)

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-2xl px-4 pt-20 pb-28 md:pt-8 space-y-5">
                <Link href="/pregacao" className="a-foco inline-flex min-h-[44px] items-center gap-2 text-[16px] font-semibold" style={{ color: 'var(--a-destaque)' }}>
                    <ArrowLeft size={20} aria-hidden /> Rotina dos cultos
                </Link>
                <div className="space-y-1">
                    <h1 className="text-[26px] font-bold">Pregações</h1>
                    <p className="text-[16px] a-suave">Quem pregou, o quê e quando. Os esboços publicados podem ler-se aqui.</p>
                </div>

                <form className="a-card space-y-3 p-4" role="search">
                    <label className="block space-y-1">
                        <span className="text-[15px] font-semibold">Procurar tema ou texto bíblico</span>
                        <input name="q" defaultValue={params.q ?? ''} placeholder="ex.: talentos, Mateus 25" className={campo} style={estilo} />
                    </label>
                    {pregadores.size > 0 && (
                        <label className="block space-y-1">
                            <span className="text-[15px] font-semibold">Pregador</span>
                            <select name="pregador" defaultValue={pregador ? String(pregador) : ''} className={campo} style={estilo}>
                                <option value="">Todos</option>
                                {[...pregadores.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt')).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
                            </select>
                        </label>
                    )}
                    <div className="flex gap-2">
                        <button type="submit" className="a-botao a-botao-principal flex-[2]"><Search size={18} aria-hidden /> Procurar</button>
                        {filtrado && <Link href="/pregacao/historico" className="a-botao a-botao-secundario flex-1">Limpar</Link>}
                    </div>
                </form>

                {gere && (
                    <NovoEsboco pregadores={membros.map((m) => ({ id: m.id, nome: responsavel({ momento: '', membro_id: m.id }, mapa) }))} eu={sessao.membroId} />
                )}

                {marcadas.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="text-[19px] font-bold">Marcadas</h2>
                        <ul className="space-y-3">{marcadas.map((p, i) => <Cartao key={`m${i}`} p={p} />)}</ul>
                    </section>
                )}
                <section className="space-y-3">
                    <h2 className="text-[19px] font-bold">{filtrado ? `Encontradas (${feitas.length})` : 'Já pregadas'}</h2>
                    {feitas.length === 0
                        ? <p className="a-card p-5 text-[16px] a-suave">{filtrado ? 'Nada encontrado.' : 'Ainda não há pregações registadas. Aparecem aqui a partir da rotina de cada culto (momento "Palavra").'}</p>
                        : <ul className="space-y-3">{feitas.map((p, i) => <Cartao key={`f${i}`} p={p} />)}</ul>}
                </section>
            </main>
        </div>
    )
}
