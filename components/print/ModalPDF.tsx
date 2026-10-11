'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { Printer, Loader2, X } from 'lucide-react'
import CartaoMembroPDF from './CartaoMembroPDF'
import ListaMembrosPDF from './ListaMembrosPDF'

interface MembroData {
    id: number
    first_name: string
    last_name: string
    email: string
    phone_1?: string | null
    id_city?: string | null
    status?: string | null
    church_role?: string | null
    data_admissao?: Date | string | null
}

export default function ModalPDF({
    tipo,
    membros,
    igrejaName,
    onClose,
}: {
    tipo: 'cartao' | 'lista'
    membros: MembroData[]
    igrejaName?: string
    onClose: () => void
}) {
    const document = tipo === 'cartao'
        ? <CartaoMembroPDF membros={membros.map(m => ({ ...m, data_admissao: m.data_admissao ? String(m.data_admissao) : null }))} igrejaName={igrejaName} />
        : <ListaMembrosPDF membros={membros} igrejaName={igrejaName} />

    const fileName = tipo === 'cartao' ? 'cartoes-membros.pdf' : 'lista-membros.pdf'

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-bg border border-soft rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Printer size={16} className="text-figueira" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-fg">
                            {tipo === 'cartao' ? 'Cartoes de Membro' : 'Lista de Membros'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-soft transition-all">
                        <X size={16} />
                    </button>
                </div>

                <p className="text-[10px] text-muted font-bold uppercase tracking-widest">
                    {membros.length} membro{membros.length !== 1 ? 's' : ''} selecionado{membros.length !== 1 ? 's' : ''}
                </p>

                <PDFDownloadLink document={document} fileName={fileName}>
                    {({ loading }) => (
                        <button
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-fg text-bg py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-figueira transition-all disabled:opacity-50"
                        >
                            {loading
                                ? <><Loader2 size={14} className="animate-spin" /> A gerar PDF...</>
                                : <><Printer size={14} /> Descarregar PDF</>
                            }
                        </button>
                    )}
                </PDFDownloadLink>
            </div>
        </div>
    )
}
