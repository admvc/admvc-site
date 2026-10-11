import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function Portal({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    // No Next.js, precisamos garantir que o código rode apenas no cliente (navegador)
    return mounted ? createPortal(children, document.body) : null
}