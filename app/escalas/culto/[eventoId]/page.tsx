// Pagina de uma escala (como no LouveApp): data, a minha parte (confirmar),
// partilhar/agenda, musicas (setlist + modo palco) e participantes.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, CalendarPlus, ChevronRight, ListOrdered, Share2 } from 'lucide-react'
import { getSessionData } from '@/lib/auth-utils'
import { dadosDaEscala, type DadosEscala } from '@/lib/ministerios-app'
import BlocoData from '@/components/app/BlocoData'
import CartaoProximaEscala from '@/components/app/CartaoProximaEscala'
import MusicasEscala from '@/components/app/MusicasEscala'
import ParticipantesEscala from '@/components/app/ParticipantesEscala'
import { daquiA, diaDaSemana, diaPorExtenso, hora } from '@/components/app/datas'
import { getTenantClient } from '@/lib/prisma'
import { checkModulo } from '@/lib/modulos'
import { MODULOS } from '@/lib/planos'
import { normalizarItens } from '@/lib/rotina-culto'

export const dynamic = 'force-dynamic'

function mensagemWhatsApp(d: DadosEscala) {
    const linhas = [`*${d.departamento.nome} · ${d.evento.nome}*`, `${diaPorExtenso(d.evento.data)}, às ${hora(d.evento.data)}`, '']
    for (const f of d.funcoes) {
        const quem = f.pessoas.filter((p) => p.estado !== 'NAO_PODE').map((p) => p.nome).join(', ')
        if (quem) linhas.push(`• ${f.nome}: ${quem}`)
    }
    if (d.musicas.length) {
        linhas.push('', '*Músicas*')
        d.musicas.forEach((m, i) => linhas.push(`${i + 1}. ${m.titulo}${m.artista ? ` (${m.artista})` : ''} — ${m.tom}`))
    }
    return linhas.join('\n')
}

function linkGoogleAgenda(d: DadosEscala) {
    const inicio = new Date(d.evento.data)
    const fim = new Date(inicio.getTime() + 2 * 3600000)
    const fmt = (x: Date) => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    const minha = d.minhas.map((m) => m.funcao).join(', ')
    const p = new URLSearchParams({
        action: 'TEMPLATE',
        text: `${d.evento.nome} · ${d.departamento.nome}`,
        dates: `${fmt(inicio)}/${fmt(fim)}`,
        details: minha ? `A minha função: ${minha}` : `Escala de ${d.departamento.nome}`,
    })
    return `https://calendar.google.com/calendar/render?${p}`
}

export default async function EscalaPage(props: {
    params: Promise<{ eventoId: string }>
    searchParams: Promise<{ equipa?: string }>
}) {
    const { eventoId } = await props.params
    const { equipa } = await props.searchParams
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')

    const dados = await dadosDaEscala(sessao, Number(eventoId), Number(equipa))
    if (!dados) redirect('/escalas')
    const { evento, departamento } = dados
    // A rotina do culto (módulo Pregações): atalho para a ver
    const [rotina, temPregacao] = await Promise.all([
        getTenantClient(sessao.tenantId).rotinaCulto.findUnique({ where: { evento_id: evento.id }, select: { itens: true } }),
        checkModulo(MODULOS.PREGACAO),
    ])
    const momentos = rotina ? normalizarItens(rotina.itens) : []

    const botao = 'a-foco inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-[15px] font-semibold'

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-5xl px-4 pt-20 pb-28 md:pt-8 space-y-5">
                <Link href={`/escalas?equipa=${departamento.id}`} className="a-foco inline-flex min-h-[44px] items-center gap-2 text-[16px] font-semibold" style={{ color: 'var(--a-destaque)' }}>
                    <ArrowLeft size={20} aria-hidden /> Escalas
                </Link>

                <header className="flex items-stretch gap-3">
                    <BlocoData iso={evento.data} />
                    <div className="a-card flex min-w-0 flex-1 flex-col justify-center px-4 py-3" style={{ background: 'var(--a-destaque-suave)', borderColor: 'transparent' }}>
                        <p className="text-[15px] font-semibold a-suave">{departamento.nome}</p>
                        <h1 className="text-[22px] font-bold leading-tight">{evento.nome}</h1>
                        <p className="text-[15px] font-semibold a-suave">{diaDaSemana(evento.data)} · {daquiA(evento.data)}</p>
                    </div>
                </header>

                <div className="flex flex-wrap gap-2">
                    <a href={`https://wa.me/?text=${encodeURIComponent(mensagemWhatsApp(dados))}`} target="_blank" rel="noopener noreferrer"
                        className={botao} style={{ borderColor: 'var(--a-borda)', background: 'var(--a-card)' }}>
                        <Share2 size={17} aria-hidden /> Partilhar
                    </a>
                    <a href={linkGoogleAgenda(dados)} target="_blank" rel="noopener noreferrer"
                        className={botao} style={{ borderColor: 'var(--a-borda)', background: 'var(--a-card)' }}>
                        <CalendarPlus size={17} aria-hidden /> Google Agenda
                    </a>
                </div>

                {temPregacao && momentos.length > 0 && (
                    <Link href={`/pregacao/culto/${evento.id}`} className="a-card a-foco flex items-center gap-3 p-4">
                        <ListOrdered size={22} aria-hidden style={{ color: 'var(--a-destaque)' }} />
                        <span className="min-w-0 flex-1">
                            <span className="block text-[17px] font-semibold">Rotina do culto</span>
                            <span className="block truncate text-[15px] a-suave">{momentos.map((m) => m.momento).join(' · ')}</span>
                        </span>
                        <ChevronRight size={20} aria-hidden />
                    </Link>
                )}

                {dados.minhas.map((m) => (
                    <CartaoProximaEscala key={m.id} titulo="A sua parte" compacto
                        escala={{ ...m, evento, departamento: { id: departamento.id, nome: departamento.nome } }} />
                ))}

                <div className={`grid gap-4 ${departamento.eLouvor ? 'md:grid-cols-2' : ''}`}>
                    {departamento.eLouvor && <MusicasEscala dados={dados} />}
                    <ParticipantesEscala dados={dados} />
                </div>


            </main>
        </div>
    )
}
