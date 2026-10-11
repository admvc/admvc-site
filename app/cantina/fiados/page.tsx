import { getDb } from '@/lib/db'
import { getSessionData, isAdmin as isAdminCheck } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { obterTodosFiadosPendentes } from '@/actions/fiado-actions'
import { HandCoins, AlertTriangle, ArrowLeft } from 'lucide-react'
import BotaoLiquidarFiado from '@/components/cantina/BotaoLiquidarFiado'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function FiadosPage() {
    const session = await getSessionData()
    if (!session) redirect('/membros/login?error=Sessao expirada')

    const db = await getDb()

    // Verificar permissao: admin, finance ou lider da cantina
    const isAdmin = isAdminCheck(session.role)
    const isFinance = session.role === 'FINANCE'
    let temPermissao = isAdmin || isFinance

    if (!temPermissao) {
        const lideraCantina = await db.departamento.findFirst({
            where: { lider_id: session.membroId, nome: { contains: 'Cantina', mode: 'insensitive' } },
        })
        if (lideraCantina) temPermissao = true
    }

    if (!temPermissao) {
        redirect('/membros/dashboard?error=Acesso restrito.')
    }

    const { fiados, total } = await obterTodosFiadosPendentes()

    return (
        <main className="max-w-6xl mx-auto pt-16 md:pt-10 px-4 sm:px-6 lg:px-8 space-y-10 animate-in fade-in duration-700 pb-28">
            <Link href="/cantina" className="inline-flex items-center gap-2 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted hover:text-figueira transition-colors">
                <ArrowLeft size={14} /> Voltar a Cantina
            </Link>

            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <HandCoins size={24} className="text-figueira" />
                        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-fg">Fiados</h1>
                    </div>
                    <p className="text-xs text-muted">Dividas pendentes na cantina.</p>
                </div>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-bg2 border border-soft rounded-2xl p-6 space-y-1">
                    <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">Total em divida</p>
                    <p className="text-2xl font-black text-figueira">{total.toFixed(2)}&euro;</p>
                </div>
                <div className="bg-bg2 border border-soft rounded-2xl p-6 space-y-1">
                    <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">Fiados pendentes</p>
                    <p className="text-2xl font-black text-fg">{fiados.length}</p>
                </div>
            </div>

            {/* List */}
            {fiados.length === 0 ? (
                <div className="bg-bg2 border border-soft rounded-2xl p-12 text-center space-y-3">
                    <HandCoins size={32} className="text-muted mx-auto" />
                    <p className="text-sm font-bold text-muted">Nenhum fiado pendente.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {fiados.map((fiado: any) => (
                        <div key={fiado.id} className="bg-bg2 border border-soft rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-fg">
                                        {fiado.membro?.first_name} {fiado.membro?.last_name}
                                    </span>
                                    <span className="text-[9px] md:text-[11px] font-black text-figueira bg-figueira/10 px-2 py-0.5 rounded-full">
                                        {fiado.valor.toFixed(2)}&euro;
                                    </span>
                                </div>
                                {fiado.descricao && (
                                    <p className="text-[10px] md:text-xs text-muted truncate">{fiado.descricao}</p>
                                )}
                                <p className="text-[9px] md:text-[11px] text-muted">
                                    {new Date(fiado.criado_em).toLocaleDateString('pt-PT', {
                                        day: '2-digit', month: '2-digit', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit',
                                    })}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-amber-400">
                                    <AlertTriangle size={11} /> Pendente
                                </span>
                                <BotaoLiquidarFiado fiadoId={fiado.id} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    )
}
