// components/obra/IgrejaTijolos.tsx
// A igreja feita de tijolos: cada tijolo assentado pinta uma célula, de baixo
// para cima; o último respira. Contorno em currentColor (serve no claro e no escuro).

import { celulasCheias, desenhoIgreja } from '@/lib/obra-tijolos'

const TIJOLO = '#C1663A'
const TIJOLO_ESCURO = '#9E4F2B'

export default function IgrejaTijolos({ colocados, total, className }: { colocados: number; total: number; className?: string }) {
    const { celulas, silhueta, porta, cume } = desenhoIgreja(total)
    const cheias = celulasCheias(colocados, total, celulas.length)
    // Os tijolos da ponta passam meio fora das paredes: recortam-se pela silhueta.
    // O id só depende da forma (igual para o mesmo total), por isso repetir não faz mal.
    const recorte = `igreja-recorte-${total}`

    return (
        <svg viewBox="0 0 200 196" role="img" aria-label={`${colocados} de ${total} tijolos assentados`} className={className}>
            <defs><clipPath id={recorte}><path d={silhueta} /></clipPath></defs>
            <g clipPath={`url(#${recorte})`}>
            {celulas.map(([x, y, w, h], i) => {
                const pintado = i < cheias
                return (
                    <rect key={i} x={x} y={y} width={w} height={h} rx={1}
                        fill={pintado ? TIJOLO : 'currentColor'} fillOpacity={pintado ? 1 : 0.05}
                        stroke={pintado ? TIJOLO_ESCURO : TIJOLO} strokeWidth={0.7} strokeOpacity={pintado ? 0.9 : 0.3}>
                        {pintado && i === cheias - 1 && (
                            <animate attributeName="opacity" values="1;.5;1" dur="2.6s" repeatCount="indefinite" />
                        )}
                    </rect>
                )
            })}
            </g>
            <path d={silhueta} fill="none" stroke="currentColor" strokeWidth={3} strokeLinejoin="round" />
            <path d={`M100 ${cume} L100 8`} stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
            <path d="M92 17 L108 17" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
            <path d={porta} fill="currentColor" fillOpacity={0.08} stroke="currentColor" strokeWidth={2.6} />
        </svg>
    )
}
