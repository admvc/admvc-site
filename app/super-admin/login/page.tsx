'use client'

import { useState } from 'react'
import { loginSuperAdmin } from '@/actions/sa-auth-actions'
import { Server, Loader2, AlertCircle, Lock, Mail } from 'lucide-react'

export default function SuperAdminLoginPage() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError('')

        const formData = new FormData(e.currentTarget)
        const res = await loginSuperAdmin(formData)

        if (res?.error) {
            setError(res.error)
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
            <div className="w-full max-w-sm space-y-8">
                {/* Logo */}
                <div className="text-center">
                    <div className="mx-auto w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.3)] mb-6">
                        <Server size={24} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">
                        ADMVC <span className="text-blue-500">Cloud</span>
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mt-2">
                        Acesso Super Administrador
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-3">
                        <div className="relative">
                            <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                            <input
                                name="email"
                                type="email"
                                placeholder="Email"
                                required
                                disabled={loading}
                                className="w-full bg-[#111] border border-[#333] rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                            />
                        </div>
                        <div className="relative">
                            <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                            <input
                                name="password"
                                type="password"
                                placeholder="Password"
                                required
                                disabled={loading}
                                className="w-full bg-[#111] border border-[#333] rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Server size={14} />}
                        Entrar na Plataforma
                    </button>
                </form>
            </div>
        </div>
    )
}
