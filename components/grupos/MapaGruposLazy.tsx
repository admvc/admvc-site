'use client'

// O Leaflet so funciona no browser: carregamento lazy, sem SSR.
// (No Next 15, `ssr: false` so pode estar num componente cliente.)
import dynamic from 'next/dynamic'

const MapaGruposLazy = dynamic(() => import('@/components/grupos/MapaGrupos'), {
    ssr: false,
    loading: () => (
        <div className="h-[500px] rounded-[1.5rem] bg-soft/30 border border-soft flex items-center justify-center animate-pulse">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted">A carregar mapa...</p>
        </div>
    ),
})

export default MapaGruposLazy
