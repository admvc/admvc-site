'use client'

import { useState } from 'react'
import { HeartHandshake, X, Save, Loader2, Calendar, CreditCard, FileText } from 'lucide-react'
import { lancarContribuicaoAction } from '@/actions/financeiro-actions' // Confirme se este caminho está correto para si
import { useToast } from '@/components/ui/ConfirmDialog'

export default function ModalLancarContribuicao({ membroId }: { membroId: number }) {
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, setIsPending] = useState(false)
    const toast = useToast()

    async function handleAction(formData: FormData) {
        setIsPending(true)
        formData.append('membroId', membroId.toString())

        const res = await lancarContribuicaoAction(formData)
        setIsPending(false)

        if (res.ok) {
            setIsOpen(false)
            // A página vai atualizar sozinha graças ao revalidatePath na Action!
        } else {
            toast(res.error || "Erro ao lançar contribuição.", 'erro')
        }
    }

    return (
        <>
            {/* BOTÃO QUE ABRE O MODAL */}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="flex items-center justify-center gap-3 bg-figueira text-white px-5 py-4 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] hover:bg-figueira/90 transition-all shadow-lg shadow-figueira/20 active:scale-95"
            >
                <HeartHandshake size={16} />
                Lançar Oferta / Dízimo
            </button>

            {/* MODAL (SOBREPOSTO A TUDO) */}
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-bg w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-soft flex flex-col animate-in zoom-in-95 duration-300">

                        {/* HEADER */}
                        <div className="p-8 border-b border-soft flex justify-between items-center bg-bg2 relative">
                            <div className="space-y-1">
                                <span className="text-figueira font-black text-[9px] uppercase tracking-[0.3em]">Tesouraria ADMVC</span>
                                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-fg">Nova <span className="text-muted/20">Entrada.</span></h3>
                            </div>
                            <button
                                onClick={() => !isPending && setIsOpen(false)}
                                className="p-4 bg-soft text-fg rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-90"
                            >
                                <X size={20} strokeWidth={3} />
                            </button>
                        </div>

                        {/* FORMULÁRIO */}
                        <form action={handleAction} className="p-8 space-y-6">

                            <div className="grid grid-cols-2 gap-4">
                                {/* TIPO */}
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2">Tipo de Entrada</label>
                                    <select
                                        name="tipo"
                                        required
                                        className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="DIZIMO">Dízimo</option>
                                        <option value="OFERTA">Oferta Voluntária</option>
                                        <option value="MISSOES">Oferta de Missões</option>
                                    </select>
                                </div>

                                {/* VALOR */}
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2">Valor (€)</label>
                                    <input
                                        type="number"
                                        name="valor"
                                        step="0.01"
                                        min="0.01"
                                        required
                                        placeholder="0.00"
                                        className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* DATA */}
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2">
                                        <Calendar size={12} /> Data do Registo
                                    </label>
                                    <input
                                        type="date"
                                        name="data"
                                        required
                                        defaultValue={new Date().toISOString().split('T')[0]}
                                        className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none cursor-pointer"
                                    />
                                </div>

                                {/* MÉTODO DE PAGAMENTO */}
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2">
                                        <CreditCard size={12} /> Método
                                    </label>
                                    <select
                                        name="metodo"
                                        required
                                        className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="NUMERARIO">Numerário (Dinheiro)</option>
                                        <option value="MBWAY">MBWay</option>
                                        <option value="TRANSFERENCIA">Transferência Bancária</option>
                                        <option value="MULTIBANCO">Multibanco (TPA)</option>
                                    </select>
                                </div>
                            </div>

                            {/* OBSERVAÇÃO */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2">
                                    <FileText size={12} /> Observação (Opcional)
                                </label>
                                <input
                                    type="text"
                                    name="observacao"
                                    placeholder="Ex: Oferta para o congresso de jovens..."
                                    className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none"
                                />
                            </div>

                            {/* BOTÃO SALVAR */}
                            <div className="pt-4 border-t border-soft mt-6">
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full flex items-center justify-center gap-3 bg-fg text-bg px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-figueira transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                >
                                    {isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    {isPending ? "A Registar..." : "Registar Contribuição"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}