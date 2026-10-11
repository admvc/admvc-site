'use client'

import { useCallback, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
    const [pulling, setPulling] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const startY = useRef(0)
    const pullDist = useRef(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    const THRESHOLD = 80

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (window.scrollY === 0) {
            startY.current = e.touches[0].clientY
        }
    }, [])

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (window.scrollY > 0 || refreshing) return
        const diff = e.touches[0].clientY - startY.current
        if (diff > 0 && startY.current > 0) {
            pullDist.current = Math.min(diff, THRESHOLD * 1.5)
            setPulling(pullDist.current > 20)
        }
    }, [refreshing])

    const handleTouchEnd = useCallback(() => {
        if (pullDist.current >= THRESHOLD && !refreshing) {
            setRefreshing(true)
            setPulling(false)
            router.refresh()
            setTimeout(() => setRefreshing(false), 1500)
        } else {
            setPulling(false)
        }
        pullDist.current = 0
        startY.current = 0
    }, [refreshing, router])

    return (
        <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {(pulling || refreshing) && (
                <div className="flex justify-center py-3">
                    <RefreshCw
                        size={18}
                        className={`text-figueira ${refreshing ? 'animate-spin' : 'opacity-50'}`}
                    />
                </div>
            )}
            {children}
        </div>
    )
}
