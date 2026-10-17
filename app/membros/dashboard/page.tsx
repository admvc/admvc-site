// Inicio do membro (telemovel e computador): a app nova, centrada nas escalas.
// O painel antigo (separadores, saudacao, atalhos) foi retirado a 13/10.
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSessionData } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import ModuloBloqueado from '@/components/ui/ModuloBloqueado'
import InicioEscalas from '@/components/app/InicioEscalas'
import AvisoDoEndereco from '@/components/app/AvisoDoEndereco'

export const dynamic = 'force-dynamic'

export default async function DashboardMembro() {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')

    const membro = await getTenantClient(sessao.tenantId).membro.findUnique({
        where: { id: sessao.membroId },
        select: { first_name: true },
    })
    // Membro nao encontrado nesta igreja: entrar outra vez
    if (!membro) redirect(`/membros/login?error=${encodeURIComponent('Sessao invalida. Faca login novamente.')}`)

    return (
        <div className="app-novo min-h-screen">
            {/* Aviso quando se tenta abrir um modulo desligado */}
            <Suspense fallback={null}>
                <ModuloBloqueado />
            </Suspense>
            <main className="mx-auto max-w-md px-4 pt-20 pb-28 md:max-w-5xl md:pt-8">
                <Suspense fallback={null}><AvisoDoEndereco /></Suspense>
                <InicioEscalas sessao={sessao} primeiroNome={membro.first_name} />
            </main>
        </div>
    )
}
