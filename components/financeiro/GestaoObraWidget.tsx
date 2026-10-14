// components/financeiro/GestaoObraWidget.tsx — resumo da obra na tesouraria;
// os valores mudam-se na página da obra.
import Link from 'next/link'
import { Building2, Pencil } from 'lucide-react'
import { getSessionData } from '@/lib/auth-utils'
import { obraDaIgreja } from '@/lib/obra'
import { contasObra } from '@/lib/obra-tijolos'
import IgrejaTijolos from '@/components/obra/IgrejaTijolos'

const euro = (v: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)

export default async function GestaoObraWidget() {
    const session = await getSessionData()
    if (!session) return null

    const obra = await obraDaIgreja(session.tenantId)
    const c = contasObra({ valorObra: obra.objetivoFinal, valorTijolo: obra.valorTijolo, arrecadado: obra.arrecadado })
    const podeEditar = session.role === 'ADMIN' || session.role === 'FINANCE'

    return (
        <div className="bg-bg2 border border-soft p-6 rounded-2xl shadow-sm flex flex-col gap-4 h-full">
            <div className="flex justify-between items-start">
                <div>
                    <div className="inline-flex items-center gap-1.5 text-green-500 font-bold text-[13px] uppercase tracking-wide mb-1">
                        <Building2 size={12} /> {obra.titulo}
                    </div>
                    <p className="text-xl font-bold text-fg leading-none valor-dinheiro">{euro(obra.arrecadado)} <span className="text-sm text-muted">de {euro(obra.objetivoFinal)}</span></p>
                </div>
                <span className="text-xs font-bold text-green-600 bg-green-500/10 px-3 py-1.5 rounded-xl border border-green-500/20">
                    {Math.floor(c.pct)}%
                </span>
            </div>

            <div className="flex items-center gap-4">
                <IgrejaTijolos colocados={c.colocados} total={c.total} className="w-32 shrink-0 text-fg" />
                <div className="space-y-1 text-sm">
                    <p><b className="valor-dinheiro" style={{ color: '#C1663A' }}>{c.colocados}</b> <span className="text-muted">tijolos colocados</span></p>
                    <p><b className="valor-dinheiro text-fg">{c.faltam}</b> <span className="text-muted">ainda faltam</span></p>
                    <p><b className="valor-dinheiro text-fg">{obra.contribuintes}</b> <span className="text-muted">contribuem por mês</span></p>
                </div>
            </div>

            {podeEditar && (
                <Link href="/departamentos/financeiro/obra" className="mt-auto flex justify-center items-center gap-2 bg-green-600 text-white p-3 rounded-xl text-[14px] font-bold uppercase tracking-wide hover:bg-green-700 transition-all">
                    <Pencil size={14} /> Atualizar valores
                </Link>
            )}
        </div>
    )
}
