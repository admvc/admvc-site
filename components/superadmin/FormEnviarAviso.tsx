'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { enviarAviso } from '@/actions/super-admin-actions'

export default function FormEnviarAviso({ igrejas }: { igrejas: { id: number; nome: string }[] }) {
    const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
    const [loading, setLoading] = useState(false)
    const [destinatario, setDestinatario] = useState<'todas' | 'especifica'>('todas')

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setMsg(null)
        const res = await enviarAviso(formData)
        if (res?.error) {
            setMsg({ type: 'err', text: res.error })
        } else {
            setMsg({ type: 'ok', text: 'Aviso enviado com sucesso!' })
        }
        setLoading(false)
    }

    return (
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-300 flex items-center gap-2">
                <Send size={16} className="text-blue-500" /> Enviar Aviso
            </h2>

            <form action={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Titulo</label>
                    <input
                        name="titulo"
                        required
                        className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600 transition"
                        placeholder="Titulo do aviso"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Mensagem</label>
                    <textarea
                        name="mensagem"
                        required
                        rows={4}
                        className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600 transition resize-none"
                        placeholder="Conteudo da mensagem..."
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Tipo</label>
                        <select
                            name="tipo"
                            required
                            className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-600 transition"
                        >
                            <option value="INFO">INFO</option>
                            <option value="ALERTA">ALERTA</option>
                            <option value="MANUTENCAO">MANUTENCAO</option>
                            <option value="NOVIDADE">NOVIDADE</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Destinatario</label>
                        <select
                            onChange={(e) => setDestinatario(e.target.value as 'todas' | 'especifica')}
                            className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-600 transition"
                        >
                            <option value="todas">Todas as Igrejas</option>
                            <option value="especifica">Igreja Especifica</option>
                        </select>
                    </div>
                </div>

                {destinatario === 'especifica' && (
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Selecionar Igreja</label>
                        <select
                            name="tenant_id"
                            required
                            className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-600 transition"
                        >
                            <option value="">-- Selecione --</option>
                            {igrejas.map((ig) => (
                                <option key={ig.id} value={ig.id}>{ig.nome}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition disabled:opacity-50"
                    >
                        {loading ? 'A enviar...' : 'Enviar Aviso'}
                    </button>

                    {msg && (
                        <p className={`text-xs font-bold ${msg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                            {msg.text}
                        </p>
                    )}
                </div>
            </form>
        </div>
    )
}
