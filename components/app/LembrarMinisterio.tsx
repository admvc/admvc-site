'use client'
// Guarda o ultimo ministerio escolhido (como o LouveApp), para a proxima vez.
import { useEffect } from 'react'

export const COOKIE_MINISTERIO = 'admvc_ministerio'

export default function LembrarMinisterio({ id }: { id: number }) {
    useEffect(() => {
        document.cookie = `${COOKIE_MINISTERIO}=${id}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    }, [id])
    return null
}
