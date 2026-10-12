'use client'

// Na ficha do membro (admin): enviar o link para definir a palavra-passe e,
// a pedido do titular (RGPD), exportar ou anonimizar os dados.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Mail, UserX } from 'lucide-react'
import { enviarLinkDefinirSenha } from '@/actions/senha-actions'
import { anonimizarMembroAction } from '@/actions/rgpd-actions'

export default function AcoesContaMembro({ membroId, nome }: { membroId: number; nome: string }) {
    const router = useRouter()
    const [pendente, iniciar] = useTransition()
    const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
    const [confirmar, setConfirmar] = useState(false)
    const [nomeEscrito, setNomeEscrito] = useState('')

    function enviarLink() {
        setMsg(null)
        iniciar(async () => {
            const r = await enviarLinkDefinirSenha(membroId)
            setMsg(r.error ? { tipo: 'erro', texto: r.error } : { tipo: 'ok', texto: 'Link enviado para o email do membro.' })
        })
    }

    function anonimizar() {
        setMsg(null)
        iniciar(async () => {
            const r = await anonimizarMembroAction(membroId, nomeEscrito)
            if (r.error) {
                setMsg({ tipo: 'erro', texto: r.error })
                return
            }
            router.push('/admin/membros')
        })
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
                <button type="button" onClick={enviarLink} disabled={pendente}
                    className="inline-flex items-center gap-2 rounded-xl border border-soft px-4 py-2.5 text-xs font-bold text-fg hover:border-figueira disabled:opacity-50">
                    <Mail size={14} /> Enviar link para definir palavra-passe
                </button>
                <a href={`/api/admin/membros/${membroId}/dados`}
                    className="inline-flex items-center gap-2 rounded-xl border border-soft px-4 py-2.5 text-xs font-bold text-fg hover:border-figueira">
                    <Download size={14} /> Exportar dados (RGPD)
                </a>
                <button type="button" onClick={() => setConfirmar((v) => !v)} disabled={pendente}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-500/10 disabled:opacity-50">
                    <UserX size={14} /> Anonimizar (RGPD)
                </button>
            </div>

            {confirmar && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 space-y-3">
                    <p className="text-xs text-fg">
                        Só a pedido do próprio. Apaga nome, contactos, morada, documentos e foto; a conta fica inativa.
                        Escalas e contribuições ficam, sem nome. <strong>Não se pode desfazer.</strong>
                    </p>
                    <label className="block text-xs font-bold text-fg">
                        Para confirmar, escreva o nome completo: <span className="font-mono">{nome}</span>
                        <input value={nomeEscrito} onChange={(e) => setNomeEscrito(e.target.value)}
                            className="mt-2 w-full rounded-xl border border-soft bg-bg px-4 py-2.5 text-sm outline-none focus:border-red-500" />
                    </label>
                    <button type="button" onClick={anonimizar} disabled={pendente || !nomeEscrito.trim()}
                        className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">
                        Anonimizar definitivamente
                    </button>
                </div>
            )}

            {msg && (
                <p role="status" className={`text-xs font-bold ${msg.tipo === 'ok' ? 'text-figueira' : 'text-red-500'}`}>{msg.texto}</p>
            )}
        </div>
    )
}
