'use server'
// Inscrições em eventos: a inscrição (página pública, sem senha) e a gestão.

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { getSessionData } from '@/lib/auth-utils'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'
import { mesmoTelefone, telefoneValido, registarVisita } from '@/lib/visitante-registo'
import { lerCampos, novoCodigo, membroPeloTelefone, inscricoesAbertas } from '@/lib/inscricoes'
import { podeGerirEvento, igrejaPublica } from '@/lib/inscricoes-acesso'

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

        revalidatePath(`/inscricoes/${evento.slug}`)
        return { ok: true, codigo, repetida: false }
    } catch (error) {
        console.error('[INSCRICAO] Erro:', error)
        return { ok: false, error: 'Não foi possível gravar a inscrição. Tenta de novo.' }
    }
}

export type AcaoInscricao = 'CONFIRMAR' | 'PENDENTE' | 'PAGO' | 'NAO_PAGO' | 'CANCELAR'

/** Gestão: confirmar, marcar pago, cancelar… (só quem gere o evento). */
export async function alterarInscricaoAction(inscricaoId: number, acao: AcaoInscricao) {
    try {
        const sessao = await getSessionData()
        if (!sessao) return { ok: false, error: 'Sessão expirada.' }
        const i = await prisma.inscricao.findUnique({
            where: { id: inscricaoId },
            include: { evento: { select: { id: true, slug: true, titulo: true, tenant_id: true, grupo_id: true, departamento_id: true } } },
        })
        if (!i || !(await podeGerirEvento(sessao, i.evento))) return { ok: false, error: 'Sem permissão.' }

        const data =
            acao === 'CONFIRMAR' ? { estado: 'CONFIRMADA' } :
            acao === 'PENDENTE' ? { estado: 'PENDENTE' } :
            acao === 'CANCELAR' ? { estado: 'CANCELADA' } :
            acao === 'PAGO' ? { pago: true, pago_em: new Date() } :
            acao === 'NAO_PAGO' ? { pago: false, pago_em: null } : null
        if (!data) return { ok: false, error: 'Ação inválida.' }

        await prisma.inscricao.update({ where: { id: i.id }, data })
        audit({
            tenant_id: i.tenant_id, categoria: 'AGENDA', acao: 'EDITAR', alvo_id: i.id, alvo_nome: i.nome,
            descricao: `Inscrição ${i.codigo} (${i.evento.titulo}): ${acao}`,
        }).catch(() => {})

        revalidatePath(`/inscricoes/${i.evento.slug}`)
        return { ok: true }
    } catch (error) {
        console.error('[INSCRICAO] Erro ao alterar:', error)
        return { ok: false, error: 'Não foi possível guardar.' }
    }
}
