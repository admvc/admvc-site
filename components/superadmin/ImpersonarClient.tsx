'use client'

import { useState } from 'react'
import { Search, LogIn } from 'lucide-react'
import { impersonarIgreja } from '@/actions/super-admin-actions'

interface Igreja {
    id: number
    nome: string
    slug: string
    plano: string
}

export default function ImpersonarClient({ igrejas }: { igrejas: Igreja[] }) {
    const [busca, setBusca] = useState('')
    const [selecionada, setSelecionada] = useState<Igreja | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const filtradas = igrejas.filter(
        (ig) =>
            ig.nome.toLowerCase().includes(busca.toLowerCase()) ||
            ig.slug.toLowerCase().includes(busca.toLowerCase())
    )

    async function handleImpersonar() {
        if (!selecionada) return
        setLoading(true)
        setError(null)
        const res = await impersonarIgreja(selecionada.id)
        if (res?.error) {
            setError(res.error)
            setLoading(false)
        }
        // If successful, the action will redirect
    }

    return (
        <div className="bg-[#111] border border-[#222] rounded-2xl p-6 space-y-6">
            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Pesquisar igreja por nome ou slug..."
                    className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600 transition"
                />
            </div>

            {/* Church List */}
            <div className="max-h-80 overflow-y-auto space-y-1 custom-scrollbar">
                {filtradas.map((ig) => (
                    <button
                        key={ig.id}
                        onClick={() => setSelecionada(ig)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition ${
                            selecionada?.id === ig.id
                                ? 'bg-blue-600/20 border border-blue-600/40'
                                : 'hover:bg-[#1A1A1A] border border-transparent'
                        }`}
                    >
                        <div>
                            <p className="text-sm font-bold text-white">{ig.nome}</p>
                            <p className="text-xs text-gray-500">{ig.slug}</p>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 bg-[#222] px-2 py-1 rounded-lg">
                            {ig.plano}
                        </span>
                    </button>
                ))}
                {filtradas.length === 0 && (
                    <p className="text-center text-gray-600 text-sm py-6">Nenhuma igreja encontrada.</p>
                )}
            </div>

            {/* Selected + Action */}
            {selecionada && (
                <div className="border-t border-[#222] pt-4 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Igreja Selecionada</p>
                        <p className="text-white font-bold">{selecionada.nome}</p>
                    </div>
                    <button
                        onClick={handleImpersonar}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition disabled:opacity-50"
                    >
                        <LogIn size={14} />
                        {loading ? 'A entrar...' : 'Entrar como Admin'}
                    </button>
                </div>
            )}

            {error && (
                <p className="text-xs font-bold text-red-400">{error}</p>
            )}
        </div>
    )
}
