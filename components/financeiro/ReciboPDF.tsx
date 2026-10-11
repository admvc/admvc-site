'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Printer, FileText } from 'lucide-react'

interface ReciboData {
    id: number
    membro_id: number
    ano: number
    valor_total: number
    numero_recibo: string | null
    emitido_em: string
    dados_igreja: { nome?: string; nif?: string; morada?: string } | null
    dados_membro: { nome?: string; nif?: string; morada?: string; email?: string } | null
    membro_nome?: string
}

const euro = (v: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v)

const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function ReciboPDF({ recibo, trigger }: { recibo: ReciboData; trigger?: React.ReactNode }) {
    const [aberto, setAberto] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => { setMounted(true) }, [])

    const igreja = recibo.dados_igreja || { nome: '', nif: '', morada: '' }
    const membro = recibo.dados_membro || { nome: recibo.membro_nome || '', nif: '', morada: '' }
    const nomeMembro = membro.nome || recibo.membro_nome || ''

    function handlePrint() {
        window.print()
    }

    if (!mounted) return null

    return (
        <>
            {/* Trigger button */}
            {trigger ? (
                <span onClick={() => setAberto(true)} className="cursor-pointer">
                    {trigger}
                </span>
            ) : (
                <button
                    onClick={() => setAberto(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-figueira/10 text-figueira rounded-lg text-xs font-semibold hover:bg-figueira/20 transition-all"
                >
                    <FileText className="w-3.5 h-3.5" />
                    Ver/PDF
                </button>
            )}

            {/* Modal */}
            {aberto && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm print:hidden"
                        onClick={() => setAberto(false)}
                    />

                    {/* Modal content */}
                    <div className="relative w-full max-w-2xl max-h-[90vh] overflow-auto bg-white rounded-2xl shadow-2xl print:shadow-none print:rounded-none print:max-w-none print:max-h-none print:overflow-visible">
                        {/* Close + Print buttons (hidden on print) */}
                        <div className="sticky top-0 flex items-center justify-between p-4 bg-white border-b border-gray-200 print:hidden">
                            <h3 className="text-sm font-bold text-gray-800">
                                Recibo de Donativo
                            </h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePrint}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-figueira text-white rounded-lg text-xs font-semibold hover:bg-figueira/90 transition-all"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    Imprimir
                                </button>
                                <button
                                    onClick={() => setAberto(false)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <X className="w-4 h-4 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        {/* Receipt content - print friendly */}
                        <div className="p-8 sm:p-12 text-black bg-white" id="recibo-print-area">
                            {/* Header line */}
                            <div className="border-t-2 border-b-2 border-black py-3 mb-8 text-center">
                                <h1 className="text-xl font-bold tracking-wide uppercase">
                                    Recibo de Donativo
                                </h1>
                                <p className="text-sm text-gray-600 mt-1">
                                    N.{'\u00BA'} {recibo.numero_recibo || '---'}
                                </p>
                            </div>

                            {/* Entidade emissora */}
                            <div className="mb-6">
                                <h2 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">
                                    Entidade Emissora
                                </h2>
                                <p className="text-base font-semibold">{igreja.nome || '---'}</p>
                                {igreja.nif && (
                                    <p className="text-sm text-gray-700">NIF: {igreja.nif}</p>
                                )}
                                {igreja.morada && (
                                    <p className="text-sm text-gray-700">Morada: {igreja.morada}</p>
                                )}
                            </div>

                            {/* Doador */}
                            <div className="mb-8">
                                <h2 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">
                                    Doador
                                </h2>
                                <p className="text-base font-semibold">{nomeMembro}</p>
                                {membro.nif && (
                                    <p className="text-sm text-gray-700">NIF: {membro.nif}</p>
                                )}
                                {membro.morada && (
                                    <p className="text-sm text-gray-700">Morada: {membro.morada}</p>
                                )}
                            </div>

                            {/* Valor */}
                            <div className="border border-gray-300 rounded-lg p-5 mb-8 bg-gray-50">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-600 uppercase">
                                        Valor Total dos Donativos
                                    </span>
                                    <span className="text-2xl font-black text-black">
                                        {euro(recibo.valor_total)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-600 uppercase">
                                        Ano Fiscal
                                    </span>
                                    <span className="text-lg font-bold text-black">
                                        {recibo.ano}
                                    </span>
                                </div>
                            </div>

                            {/* Certificacao */}
                            <div className="mb-8 text-sm leading-relaxed text-gray-800">
                                <p>
                                    Certificamos que o(a) Sr(a). <strong>{nomeMembro}</strong> contribuiu
                                    com o valor total de <strong>{euro(recibo.valor_total)}</strong> durante
                                    o ano de <strong>{recibo.ano}</strong>, a titulo de donativo, ao abrigo
                                    do artigo 63.{'\u00BA'} do Estatuto dos Beneficios Fiscais.
                                </p>
                            </div>

                            {/* Data + Assinatura */}
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-8 mt-12">
                                <div>
                                    <p className="text-sm text-gray-600">
                                        Data de Emissao: <strong>{formatDate(recibo.emitido_em)}</strong>
                                    </p>
                                </div>
                                <div className="text-center">
                                    <div className="w-48 border-b border-black mb-1 mt-8" />
                                    <p className="text-xs text-gray-500">(Tesoureiro)</p>
                                </div>
                            </div>

                            {/* Bottom line */}
                            <div className="border-t-2 border-black mt-10 pt-2">
                                <p className="text-[10px] text-gray-400 text-center">
                                    Documento emitido eletronicamente por {igreja.nome || 'a igreja'}.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Print styles */}
            <style jsx global>{`
                @media print {
                    body > *:not([class*="fixed"]) {
                        display: none !important;
                    }
                    .fixed {
                        position: static !important;
                    }
                    .fixed > .absolute {
                        display: none !important;
                    }
                    #recibo-print-area {
                        padding: 2cm !important;
                    }
                }
            `}</style>
        </>
    )
}
