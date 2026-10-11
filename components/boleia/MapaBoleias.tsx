'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix Leaflet default icons
function fixLeafletIcons() {
    if (typeof window === 'undefined') return
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })
}

// Green icon for available seats
const greenIcon = typeof window !== 'undefined'
    ? new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    })
    : undefined

// Grey icon for full rides
const greyIcon = typeof window !== 'undefined'
    ? new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    })
    : undefined

export interface OfertaMapa {
    id: number
    latitude: number
    longitude: number
    motorista_nome: string
    hora: string
    vagas_livres: number
    vagas_total: number
    zona: string
    evento_nome?: string
}

function FitBounds({ ofertas }: { ofertas: OfertaMapa[] }) {
    const map = useMap()

    useEffect(() => {
        if (ofertas.length === 0) return
        const bounds = L.latLngBounds(
            ofertas.map((o) => [o.latitude, o.longitude] as [number, number])
        )
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })
    }, [ofertas, map])

    return null
}

export default function MapaBoleias({ ofertas }: { ofertas: OfertaMapa[] }) {
    useEffect(() => {
        fixLeafletIcons()
    }, [])

    return (
        <div className="h-[300px] rounded-[1.5rem] overflow-hidden border border-soft shadow-sm">
            <MapContainer
                center={[39.6, -8.0]}
                zoom={7}
                className="h-full w-full"
                scrollWheelZoom={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitBounds ofertas={ofertas} />
                {ofertas.map((oferta) => (
                    <Marker
                        key={oferta.id}
                        position={[oferta.latitude, oferta.longitude]}
                        icon={oferta.vagas_livres > 0 ? greenIcon : greyIcon}
                    >
                        <Popup>
                            <div className="text-xs space-y-1">
                                <p className="font-bold text-sm">{oferta.motorista_nome}</p>
                                <p>Hora: {oferta.hora}</p>
                                <p>Vagas: {oferta.vagas_livres}/{oferta.vagas_total}</p>
                                <p>Zona: {oferta.zona}</p>
                                {oferta.evento_nome && <p>Evento: {oferta.evento_nome}</p>}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    )
}
