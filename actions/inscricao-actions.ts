'use server'

// Inscrições em eventos: a inscrição (página pública, sem senha) e a gestão.

import { after } from 'next/server'
import { headers } from 'next/headers'
import { urlDoPortal } from '@/lib/redefinir-senha'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { getSessionData } from '@/lib/auth-utils'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'
import { mesmoTelefone, telefoneValido, registarVisita } from '@/lib/visitante-registo'
import { lerCampos, novoCodigo, membroPeloTelefone, inscricoesAbertas, dataDoEvento } from '@/lib/inscricoes'
import { podeGerirEvento, igrejaPublica, gestoresDoEvento } from '@/lib/inscricoes-acesso'
import { sendPushToMembros } from '@/lib/web-push'
import { enviarEmailInscricaoConfirmada } from '@/lib/mail'

export type ResultadoInscricao =
    | { ok: true; codigo: string | null; repetida: boolean }
    | { ok: false; error: string }

/**
 * Inscrição pela página pública. Nunca mostra dados da base: o membro é
 * reconhecido em silêncio pelo telefone (ou pela sessão, se já entrou na app),
 * e a resposta é igual para membros e visitantes.
 */
export async function inscreverAction(slug: string, formData: FormData): Promise<ResultadoInscricao> {
    try {
        const ip = ipDoPedido(await headers())
        if (!(await rateLimit(`inscricao:${ip}`, 8, 60_000)).success) {
            return { ok: false, error: 'Demasiadas tentativas. Espera um minuto e tenta de novo.' }
        }

        const igreja = await igrejaPublica()
        if (!igreja) return { ok: false, error: 'Configuração não encontrada.' }
        const evento = await prisma.eventoInscricao.findUnique({ where: { tenant_id_slug: { tenant_id: igreja.id, slug } } })
        if (!evento || !inscricoesAbertas(evento)) return { ok: false, error: 'As inscrições para este evento não estão abertas.' }

        const sessao = await getSessionData()
        const daIgreja = sessao && sessao.tenantId === evento.tenant_id ? sessao : null

        const nome = String(formData.get('nome') ?? '').trim().replace(/\s+/g, ' ').slice(0, 120)
        const telefone = String(formData.get('telefone') ?? '').trim().slice(0, 30)
        const email = String(formData.get('email') ?? '').trim().toLowerCase().slice(0, 160)
        const querContacto = formData.get('quer_contacto') === 'on'

        if (nome.length < 3) return { ok: false, error: 'Escreve o teu nome completo.' }
        if (!telefoneValido(telefone)) return { ok: false, error: 'Telemóvel inválido (9 a 15 dígitos).' }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Email inválido.' }
        if (formData.get('consentimento') !== 'on') return { ok: false, error: 'Para te inscreveres, aceita a caixa de autorização.' }

        const respostas: Record<string, boolean> = {}
        for (const c of lerCampos(evento.campos)) {
            const marcado = formData.get(`campo_${c.id}`) === 'on'
            if (c.obrigatorio && !marcado) return { ok: false, error: `Falta confirmar: ${c.rotulo}` }
            respostas[c.id] = marcado
        }

        // Já inscrita com este telefone? (resposta neutra: não diz quem é)
        const existentes = await prisma.inscricao.findMany({
            where: { evento_inscricao_id: evento.id },
            select: { id: true, telefone: true, estado: true },
        })
        const repetida = existentes.find(i => mesmoTelefone(i.telefone, telefone))
        if (repetida && repetida.estado !== 'CANCELADA') return { ok: true, codigo: null, repetida: true }

        // Membro: pela sessão ou, em silêncio, pelo telefone
        let membroId: number | null = daIgreja?.membroId ?? null
        if (!membroId) {
            const membros = await prisma.membro.findMany({
                where: { tenant_id: evento.tenant_id, OR: [{ phone_1: { not: null } }, { phone_2: { not: null } }] },
                select: { id: true, phone_1: true, phone_2: true, is_active: true, password: true },
            })
            membroId = membroPeloTelefone(telefone, membros)?.id ?? null
        }
        if (!membroId && !evento.aberto_visitantes) {
            return { ok: false, error: 'Este evento é só para membros. Usa o telemóvel registado na igreja.' }
        }

        // Visitante que quer ser contactado: entra no acolhimento
        let visitanteId: number | null = null
        if (!membroId && querContacto) {
            const v = await registarVisita(prisma, { tenantId: evento.tenant_id, nome, telefone, email: email || null, origem: 'EVENTO' })
            visitanteId = v.id
        }

        const dados = {
            nome, telefone, email: email || null, respostas, membro_id: membroId, visitante_id: visitanteId,
            quer_contacto: querContacto, consentimento_em: new Date(),
            estado: evento.precisa_confirmacao ? 'PENDENTE' : 'CONFIRMADA',
        }

        let codigo = ''
        if (repetida) {
            // Estava cancelada: volta com os dados novos e um código novo
            for (let t = 0; t < 5 && !codigo; t++) {
                const c = novoCodigo()
                if (!(await prisma.inscricao.findFirst({ where: { evento_inscricao_id: evento.id, codigo: c }, select: { id: true } }))) codigo = c
            }
            await prisma.inscricao.update({ where: { id: repetida.id }, data: { ...dados, codigo, pago: false, pago_em: null } })
        } else {
            for (let t = 0; t < 5 && !codigo; t++) {
                const c = novoCodigo()
                try {
                    await prisma.inscricao.create({ data: { ...dados, codigo: c, tenant_id: evento.tenant_id, evento_inscricao_id: evento.id } })
                    codigo = c
                } catch (e: unknown) {
                    if ((e as { code?: string })?.code !== 'P2002') throw e // código repetido: tenta outro
                }
            }
        }
        if (!codigo) return { ok: false, error: 'Não foi possível gravar. Tenta de novo.' }

        // Aviso no telemóvel de quem organiza (não atrasa a resposta)
        // (after: no Vercel a função não acaba antes de o aviso sair)
        after(() => gestoresDoEvento(evento)
            .then(ids => ids.length && sendPushToMembros(ids, {
                title: `Nova inscrição · ${evento.titulo}`,
                body: `${nome} (${membroId ? 'membro' : 'visitante'}) inscreveu-se.`,
                url: `/inscricoes/${evento.slug}`,
                tag: `inscricao-${evento.slug}`,
            }))
            .catch(err => console.error('[INSCRICAO] Aviso à organização:', err)))

        revalidatePath(`/inscricoes/${evento.slug}`)
        return { ok: true, codigo, repetida: false }
    } catch (error) {
        console.error('[INSCRICAO] Erro:', error)
        return { ok: false, error: 'Não foi possível gravar a inscrição. Tenta de novo.' }
    }
}

