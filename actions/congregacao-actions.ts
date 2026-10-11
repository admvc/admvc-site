'use server'

import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-utils'

export async function selecionarCongregacao(congregacaoId: number) {
    const session = await requireAuth()

    // Atualiza o membro com a congregação escolhida
    await prisma.membro.update({
        where: { id: session.membroId },
        data: { congregacao_id: congregacaoId }
    })

    // Atualiza o cookie para incluir a congregação
    const cookieStore = await cookies()
    const currentSession = cookieStore.get('admvc_session')

    if (currentSession) {
        // Remove cong: antigo se existir e adiciona o novo
        const parts = currentSession.value.split('|').filter(p => !p.startsWith('cong:'))
        parts.push(`cong:${congregacaoId}`)
        const newSession = parts.join('|')

        cookieStore.set('admvc_session', newSession, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
            sameSite: 'lax',
        })
    }

    if (session.role === 'ADMIN') redirect('/admin/dashboard')
    redirect('/membros/dashboard')
}
