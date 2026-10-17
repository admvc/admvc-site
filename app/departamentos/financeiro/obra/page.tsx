// app/departamentos/financeiro/obra/page.tsx — a campanha da obra em tijolos
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building2, ArrowLeft, ChevronRight } from 'lucide-react'
import { obraDaIgreja } from '@/lib/obra'
import FormObra from '@/components/obra/FormObra'

export default async function GestaoObraFinanceiro() {
    const session = await getSessionData()
    if (!session || (session.role !== 'ADMIN' && session.role !== 'FINANCE')) {
        redirect(`/membros/dashboard?error=${encodeURIComponent('Acesso Negado')}`)
    }

    const obra = await obraDaIgreja(session.tenantId)

    return (
        <main className="max-w-5xl mx-auto pt-16 md:pt-8 pb-28 px-6 space-y-8 animate-in fade-in duration-700">
            <nav className="flex items-center gap-4 text-[14px] font-bold uppercase tracking-wide text-muted">
                <Link href="/departamentos/financeiro/dashboard" className="hover:text-green-500 transition-colors flex items-center gap-2">
                    <ArrowLeft size={12} strokeWidth={3} /> Dashboard Financeira
                </Link>
                <ChevronRight size={10} className="opacity-30" />
                <span className="text-fg">Campanha de Construção</span>
            </nav>

            <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-green-500 font-bold text-[14px] uppercase tracking-wide">
                    <Building2 size={14} /> Campanha dos tijolos
                </div>
                <h1 className="text-4xl font-bold text-fg leading-none">A nossa obra</h1>
                <p className="text-sm text-muted max-w-2xl">
                    A obra é dividida em tijolos de valor fixo. Escreva o valor arrecadado e os tijolos
                    pintam-se sozinhos. Aparece no site público e no telão do VOLTA.
                </p>
            </div>

            <div className="bg-bg2 border border-soft p-6 md:p-8 rounded-[2rem] shadow-sm">
                <FormObra obra={{
                    titulo: obra.titulo,
                    objetivoFinal: obra.objetivoFinal,
                    valorTijolo: obra.valorTijolo,
                    arrecadado: obra.arrecadado,
                    contribuintes: obra.contribuintes,
                    chamada: obra.chamada,
                    versiculo: obra.versiculo,
                    versiculoRef: obra.versiculoRef,
                }} />
            </div>
        </main>
    )
}
