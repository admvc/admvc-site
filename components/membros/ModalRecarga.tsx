'use client'

import { useState } from 'react'
import { Phone, CheckCircle2, Copy, X, ArrowRight } from 'lucide-react'

export default function ModalRecarga({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [copiado, setCopiado] = useState(false)
    const telemovelIgreja = "912 345 678" // Substitua pelo número real

    const copiarNumero = () => {
        navigator.clipboard.writeText(telemovelIgreja.replace(/\s/g, ''))
        setCopiado(true)
        setTimeout(() => setCopiado(false), 2000)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-bg2 border border-soft w-full max-w-md rounded-[3rem] p-8 shadow-2xl relative overflow-hidden">

                {/* Botão Fechar */}
                <button onClick={onClose} className="absolute top-6 right-6 text-muted hover:text-fg transition-colors">
                    <X size={24} />
                </button>

                <div className="space-y-6">
                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 bg-[#ff004f]/10 text-[#ff004f] rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <img src="https://www.mbway.pt/wp-content/uploads/2017/01/logo_mbway.png" alt="MBWAY" className="w-10 h-10 object-contain" />
                        </div>
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter text-fg">Recarga via <span className="text-[#ff004f]">MB WAY</span></h3>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Siga os passos abaixo para adicionar saldo</p>
                    </div>

                    <div className="bg-bg border border-soft p-6 rounded-3xl space-y-4">
                        <div className="space-y-1">
                            <span className="text-[8px] font-black text-muted uppercase tracking-widest block">Número de Telemóvel</span>
                            <div className="flex items-center justify-between bg-soft/20 p-4 rounded-xl border border-soft">
                                <span className="text-lg font-black text-fg tracking-tighter">{telemovelIgreja}</span>
                                <button onClick={copiarNumero} className="text-figueira hover:scale-110 transition-transform">
                                    {copiado ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] font-medium text-muted leading-relaxed italic">
                                1. Envie o valor desejado via MB WAY para o número acima.<br />
                                2. Na descrição, coloque o seu **Nome Completo**.<br />
                                3. O Financeiro validará o depósito em até 24h.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-5 bg-fg text-bg rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-figueira hover:text-white transition-all shadow-xl flex items-center justify-center gap-2"
                    >
                        Entendi, já fiz o envio <ArrowRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    )
}