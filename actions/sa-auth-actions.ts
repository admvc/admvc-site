'use server'

import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { headers } from 'next/headers'
import { criarSessaoSA, apagarSessaoSA } from '@/lib/sessao'
import { redirect } from 'next/navigation'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'
import { registarAcaoSA } from '@/lib/sa-auth'

export async function loginSuperAdmin(formData: FormData) {
    const email = (formData.get('email') as string)?.toLowerCase().trim()
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Preencha todos os campos.' }
    }

    // Rate limiting: max 5 tentativas por IP por minuto
    const headersList = await headers()
    const ip = ipDoPedido(headersList)
    const rl = await rateLimit(`sa-login:${ip}`, 5, 60000)
    if (!rl.success) {
        return { error: 'Demasiadas tentativas. Aguarde 1 minuto antes de tentar novamente.' }
    }
    // E por conta: 10 tentativas em 15 minutos, venham de onde vierem
    const rlConta = await rateLimit(`sa-login-conta:${email}`, 10, 15 * 60000)
    if (!rlConta.success) {
        return { error: 'Demasiadas tentativas para esta conta. Aguarde 15 minutos.' }
    }

    const sa = await prisma.superAdmin.findUnique({ where: { email } })

    if (!sa || !sa.is_active) {
        return { error: 'Credenciais inválidas.' }
    }

    const senhaValida = await bcrypt.compare(password, sa.password)
    if (!senhaValida) {
        await registarAcaoSA(sa.id, 'LOGIN_FALHADO', `IP ${ip}`)
        return { error: 'Credenciais inválidas.' }
    }

    await criarSessaoSA(sa)
    await registarAcaoSA(sa.id, 'LOGIN', `IP ${ip}`)

    redirect('/super-admin/dashboard')
}

export async function logoutSuperAdmin() {
    await apagarSessaoSA()
    redirect('/super-admin/login')
}
