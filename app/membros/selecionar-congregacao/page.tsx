// app/membros/selecionar-congregacao/page.tsx
import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import SelecionarCongregacaoClient from '@/components/membros/SelecionarCongregacaoClient'

export default async function SelecionarCongregacaoPage() {
    const db = await getDb()
    const session = await getSessionData()
    if (!session) redirect('/membros/login')

    const [congregacoes, tenant] = await Promise.all([
        db.congregacao.findMany({
            select: { id: true, nome: true, cidade: true },
            orderBy: { nome: 'asc' },
        }),
        db.tenant.findUnique({
            where: { id: await getTenantIdFromHeaders() },
            select: { nome: true }
        })
    ])

    // Se só tem 1 congregação, associa automaticamente
    if (congregacoes.length <= 1) {
        redirect('/membros/dashboard')
    }

    return (
        <SelecionarCongregacaoClient
            congregacoes={congregacoes}
            igrejaName={tenant?.nome || 'Igreja'}
            adminNome={isAdmin(session.role) ? 'Administrador' : 'Lider'}
        />
    )
}