export type AcaoInscricao = 'CONFIRMAR' | 'PENDENTE' | 'PAGO' | 'NAO_PAGO' | 'CANCELAR' | 'CHEGOU' | 'NAO_CHEGOU'

/** Gestão: confirmar, marcar pago, cancelar… (só quem gere o evento). */
export async function alterarInscricaoAction(inscricaoId: number, acao: AcaoInscricao) {
    try {
        const sessao = await getSessionData()
        if (!sessao) return { ok: false, error: 'Sessão expirada.' }
        const i = await prisma.inscricao.findUnique({
            where: { id: inscricaoId },
            include: { evento: { select: { id: true, slug: true, titulo: true, tenant_id: true, grupo_id: true, departamento_id: true, inicio: true, local: true, preco_eur: true, pagamento: true, cor_principal: true } } },
        })
        if (!i || !(await podeGerirEvento(sessao, i.evento))) return { ok: false, error: 'Sem permissão.' }

        const data =
            acao === 'CONFIRMAR' ? { estado: 'CONFIRMADA' } :
            acao === 'PENDENTE' ? { estado: 'PENDENTE' } :
            acao === 'CANCELAR' ? { estado: 'CANCELADA' } :
            acao === 'PAGO' ? { pago: true, pago_em: new Date() } :
            acao === 'NAO_PAGO' ? { pago: false, pago_em: null } :
            acao === 'CHEGOU' ? { presente_em: new Date() } :
            acao === 'NAO_CHEGOU' ? { presente_em: null } : null
        if (!data) return { ok: false, error: 'Ação inválida.' }

        await prisma.inscricao.update({ where: { id: i.id }, data })

        // Confirmada agora: email com o código e como pagar (se deixou email)
        if (acao === 'CONFIRMAR' && i.estado !== 'CONFIRMADA' && i.email) {
            const { dia, hora } = dataDoEvento(i.evento.inicio)
            const origem = urlDoPortal()
            enviarEmailInscricaoConfirmada({
                email: i.email, nome: i.nome, titulo: i.evento.titulo, quando: `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, às ${hora}`,
                local: i.evento.local, codigo: i.codigo, preco: i.evento.preco_eur, pagamento: i.evento.pagamento, pago: i.pago,
                cor: i.evento.cor_principal, link: `${origem}/i/${i.evento.slug}`,
            }).catch(err => console.error('[INSCRICAO] Email de confirmação:', err))
        }
        audit({
            tenant_id: i.tenant_id, categoria: 'AGENDA', acao: 'EDITAR', alvo_id: i.id, alvo_nome: i.nome,
            descricao: `Inscrição ${i.codigo} (${i.evento.titulo}): ${acao}`,
        }).catch(() => {})

        revalidatePath(`/inscricoes/${i.evento.slug}`)
        revalidatePath(`/inscricoes/${i.evento.slug}/entrada`)
        return { ok: true }
    } catch (error) {
        console.error('[INSCRICAO] Erro ao alterar:', error)
        return { ok: false, error: 'Não foi possível guardar.' }
    }
}

