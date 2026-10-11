'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const HIGH_CONTRAST_VARS: Record<string, string> = {
    '--bg': '#ffffff',
    '--bg2': '#f3f4f6',
    '--border': '#d1d5db',
    '--fg': '#111827',
    '--muted': '#4b5563',
    '--muted2': '#6b7280',
}

export function useHighContrast() {
    const [active, setActive] = useState(() => {
        if (typeof window === 'undefined') return false
        return localStorage.getItem('admvc-high-contrast') === 'true'
    })

    const originalsRef = useRef<Record<string, string> | null>(null)

    useEffect(() => {
        const root = document.querySelector('.contents') as HTMLElement
        if (!root) return

        // Captura valores originais do BrandingProvider apenas uma vez
        if (!originalsRef.current) {
            originalsRef.current = {}
            for (const k of Object.keys(HIGH_CONTRAST_VARS)) {
                originalsRef.current[k] = root.style.getPropertyValue(k)
            }
        }

        if (active) {
            for (const [k, v] of Object.entries(HIGH_CONTRAST_VARS)) {
                root.style.setProperty(k, v)
            }
            document.documentElement.classList.add('high-contrast')
        } else {
            for (const [k, v] of Object.entries(originalsRef.current)) {
                root.style.setProperty(k, v)
            }
            document.documentElement.classList.remove('high-contrast')
        }

        localStorage.setItem('admvc-high-contrast', String(active))
    }, [active])

    const toggle = useCallback(() => setActive(prev => !prev), [])

    return { active, toggle }
}
