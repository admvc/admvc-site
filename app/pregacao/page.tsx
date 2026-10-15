// Pregações: a rotina dos próximos cultos (todos veem) e os sermões.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, ChevronRight, LayoutList } from 'lucide-react'
import { getSessionData } from '@/lib/auth-utils'
import { podeGerirModelos, proximosCultos } from '@/lib/rotina-culto-dados'
import { quandoPorExtenso } from '@/lib/rotina-culto'

export const dynamic = 'force-dynamic'

export default async function PregacaoPage() {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login?volta=/pregacao')
    const [cultos, gereModelos] = await Promise.all([proximosCultos(sessao), podeGerirModelos(sessao)])
    const variasCongregacoes = new Set(cultos.map((c) => c.congregacao?.id ?? 0)).size > 1

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-2xl px-4 pt-20 pb-28 md:pt-8 space-y-5">
                <div className="space-y-1">
                    <h1 className="text-[28px] font-bold flex items-center gap-2"><BookOpen size={26} aria-hidden /> Pregações</h1>
                    <p className="text-[16px] a-suave">A rotina dos próximos cultos: a ordem dos momentos e quem fica com cada um.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {gereModelos && (
                        <Link href="/pregacao/modelos" className="a-botao a-botao-secundario"><LayoutList size={18} aria-hidden /> Modelos de rotina</Link>
                    )}
                    <Link href="/pregacao/sermoes" className="a-botao a-botao-secundario"><BookOpen size={18} aria-hidden /> Sermões</Link>
                </div>

                {cultos.length === 0 ? (
                    <p className="a-card p-5 text-[16px] a-suave">Não há cultos marcados nas próximas semanas.</p>
                ) : (
                    <ul className="space-y-3">
                        {cultos.map((c) => (
                            <li key={c.id}>
                                <Link href={`/pregacao/culto/${c.id}`} className="a-card a-foco flex items-center gap-3 p-4">
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[18px] font-semibold leading-snug">{c.nome}</span>
                                        <span className="block text-[15px] a-suave">
                                            {quandoPorExtenso(c.data)}{variasCongregacoes && c.congregacao ? ` · ${c.congregacao.nome}` : ''}
                                        </span>
                                        <span className="mt-1 inline-block rounded-full px-3 py-0.5 text-[14px] font-semibold"
                                            style={c.momentos
                                                ? { background: 'var(--a-ok-suave)', color: 'var(--a-ok)' }
                                                : { background: 'var(--a-aviso-suave)', color: 'var(--a-aviso)' }}>
                                            {c.momentos ? `Rotina pronta · ${c.momentos} momento(s)` : 'Ainda sem rotina'}
                                        </span>
                                    </span>
                                    <ChevronRight size={20} aria-hidden />
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        </div>
    )
}