/**
 * Entrada no dia pelo código (QR da inscrição ou escrito à mão): marca quem
 * chegou e diz à organização o nome, se está confirmada e se pagou.
 */
export async function entradaPorCodigoAction(slug: string, codigoLido: string) {
    try {
        const sessao = await getSessionData()
        if (!sessao) return { ok: false as const, error: 'Sessão expirada.' }
        const evento = await prisma.eventoInscricao.findUnique({ where: { tenant_id_slug: { tenant_id: sessao.tenantId, slug } } })
        if (!evento || !(await podeGerirEvento(sessao, evento))) return { ok: false as const, error: 'Sem permissão.' }

        const codigo = codigoLido.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-5)
        const i = await prisma.inscricao.findFirst({ where: { evento_inscricao_id: evento.id, codigo } })
        if (!i) return { ok: false as const, error: `Código ${codigo || '?'} não encontrado neste evento.` }
        if (i.estado === 'CANCELADA') return { ok: false as const, error: `${i.nome}: a inscrição está cancelada.` }

        const jaEstava = !!i.presente_em
        if (!jaEstava) await prisma.inscricao.update({ where: { id: i.id }, data: { presente_em: new Date() } })
        revalidatePath(`/inscricoes/${slug}/entrada`)
        return { ok: true as const, id: i.id, nome: i.nome, estado: i.estado, pago: i.pago, jaEstava }
    } catch (error) {
        console.error('[INSCRICAO] Erro na entrada:', error)
        return { ok: false as const, error: 'Não foi possível registar a entrada.' }
    }
}

/** Fica na auditoria quem ganhou o sorteio (e quem sorteou). */
export async function registarSorteioAction(slug: string, inscricaoId: number) {
    const sessao = await getSessionData()
    if (!sessao) return { ok: false }
    const evento = await prisma.eventoInscricao.findUnique({ where: { tenant_id_slug: { tenant_id: sessao.tenantId, slug } } })
    if (!evento || !(await podeGerirEvento(sessao, evento))) return { ok: false }
    const i = await prisma.inscricao.findFirst({ where: { id: inscricaoId, evento_inscricao_id: evento.id }, select: { nome: true, codigo: true } })
    if (!i) return { ok: false }
    await audit({ tenant_id: evento.tenant_id, categoria: 'AGENDA', acao: 'EDITAR', alvo_id: inscricaoId, alvo_nome: i.nome, descricao: `Sorteio ${evento.titulo}: ${i.nome} (${i.codigo})` }).catch(() => {})
    return { ok: true }
}

/**
 * Criar (id null) ou editar um evento com inscrição. Quem organiza tem de ser
 * um grupo/departamento que esta pessoa gere; o endereço (/i/<slug>) não muda
 * depois de criado (pode já estar divulgado).
 */
