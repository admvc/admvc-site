// /inscricoes/<slug>/editar — mudar o evento (texto, datas, preço, estado, aspeto…).
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getSessionData } from '@/lib/auth-utils'
import { podeGerirEvento, organizadoresPossiveis } from '@/lib/inscricoes-acesso'
import { lerCampos } from '@/lib/inscricoes'
import { paraFormulario, camposParaLinhas } from '@/lib/inscricoes-form'
import FormEvento from '../../FormEvento'
import { ArrowLeft } from 'lucide-react'

export default async function EditarEventoPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const sessao = await getSessionData()
    if (!sessao) redirect(`/membros/login?volta=/inscricoes/${slug}/editar`)
    const e = await prisma.eventoInscricao.findUnique({ where: { tenant_id_slug: { tenant_id: sessao.tenantId, slug } } })
    if (!e || !(await podeGerirEvento(sessao, e))) notFound()

    const organizadores = await organizadoresPossiveis(sessao)
    const atual = e.grupo_id ? `grupo:${e.grupo_id}` : e.departamento_id ? `departamento:${e.departamento_id}` : ''
    // O organizador atual aparece sempre (mesmo que esta pessoa só o gira por ser líder dele)
    if (atual && !organizadores.some(o => o.valor === atual)) {
        const nome = e.grupo_id
            ? `Grupo · ${(await prisma.grupo.findUnique({ where: { id: e.grupo_id }, select: { nome: true } }))?.nome ?? '?'}`
            : (await prisma.departamento.findUnique({ where: { id: e.departamento_id! }, select: { nome: true } }))?.nome ?? '?'
        organizadores.unshift({ valor: atual, nome })
    }
    const inicio = paraFormulario(e.inicio)
    const ate = paraFormulario(e.inscricoes_ate)
    const divulgar = paraFormulario(e.divulgar_em)

    return (
        <main className="app-novo max-w-2xl mx-auto px-4 pt-20 md:pt-8 pb-24 space-y-5">
            <Link href={`/inscricoes/${e.slug}`} className="inline-flex items-center gap-1 text-[15px] a-suave"><ArrowLeft size={16} aria-hidden /> {e.titulo}</Link>
            <h1 className="text-[28px] font-bold">Editar evento</h1>
            <FormEvento id={e.id} slug={e.slug} organizadores={organizadores} valores={{
                titulo: e.titulo, subtitulo: e.subtitulo ?? '', descricao: e.descricao ?? '', local: e.local ?? '',
                data: inicio.data, hora: inicio.hora, ate_data: ate.data, ate_hora: ate.hora,
                preco: e.preco_eur != null ? String(e.preco_eur).replace('.', ',') : '', pagamento: e.pagamento ?? '',
                precisa_confirmacao: e.precisa_confirmacao, aberto_visitantes: e.aberto_visitantes,
                campos: camposParaLinhas(lerCampos(e.campos)), cor_principal: e.cor_principal, cor_fundo: e.cor_fundo,
                estado: e.estado, organizador: atual, imagem_url: e.imagem_url,
                convite_visivel: e.convite_visivel, divulgar_data: divulgar.data, divulgar_hora: divulgar.hora, mostrar_preco: e.mostrar_preco,
            }} />
        </main>
    )
}
