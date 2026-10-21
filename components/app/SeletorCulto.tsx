'use client'

// "Outro culto…": os cultos para lá dos primeiros, numa lista (em vez de dezenas de botões).
import { useRouter } from 'next/navigation'

export default function SeletorCulto({ opcoes, atual }: { opcoes: { id: number; texto: string }[]; atual: number | null }) {
    const router = useRouter()
    if (opcoes.length === 0) return null
    return (
        <select aria-label="Outro culto" value={opcoes.some((o) => o.id === atual) ? atual! : ''} onChange={(e) => e.target.value && router.push(`/midia/divulgacao?evento=${e.target.value}`)}
            className="a-foco min-h-[48px] shrink-0 rounded-[14px] border px-3 text-[15px]" style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }}>
            <option value="">Outro culto…</option>
            {opcoes.map((o) => <option key={o.id} value={o.id}>{o.texto}</option>)}
        </select>
    )
}
