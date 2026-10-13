'use client'
// components/grupos/EditorAreaGrupo.tsx
// Desenhar a zona que o grupo abrange: "Desenhar área" e cada toque no mapa marca
// um canto; a area vai ficando pintada. Desfazer o ultimo ponto ou limpar.
// Funciona com o dedo e com o rato. Importar com dynamic({ ssr: false }).

import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, Marker, Polygon, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Check, PenLine, Trash2, Undo2 } from 'lucide-react'
import { lerArea, MAX_PONTOS_AREA, type PontoArea } from '@/lib/area-grupo'

const COR = '#2563eb'
const CENTRO_PT: [number, number] = [39.6, -8.0]

const icone = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
})

function Toques({ ativo, onToque }: { ativo: boolean; onToque: (p: PontoArea) => void }) {
    useMapEvents({ click(e) { if (ativo) onToque([e.latlng.lat, e.latlng.lng]) } })
    return null
}

/** Enquadra a area (ou o local de encontro) quando o mapa abre. */
function Enquadrar({ pontos, centro }: { pontos: PontoArea[]; centro: [number, number] | null }) {
    const map = useMap()
    useEffect(() => {
        if (pontos.length >= 2) map.fitBounds(L.latLngBounds(pontos), { padding: [24, 24] })
        else if (centro) map.setView(centro, 15)
        // so ao abrir
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map])
    return null
}

interface Props {
    latitude?: number | null
    longitude?: number | null
    valor: unknown
    onChange?: (area: PontoArea[] | null) => void
    altura?: number
}

export default function EditorAreaGrupo({ latitude, longitude, valor, onChange, altura = 320 }: Props) {
    const [pontos, setPontos] = useState<PontoArea[]>(() => lerArea(valor) ?? [])
    const [desenhar, setDesenhar] = useState(false)
    const centro: [number, number] | null = latitude != null && longitude != null ? [latitude, longitude] : null
    const editavel = !!onChange

    function mudar(novos: PontoArea[]) {
        setPontos(novos)
        onChange?.(novos.length >= 3 ? novos : null)
    }

    const botao = 'a-botao a-botao-secundario !min-h-[44px] !px-3 text-[15px]'

    // app-novo: os botoes ficam com o estilo da app tambem nas paginas antigas
    return (
        <div className="app-novo space-y-2" style={{ background: 'transparent' }}>
            <div className="relative isolate overflow-hidden rounded-[14px] border" style={{ height: altura, borderColor: 'var(--a-borda)' }}>
                {/* So leitura no telemovel: nao arrasta, para nao prender o scroll da pagina */}
                <MapContainer center={centro ?? CENTRO_PT} zoom={centro ? 15 : 7} scrollWheelZoom={false}
                    dragging={editavel || !L.Browser.mobile}
                    style={{ height: '100%', width: '100%', zIndex: 0, cursor: desenhar ? 'crosshair' : undefined }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Enquadrar pontos={pontos} centro={centro} />
                    {pontos.length >= 3 && <Polygon positions={pontos} pathOptions={{ color: COR, weight: 2, fillOpacity: 0.2 }} />}
                    {pontos.length === 2 && <Polyline positions={pontos} pathOptions={{ color: COR, weight: 2, dashArray: '6 6' }} />}
                    {desenhar && pontos.map((p, i) => (
                        <CircleMarker key={i} center={p} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: COR, fillOpacity: 1 }} />
                    ))}
                    {centro && <Marker position={centro} icon={icone} />}
                    {editavel && <Toques ativo={desenhar} onToque={(p) => pontos.length < MAX_PONTOS_AREA && mudar([...pontos, p])} />}
                </MapContainer>
                {desenhar && (
                    <p className="pointer-events-none absolute inset-x-2 top-2 z-[400] rounded-[10px] px-3 py-2 text-center text-[14px] font-semibold"
                        style={{ background: 'rgba(0,0,0,0.7)', color: '#fff' }}>
                        {pontos.length < 3 ? `Toque no mapa para marcar os cantos da zona (${pontos.length}/3)` : 'Continue a tocar para ajustar, ou toque em Concluir'}
                    </p>
                )}
            </div>

            {editavel && (
                <div className="flex flex-wrap items-center gap-2">
                    {desenhar ? (
                        <>
                            <button type="button" className={botao} onClick={() => mudar(pontos.slice(0, -1))} disabled={!pontos.length}>
                                <Undo2 size={18} aria-hidden /> Desfazer ponto
                            </button>
                            <button type="button" className="a-botao a-botao-principal !min-h-[44px] !px-4 text-[15px]" onClick={() => setDesenhar(false)}>
                                <Check size={18} aria-hidden /> Concluir
                            </button>
                        </>
                    ) : (
                        <button type="button" className={botao} onClick={() => setDesenhar(true)}>
                            <PenLine size={18} aria-hidden /> {pontos.length >= 3 ? 'Alterar área' : 'Desenhar área'}
                        </button>
                    )}
                    {pontos.length > 0 && (
                        <button type="button" className={botao} onClick={() => { mudar([]); setDesenhar(true) }}>
                            <Trash2 size={18} aria-hidden /> Limpar
                        </button>
                    )}
                    <span className="text-[14px] a-suave">
                        {pontos.length >= 3 ? `Área com ${pontos.length} pontos` : 'Sem área desenhada'}
                    </span>
                </div>
            )}
        </div>
    )
}
