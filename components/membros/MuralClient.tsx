// components/membros/MuralClient.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Hash, MessageSquare, UserCircle, Loader2, Trash2 } from 'lucide-react'
import { publicarAviso, apagarAviso } from '@/actions/mural-actions'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'
import Image from 'next/image'

export default function MuralClient({ canais, avisos, membroAtualId }: { canais: any[], avisos: any[], membroAtualId: number }) {
    const confirmar = useConfirm()
    const toast = useToast()
    const [canalAtivo, setCanalAtivo] = useState(canais[0]?.id);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null); // Para mostrar loading ao apagar
    const formRef = useRef<HTMLFormElement>(null);
    const feedRef = useRef<HTMLDivElement>(null);

    const mensagensDoCanal = avisos.filter(aviso => {
        const idCanal = aviso.departamento_id ? `DEP_${aviso.departamento_id}` : `GRP_${aviso.grupo_id}`;
        return idCanal === canalAtivo;
    }).reverse();

    useEffect(() => {
        if (feedRef.current) {
            feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
    }, [mensagensDoCanal]);

    async function handlePost(formData: FormData) {
        setLoading(true);
        const res = await publicarAviso(formData);
        setLoading(false);
        if (res.ok) {
            formRef.current?.reset();
        } else {
            toast(res.error || "Erro ao publicar.", 'erro');
        }
    }

    // NOVA FUNÇÃO: APAGAR MENSAGEM
    async function handleDelete(id: string) {
        const ok = await confirmar({ mensagem: 'Tens a certeza que queres apagar esta mensagem? Todos vão deixar de a ver.', tipo: 'perigo' })
        if (!ok) return;
        setDeletingId(id);
        const res = await apagarAviso(id);
        setDeletingId(null);
        if (res.error) toast(res.error, 'erro');
    }

    const formatDate = (dateString: string) => {
        const data = new Date(dateString);
        return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(data);
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-3 md:gap-6">

            {/* LISTA DE CANAIS — horizontal scroll no mobile, sidebar no desktop */}
            <div className="md:w-64 shrink-0 flex flex-col gap-2 overflow-x-auto md:overflow-y-auto custom-scrollbar md:pr-2 -mx-4 px-4 md:mx-0 md:px-0">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted mb-1 hidden md:block px-2">Meus Canais</span>
                <div className="flex md:flex-col gap-2">
                    {canais.map(canal => (
                        <button
                            key={canal.id}
                            onClick={() => setCanalAtivo(canal.id)}
                            className={`flex items-center gap-2 md:gap-3 px-3 py-2.5 md:p-4 rounded-xl md:rounded-2xl text-left transition-all shrink-0 md:shrink border ${canalAtivo === canal.id
                                ? 'bg-figueira text-white border-figueira shadow-lg'
                                : 'bg-bg2 text-muted border-soft hover:bg-soft'
                                }`}
                        >
                            <Hash size={14} className={`md:w-4 md:h-4 ${canalAtivo === canal.id ? 'text-white' : 'text-figueira'}`} />
                            <div className="overflow-hidden">
                                <p className="text-[10px] md:text-[11px] font-black uppercase tracking-wider truncate">{canal.nome}</p>
                                <p className={`text-[7px] md:text-[8px] font-bold uppercase tracking-widest mt-0.5 hidden md:block ${canalAtivo === canal.id ? 'text-white/70' : 'text-muted/50'}`}>
                                    {canal.tipo}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* LADO DIREITO: FEED E INPUT */}
            <div className="flex-1 flex flex-col bg-bg2 border border-soft rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-sm min-h-0">

                <div className="bg-bg border-b border-soft p-3 md:p-5 shrink-0">
                    <h3 className="text-xs md:text-sm font-black text-fg uppercase tracking-widest flex items-center gap-2">
                        <Hash size={14} className="text-figueira" />
                        {canais.find(c => c.id === canalAtivo)?.nome}
                    </h3>
                </div>

                <div ref={feedRef} className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6 custom-scrollbar bg-bg2/50">
                    {mensagensDoCanal.length > 0 ? (
                        mensagensDoCanal.map((msg: any) => {
                            // Verifica se a mensagem é do membro atual
                            const isMe = msg.autor.id === membroAtualId;

                            return (
                                <div key={msg.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${deletingId === msg.id ? 'opacity-50' : ''}`}>
                                    <div className="shrink-0">
                                        {msg.autor.avatar_file ? (
                                            <Image src={msg.autor.avatar_file} alt="Avatar" width={40} height={40} className="rounded-xl object-cover border-2 border-bg" />
                                        ) : (
                                            <div className="w-10 h-10 bg-soft text-muted rounded-xl flex items-center justify-center">
                                                <UserCircle size={24} />
                                            </div>
                                        )}
                                    </div>

                                    <div className={`max-w-[80%] md:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-baseline gap-2 mb-1 px-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-fg">{msg.autor.first_name} {msg.autor.last_name}</span>
                                            <span className="text-[8px] font-bold uppercase tracking-widest text-muted">{formatDate(msg.createdAt)}</span>
                                        </div>

                                        <div className={`p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${isMe
                                            ? 'bg-figueira text-white rounded-tr-none'
                                            : 'bg-bg border border-soft text-fg rounded-tl-none'
                                            }`}>
                                            {msg.texto}
                                        </div>

                                        {/* BOTÃO DE APAGAR (Apenas visível se for o dono da mensagem) */}
                                        {isMe && (
                                            <button
                                                onClick={() => handleDelete(msg.id)}
                                                disabled={deletingId === msg.id}
                                                className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-muted hover:text-red-500 transition-colors mt-1 px-1"
                                            >
                                                {deletingId === msg.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                                                Apagar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted opacity-50 space-y-3">
                            <MessageSquare size={32} />
                            <p className="text-[10px] font-black uppercase tracking-widest">Ainda não há mensagens neste canal.</p>
                        </div>
                    )}
                </div>

                <div className="bg-bg border-t border-soft p-3 md:p-4 shrink-0">
                    <form ref={formRef} action={handlePost} className="flex gap-2 md:gap-3">
                        <input type="hidden" name="destino" value={canalAtivo} />
                        <input
                            name="texto"
                            required
                            autoComplete="off"
                            placeholder="Escreve uma mensagem..."
                            className="flex-1 bg-bg2 border border-soft rounded-xl md:rounded-2xl px-4 py-3 md:px-5 md:py-4 text-xs md:text-sm font-bold text-fg focus:border-figueira outline-none transition-colors"
                        />
                        <button
                            disabled={loading}
                            type="submit"
                            className="bg-figueira text-white px-4 py-3 md:px-6 md:py-4 rounded-xl md:rounded-2xl hover:bg-figueira/90 transition-all shadow-lg active:scale-95 disabled:opacity-50 shrink-0 flex items-center justify-center"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                    </form>
                </div>

            </div>
        </div>
    )
}