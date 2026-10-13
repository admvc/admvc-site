// Fotos da equipa sobrepostas (as primeiras; o resto em "+3"). Sem foto: iniciais.
import type { Pessoa } from '@/lib/ministerios-app'

export function Avatar({ pessoa, tamanho = 32 }: { pessoa: Pessoa; tamanho?: number }) {
    const iniciais = pessoa.nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
    return (
        <span className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold"
            style={{ width: tamanho, height: tamanho, fontSize: Math.round(tamanho * 0.38), background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)', border: '2px solid var(--a-card)' }}
            aria-hidden>
            {pessoa.avatar ? <img src={pessoa.avatar} alt="" className="h-full w-full object-cover" /> : iniciais}
        </span>
    )
}

export default function Avatares({ pessoas, max = 7 }: { pessoas: Pessoa[]; max?: number }) {
    if (pessoas.length === 0) return null
    const resto = pessoas.length - max
    return (
        <span className="flex items-center" aria-label={pessoas.map((p) => p.nome).join(', ')}>
            {pessoas.slice(0, max).map((p, i) => (
                <span key={i} className={i ? '-ml-2' : ''}><Avatar pessoa={p} /></span>
            ))}
            {resto > 0 && <span className="ml-1 text-[14px] font-semibold a-suave">+{resto}</span>}
        </span>
    )
}
