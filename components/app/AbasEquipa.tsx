// Separadores de uma equipa: Escalas · Agenda · Pessoas (três páginas, uma só barra de texto sublinhado).
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
        <nav aria-label="Equipa" className="flex border-b print:hidden" style={{ borderColor: 'var(--a-borda)' }}>
            {visiveis.map((a) => (
                <Link key={a.id} href={a.href} aria-current={a.id === ativa ? 'page' : undefined}
                    className="a-foco -mb-px flex min-h-[48px] flex-1 items-center justify-center border-b-[3px] text-[17px]"
                    style={a.id === ativa
                        ? { borderColor: 'var(--a-destaque)', color: 'var(--a-destaque)', fontWeight: 700 }
                        : { borderColor: 'transparent', color: 'var(--a-suave)', fontWeight: 600 }}>
                    {a.texto}
                </Link>
            ))}
        </nav>
    )
}
