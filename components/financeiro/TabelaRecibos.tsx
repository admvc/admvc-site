'use client'

import ReciboPDF from './ReciboPDF'

interface ReciboRow {
    id: number
    membro_id: number
    ano: number
    valor_total: number
    numero_recibo: string | null
    emitido_em: string
    dados_igreja: any
    dados_membro: any
    membro_nome: string
    membro_nif: string
    membro_email: string
}

const euro = (v: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v)

const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function TabelaRecibos({ recibos }: { recibos: ReciboRow[] }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-xs text-muted uppercase tracking-wider">
                        <th className="text-left px-4 py-3 font-medium">Membro</th>
                        <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">NIF</th>
                        <th className="text-right px-4 py-3 font-medium">Valor Total</th>
                        <th className="text-left px-4 py-3 font-medium hidden md:table-cell">N.{'\u00BA'} Recibo</th>
                        <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Emitido em</th>
                        <th className="text-center px-4 py-3 font-medium">Acao</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-soft">
                    {recibos.map(r => (
                        <tr key={r.id} className="hover:bg-soft/30 transition-colors">
                            <td className="px-4 py-3">
                                <span className="text-fg font-medium">{r.membro_nome}</span>
                            </td>
                            <td className="px-4 py-3 text-muted hidden sm:table-cell">
                                {r.membro_nif || '---'}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-400">
                                {euro(r.valor_total)}
                            </td>
                            <td className="px-4 py-3 text-muted text-xs hidden md:table-cell">
                                {r.numero_recibo || '---'}
                            </td>
                            <td className="px-4 py-3 text-muted text-xs hidden lg:table-cell">
                                {formatDate(r.emitido_em)}
                            </td>
                            <td className="px-4 py-3 text-center">
                                <ReciboPDF recibo={r} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
