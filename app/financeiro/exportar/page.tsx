import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { FileDown } from 'lucide-react'
import ExportacaoFiscal from '@/components/financeiro/ExportacaoFiscal'

export const dynamic = 'force-dynamic'

export default async function ExportarPage() {
    const session = await getSessionData()
    if (!session || session.role !== 'ADMIN') {
        redirect('/membros/dashboard?error=Acesso negado')
    }

    return (
        <div className="max-w-4xl mx-auto pt-16 md:pt-8 pb-28 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-figueira/10 rounded-xl">
                    <FileDown size={24} className="text-figueira" />
                </div>
                <div>
                    <h1 className="text-xl font-black uppercase tracking-tight text-fg">
                        Exportacao Fiscal
                    </h1>
                    <p className="text-xs text-muted">
                        Exporte dados financeiros em formato CSV para o TOC ou arquivo
                    </p>
                </div>
            </div>

            {/* Descricao */}
            <div className="bg-bg2 border border-soft rounded-2xl p-5 space-y-3">
                <h2 className="text-sm font-bold text-fg uppercase tracking-wide">Ficheiros disponiveis</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted">
                    <div className="space-y-1">
                        <p className="font-bold text-fg">Contribuicoes</p>
                        <p>Data, membro, NIF, tipo, valor, metodo de pagamento e fundo</p>
                    </div>
                    <div className="space-y-1">
                        <p className="font-bold text-fg">Despesas</p>
                        <p>Data, descricao, fornecedor, valor, categoria, fundo e forma de pagamento</p>
                    </div>
                    <div className="space-y-1">
                        <p className="font-bold text-fg">Donativos</p>
                        <p>Data, doador, valor, fundo e forma de pagamento</p>
                    </div>
                    <div className="space-y-1">
                        <p className="font-bold text-fg">Lancamentos</p>
                        <p>Data, campanha/objetivo, valor pago, forma de pagamento e fundo</p>
                    </div>
                </div>
            </div>

            {/* Client component com seleccao de ano e botoes de export */}
            <ExportacaoFiscal />
        </div>
    )
}
