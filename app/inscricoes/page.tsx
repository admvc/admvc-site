// /inscricoes — os eventos com inscrição que esta pessoa organiza.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionData } from '@/lib/auth-utils'
import { eventosQueGere, organizadoresPossiveis } from '@/lib/inscricoes-acesso'
import { dataDoEvento } from '@/lib/inscricoes'
import { ClipboardList, ChevronRight, Plus } from 'lucide-react'

const ESTADO: Record<string, string> = { RASCUNHO: 'Rascunho', ABERTO: 'Inscrições abertas', FECHADO: 'Fechado' }

export default async function InscricoesPage() {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login?volta=/inscricoes')
    const [eventos, organizadores] = await Promise.all([eventosQueGere(sessao), organizadoresPossiveis(sessao)])

    return (
        <main className="app-novo max-w-2xl mx-auto px-4 pt-20 md:pt-8 pb-24 space-y-5">
            <header className="space-y-1">
                <h1 className="text-[28px] font-bold flex items-center gap-2"><ClipboardList size={26} aria-hidden /> Inscrições</h1>
                <p className="text-[16px] a-suave">Os eventos que organiza: quem se inscreveu, confirmar e marcar pagamentos.</p>
            </header>
            {organizadores.length > 0 && (
                <Link href="/inscricoes/novo" className="a-botao a-botao-principal w-full !min-h-[52px]"><Plus size={18} aria-hidden /> Novo evento com inscrição</Link>
            )}
            {eventos.length === 0 ? (
                <p className="a-card p-5 text-[16px]">Ainda não organiza nenhum evento com inscrição.</p>
            ) : (
                <ul className="space-y-3">
                    {eventos.map(e => {
                        const { dia, hora } = dataDoEvento(e.inicio)
                        return (
                            <li key={e.id}>
                                <Link href={`/inscricoes/${e.slug}`} className="a-card flex items-center gap-3 p-4 hover:opacity-90">
                                    <span className="w-2 self-stretch rounded-full" style={{ background: e.cor_principal }} aria-hidden />
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-[18px] font-semibold truncate">{e.titulo}</span>
                                        <span className="block text-[15px] a-suave first-letter:uppercase">{dia} · {hora}</span>
                                        <span className="block text-[14px] a-suave">{ESTADO[e.estado] ?? e.estado} · {e._count.inscricoes} inscrição(ões)</span>
                                    </span>
                                    <ChevronRight size={20} aria-hidden />
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            )}
        </main>
    )
}
