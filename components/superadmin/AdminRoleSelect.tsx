'use client'

import { useState } from 'react'
import { alterarRoleSA } from '@/actions/super-admin-actions'

const ROLE_STYLES: Record<string, string> = {
    ADMIN: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    VIEWER: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    SUPPORT: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

export default function AdminRoleSelect({ saId, currentRole }: { saId: number; currentRole: string }) {
    const [role, setRole] = useState(currentRole)
    const [saving, setSaving] = useState(false)

    async function handleChange(newRole: string) {
        if (newRole === role) return
        setSaving(true)
        const res = await alterarRoleSA(saId, newRole)
        if (res.success) setRole(newRole)
        setSaving(false)
    }

    return (
        <select
            value={role}
            onChange={e => handleChange(e.target.value)}
            disabled={saving}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border outline-none cursor-pointer transition-all ${ROLE_STYLES[role] || ROLE_STYLES.VIEWER} ${saving ? 'opacity-50' : ''}`}
        >
            <option value="ADMIN">Admin</option>
            <option value="SUPPORT">Support</option>
            <option value="VIEWER">Viewer</option>
        </select>
    )
}
