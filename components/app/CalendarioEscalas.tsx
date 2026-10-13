'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Music2, ThumbsUp, Users } from 'lucide-react'

type Culto = {
    id: number; nome: string; data: string
    pessoas: { nome: string; avatar: string | null }[]
    confirmados: number; musicas: number; euEstou: boolean
}

const DIAS_SEMANA = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

function mesmodia(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function diasDoMes(ano: number, mes: number) {
    const primeiro = new Date(ano, mes, 1)
    const inicio = primeiro.getDay()
    const total = new Date(ano, mes + 1, 0).getDate()
    const dias: (number | null)[] = Array(inicio).fill(null)
    for (let d = 1; d <= total; d++) dias.push(d)
    while (dias.length % 7 !== 0) dias.push(null)
    return dias
}

export default function CalendarioEscalas({ cultos, deptoId, eLouvor }: {
    cultos: Culto[]; deptoId: number; eLouvor: boolean
}) {
    const hoje = new Date()
    const [ano, setAno] = useState(hoje.getFullYear())
    const [mes, setMes] = useState(hoje.getMonth())
    const [diaSel, setDiaSel] = useState<number | null>(hoje.getDate())

    const cultoPorDia = new Map<string, Culto[]>()
    for (const c of cultos) {
        const d = new Date(c.data)
        const chave = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
        const arr = cultoPorDia.get(chave) ?? []
        arr.push(c)
        cultoPorDia.set(chave, arr)
    }

    function mudarMes(delta: number) {
        let m = mes + delta, a = ano
        if (m < 0) { m = 11; a-- }
        if (m > 11) { m = 0; a++ }
        setAno(a); setMes(m); setDiaSel(null)
    }

    const dias = diasDoMes(ano, mes)
    const chaveHoje = `${hoje.getFullYear()}-${hoje.getMonth()}-${hoje.getDate()}`
    const chaveSel = diaSel ? `${ano}-${mes}-${diaSel}` : null
    const cultosDoDia = chaveSel ? cultoPorDia.get(chaveSel) ?? [] : []

    return (
        <div className="space-y-4">
            <div className="a-card p-4 space-y-3">
                {/* Cabeçalho do mês */}
                <div className="flex items-center justify-between">
                    <button type="button" onClick={() => mudarMes(-1)} className="a-foco flex h-10 w-10 items-center justify-center rounded-full" aria-label="Mês anterior">
                        <ChevronLeft size={20} />
                    </button>
                    <h2 className="text-[17px] font-bold capitalize">{MESES[mes]} de {ano}</h2>
                    <button type="button" onClick={() => mudarMes(1)} className="a-foco flex h-10 w-10 items-center justify-center rounded-full" aria-label="Mês seguinte">
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Dias da semana */}
                <div className="grid grid-cols-7 text-center text-[13px] font-semibold a-suave">
                    {DIAS_SEMANA.map((d) => <span key={d}>{d}</span>)}
                </div>

                {/* Grelha */}
                <div className="grid grid-cols-7 gap-y-1">
                    {dias.map((d, i) => {
                        if (d === null) return <span key={`v${i}`} />
                        const chave = `${ano}-${mes}-${d}`
                        const temEvento = cultoPorDia.has(chave)
                        const eHoje = chave === chaveHoje
                        const eSel = chave === chaveSel
                        const qtd = cultoPorDia.get(chave)?.length ?? 0
                        return (
                            <button key={chave} type="button"
                                onClick={() => setDiaSel(d)}
                                className="a-foco relative mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-full text-[15px] font-semibold"
                                style={eSel
                                    ? { background: 'var(--a-destaque)', color: 'var(--a-sobre-destaque)' }
                                    : eHoje
                                        ? { background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }
                                        : undefined}
                                aria-label={`${d} ${MESES[mes]}${temEvento ? `, ${qtd} culto${qtd > 1 ? 's' : ''}` : ''}`}
                                aria-current={eHoje ? 'date' : undefined}>
                                {d}
                                {temEvento && (
                                    <span className="absolute bottom-0.5 flex gap-0.5">
                                        {Array.from({ length: Math.min(qtd, 3) }).map((_, j) => (
                                            <span key={j} className="block h-1.5 w-1.5 rounded-full"
                                                style={{ background: eSel ? 'var(--a-sobre-destaque)' : 'var(--a-destaque)' }} />
                                        ))}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Cultos do dia selecionado */}
            {chaveSel && (
                <div className="space-y-2">
                    {diaSel && (
                        <h3 className="text-[15px] font-semibold a-suave px-1">
                            {diaSel} de {MESES[mes]}
                            {cultosDoDia.length > 0 && <span> · {cultosDoDia.length} culto{cultosDoDia.length > 1 ? 's' : ''}</span>}
                        </h3>
                    )}
                    {cultosDoDia.length === 0 ? (
                        <p className="a-card p-4 text-[15px] a-suave">Nenhum culto neste dia.</p>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {cultosDoDia.map((c) => {
                                const h = new Date(c.data).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
                                return (
                                    <Link key={c.id} href={`/escalas/culto/${c.id}?equipa=${deptoId}`} className="a-card a-foco block p-4 space-y-3">
                                        <span className="flex items-start justify-between gap-2">
                                            <span className="min-w-0">
                                                <span className="block truncate text-[18px] font-bold leading-tight">{c.nome}</span>
                                                <span className="block text-[15px] a-suave">{h}</span>
                                            </span>
                                            {c.euEstou && (
                                                <span className="shrink-0 rounded-full px-2.5 py-1 text-[13px] font-semibold"
                                                    style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }}>
                                                    Estou nesta
                                                </span>
                                            )}
                                        </span>
                                        <span className="flex items-center gap-4 border-t pt-3 text-[15px] a-suave" style={{ borderColor: 'var(--a-borda)' }}>
                                            <span className="inline-flex items-center gap-1.5"><Users size={17} aria-hidden /> {c.pessoas.length}</span>
                                            <span className="inline-flex items-center gap-1.5"><ThumbsUp size={17} aria-hidden /> {c.confirmados}</span>
                                            {eLouvor && <span className="inline-flex items-center gap-1.5"><Music2 size={17} aria-hidden /> {c.musicas}</span>}
                                        </span>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
