// A rotina de um culto, para ler: hora prevista, momento, responsável e nota.
import { horasPrevistas, minutosPorExtenso, responsavel, type ItemRotina, type MembroRotina } from '@/lib/rotina-culto'

export default function RotinaLista({ inicio, itens, membros, compacta = false }: {
    inicio?: string // hora do culto (sem ela, não se mostram horas: modelos)
    itens: ItemRotina[]
    membros: MembroRotina[]
    compacta?: boolean
}) {
    const mapa = new Map(membros.map((m) => [m.id, m]))
    const horas = inicio ? horasPrevistas(inicio, itens) : []
    const algumaHora = horas.some((h, i) => h && (i > 0 || itens[0]?.duracao))

    return (
        <ol className={compacta ? 'space-y-2' : 'space-y-3'}>
            {itens.map((it, i) => {
                const quem = responsavel(it, mapa)
                return (
                    <li key={i} className={compacta ? 'flex gap-3' : 'a-card flex gap-3 p-4'}>
                        {algumaHora && (
                            <span className={`shrink-0 tabular-nums font-bold ${compacta ? 'w-12 text-[15px]' : 'w-14 text-[17px]'}`}
                                style={{ color: 'var(--a-destaque)' }}>
                                {horas[i] ?? ''}
                            </span>
                        )}
                        <span className="min-w-0 flex-1">
                            <span className={`block font-semibold leading-snug ${compacta ? 'text-[15px]' : 'text-[18px]'}`}>
                                {it.momento}
                                {it.duracao ? <span className="font-normal a-suave"> · {minutosPorExtenso(it.duracao)}</span> : null}
                            </span>
                            {quem && <span className={`block ${compacta ? 'text-[15px]' : 'text-[16px]'}`}>{quem}</span>}
                            {(it.nota || it.texto) && (
                                <span className={`block italic a-suave ${compacta ? 'text-[14px]' : 'text-[15px]'}`}>
                                    {[it.nota, it.texto].filter(Boolean).join(' · ')}
                                </span>
                            )}
                        </span>
                    </li>
                )
            })}
        </ol>
    )
}
