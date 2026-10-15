// Ler o esboço de uma pregação (publicado, ou de quem o pode alterar).
// As notas privadas nunca aparecem aqui.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Edit3, EyeOff } from 'lucide-react'
import { getSessionData } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { formatarReferencia, podeEditarSermao, podeLerSermao } from '@/lib/pregacoes'
import { quandoPorExtenso, responsavel } from '@/lib/rotina-culto'

export const dynamic = 'force-dynamic'

export default async function LerEsbocoPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const sessao = await getSessionData()
    if (!sessao) redirect(`/membros/login?volta=/pregacao/sermao/${id}`)
    const s = await getTenantClient(sessao.tenantId).sermao.findUnique({
        where: { id },
        select: {
            id: true, titulo: true, texto_corpo: true, referencias_biblicas: true, tags: true, publicado: true,
            data_pregacao: true, pregador_id: true,
            pregador: { select: { id: true, first_name: true, last_name: true, church_role: true, gender: true } },
            evento: { select: { id: true, nome: true, data: true } },
        },
    })
    if (!s || !(await podeLerSermao(sessao, s))) redirect('/pregacao/historico')
    const podeEditar = await podeEditarSermao(sessao, s)
    const refs = Array.isArray(s.referencias_biblicas) ? (s.referencias_biblicas as Parameters<typeof formatarReferencia>[0][]).map(formatarReferencia).filter(Boolean) : []
    const tags = Array.isArray(s.tags) ? (s.tags as string[]) : []
    const quem = responsavel({ momento: '', membro_id: s.pregador.id }, new Map([[s.pregador.id, s.pregador]]))

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-2xl px-4 pt-20 pb-28 md:pt-8 space-y-5">
                <Link href={s.evento ? `/pregacao/culto/${s.evento.id}` : '/pregacao/historico'}
                    className="a-foco inline-flex min-h-[44px] items-center gap-2 text-[16px] font-semibold no-print" style={{ color: 'var(--a-destaque)' }}>
                    <ArrowLeft size={20} aria-hidden /> {s.evento ? 'Rotina do culto' : 'Pregações'}
                </Link>
                <article className="space-y-4">
                    <div className="space-y-1">
                        <p className="text-[15px] font-semibold a-suave">
                            {s.evento ? `${s.evento.nome} · ` : ''}{quandoPorExtenso((s.evento?.data ?? s.data_pregacao).toISOString())}
                        </p>
                        <h1 className="text-[26px] font-bold leading-tight">{s.titulo}</h1>
                        <p className="text-[17px]">{quem}</p>
                        {refs.length > 0 && <p className="text-[17px] font-semibold" style={{ color: 'var(--a-destaque)' }}>{refs.join(' · ')}</p>}
                    </div>
                    {!s.publicado && (
                        <p className="flex items-center gap-2 rounded-[12px] p-3 text-[15px] font-semibold" style={{ background: 'var(--a-aviso-suave)', color: 'var(--a-aviso)' }}>
                            <EyeOff size={18} aria-hidden /> Ainda não publicado: só quem prega e quem gere as pregações o veem.
                        </p>
                    )}
                    {s.texto_corpo
                        ? <div className="a-card whitespace-pre-wrap p-5 text-[17px] leading-relaxed">{s.texto_corpo}</div>
                        : <p className="a-card p-5 text-[16px] a-suave">O esboço ainda está em branco.</p>}
                    {tags.length > 0 && (
                        <p className="flex flex-wrap gap-2">
                            {tags.map((t) => <span key={t} className="rounded-full px-3 py-1 text-[14px] font-semibold" style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }}>{t}</span>)}
                        </p>
                    )}
                </article>
                {podeEditar && (
                    <Link href={`/pregacao/editor/${s.id}`} className="a-botao a-botao-principal w-full no-print">
                        <Edit3 size={18} aria-hidden /> Alterar o esboço
                    </Link>
                )}
            </main>
        </div>
    )
}
