'use server'

// "Esqueci-me da palavra-passe", "Definir palavra-passe" e o botao do admin
// "Enviar link para definir palavra-passe".

import { headers } from 'next/headers'
import prisma from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { requireRole } from '@/lib/auth-utils'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'
import { enviarLinkRedefinir, lerIdDoLink, linkValidoPara } from '@/lib/redefinir-senha'
import { cifrarSenha, validarSenhaNova } from '@/lib/senhas'

const RESPOSTA_PEDIDO = 'Se existir uma conta ativa com esse email, enviámos um link para definir a palavra-passe. Veja também o spam.'

/** Pede o link. Responde sempre o mesmo, exista ou nao a conta. */
export async function pedirLinkNovaSenha(formData: FormData) {
    const email = String(formData.get('email') ?? '').toLowerCase().trim()
    if (!email || !email.includes('@')) return { error: 'Escreva o seu email.' }

    const ip = ipDoPedido(await headers())
    const porIp = await rateLimit(`nova-senha:ip:${ip}`, 10, 60 * 60 * 1000)
    const porEmail = await rateLimit(`nova-senha:email:${email}`, 3, 60 * 60 * 1000)
    if (!porIp.success || !porEmail.success) {
        return { error: 'Demasiados pedidos. Tente de novo daqui a uma hora.' }
    }

    try {
        const membro = await prisma.membro.findUnique({
            where: { email },
            select: { id: true, first_name: true, email: true, password: true, is_active: true, tenant_id: true },
        })
        if (membro && membro.is_active !== false) {
            await enviarLinkRedefinir(membro, 'pedido')
            await audit({
                tenant_id: membro.tenant_id,
                categoria: 'ACESSO',
                acao: 'RESET_SENHA',
                actor_id: membro.id,
                alvo_id: membro.id,
                alvo_tipo: 'MEMBRO',
                descricao: 'Pedido de link para definir palavra-passe',
            })
        }
    } catch (err) {
        console.error('[NOVA SENHA] Erro ao pedir link:', err)
    }
    return { ok: true, mensagem: RESPOSTA_PEDIDO }
}

/** O link ainda serve? (para a pagina decidir se mostra o formulario) */
export async function verificarLinkNovaSenha(token: string): Promise<boolean> {
    const id = await lerIdDoLink(token)
    if (!id) return false
    const membro = await prisma.membro.findUnique({ where: { id }, select: { id: true, password: true, is_active: true } })
    return !!membro && membro.is_active !== false && (await linkValidoPara(token, membro))
}

/** Grava a senha nova. O link deixa de valer (a impressao da senha muda). */
export async function definirNovaSenha(formData: FormData) {
    const token = String(formData.get('t') ?? '')
    const senha = String(formData.get('senha') ?? '')
    const confirmacao = String(formData.get('confirmacao') ?? '')

    const id = await lerIdDoLink(token)
    const membro = id
        ? await prisma.membro.findUnique({ where: { id }, select: { id: true, email: true, password: true, is_active: true, tenant_id: true } })
        : null
    if (!membro || membro.is_active === false || !(await linkValidoPara(token, membro))) {
        return { error: 'Este link já não é válido. Peça um novo em "Esqueci-me da palavra-passe".' }
    }
    if (senha !== confirmacao) return { error: 'As duas palavras-passe não são iguais.' }
    const motivo = validarSenhaNova(senha, membro.email)
    if (motivo) return { error: motivo }

    await prisma.membro.update({ where: { id: membro.id }, data: { password: await cifrarSenha(senha) } })
    await audit({
        tenant_id: membro.tenant_id,
        categoria: 'ACESSO',
        acao: 'RESET_SENHA',
        actor_id: membro.id,
        alvo_id: membro.id,
        alvo_tipo: 'MEMBRO',
        descricao: 'Palavra-passe definida por link',
    })
    return { ok: true }
}

/** Admin: envia ao membro um link para definir a palavra-passe. */
export async function enviarLinkDefinirSenha(membroId: number) {
    try {
        const sessao = await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const membro = await prisma.membro.findUnique({
            where: { id: membroId },
            select: { id: true, first_name: true, email: true, password: true, is_active: true, tenant_id: true },
        })
        if (!membro || membro.tenant_id !== sessao.tenantId) return { error: 'Membro não encontrado.' }
        if (membro.is_active === false) return { error: 'A conta está inativa.' }
        if (!membro.email) return { error: 'O membro não tem email.' }

        const r = await enviarLinkRedefinir(membro, 'convite')
        if (!r.ok) return { error: 'Não foi possível enviar o email.' }
        await audit({
            tenant_id: membro.tenant_id,
            categoria: 'ACESSO',
            acao: 'RESET_SENHA',
            alvo_id: membro.id,
            alvo_tipo: 'MEMBRO',
            descricao: 'Admin enviou link para definir palavra-passe',
        })
        return { ok: true }
    } catch (err: any) {
        return { error: err?.message || 'Erro ao enviar o link.' }
    }
}
