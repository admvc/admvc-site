// /inscricoes/<slug> — gestão das inscrições de um evento (líderes do grupo/departamento e admins).
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getSessionData } from '@/lib/auth-utils'
import { podeGerirEvento } from '@/lib/inscricoes-acesso'
import { dataDoEvento, mensagemWhatsApp, linkWhatsApp, lerCampos } from '@/lib/inscricoes'
import LinhaInscricao from './LinhaInscricao'
import CopiarLink from './CopiarLink'
import { ArrowLeft, Download, ExternalLink, Search } from 'lucide-react'

const FILTROS = [
    { chave: 'todas', texto: 'Todas' },
    { chave: 'pendentes', texto: 'Por confirmar' },
    { chave: 'confirmadas', texto: 'Confirmadas' },
    { chave: 'porpagar', texto: 'Por pagar' },
    { chave: 'canceladas', texto: 'Canceladas' },
] as const

export default async function GestaoInscricoesPage({ params, searchParams }: {
    params: Promise<{ slug: string }>
    searchParams: Promise<{ f?: string; q?: string }>
}) {
    const { slug } = await params
    const { f = 'todas', q = '' } = await searchParams
    const sessao = await getSessionData()
    if (!sessao) redirect(`/membros/login?volta=/inscricoes/${slug}`)

    const evento = await prisma.eventoInscricao.findUnique({ where: { tenant_id_slug: { tenant_id: sessao.tenantId, slug } } })
    if (!evento || !(await podeGerirEvento(sessao, evento))) notFound()

    const todas = await prisma.inscricao.findMany({
        where: { evento_inscricao_id: evento.id },
        orderBy: { criado_em: 'asc' },
        include: { membro: { select: { first_name: true, last_name: true } } },
    })
    const ativas = todas.filter(i => i.estado !== 'CANCELADA')
    const cont = {
        inscritas: ativas.length,
        confirmadas: ativas.filter(i => i.estado === 'CONFIRMADA').length,
        pagas: ativas.filter(i => i.pago).length,
        membros: ativas.filter(i => i.membro_id).length,
    }

    const termo = q.trim().toLowerCase()
    const lista = todas
        .filter(i =>
            f === 'pendentes' ? i.estado === 'PENDENTE' :
            f === 'confirmadas' ? i.estado === 'CONFIRMADA' :
            f === 'porpagar' ? i.estado !== 'CANCELADA' && !i.pago :
            f === 'canceladas' ? i.estado === 'CANCELADA' :
            i.estado !== 'CANCELADA')
        .filter(i => !termo || i.nome.toLowerCase().includes(termo) || i.codigo.toLowerCase().includes(termo) || i.telefone.replace(/\D/g, '').includes(termo.replace(/\D/g, '') || '§'))

    const { dia, hora } = dataDoEvento(evento.inicio)
    const campos = lerCampos(evento.campos)
    const cobra = !!evento.preco_eur && evento.preco_eur > 0
    const link = (mudar: { f?: string }) => {
        const p = new URLSearchParams()
        const nf = mudar.f ?? f
        if (nf !== 'todas') p.set('f', nf)
        if (q) p.set('q', q)
        return `?${p.toString()}`
    }

    return (
        <main className="app-novo max-w-3xl mx-auto px-4 pt-20 md:pt-8 pb-24 space-y-5">
            <Link href="/inscricoes" className="inline-flex items-center gap-1 text-[15px] a-suave"><ArrowLeft size={16} aria-hidden /> Inscrições</Link>

            <header className="space-y-1">
                <h1 className="text-[28px] font-bold leading-tight" style={{ color: evento.cor_principal }}>{evento.titulo}</h1>
                <p className="text-[16px] a-suave first-letter:uppercase">{dia} · {hora}{evento.local ? ` · ${evento.local}` : ''}</p>
                {evento.estado !== 'ABERTO' && (
                    <p className="inline-block rounded-lg bg-amber-100 text-amber-900 px-2 py-1 text-[14px] font-semibold">
                        {evento.estado === 'RASCUNHO' ? 'Rascunho: a página ainda não aceita inscrições' : 'Inscrições fechadas'}
                    </p>
                )}
            </header>

            <section className="grid grid-cols-2 sm:grid-cols-4 gap-2" aria-label="Resumo">
                {[['Inscritas', cont.inscritas], ['Confirmadas', cont.confirmadas], ...(cobra ? [['Pagas', cont.pagas]] : []), ['Membros', cont.membros]].map(([t, n]) => (
                    <div key={t as string} className="a-card p-3 text-center">
                        <p className="text-[26px] font-bold leading-none">{n as number}</p>
                        <p className="text-[14px] a-suave mt-1">{t as string}</p>
                    </div>
                ))}
            </section>

            <section className="flex flex-wrap gap-2">
                <a href={`/i/${evento.slug}`} target="_blank" rel="noopener noreferrer" className="a-botao a-botao-secundario !min-h-[44px] !text-[15px]">
                    <ExternalLink size={16} aria-hidden /> Página de inscrição
                </a>
                <CopiarLink caminho={`/i/${evento.slug}`} />
                <a href={`/inscricoes/${evento.slug}/csv`} className="a-botao a-botao-secundario !min-h-[44px] !text-[15px]">
                    <Download size={16} aria-hidden /> Exportar (Excel)
                </a>
            </section>

            <form method="get" className="flex items-center gap-2 a-card px-3">
                <Search size={16} className="a-suave shrink-0" aria-hidden />
                {f !== 'todas' && <input type="hidden" name="f" value={f} />}
                <input name="q" defaultValue={q} placeholder="Procurar nome, telefone ou código" aria-label="Procurar inscrição"
                    className="flex-1 bg-transparent py-3 text-[16px] outline-none min-w-0" />
            </form>

            <nav aria-label="Filtro" className="flex flex-wrap gap-2">
                {FILTROS.filter(x => cobra || x.chave !== 'porpagar').map(x => (
                    <Link key={x.chave} href={link({ f: x.chave })} aria-current={f === x.chave ? 'page' : undefined}
                        className="rounded-full border px-3 py-1.5 text-[14px] font-semibold"
                        style={f === x.chave ? { background: evento.cor_principal, color: '#fff', borderColor: evento.cor_principal } : { borderColor: 'var(--a-borda)' }}>
                        {x.texto}
                    </Link>
                ))}
            </nav>

            {lista.length === 0 ? (
                <p className="a-card p-5 text-[16px] text-center">Nenhuma inscrição {f !== 'todas' || q ? 'com este filtro' : 'ainda'}.</p>
            ) : (
                <ul className="space-y-2">
                    {lista.map(i => (
                        <LinhaInscricao key={i.id}
                            inscricao={{
                                id: i.id, nome: i.nome, telefone: i.telefone, email: i.email, codigo: i.codigo, estado: i.estado,
                                pago: i.pago, quer_contacto: i.quer_contacto, criado_em: i.criado_em.toISOString(),
                                membro: i.membro ? `${i.membro.first_name} ${i.membro.last_name}`.trim() : null,
                                faltam: campos.filter(c => !(i.respostas as Record<string, boolean> | null)?.[c.id]).map(c => c.rotulo),
                            }}
                            cobra={cobra}
                            cor={evento.cor_principal}
                            whatsapp={linkWhatsApp(i.telefone, mensagemWhatsApp(i, evento))}
                        />
                    ))}
                </ul>
            )}
        </main>
    )
}
