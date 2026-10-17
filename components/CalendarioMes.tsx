// Calendário mês a mês (sem JavaScript: cada dia é um link). Pontos de cor em cada dia com eventos;
// o dia escolhido mostra a lista por baixo (quem usa decide o que mostrar).
// Variante "app" (app dos membros, cores --a-*) ou "admin" (administração).
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { mesVizinho, nomeDoMes, semanasDoMes } from '@/lib/agenda'

export type ItemCalendario = { chave: string; dia: string; titulo: string; cor: string }

const DIAS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

export default function CalendarioMes({ mes, itens, diaEscolhido, hoje, href, variante = 'app' }: {
    mes: string
    itens: ItemCalendario[]
    diaEscolhido?: string | null
    hoje: string
    /** endereço para outro mês / dia (mantém os outros filtros) */
    href: (q: { mes: string; dia?: string }) => string
    variante?: 'app' | 'admin'
}) {
    const porDia = new Map<string, ItemCalendario[]>()
    for (const i of itens) porDia.set(i.dia, [...(porDia.get(i.dia) ?? []), i])
    const app = variante === 'app'
    const cartao = app ? 'a-card' : 'rounded-2xl border border-soft bg-bg2'
    const suave = app ? 'a-suave' : 'text-muted'

    return (
        <section className={`${cartao} p-3`} aria-label={`Calendário de ${nomeDoMes(mes)}`}>
            <div className="mb-2 flex items-center justify-between">
                <Link href={href({ mes: mesVizinho(mes, -1) })} className="a-foco flex h-10 w-10 items-center justify-center rounded-full" aria-label="Mês anterior"><ChevronLeft size={20} aria-hidden /></Link>
                <h2 className="text-[17px] font-bold first-letter:uppercase">{nomeDoMes(mes)}</h2>
                <Link href={href({ mes: mesVizinho(mes, 1) })} className="a-foco flex h-10 w-10 items-center justify-center rounded-full" aria-label="Mês seguinte"><ChevronRight size={20} aria-hidden /></Link>
            </div>
            <div className={`grid grid-cols-7 text-center text-[13px] font-semibold ${suave}`} aria-hidden>
                {DIAS.map((d, i) => <span key={i} className="py-1">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {semanasDoMes(mes).flat().map((dia, i) => {
                    if (!dia) return <span key={`v${i}`} />
                    const doDia = porDia.get(dia) ?? []
                    const escolhido = dia === diaEscolhido
                    const eHoje = dia === hoje
                    return (
                        <Link key={dia} href={href({ mes, dia })} aria-current={escolhido ? 'date' : undefined}
                            aria-label={`${Number(dia.slice(8))}${doDia.length ? `, ${doDia.length} ${doDia.length === 1 ? 'evento' : 'eventos'}` : ''}`}
                            className={`a-foco flex min-h-[48px] flex-col items-center justify-start rounded-xl pt-1.5 text-[15px] ${eHoje ? 'font-bold' : ''}`}
                            style={escolhido
                                ? (app ? { background: 'var(--a-destaque)', color: 'var(--a-sobre-destaque)' } : { background: '#3f6b4f', color: '#fff' })
                                : eHoje ? (app ? { boxShadow: 'inset 0 0 0 2px var(--a-destaque)' } : { boxShadow: 'inset 0 0 0 2px #3f6b4f' }) : undefined}>
                            {Number(dia.slice(8))}
                            {doDia.length > 0 && (
                                <span className="mt-1 flex gap-0.5" aria-hidden>
                                    {doDia.slice(0, 3).map((x) => <span key={x.chave} className="h-1.5 w-1.5 rounded-full" style={{ background: escolhido ? 'currentColor' : x.cor }} />)}
                                </span>
                            )}
                        </Link>
                    )
                })}
            </div>
        </section>
    )
}
