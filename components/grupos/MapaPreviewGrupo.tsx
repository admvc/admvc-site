'use client'

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon
const icon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
})

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng.lat, e.latlng.lng)
        },
    })
    return null
}

interface Props {
    latitude: number | null
    longitude: number | null
    onMapClick?: (lat: number, lng: number) => void
}

export default function MapaPreviewGrupo({ latitude, longitude, onMapClick }: Props) {
    const center: [number, number] = latitude && longitude
        ? [latitude, longitude]
        : [38.7223, -9.1393] // Lisboa default

    const zoom = latitude && longitude ? 15 : 6

    return (
        <div className="w-full h-[200px] rounded-2xl overflow-hidden border border-soft">
            <MapContainer
                center={center}
                zoom={zoom}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {latitude && longitude && (
                    <Marker position={[latitude, longitude]} icon={icon} />
                )}
                {onMapClick && <ClickHandler onMapClick={onMapClick} />}
            </MapContainer>
        </div>
    )
}
