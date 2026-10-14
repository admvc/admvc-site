// components/membros/MuralClient.tsx
'use client'

// Avisos como uma lista simples: escolhe-se o ministerio/grupo, escreve-se em
// cima e as mensagens aparecem por baixo, a mais recente primeiro.

import { useState, useRef } from 'react'
import { Send, User, Loader2, Trash2 } from 'lucide-react'
import { publicarAviso, apagarAviso } from '@/actions/mural-actions'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'
import Image from 'next/image'

export default function MuralClient({ canais, avisos, membroAtualId }: { canais: any[], avisos: any[], membroAtualId: number }) {
    const confirmar = useConfirm()
    const toast = useToast()
    const [canalAtivo, setCanalAtivo] = useState(canais[0]?.id)
    const [loading, setLoading] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const formRef = useRef<HTMLFormElement>(null)

    // Vem do servidor ja ordenado do mais recente para o mais antigo
    const mensagensDoCanal = avisos.filter(aviso => {
        const idCanal = aviso.departamento_id ? `DEP_${aviso.departamento_id}` : `GRP_${aviso.grupo_id}`
        return idCanal === canalAtivo
    })

    async function handlePost(formData: FormData) {
        setLoading(true)
        const res = await publicarAviso(formData)
        setLoading(false)
        if (res.ok) {
            formRef.current?.reset()
            toast('Aviso publicado.', 'sucesso')
        } else {
            toast(res.error || 'Erro ao publicar.', 'erro')
        }
    }

    async function handleDelete(id: string) {
        const ok = await confirmar({ mensagem: 'Apagar esta mensagem? Todos deixam de a ver.', tipo: 'perigo' })
        if (!ok) return
        setDeletingId(id)
        const res = await apagarAviso(id)
        setDeletingId(null)
        if (res.error) toast(res.error, 'erro')
    }

    const formatDate = (dateString: string) =>
        new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(dateString))

    const nomeCanal = canais.find(c => c.id === canalAtivo)?.nome

    return (
        <div className="space-y-4">
            {/* Ministerios e grupos: so aparece a escolha se houver mais de um */}
            {canais.length > 1 && (
                <div role="radiogroup" aria-label="Ministério ou grupo" className="flex flex-wrap gap-2">
                    {canais.map(canal => {
                        const ativo = canalAtivo === canal.id
                        return (
                            <button key={canal.id} type="button" role="radio" aria-checked={ativo} onClick={() => setCanalAtivo(canal.id)}
                                className={`a-botao !min-h-[48px] ${ativo ? 'a-botao-principal' : 'a-botao-secundario'}`}>
                                {canal.nome}
                            </button>
                        )
                    })}
                </div>
            )}

            <form ref={formRef} action={handlePost} className="a-card space-y-3 p-4">
                <input type="hidden" name="destino" value={canalAtivo} />
                <label htmlFor="mural-texto" className="block text-[16px] font-semibold">Escrever para {nomeCanal}</label>
                <textarea id="mural-texto" name="texto" required rows={3} autoComplete="off"
                    className="a-foco w-full resize-none rounded-[14px] border px-4 py-3 text-[17px]"
                    style={{ background: 'var(--a-bg)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }} />
                <button disabled={loading} type="submit" className="a-botao a-botao-principal w-full">
                    {loading ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Send size={20} aria-hidden />}
                    {loading ? 'A publicar…' : 'Publicar'}
                </button>
            </form>

            {mensagensDoCanal.length > 0 ? (
                <ul className="space-y-3">
                    {mensagensDoCanal.map((msg: any) => {
                        const isMe = msg.autor.id === membroAtualId
                        return (
                            <li key={msg.id} className={`a-card space-y-3 p-4 ${deletingId === msg.id ? 'opacity-50' : ''}`}>
                                <div className="flex items-center gap-3">
                                    {msg.autor.avatar_file ? (
                                        <Image src={msg.autor.avatar_file} alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-full object-cover" />
                                    ) : (
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full a-suave" style={{ background: 'var(--a-bg)' }}>
                                            <User size={22} aria-hidden />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[17px] font-semibold">{isMe ? 'Eu' : `${msg.autor.first_name} ${msg.autor.last_name}`}</p>
                                        <p className="text-[15px] a-suave">{formatDate(msg.createdAt)}</p>
                                    </div>
                                    {isMe && (
                                        <button type="button" onClick={() => handleDelete(msg.id)} disabled={deletingId === msg.id}
                                            className="a-botao shrink-0 !min-h-[44px] !px-3" aria-label="Apagar a mensagem" style={{ color: 'var(--a-erro)' }}>
                                            {deletingId === msg.id ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Trash2 size={20} aria-hidden />}
                                        </button>
                                    )}
                                </div>
                                <p className="whitespace-pre-wrap text-[17px] leading-relaxed">{msg.texto}</p>
                            </li>
                        )
                    })}
                </ul>
            ) : (
                <p className="a-card p-6 text-center text-[16px] a-suave">Ainda não há mensagens aqui.</p>
            )}
        </div>
    )
}
