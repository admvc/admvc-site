// /i/<slug> — página pública de inscrição num evento (membros e visitantes, sem senha).
// Nunca mostra dados da base a quem não entrou na app; quem já entrou vê o
// formulário preenchido. Rascunhos só os vê quem gere o evento.
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import prisma from '@/lib/prisma'
import { getSessionData } from '@/lib/auth-utils'
import { lerCampos, lerDescricao, inscricoesAbertas, conviteDivulgado, motivoConviteEscondido, dataDoEvento } from '@/lib/inscricoes'
import { podeGerirEvento, igrejaPublica } from '@/lib/inscricoes-acesso'
import FormInscricao from './FormInscricao'

async function carregar(slug: string) {
    const igreja = await igrejaPublica()
    if (!igreja) return null
    return prisma.eventoInscricao.findUnique({ where: { tenant_id_slug: { tenant_id: igreja.id, slug } } })
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const e = await carregar((await params).slug)
    if (!e || e.estado === 'RASCUNHO') return { title: 'Inscrição' }
    const { dia, hora } = dataDoEvento(e.inicio)
    return {
        title: `${e.titulo} · Inscrição`,
        description: `${dia}, às ${hora}${e.local ? ` · ${e.local}` : ''}. Inscreve-te aqui.`,
        openGraph: e.imagem_url ? { images: [e.imagem_url] } : undefined,
    }
}

export default async function PaginaInscricao({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const e = await carregar(slug)
    if (!e) notFound()

    const sessao = await getSessionData()
    const gestor = await podeGerirEvento(sessao, e)
    const divulgado = conviteDivulgado(e)
    if ((e.estado === 'RASCUNHO' || !divulgado) && !gestor) notFound()
    const escondido = motivoConviteEscondido(e)

    // Quem já entrou na app: formulário preenchido (a sessão prova quem é)
    let prefill: { nome: string; telefone: string; email: string } | null = null
    if (sessao && sessao.tenantId === e.tenant_id) {
        const m = await prisma.membro.findUnique({ where: { id: sessao.membroId }, select: { first_name: true, last_name: true, phone_1: true, email: true } })
        if (m) prefill = {
            nome: `${m.first_name} ${m.last_name}`.trim(),
            telefone: m.phone_1 ?? '',
            email: m.email && !m.email.endsWith('.local') ? m.email : '',
        }
    }

    const { dia, hora } = dataDoEvento(e.inicio)
    const blocos = lerDescricao(e.descricao)
    const abertas = inscricoesAbertas(e) && divulgado
    const verPreco = e.mostrar_preco
    const cor = e.cor_principal
    const texto = '#3B2A22'

    return (
        <main style={{ background: e.cor_fundo, color: texto, minHeight: '100dvh' }} className="pb-16">
            {e.estado === 'RASCUNHO' && (
                <div className="bg-amber-400 text-black text-center text-sm font-semibold px-4 py-2">
                    Pré-visualização: as inscrições ainda não estão abertas (só a organização vê esta página).
                </div>
            )}
            {e.estado !== 'RASCUNHO' && escondido && (
                <div className="bg-amber-400 text-black text-center text-sm font-semibold px-4 py-2">
                    Pré-visualização: {escondido} Até lá, só a organização vê esta página.
                </div>
            )}
            <div className="mx-auto max-w-xl px-4 pt-10 space-y-8">
                <header className="text-center space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: cor }}>ADMVC · Inscrição</p>
                    <h1 className="font-serif text-4xl sm:text-5xl leading-tight" style={{ color: cor }}>{e.titulo}</h1>
                    {e.subtitulo && <p className="text-lg opacity-80">{e.subtitulo}</p>}
                    <div className="flex flex-wrap justify-center gap-2 pt-2 text-sm font-semibold">
                        <span className="rounded-full px-3 py-1.5" style={{ background: `${cor}1a` }}>
                            <span className="first-letter:uppercase inline-block">{dia}</span> · {hora}
                        </span>
                        {e.local && <span className="rounded-full px-3 py-1.5" style={{ background: `${cor}1a` }}>{e.local}</span>}
                        {verPreco && e.preco_eur != null && e.preco_eur > 0 && (
                            <span className="rounded-full px-3 py-1.5" style={{ background: `${cor}1a` }}>{e.preco_eur.toLocaleString('pt-PT')} €</span>
                        )}
                        {!verPreco && (
                            <span className="rounded-full px-3 py-1.5" style={{ background: `${cor}1a` }}>Preço a combinar</span>
                        )}
                    </div>
                </header>

                <section aria-label="Inscrição" className="rounded-3xl p-5 sm:p-6 shadow-sm" style={{ background: '#fffaf5', border: `1px solid ${cor}33` }}>
                    {abertas ? (
                        <FormInscricao
                            slug={e.slug}
                            cor={cor}
                            campos={lerCampos(e.campos)}
                            prefill={prefill}
                            visitantes={e.aberto_visitantes}
                            preco={verPreco ? e.preco_eur : null}
                            pagamento={verPreco ? e.pagamento : null}
                            precoACombinar={!verPreco}
                            precisaConfirmacao={e.precisa_confirmacao}
                        />
                    ) : (
                        <p className="text-center font-semibold">
                            {e.estado === 'FECHADO' || (e.inscricoes_ate && new Date(e.inscricoes_ate) < new Date())
                                ? 'As inscrições já fecharam.'
                                : 'As inscrições ainda não abriram. Volta mais tarde!'}
                        </p>
                    )}
                </section>

                {blocos.length > 0 && (
                    <article className="space-y-4 text-[17px] leading-relaxed">
                        {blocos.map((b, i) =>
                            b.tipo === 'titulo' ? <h2 key={i} className="font-serif text-2xl pt-4" style={{ color: cor }}>{b.texto}</h2>
                            : b.tipo === 'lista' ? <ul key={i} className="list-disc pl-6 space-y-1">{b.itens.map((t, j) => <li key={j}>{t}</li>)}</ul>
                            : <p key={i}>{b.texto}</p>
                        )}
                    </article>
                )}

                {e.imagem_url && (
                    <Image src={e.imagem_url} alt={`Cartaz: ${e.titulo}`} width={1016} height={663} className="w-full h-auto rounded-3xl shadow-sm" />
                )}

                <footer className="text-center text-sm opacity-70 pt-4">
                    Assembleia de Deus Ministério Visão de Conquista ·{' '}
                    <a href="/privacidade" className="underline">Privacidade</a>
                </footer>
            </div>
        </main>
    )
}
