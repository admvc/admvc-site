// Ecra inicial (telemovel e computador, como o LouveApp): termos por assinar,
// os meus ministerios, as minhas escalas (a proxima com os botoes grandes), as
// meus grupos, as datas em que nao posso; a semana e os aniversariantes ao lado
// (computador) ou logo a seguir a proxima escala (telemovel).
import InscricoesAbertas from '@/components/app/InscricoesAbertas'
import Link from 'next/link'
import { CalendarHeart, FileSignature, Music2, Users } from 'lucide-react'
import type { SessionData } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { minhasEscalas, minhasIndisponibilidades } from '@/lib/escalas-app'
import { meusMinisterios } from '@/lib/ministerios-app'
import { aniversariantesDoMes, cultosDaSemana, meusGrupos, termosPorAssinar } from '@/lib/inicio-app'
import Aniversariantes from './Aniversariantes'
import MeusGrupos from './MeusGrupos'
import AtivarNotificacoes from './AtivarNotificacoes'
import EstaSemana from './EstaSemana'
import CartaoProximaEscala from './CartaoProximaEscala'
import Indisponibilidades from './Indisponibilidades'
import { diaPorExtenso, hora } from './datas'

export default async function InicioEscalas({ sessao, primeiroNome }: { sessao: SessionData; primeiroNome: string }) {
    const db = getTenantClient(sessao.tenantId)
    const [escalas, indisponiveis, ministerios, proximoCulto, termos, aniversariantes, semana, grupos] = await Promise.all([
        minhasEscalas(sessao),
        minhasIndisponibilidades(sessao),
        meusMinisterios(sessao),
        db.evento.findFirst({ where: { data: { gte: new Date() } }, orderBy: { data: 'asc' }, select: { nome: true, data: true } }),
        termosPorAssinar(sessao),
        aniversariantesDoMes(sessao),
        cultosDaSemana(sessao),
        meusGrupos(sessao),
    ])
    const [proxima, ...seguintes] = escalas
    // Quem nao serve em nenhum ministerio nao precisa dos cartoes de escalas
    const sirvo = ministerios.length > 0 || escalas.length > 0
    const linkEscala = (e: (typeof escalas)[number]) => `/escalas/culto/${e.evento.id}?equipa=${e.departamento.id}`

    return (
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_340px] md:items-start">
        <div className="min-w-0 space-y-6">
            <h1 className="text-[24px] font-bold leading-tight">Olá, {primeiroNome}</h1>

            {termos && (
                <section className="a-card flex flex-wrap items-center gap-3 p-4" style={{ borderColor: 'var(--a-aviso)', background: 'var(--a-aviso-suave)' }}>
                    <FileSignature size={24} style={{ color: 'var(--a-aviso)' }} aria-hidden />
                    <p className="min-w-0 flex-1 text-[16px]"><strong>Falta aceitar os termos</strong> de proteção de dados.</p>
                    <Link href="/membros/termos" className="a-botao a-botao-principal !min-h-[44px]">Ler e aceitar</Link>
                </section>
            )}

            <InscricoesAbertas sessao={sessao} />

            <AtivarNotificacoes />

            {ministerios.length > 0 && (
                <section className="space-y-2" aria-labelledby="ministerios">
                    <h2 id="ministerios" className="text-[19px] font-bold">Os meus ministérios</h2>
                    <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide">
                        {ministerios.map((m) => (
                            <li key={m.id} className="shrink-0">
                                <Link href={`/escalas?equipa=${m.id}`} className="a-card a-foco flex w-[250px] items-center gap-3 p-3">
                                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[12px]"
                                        style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }} aria-hidden>
                                        {m.foto ? <img src={m.foto} alt="" className="h-full w-full object-cover" /> : m.eLouvor ? <Music2 size={22} /> : <Users size={22} />}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block truncate text-[16px] font-bold">{m.nome}</span>
                                        <span className="block text-[14px] a-suave">
                                            {m.minhas} {m.minhas === 1 ? 'escala minha' : 'escalas minhas'}
                                        </span>
                                        <span className="block text-[14px] a-suave">
                                            {m.pessoas} pessoas{m.eLouvor ? ` · ${m.musicas} músicas` : ''}
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {proxima ? (
                <CartaoProximaEscala escala={proxima} href={linkEscala(proxima)} />
            ) : sirvo && (
                <section className="a-card p-5 space-y-2">
                    <p className="flex items-center gap-2 text-[18px] font-semibold"><CalendarHeart size={22} aria-hidden /> Não tem escalas marcadas</p>
                    {proximoCulto && (
                        <p className="text-[16px] a-suave">
                            Próximo culto: {proximoCulto.nome}, {diaPorExtenso(proximoCulto.data.toISOString()).toLowerCase()}, às {hora(proximoCulto.data.toISOString())}.
                        </p>
                    )}
                </section>
            )}

            {/* Telemovel: a semana e os aniversarios logo a seguir a proxima escala */}
            <div className="space-y-6 md:hidden">
                <EstaSemana cultos={semana} />
                <Aniversariantes lista={aniversariantes} />
            </div>

            {seguintes.length > 0 && (
                <section className="space-y-3" aria-label="Próximas escalas">
                    <h2 className="text-[19px] font-bold">Depois</h2>
                    {seguintes.slice(0, 4).map((e) => (
                        <CartaoProximaEscala key={e.id} escala={e} titulo={diaPorExtenso(e.evento.data)} compacto href={linkEscala(e)} />
                    ))}
                </section>
            )}

            <MeusGrupos grupos={grupos} />

            {sirvo && <Indisponibilidades lista={indisponiveis} />}
        </div>

        <aside className="hidden space-y-6 md:block">
            <EstaSemana cultos={semana} />
            <Aniversariantes lista={aniversariantes} />
        </aside>
        </div>
    )
}
