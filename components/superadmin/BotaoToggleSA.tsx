'use client'

import { useState } from 'react'
import { toggleSuperAdmin } from '@/actions/super-admin-actions'

export default function BotaoToggleSA({ saId, isActive }: { saId: number; isActive: boolean }) {
    const [loading, setLoading] = useState(false)
    const [active, setActive] = useState(isActive)

    async function handleToggle() {
        setLoading(true)
        const res = await toggleSuperAdmin(saId)
        if (!res?.error) {
            setActive(!active)
        }
        setLoading(false)
    }

    return (
        <button
            onClick={handleToggle}
            disabled={loading}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition border disabled:opacity-50 ${
                active
                    ? 'text-red-400 border-red-500/30 hover:bg-red-500/10'
                    : 'text-green-400 border-green-500/30 hover:bg-green-500/10'
            }`}
        >
            {loading ? '...' : active ? 'Desativar' : 'Ativar'}
        </button>
    )
}
