import { getDb } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { Receipt, FileText, Users, Euro } from 'lucide-react'
import BotaoGerarRecibos from '@/components/financeiro/BotaoGerarRecibos'
import BotaoGerarReciboIndividual from '@/components/financeiro/BotaoGerarReciboIndividual'
import TabelaRecibos from '@/components/financeiro/TabelaRecibos'

export const dynamic = 'force-dynamic'

const euro = (v: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v)

export default async function RecibosPage({
    searchParams,
}: {
    searchParams: Promise<{ ano?: string }>
}) {
    const session = await getSessionData()
    if (!session || !['FINANCE', 'ADMIN'].includes(session.role)) {
        redirect('/membros/dashboard?error=Acesso negado ao modulo financeiro')
    }

    const params = await searchParams
    const anoAtual = new Date().getFullYear()
    const anoSelecionado = params.ano ? parseInt(params.ano) : anoAtual

    const db = await getDb()

    const inicioAno = new Date(anoSelecionado, 0, 1)
    const fimAno = new Date(anoSelecionado + 1, 0, 1)

    // Buscar recibos do ano
    const recibos = await db.reciboFiscal.findMany({
        where: { ano: anoSelecionado },
        include: {
            membro: {
                select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    tax_id: true,
                    email: true,
                },
            },
        },
        orderBy: { membro: { first_name: 'asc' } },
    })

    // Contar membros com contribuicoes sem recibo
    const contribuicoes = await db.contribuicao.findMany({
        where: {
            tipo: { in: ['DIZIMO', 'OFERTA', 'MISSOES', 'MISSAO'] },
            data: { gte: inicioAno, lt: fimAno },
        },
        select: { membro_id: true },
        distinct: ['membro_id'],
    })

    const membrosComContrib = new Set(contribuicoes.map(c => c.membro_id))
    const membrosComRecibo = new Set(recibos.map(r => r.membro_id))
    let semRecibo = 0
    for (const id of membrosComContrib) {
        if (!membrosComRecibo.has(id)) semRecibo++
    }

    const valorTotal = recibos.reduce((sum, r) => sum + r.valor_total, 0)

    // Anos disponiveis (ultimos 5 anos)
    const anos = Array.from({ length: 5 }, (_, i) => anoAtual - i)

    // Serializar recibos para o client
    const recibosSerializados = recibos.map(r => ({
        id: r.id,
        membro_id: r.membro_id,
        ano: r.ano,
        valor_total: r.valor_total,
        numero_recibo: r.numero_recibo,
        emitido_em: r.emitido_em.toISOString(),
        dados_igreja: r.dados_igreja as any,
        dados_membro: r.dados_membro as any,
        membro_nome: `${r.membro.first_name} ${r.membro.last_name}`,
        membro_nif: r.membro.tax_id || '',
        membro_email: r.membro.email,
    }))

    return (
        <main className="max-w-7xl mx-auto pt-16 md:pt-8 pb-28 px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-fg">
                        Recibos de Donativo
                    </h1>
                    <p className="text-xs text-muted">
                        Emissao de recibos fiscais para membros contribuintes.
                    </p>
                </div>
            </header>

            {/* Year Selector + Gerar em Lote */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                    <label className="text-sm text-muted font-medium">Ano fiscal:</label>
                    <div className="flex gap-1">
                        {anos.map(a => (
                            <a
                                key={a}
                                href={`/financeiro/recibos?ano=${a}`}
                                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                                    a === anoSelecionado
                                        ? 'bg-figueira text-white'
                                        : 'bg-card text-muted hover:text-fg hover:bg-soft'
                                }`}
                            >
                                {a}
                            </a>
                        ))}
                    </div>
                </div>
                <BotaoGerarRecibos ano={anoSelecionado} />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-card border border-soft rounded-2xl p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <Receipt className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted">Recibos emitidos</p>
                            <p className="text-2xl font-black text-fg">{recibos.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card border border-soft rounded-2xl p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <Euro className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted">Valor total</p>
                            <p className="text-2xl font-black text-fg">{euro(valorTotal)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card border border-soft rounded-2xl p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted">Membros sem recibo</p>
                            <p className="text-2xl font-black text-fg">{semRecibo}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Geracao Individual */}
            <div className="bg-card border border-soft rounded-2xl p-5">
                <h2 className="text-sm font-bold text-fg mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-figueira" />
                    Gerar recibo individual
                </h2>
                <BotaoGerarReciboIndividual ano={anoSelecionado} />
            </div>

            {/* Tabela de Recibos */}
            {recibos.length > 0 ? (
                <div className="bg-card border border-soft rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-soft">
                        <h2 className="text-sm font-bold text-fg">
                            Recibos emitidos em {anoSelecionado}
                        </h2>
                    </div>
                    <TabelaRecibos recibos={recibosSerializados} />
                </div>
            ) : (
                <div className="bg-card border border-soft rounded-2xl p-12 text-center">
                    <Receipt className="w-12 h-12 text-muted/30 mx-auto mb-3" />
                    <p className="text-muted text-sm">Nenhum recibo emitido para {anoSelecionado}.</p>
                    <p className="text-muted/60 text-xs mt-1">
                        Utilize o botao &quot;Gerar em Lote&quot; para emitir recibos para todos os contribuintes.
                    </p>
                </div>
            )}
        </main>
    )
}
