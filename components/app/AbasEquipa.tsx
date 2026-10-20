// Separadores de uma equipa: Escalas · Agenda · Pessoas (três páginas, uma só barra).
import Link from 'next/link'

export type AbaEquipa = 'escalas' | 'agenda' | 'pessoas'

export default function AbasEquipa({ deptoId, ativa, temEscala = true }: { deptoId: number; ativa: AbaEquipa; temEscala?: boolean }) {
    const abas: { id: AbaEquipa; texto: string; href: string }[] = [
        { id: 'escalas', texto: 'Escalas', href: `/escalas?equipa=${deptoId}` },
        { id: 'agenda', texto: 'Agenda', href: `/membros/gestao/equipa/${deptoId}/agenda` },
        { id: 'pessoas', texto: 'Pessoas', href: `/membros/gestao/equipa/${deptoId}` },
    ]
    const visiveis = abas.filter((a) => temEscala || a.id !== 'escalas')
    return (
        <nav aria-label="Equipa" className="flex gap-2 print:hidden">
            {visiveis.map((a) => (
                <Link key={a.id} href={a.href} aria-current={a.id === ativa ? 'page' : undefined}
                    className="a-foco flex min-h-[44px] flex-1 items-center justify-center rounded-full border text-[16px] font-semibold"
                    style={a.id === ativa
                        ? { background: 'var(--a-destaque)', borderColor: 'var(--a-destaque)', color: '#fff' }
                        : { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }}>
                    {a.texto}
                </Link>
            ))}
        </nav>
    )
}
