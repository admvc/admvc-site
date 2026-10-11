'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { criarSuperAdmin } from '@/actions/super-admin-actions'

export default function FormNovoSA() {
    const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setMsg(null)
        const res = await criarSuperAdmin(formData)
        if (res?.error) {
            setMsg({ type: 'err', text: res.error })
        } else {
            setMsg({ type: 'ok', text: 'Administrador criado com sucesso!' })
        }
        setLoading(false)
    }

    return (
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-300 flex items-center gap-2">
                <UserPlus size={16} className="text-blue-500" /> Novo Administrador
            </h2>

            <form action={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Nome</label>
                    <input
                        name="nome"
                        required
                        className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600 transition"
                        placeholder="Nome completo"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Email</label>
                    <input
                        name="email"
                        type="email"
                        required
                        className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600 transition"
                        placeholder="email@exemplo.com"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Password</label>
                    <input
                        name="password"
                        type="password"
                        required
                        minLength={6}
                        className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600 transition"
                        placeholder="Min. 6 caracteres"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Role</label>
                    <select
                        name="role"
                        required
                        className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-600 transition"
                    >
                        <option value="ADMIN">ADMIN</option>
                        <option value="VIEWER">VIEWER</option>
                        <option value="SUPPORT">SUPPORT</option>
                    </select>
                </div>

                <div className="md:col-span-2 flex items-center gap-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition disabled:opacity-50"
                    >
                        {loading ? 'A criar...' : 'Criar Administrador'}
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
