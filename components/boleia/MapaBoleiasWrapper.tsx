'use client'

import dynamic from 'next/dynamic'
import type { OfertaMapa } from './MapaBoleias'

const MapaBoleias = dynamic(() => import('./MapaBoleias'), {
    ssr: false,
    loading: () => (
        <div className="h-[300px] rounded-[1.5rem] bg-soft/30 border border-soft flex items-center justify-center animate-pulse">
            <p className="text-[14px] font-bold uppercase tracking-wide text-muted">A carregar mapa...</p>
        </div>
    ),
})

export default function MapaBoleiasWrapper({ ofertas }: { ofertas: OfertaMapa[] }) {
    return <MapaBoleias ofertas={ofertas} />
}
