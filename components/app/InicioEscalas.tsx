// Ecra inicial no telemovel: as minhas escalas e, para lideres, a equipa.
import { CalendarHeart } from 'lucide-react'
import type { SessionData } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { cultosDaEquipa, equipasQueGiro, minhasEscalas, minhasIndisponibilidades } from '@/lib/escalas-app'
import CartaoProximaEscala from './CartaoProximaEscala'
import Indisponibilidades from './Indisponibilidades'
import MinhaEquipa from './MinhaEquipa'
import { diaPorExtenso, hora } from './datas'

export default async function InicioEscalas({ sessao, primeiroNome }: { sessao: SessionData; primeiroNome: string }) {
    const db = getTenantClient(sessao.tenantId)
    const [escalas, indisponiveis, equipas, proximoCulto] = await Promise.all([
        minhasEscalas(sessao),
        minhasIndisponibilidades(sessao),
        equipasQueGiro(sessao),
        db.evento.findFirst({ where: { data: { gte: new Date() } }, orderBy: { data: 'asc' }, select: { nome: true, data: true } }),
    ])
    const cultosPorEquipa = await Promise.all(equipas.map((e) => cultosDaEquipa(sessao, e.id)))
    const [proxima, ...seguintes] = escalas

    return (
        <div className="space-y-6">
            <h1 className="text-[24px] font-bold leading-tight">Olá, {primeiroNome}</h1>

            {proxima ? (
                <CartaoProximaEscala escala={proxima} />
            ) : (
                <section className="a-card p-5 space-y-2">
                    <p className="flex items-center gap-2 text-[18px] font-semibold"><CalendarHeart size={22} aria-hidden /> Não tem escalas marcadas</p>
                    {proximoCulto && (
                        <p className="text-[16px] a-suave">
                            Próximo culto: {proximoCulto.nome}, {diaPorExtenso(proximoCulto.data.toISOString()).toLowerCase()}, às {hora(proximoCulto.data.toISOString())}.
                        </p>
                    )}
                </section>
            )}

            {seguintes.length > 0 && (
                <section className="space-y-3" aria-label="Próximas escalas">
                    <h2 className="text-[19px] font-bold">Depois</h2>
                    {seguintes.slice(0, 4).map((e) => (
                        <CartaoProximaEscala key={e.id} escala={e} titulo={diaPorExtenso(e.evento.data)} compacto />
                    ))}
                </section>
            )}

            {equipas.map((eq, i) => (
                <MinhaEquipa key={eq.id} equipa={eq} cultos={cultosPorEquipa[i]} />
            ))}

            <Indisponibilidades lista={indisponiveis} />
        </div>
    )
}