export async function guardarEventoAction(id: number | null, formData: FormData) {
    try {
        const sessao = await getSessionData()
        if (!sessao) return { ok: false as const, error: 'Sessão expirada.' }
        const { lerFormularioEvento, slugDe } = await import('@/lib/inscricoes-form')
        const { organizadoresPossiveis } = await import('@/lib/inscricoes-acesso')

        const r = lerFormularioEvento(formData)
        if ('error' in r) return { ok: false as const, error: r.error }
        const d = r.dados

        const podeOrg = (await organizadoresPossiveis(sessao)).some(o => o.valor === `${d.organizador.tipo}:${d.organizador.id}`)
        if (!podeOrg) return { ok: false as const, error: 'Não pode pôr esse grupo/departamento a organizar.' }

        let atual: { id: number; slug: string; imagem_url: string | null } | null = null
        if (id) {
            const e = await prisma.eventoInscricao.findUnique({ where: { id } })
            if (!e || !(await podeGerirEvento(sessao, e))) return { ok: false as const, error: 'Sem permissão.' }
            atual = { id: e.id, slug: e.slug, imagem_url: e.imagem_url }
        }

        // Endereço novo: do título (+ ano, e um número se já existir)
        let slug = atual?.slug
        if (!slug) {
            const base = `${slugDe(d.titulo)}-${d.inicio.getUTCFullYear()}`
            slug = base
            for (let n = 2; await prisma.eventoInscricao.findUnique({ where: { tenant_id_slug: { tenant_id: sessao.tenantId, slug } }, select: { id: true } }); n++) {
                slug = `${base}-${n}`
            }
        }

        // Imagem: nova (comprimida no Blob), manter ou tirar
        let imagem_url = atual?.imagem_url ?? null
        if (formData.get('tirar_imagem') === 'on') imagem_url = null
        const file = formData.get('imagem') as File | null
        if (file && file.size > 0) {
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return { ok: false as const, error: 'Imagem: use JPG, PNG ou WEBP.' }
            if (file.size > 6 * 1024 * 1024) return { ok: false as const, error: 'Imagem demasiado grande (máx. 6 MB).' }
            const { comprimirImagem } = await import('@/lib/image-utils')
            const { put } = await import('@vercel/blob')
            const comprimido = await comprimirImagem(Buffer.from(await file.arrayBuffer()), { maxWidth: 1400, maxHeight: 1400, quality: 80 })
            const blob = await put(`eventos/${sessao.tenantId}-${slug}-${Date.now()}.webp`, comprimido, { access: 'public', contentType: 'image/webp' })
            imagem_url = blob.url
        }

        const dados = {
            titulo: d.titulo, subtitulo: d.subtitulo, descricao: d.descricao, local: d.local, inicio: d.inicio,
            inscricoes_ate: d.inscricoes_ate, preco_eur: d.preco_eur, pagamento: d.pagamento,
            precisa_confirmacao: d.precisa_confirmacao, aberto_visitantes: d.aberto_visitantes,
            campos: d.campos as unknown as object[], cor_principal: d.cor_principal, cor_fundo: d.cor_fundo,
            estado: d.estado, imagem_url,
            grupo_id: d.organizador.tipo === 'grupo' ? d.organizador.id : null,
            departamento_id: d.organizador.tipo === 'departamento' ? d.organizador.id : null,
        }
        if (atual) await prisma.eventoInscricao.update({ where: { id: atual.id }, data: dados })
        else await prisma.eventoInscricao.create({ data: { ...dados, slug, tenant_id: sessao.tenantId } })

        audit({ tenant_id: sessao.tenantId, categoria: 'AGENDA', acao: atual ? 'EDITAR' : 'CRIAR', descricao: `Evento com inscrição "${d.titulo}" (${slug}, ${d.estado})` }).catch(() => {})
        revalidatePath('/inscricoes')
        revalidatePath(`/inscricoes/${slug}`)
        revalidatePath(`/i/${slug}`)
        return { ok: true as const, slug }
    } catch (error) {
        console.error('[INSCRICAO] Erro ao guardar evento:', error)
        return { ok: false as const, error: 'Não foi possível guardar o evento.' }
    }
}
