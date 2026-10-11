'use client'

import { useState, useRef } from 'react'
import { useToast } from '@/components/ui/ConfirmDialog'
import { Send, CheckCircle2, Loader2, History, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { salvarRelatoRapido } from '@/actions/visitante-actions'
import ModalHistorico from './ModalHistorico'

export default function FormAcompanhamentoRapido({ visitante }: { visitante: any }) {
    const toast = useToast()
    const [loading, setLoading] = useState(false)
    const [sucesso, setSucesso] = useState(false)
    const [expanded, setExpanded] = useState(false)
    const formRef = useRef<HTMLFormElement>(null)

    const ultimoAcomp = visitante.acompanhamentos?.[0]
    const temHistorico = !!ultimoAcomp?.observacoes

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        const res = await salvarRelatoRapido(formData)
        setLoading(false)

        if (res.ok) {
            setSucesso(true)
            formRef.current?.reset()
            setExpanded(false)
            setTimeout(() => setSucesso(false), 3000)
        } else {
            toast(res.error, 'erro')
        }
    }

    return (
        <div className="space-y-2">

            {/* ÚLTIMO RELATO — compacto */}
            {temHistorico && (
                <div className="flex items-start justify-between gap-3 bg-bg border border-soft rounded-2xl px-3 py-2.5">
                    <p className="text-[10px] text-muted font-medium italic leading-relaxed line-clamp-2 flex-1">
                        "{ultimoAcomp.observacoes}"
                    </p>
                    <ModalHistorico
                        visitante={visitante}
                        acionador={
                            <button className="shrink-0 flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-muted hover:text-figueira transition-colors bg-soft/50 px-2 py-1 rounded-lg">
                                <History size={9} /> Histórico
                            </button>
                        }
                    />
                </div>
            )}

            {/* BOTÃO DE EXPANDIR FORMULÁRIO */}
            {!expanded ? (
                <div className="flex gap-2">
                    <a
                        href={`https://wa.me/${visitante.telefone?.replace(/\D/g, '')}`}
                        target="_blank"
                        className="h-9 w-9 bg-green-500/10 text-green-600 border border-green-500/20 rounded-xl flex items-center justify-center hover:bg-green-500 hover:text-white transition-all shrink-0"
                    >
                        <MessageCircle size={14} />
                    </a>
                    <button
                        onClick={() => setExpanded(true)}
                        className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all
                            ${sucesso
                                ? 'bg-green-500/10 text-green-600 border-green-500/20'
                                : 'bg-figueira/5 text-figueira border-figueira/20 hover:bg-figueira hover:text-white'
                            }`}
                    >
                        {sucesso
                            ? <><CheckCircle2 size={12} /> Gravado!</>
                            : <><ChevronDown size={12} /> Novo Relato</>
                        }
                    </button>
                </div>
            ) : (
                /* FORMULÁRIO EXPANDIDO */
                <form ref={formRef} action={handleSubmit} className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <input type="hidden" name="visitante_id" value={visitante.id} />

                    <textarea
                        name="relato"
                        placeholder="Descreve o contacto realizado..."
                        required
                        autoFocus
                        className="w-full bg-bg border border-soft rounded-2xl p-3 text-[10px] font-medium text-fg focus:border-figueira outline-none resize-none h-16 transition-all placeholder:text-muted/50"
                    />

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setExpanded(false)}
                            className="h-9 w-9 flex items-center justify-center bg-soft/50 text-muted rounded-xl hover:bg-soft transition-all shrink-0"
                        >
                            <ChevronUp size={14} />
                        </button>
                        <a
                            href={`https://wa.me/${visitante.telefone?.replace(/\D/g, '')}`}
                            target="_blank"
                            className="h-9 w-9 bg-green-500/10 text-green-600 border border-green-500/20 rounded-xl flex items-center justify-center hover:bg-green-500 hover:text-white transition-all shrink-0"
                        >
                            <MessageCircle size={14} />
                        </a>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 h-9 bg-figueira text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {loading
                                ? <><Loader2 size={12} className="animate-spin" /> A gravar...</>
                                : <><Send size={12} /> Gravar</>
                            }
                        </button>
                    </div>
                </form>
            )}
        </div>
    )
}
