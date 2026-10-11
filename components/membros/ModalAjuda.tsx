'use client'

import { useState } from 'react'
import { Smartphone, Download, QrCode, ShoppingCart, Wallet2, HelpCircle, X, Shield, HeartHandshake } from 'lucide-react'

const SECOES = [
    {
        icon: Smartphone,
        titulo: 'Instalar no Android',
        conteudo: 'Chrome > Menu (3 pontos) > "Adicionar ao ecra inicial"',
    },
    {
        icon: Download,
        titulo: 'Instalar no iPhone',
        conteudo: 'Safari > Partilhar (icone quadrado com seta) > "Adicionar ao ecra inicial"',
    },
    {
        icon: QrCode,
        titulo: 'Como usar QR Code',
        conteudo: 'Va ao seu dashboard > seccao Cantina > clique em "Gerar Cartao"',
    },
    {
        icon: ShoppingCart,
        titulo: 'Como encomendar',
        conteudo: 'Menu Cantina > selecione o evento > escolha produtos > confirme',
    },
    {
        icon: Wallet2,
        titulo: 'Como carregar saldo',
        conteudo: 'Menu Cantina > "Carregar Saldo" > escolha valor e forma de pagamento',
    },
]

export default function ModalAjuda({ isMenuItem = false, trigger }: { isMenuItem?: boolean; trigger?: React.ReactNode }) {
    const [aberto, setAberto] = useState(false)

    return (
        <>
            {trigger ? (
                <div onClick={() => setAberto(true)} className="cursor-pointer">
                    {trigger}
                </div>
            ) : isMenuItem ? (
                <button
                    onClick={() => setAberto(true)}
                    className="text-[9px] font-bold uppercase tracking-widest text-fg hover:bg-soft px-2.5 py-2 rounded-lg transition-all flex items-center gap-2.5 w-full text-left"
                >
                    <HelpCircle size={12} className="text-figueira" /> Ajuda
                </button>
            ) : (
                <button
                    onClick={() => setAberto(true)}
                    className="h-9 w-9 flex items-center justify-center bg-bg2 border border-soft text-muted rounded-lg hover:text-figueira hover:border-figueira/30 transition-all"
                    title="Ajuda"
                >
                    <HelpCircle size={14} />
                </button>
            )}

            {aberto && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAberto(false)} />
                    <div className="relative w-full max-w-md bg-bg border border-soft rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-soft">
                            <div className="flex items-center gap-2.5">
                                <HelpCircle size={18} className="text-figueira" />
                                <h2 className="text-sm font-black uppercase tracking-widest text-fg">Ajuda</h2>
                            </div>
                            <button
                                onClick={() => setAberto(false)}
                                className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-soft/30 transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Sections */}
                        <div className="p-4 space-y-2">
                            {SECOES.map((secao) => {
                                const Icon = secao.icon
                                return (
                                    <details key={secao.titulo} className="group rounded-xl border border-soft overflow-hidden">
                                        <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-soft/20 transition-all">
                                            <Icon size={14} className="text-figueira shrink-0" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-fg">{secao.titulo}</span>
                                        </summary>
                                        <div className="px-4 pb-3 pt-0">
                                            <p className="text-xs text-muted leading-relaxed pl-[26px]">{secao.conteudo}</p>
                                        </div>
                                    </details>
                                )
                            })}

                            <details className="group rounded-xl border border-soft overflow-hidden">
                                <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-soft/20 transition-all">
                                    <Shield size={14} className="text-figueira shrink-0" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-fg">O que e o GDPR?</span>
                                </summary>
                                <div className="px-4 pb-3 pt-0">
                                    <p className="text-xs text-muted leading-relaxed pl-[26px]">O GDPR (Regulamento Geral de Protecao de Dados) e a lei europeia que protege os seus dados pessoais. Ao aceitar o GDPR na nossa plataforma, voce autoriza a igreja a guardar os seus dados (nome, contacto, etc.) de forma segura e apenas para fins de gestao eclesiastica.</p>
                                    <p className="text-xs text-muted leading-relaxed pl-[26px] mt-2">Pode solicitar a remocao dos seus dados a qualquer momento contactando a lideranca da igreja.</p>
                                </div>
                            </details>

                            <details className="group rounded-xl border border-soft overflow-hidden">
                                <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-soft/20 transition-all">
                                    <HeartHandshake size={14} className="text-figueira shrink-0" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-fg">O que e o Permanecer?</span>
                                </summary>
                                <div className="px-4 pb-3 pt-0">
                                    <p className="text-xs text-muted leading-relaxed pl-[26px]">O Permanecer e o processo de integracao a membresia da igreja. Ao aceitar o Permanecer, voce declara o seu compromisso de caminhar em comunhao, participar na vida da igreja e crescer espiritualmente.</p>
                                    <p className="text-xs text-muted leading-relaxed pl-[26px] mt-2">E um passo voluntario que demonstra a sua decisao de fazer parte da familia da igreja de forma activa e comprometida.</p>
                                </div>
                            </details>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
