// Escrever o esboço de uma pregação: quem prega, ou quem gere as pregações.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getSessionData } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { formatarReferencia, podeEditarSermao } from '@/lib/pregacoes'
import { quandoPorExtenso } from '@/lib/rotina-culto'
import EditorEsboco from '@/components/pregacao/EditorEsboco'

export const dynamic = 'force-dynamic'

export default async function EditorEsbocoPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const sessao = await getSessionData()
    if (!sessao) redirect(`/membros/login?volta=/pregacao/editor/${id}`)
    const s = await getTenantClient(sessao.tenantId).sermao.findUnique({
        where: { id },
        include: {
            pregador: { select: { first_name: true, last_name: true } },
            evento: { select: { id: true, nome: true, data: true } },
        },
    })
    if (!s) redirect('/pregacao/historico')
    if (!(await podeEditarSermao(sessao, s))) redirect(`/pregacao/sermao/${id}`)

    const refs = Array.isArray(s.referencias_biblicas) ? (s.referencias_biblicas as Parameters<typeof formatarReferencia>[0][]) : []
    const voltar = s.evento ? `/pregacao/culto/${s.evento.id}` : '/pregacao/historico'

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-2xl px-4 pt-20 pb-28 md:pt-8 space-y-5">
                <Link href={voltar} className="a-foco inline-flex min-h-[44px] items-center gap-2 text-[16px] font-semibold" style={{ color: 'var(--a-destaque)' }}>
                    <ArrowLeft size={20} aria-hidden /> {s.evento ? 'Rotina do culto' : 'Pregações'}
                </Link>
                <div className="space-y-1">
                    <p className="text-[15px] font-semibold a-suave">Esboço · {s.pregador.first_name} {s.pregador.last_name}</p>
                    <h1 className="text-[24px] font-bold leading-tight">{s.evento ? s.evento.nome : 'Pregação'}</h1>
                    <p className="text-[16px] a-suave">{quandoPorExtenso((s.evento?.data ?? s.data_pregacao).toISOString())}</p>
                </div>
                <EditorEsboco
                    id={s.id}
                    voltar={voltar}
                    inicial={{
                        titulo: s.titulo,
                        referencias: refs.map(formatarReferencia).filter(Boolean).join('; '),
                        texto_corpo: s.texto_corpo ?? '',
                        notas_privadas: s.notas_privadas ?? '',
                        tags: Array.isArray(s.tags) ? (s.tags as string[]).join(', ') : '',
                        publicado: s.publicado,
                    }}
                />
            </main>
        </div>
    )
}
