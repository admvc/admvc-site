'use client'

import { useState, useTransition } from 'react'
import { Plus, X, Music, Hash, Loader2, Youtube } from 'lucide-react'
import { adicionarMusicaRapidaAoEvento } from '@/actions/louvor-actions'
import { useRouter } from 'next/navigation'

export default function ModalAdicionarMusica({ eventoId }: { eventoId: number }) {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, startTransition] = useTransition()

    // Estados do formulário simples
    const [titulo, setTitulo] = useState('')
    const [tom, setTom] = useState('')
    const [link, setLink] = useState('')
    const [erro, setErro] = useState('')

    const handleSalvar = async () => {
        if (!titulo.trim() || !tom.trim()) {
            setErro('Preenche o nome da música e o tom!')
            return
        }

        setErro('')
        startTransition(async () => {
            const res = await adicionarMusicaRapidaAoEvento(eventoId, titulo, tom, link)
            if (res.success) {
                setIsOpen(false)
                setTitulo('')
                setTom('')
                setLink('')
                router.refresh()
            } else {
                setErro(res.error || 'Erro ao adicionar música.')
            }
        })
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-figueira text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-figueira/90 transition-all active:scale-95 shadow-sm"
            >
                <Plus size={14} /> Adicionar Música
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-bg border border-soft rounded-3xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">

                        <div className="flex justify-between items-center p-4 border-b border-soft bg-soft/10">
                            <div className="flex items-center gap-2 text-fg">
                                <Music size={18} className="text-figueira" />
                                <h2 className="text-sm font-black uppercase tracking-widest">Inserir na Escala</h2>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-muted hover:text-red-500 transition-colors p-1">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block">Nome da Música</label>
                                <input
                                    type="text"
                                    value={titulo}
                                    onChange={(e) => setTitulo(e.target.value)}
                                    placeholder="Ex: Quebrantado"
                                    className="w-full bg-bg2 border border-soft rounded-xl px-4 py-3 text-xs font-bold text-fg outline-none focus:border-figueira transition-colors"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 flex items-center gap-1">
                                    <Hash size={12} /> Tom Escolhido
                                </label>
                                <input
                                    type="text"
                                    value={tom}
                                    onChange={(e) => setTom(e.target.value.toUpperCase())}
                                    placeholder="Ex: G, C#m"
                                    maxLength={5}
                                    className="w-full bg-bg2 border border-soft rounded-xl px-4 py-3 text-xs font-black text-fg outline-none focus:border-figueira transition-colors uppercase"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 flex items-center gap-1">
                                    <Youtube size={12} /> Link do Vídeo (Opcional)
                                </label>
                                <input
                                    type="url"
                                    value={link}
                                    onChange={(e) => setLink(e.target.value)}
                                    placeholder="https://youtube.com/..."
                                    className="w-full bg-bg2 border border-soft rounded-xl px-4 py-3 text-xs font-bold text-fg outline-none focus:border-figueira transition-colors"
                                />
                            </div>

                            {erro && <p className="text-[10px] text-red-500 font-bold uppercase text-center mt-2">{erro}</p>}

                            <button
                                onClick={handleSalvar}
                                disabled={isPending || !titulo.trim() || !tom.trim()}
                                className="w-full mt-4 bg-figueira hover:bg-figueira/90 text-white px-4 py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                Inserir na Lista
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}