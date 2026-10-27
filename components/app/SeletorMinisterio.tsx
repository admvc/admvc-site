'use client'

// Escolher o ministério em /escalas: uma lista pequena ao lado do título (em vez de uma fila de botões com nomes compridos).
import { useRouter } from 'next/navigation'
import { nomeCurto } from '@/lib/nome-curto'


export default function SeletorMinisterio({ ministerios, atual, quando }: { ministerios: { id: number; nome: string }[]; atual: number; quando: string }) {
    const router = useRouter()
    return (
        <select aria-label="Ministério" value={atual} onChange={(e) => router.push(`/escalas?equipa=${e.target.value}${quando === 'anteriores' ? '&quando=anteriores' : ''}`)}
            className="a-foco min-h-[44px] max-w-[60%] truncate rounded-full border px-4 text-[16px] font-semibold"
            style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }}>
            {ministerios.map((m) => <option key={m.id} value={m.id}>{nomeCurto(m.nome)}</option>)}
        </select>
    )
}
