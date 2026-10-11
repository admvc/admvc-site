'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Save, Loader2, Image as ImageIcon, Plus, Edit3, Camera, CheckCircle2 } from 'lucide-react'
import { salvarItemLoyverseAction } from '@/actions/despensa-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

export default function ModalEditarItem({ item, categorias }: { item?: any, categorias: any[] }) {
    const toast = useToast()
    const [aberto, setAberto] = useState(false);
    const [loading, setLoading] = useState(false);
    const [progresso, setProgresso] = useState(0);
    const [sucesso, setSucesso] = useState(false);
    const [preview, setPreview] = useState(item?.imagem || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Simulação de barra de progresso
    useEffect(() => {
        let interval: any;
        if (loading) {
            setProgresso(10);
            interval = setInterval(() => {
                setProgresso(prev => (prev < 90 ? prev + Math.random() * 15 : prev));
            }, 400);
        } else {
            setProgresso(0);
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [loading]);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setSucesso(false);

        const res = await salvarItemLoyverseAction(formData);

        if (res.ok) {
            setProgresso(100);
            setSucesso(true);
            setTimeout(() => {
                setAberto(false);
                setSucesso(false);
            }, 1500);
        } else {
            toast("Erro: " + res.error, 'erro');
            setLoading(false);
        }
    }

    return (
        <>
            {item ? (
                <button onClick={() => setAberto(true)} className="p-2.5 bg-bg border border-soft rounded-xl text-muted hover:text-figueira hover:border-figueira transition-all">
                    <Edit3 size={16} />
                </button>
            ) : (
                <button onClick={() => setAberto(true)} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg">
                    <Plus size={16} /> Novo Item
                </button>
            )}

            {aberto && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-bg2 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-soft overflow-hidden relative">

                        {/* BARRA DE PROGRESSO NO TOPO */}
                        {loading && (
                            <div className="absolute top-0 left-0 h-1 bg-figueira transition-all duration-500 z-50" style={{ width: `${progresso}%` }} />
                        )}

                        <div className="p-8 border-b border-soft flex justify-between items-center">
                            <h3 className="text-xl font-black uppercase italic tracking-tighter">
                                {item ? 'Editar Item' : 'Novo Item'}
                            </h3>
                            <button onClick={() => !loading && setAberto(false)} className="p-2 hover:bg-red-500 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form action={handleSubmit} className="p-8 space-y-6">
                            {item?.id && <input type="hidden" name="id" value={item.id} />}

                            {/* PREVIEW E UPLOAD */}
                            <div className="flex flex-col items-center gap-2">
                                <div
                                    onClick={() => !loading && fileInputRef.current?.click()}
                                    className={`relative w-32 h-32 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer transition-all ${loading ? 'opacity-50' : 'hover:border-figueira'}`}
                                >
                                    {preview ? <img src={preview} className="w-full h-full object-cover" /> : <ImageIcon className="opacity-20" size={32} />}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center text-white text-[8px] font-black uppercase">Trocar Foto</div>
                                    <input ref={fileInputRef} type="file" name="imagem" className="hidden" accept="image/*" onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) setPreview(URL.createObjectURL(file));
                                    }} />
                                </div>
                            </div>

                            <div className="grid gap-4">
                                <input name="nome" required defaultValue={item?.nome} placeholder="Nome do item" className="w-full bg-bg border border-soft p-4 rounded-xl text-sm font-bold outline-none focus:border-figueira" />
                                <div className="grid grid-cols-2 gap-4">
                                    <select name="categoria_id" defaultValue={item?.categoriaId} className="bg-bg border border-soft p-4 rounded-xl text-sm font-bold outline-none">
                                        {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <input name="preco" type="number" step="0.01" defaultValue={item?.preco} className="bg-bg border border-soft p-4 rounded-xl text-sm font-bold outline-none" />
                                </div>
                            </div>

                            <button
                                disabled={loading}
                                className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 ${sucesso ? 'bg-green-500 text-white' : 'bg-fg text-bg hover:bg-figueira'}`}
                            >
                                {sucesso ? <CheckCircle2 size={18} /> : loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                {sucesso ? 'Sincronizado!' : loading ? `A Enviar (${Math.round(progresso)}%)...` : 'Guardar Alterações'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}