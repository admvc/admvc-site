'use client'
// components/grupos/MapaGrupos.tsx
// Importado com dynamic({ ssr: false }) nas páginas que o usam

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import type { Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix do ícone padrão do Leaflet no Next.js
// (o webpack não copia os assets automaticamente)
function fixLeafletIcons() {
    if (typeof window === 'undefined') return
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet')
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })
}

// Cores por região
const COR_REGIAO: Record<string, string> = {
    Norte: '#3b82f6',
    Centro: '#8b5cf6',
    Sul: '#f59e0b',
    Lisboa: '#ef4444',
    Online: '#6b7280',
}

function criarIconeColorido(cor: string) {
    if (typeof window === 'undefined') return undefined
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet')
    return L.divIcon({
        html: `
            <div style="
                width: 28px; height: 28px;
                background: ${cor};
                border: 3px solid white;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            "></div>
        `,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -32],
    })
}

// Ajusta o mapa para mostrar todos os marcadores
function FitBounds({ grupos }: { grupos: any[] }) {
    const map = useMap()
    useEffect(() => {
        const comCoords = grupos.filter(g => g.latitude && g.longitude)
        if (comCoords.length === 0) return
        if (comCoords.length === 1) {
            map.setView([comCoords[0].latitude, comCoords[0].longitude], 13)
            return
        }
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const L = require('leaflet')
        const bounds = L.latLngBounds(comCoords.map((g: any) => [g.latitude, g.longitude]))
        map.fitBounds(bounds, { padding: [40, 40] })
    }, [grupos, map])
    return null
}

interface Grupo {
    id: number
    nome: string
    dia_semana?: string | null
    horario?: string | null
    endereco?: string | null
    cidade?: string | null
    estado?: string | null
    regiao?: string | null
    descricao?: string | null
    categoria?: string | null
    latitude?: number | null
    longitude?: number | null
    lideres?: { first_name: string; last_name: string }[]
}

interface Props {
    grupos: Grupo[]
    altura?: string
    mostrarLegenda?: boolean
}

export default function MapaGrupos({ grupos, altura = '500px', mostrarLegenda = true }: Props) {
    fixLeafletIcons()

    const gruposComCoords = grupos.filter(g => g.latitude && g.longitude)
    const centro: [number, number] = [39.6, -8.0] // Centro de Portugal

    // Regiões presentes para a legenda
    const regioesPresentas = Array.from(new Set(gruposComCoords.map(g => g.regiao).filter(Boolean)))

    return (
        <div className="space-y-3">
            <MapContainer
                center={centro}
                zoom={7}
                style={{ height: altura, width: '100%', borderRadius: '1.5rem', zIndex: 0 }}
                className="shadow-sm border border-soft"
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                <FitBounds grupos={gruposComCoords} />

                {gruposComCoords.map(g => {
                    const cor = COR_REGIAO[g.regiao || ''] || '#6b7280'
                    const icone = criarIconeColorido(cor)
                    const lider = g.lideres?.[0]

                    return (
                        <Marker
                            key={g.id}
                            position={[g.latitude!, g.longitude!]}
                            icon={icone}
                        >
                            <Popup minWidth={200}>
                                <div className="space-y-1.5 py-1">
                                    <p className="font-black text-sm uppercase leading-tight">{g.nome}</p>
                                    {g.regiao && (
                                        <span style={{ background: cor }}
                                            className="inline-block text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                                            {g.regiao}
                                        </span>
                                    )}
                                    {g.dia_semana && g.horario && (
                                        <p className="text-xs text-gray-600">
                                            📅 {g.dia_semana} às {g.horario}
                                        </p>
                                    )}
                                    {(g.endereco || g.cidade) && (
                                        <p className="text-xs text-gray-500">
                                            📍 {[g.endereco, g.cidade].filter(Boolean).join(', ')}
                                        </p>
                                    )}
                                    {lider && (
                                        <p className="text-xs text-gray-600">
                                            👤 {lider.first_name} {lider.last_name}
                                        </p>
                                    )}
                                    {g.descricao && (
                                        <p className="text-xs text-gray-500 italic border-t pt-1 mt-1">
                                            {g.descricao}
                                        </p>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    )
                })}
            </MapContainer>

            {/* LEGENDA */}
            {mostrarLegenda && regioesPresentas.length > 0 && (
                <div className="flex flex-wrap gap-2 px-1">
                    {regioesPresentas.map(regiao => (
                        <div key={regiao} className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full shrink-0"
                                style={{ background: COR_REGIAO[regiao!] || '#6b7280' }} />
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted">
                                {regiao}
                            </span>
                        </div>
                    ))}
                    <span className="text-[9px] font-bold text-muted ml-auto">
                        {gruposComCoords.length} grupo{gruposComCoords.length !== 1 ? 's' : ''} no mapa
                    </span>
                </div>
            )}
        </div>
    )
}