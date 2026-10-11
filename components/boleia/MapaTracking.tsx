'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface Posicao {
    membroId: number
    nome: string
    papel: string
    latitude: number
    longitude: number
    atualizadoEm: string
}

interface Props {
    posicoes: Posicao[]
    meuMembroId: number
    latitudePartida: number | null
    longitudePartida: number | null
}

// Ícones customizados
function criarIcone(cor: string) {
    return L.divIcon({
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
        html: `<div style="
            width: 32px; height: 32px;
            background: ${cor};
            border: 3px solid white;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex; align-items: center; justify-content: center;
        "><div style="
            transform: rotate(45deg);
            color: white; font-size: 14px; font-weight: 900;
        ">${cor === '#3b82f6' ? '🚗' : '📍'}</div></div>`,
    })
}

const iconeMotorista = criarIcone('#3b82f6')  // Azul
const iconePassageiro = criarIcone('#3f6b4f')  // Verde/figueira
const iconePartida = L.divIcon({
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    html: `<div style="
        width: 20px; height: 20px;
        background: #f59e0b;
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    "></div>`,
})

// Auto-fit bounds quando posicoes mudam
function FitBounds({ posicoes, latPartida, lngPartida }: { posicoes: Posicao[]; latPartida: number | null; lngPartida: number | null }) {
    const map = useMap()

    useEffect(() => {
        const points: [number, number][] = posicoes.map(p => [p.latitude, p.longitude])
        if (latPartida && lngPartida) points.push([latPartida, lngPartida])

        if (points.length > 0) {
            const bounds = L.latLngBounds(points)
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
        }
    }, [posicoes, latPartida, lngPartida, map])

    return null
}

export default function MapaTracking({ posicoes, meuMembroId, latitudePartida, longitudePartida }: Props) {
    const center: [number, number] = latitudePartida && longitudePartida
        ? [latitudePartida, longitudePartida]
        : posicoes.length > 0
            ? [posicoes[0].latitude, posicoes[0].longitude]
            : [38.7223, -9.1393]

    const temPosicoes = posicoes.length > 0 || (latitudePartida && longitudePartida)

    return (
        <div className="w-full h-[50vh] rounded-2xl overflow-hidden border border-soft relative">
            {!temPosicoes && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg2/80 backdrop-blur-sm">
                    <p className="text-xs font-black uppercase tracking-widest text-muted">
                        Aguardando localizações...
                    </p>
                </div>
            )}
            <MapContainer
                center={center}
                zoom={14}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Ponto de partida */}
                {latitudePartida && longitudePartida && (
                    <Marker position={[latitudePartida, longitudePartida]} icon={iconePartida}>
                        <Popup>
                            <span className="font-bold text-xs">Ponto de Partida</span>
                        </Popup>
                    </Marker>
                )}

                {/* Posicoes dos participantes */}
                {posicoes.map(p => {
                    const icone = p.papel === 'MOTORISTA' ? iconeMotorista : iconePassageiro
                    const atualizadoHa = Math.round((Date.now() - new Date(p.atualizadoEm).getTime()) / 1000)

                    return (
                        <Marker key={p.membroId} position={[p.latitude, p.longitude]} icon={icone}>
                            <Popup>
                                <div className="text-xs space-y-1">
                                    <p className="font-bold">{p.nome}</p>
                                    <p className="text-gray-500">{p.papel === 'MOTORISTA' ? '🚗 Motorista' : '📍 Passageiro'}</p>
                                    <p className="text-gray-400">Atualizado há {atualizadoHa}s</p>
                                </div>
                            </Popup>
                        </Marker>
                    )
                })}

                <FitBounds posicoes={posicoes} latPartida={latitudePartida} lngPartida={longitudePartida} />
            </MapContainer>
        </div>
    )
}
