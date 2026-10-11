'use client'

import { useState } from 'react'
import { criarNovaFamilia } from '@/actions/familia-actions'
import { useToast } from '@/components/ui/ConfirmDialog'
import { Plus, X, Loader2, Home, AlertTriangle } from 'lucide-react'

export default function NovaFamiliaModal({ familiasExistentes = [] }: { familiasExistentes?: string[] }) {
    const toast = useToast()
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Estado para controlar o que o utilizador escreve em tempo real
    const [nome, setNome] = useState('');

    // Verifica se o nome exato já existe na base de dados (ignorando maiúsculas/minúsculas e espaços extras)
    const nomeDuplicado = familiasExistentes.some(
        f => f.toLowerCase() === nome.trim().toLowerCase()
    );

    async function handleAction(formData: FormData) {
        // Trava de segurança extra caso tentem forçar o envio
        if (nomeDuplicado) return;

        setLoading(true)
        const res = await criarNovaFamilia(formData)
        setLoading(false)

        // Se a sua action devolver um erro, mostramos um alerta. Senão, fechamos e limpamos.
        if (res?.erro) {
            toast(res.erro, 'erro')
        } else {
            fecharModal()
        }
    }

    // Função auxiliar para fechar e limpar o campo
    function fecharModal() {
        setIsOpen(false)
        setNome('')
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="w-full md:w-auto flex items-center justify-center gap-3 bg-fg text-bg px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-figueira transition-all shadow-xl active:scale-95"
            >
                <Plus size={16} /> Nova Família
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-bg2 w-full max-w-md border border-soft p-8 rounded-[3rem] shadow-2xl relative animate-in zoom-in-95 duration-300">

                        <button
                            onClick={fecharModal}
                            className="absolute top-6 right-6 p-2 bg-soft text-muted rounded-full hover:bg-red-500 hover:text-white transition-colors"
                        >
                            <X size={16} />
                        </button>

                        <div className="mb-8">
                            <div className="w-12 h-12 bg-figueira/10 text-figueira rounded-2xl flex items-center justify-center mb-4">
                                <Home size={20} />
                            </div>
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-fg">Criar Agregado</h2>
                            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">Insira o apelido principal da família</p>
                        </div>

                        {/* Note que mudámos para onSubmit no form em vez de action direto se preferir, ou mantemos action. 
                            O Next.js aceita Action com FormData perfeitamente. */}
                        <form action={handleAction} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted ml-4 tracking-widest">
                                    Apelido (Ex: Silva, Oliveira)
                                </label>
                                <input
                                    name="surname"
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)} // Liga o input à nossa variável
                                    placeholder="Escreva aqui..."
                                    className={`w-full bg-bg border rounded-2xl p-4 text-xs font-bold text-fg outline-none transition-all shadow-sm ${nomeDuplicado
                                            ? 'border-red-500 focus:border-red-500 bg-red-500/5'
                                            : 'border-soft focus:border-figueira'
                                        }`}
                                    required
                                    autoFocus
                                />

                                {/* AVISO VISUAL SE FOR DUPLICADO */}
                                {nomeDuplicado && (
                                    <div className="flex items-center gap-1.5 text-red-500 ml-4 animate-in slide-in-from-top-2">
                                        <AlertTriangle size={12} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">
                                            A família "{nome.trim()}" já existe!
                                        </span>
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                // Desativa o botão se estiver a carregar, se o nome for duplicado, ou se estiver vazio
                                disabled={loading || nomeDuplicado || nome.trim() === ''}
                                className="w-full flex items-center justify-center gap-2 bg-figueira text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-lg shadow-figueira/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                {loading ? 'A criar...' : 'Guardar Família'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}