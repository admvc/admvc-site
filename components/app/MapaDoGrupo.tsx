'use client'
// Mapa pequeno (so leitura) no cartao do grupo: o local de encontro e a zona.
import dynamic from 'next/dynamic'
import type { PontoArea } from '@/lib/area-grupo'

const EditorAreaGrupo = dynamic(() => import('@/components/grupos/EditorAreaGrupo'), {
    ssr: false,
    loading: () => <div className="h-[180px] animate-pulse rounded-[14px]" style={{ background: 'var(--a-borda)' }} />,
})

export default function MapaDoGrupo({ latitude, longitude, area }: { latitude: number | null; longitude: number | null; area: PontoArea[] | null }) {
    return <EditorAreaGrupo latitude={latitude} longitude={longitude} valor={area} altura={180} />
}
