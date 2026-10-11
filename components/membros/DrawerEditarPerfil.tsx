'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, UserCircle, ChevronRight } from 'lucide-react'
import MeuPerfilClient from '@/components/membros/MeuPerfilClient'

interface Props {
    membro: any
    escolaridades: any[]
    isMenuItem?: boolean
    trigger?: React.ReactNode
}

export default function DrawerEditarPerfil({ membro, escolaridades, isMenuItem, trigger }: Props) {
    const [aberto, setAberto] = useState(false)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const fechar = () => setAberto(false)

    // Callback chamado pelo MeuPerfilClient após guardar com sucesso
    const handleSucesso = () => {
        startTransition(() => router.refresh())
    }

    return (
        <>
            {trigger ? (
                <div onClick={() => setAberto(true)} className="cursor-pointer">
                    {trigger}
                </div>
            ) : isMenuItem ? (
                <button onClick={() => setAberto(true)}
                    className="text-[10px] font-bold uppercase tracking-widest text-fg hover:bg-soft px-3 py-2.5 rounded-lg transition-all flex items-center gap-3 w-full text-left">
                    <UserCircle size={13} className="text-figueira" /> Editar Perfil
                </button>
            ) : (
                <button onClick={() => setAberto(true)}
                    className="h-12 w-12 flex items-center justify-center bg-bg2 border border-soft text-muted rounded-2xl hover:bg-soft hover:text-fg transition-all shadow-sm shrink-0"
                    title="Editar o meu perfil">
                    <UserCircle size={18} />
                </button>
            )}

            {/* OVERLAY */}
            {aberto && (
                <div
                    className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={fechar}
                />
            )}

            {/* DRAWER */}
            <div className={`
                fixed top-0 right-0 z-[160] h-full w-full sm:w-[680px] lg:w-[760px]
                bg-bg border-l border-soft shadow-2xl
                flex flex-col
                transition-transform duration-300 ease-in-out
                ${aberto ? 'translate-x-0' : 'translate-x-full'}
            `}>
                {/* HEADER DO DRAWER */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-soft bg-bg2 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-figueira/10 text-figueira rounded-xl flex items-center justify-center">
                            <UserCircle size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase italic tracking-tighter text-fg leading-none">
                                O Meu Perfil
                            </h2>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted mt-0.5">
                                {membro.first_name} {membro.last_name}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={fechar}
                        className="w-9 h-9 flex items-center justify-center bg-bg border border-soft text-muted rounded-xl hover:bg-soft hover:text-fg transition-all"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* CONTEÚDO COM SCROLL */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <MeuPerfilClient
                        membro={membro}
                        escolaridades={escolaridades}
                        onSucesso={handleSucesso}
                        isDrawer
                    />
                </div>
            </div>
        </>
    )
}