'use client'
// Mapa das famílias (só admins). Carregado com dynamic({ ssr: false }) — ver MapaFamiliasLazy.
// Um círculo por casa (cor da congregação; contorno tracejado vermelho = ninguém num grupo),
// as zonas dos grupos por cima e um botão para o mapa ocupar o ecrã todo.

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Polygon, Circle, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import Link from 'next/link'
import { Maximize2, Minimize2 } from 'lucide-react'
import type { PontoFamilia } from '@/lib/mapa-familias'

export interface GrupoNoMapa { id: number; nome: string; area: [number, number][] | null; lat: number | null; lng: number | null }

function Ajustar({ pontos, grande }: { pontos: PontoFamilia[]; grande: boolean }) {
    const map = useMap()
    // Mudou de tamanho (ecrã inteiro): o Leaflet tem de voltar a medir
    useEffect(() => { const t = setTimeout(() => map.invalidateSize(), 150); return () => clearTimeout(t) }, [grande, map])
    useEffect(() => {
        if (pontos.length === 0) return
        if (pontos.length === 1) { map.setView([pontos[0].lat, pontos[0].lng], 15); return }
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const L = require('leaflet')
        map.fitBounds(L.latLngBounds(pontos.map(p => [p.lat, p.lng])), { padding: [30, 30], maxZoom: 15 })
    }, [pontos, map])
    return null
}

export default function MapaFamilias({ pontos, grupos, mostrarGrupos, corDe }: {
    pontos: PontoFamilia[]
    grupos: GrupoNoMapa[]
    mostrarGrupos: boolean
    corDe: (congregacaoId: number | null) => string
}) {
    const [grande, setGrande] = useState(false)

    // Esc fecha o ecrã inteiro
    useEffect(() => {
        if (!grande) return
        const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setGrande(false) }
        window.addEventListener('keydown', tecla)
        return () => window.removeEventListener('keydown', tecla)
    }, [grande])

    return (
        <div className={grande ? 'fixed inset-0 z-[9999] bg-bg p-2' : 'relative'}>
            <button type="button" onClick={() => setGrande(g => !g)}
                className="absolute right-3 top-3 z-[1000] flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-2 text-[14px] font-semibold text-gray-900 shadow-md"
                style={grande ? { right: 20, top: 20 } : undefined}
                aria-label={grande ? 'Sair do ecrã inteiro' : 'Ecrã inteiro'}>
                {grande ? <Minimize2 size={16} aria-hidden /> : <Maximize2 size={16} aria-hidden />}
                {grande ? 'Fechar' : 'Ecrã inteiro'}
            </button>
            {/* A altura muda na caixa: o MapContainer ignora mudanças de estilo depois de criado */}
            <div style={{ height: grande ? 'calc(100dvh - 16px)' : '560px', borderRadius: grande ? 12 : 20, overflow: 'hidden' }}>
            <MapContainer center={[40.15, -8.86]} zoom={12} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
                <Ajustar pontos={pontos} grande={grande} />

                {mostrarGrupos && grupos.map(g => g.area && g.area.length >= 3 ? (
                    <Polygon key={`g${g.id}`} positions={g.area} pathOptions={{ color: '#2563eb', weight: 2, fillOpacity: 0.08 }}>
                        <Tooltip sticky>{g.nome}</Tooltip>
                    </Polygon>
                ) : g.lat != null && g.lng != null ? (
                    <Circle key={`g${g.id}`} center={[g.lat, g.lng]} radius={600} pathOptions={{ color: '#2563eb', weight: 2, fillOpacity: 0.08 }}>
                        <Tooltip sticky>{g.nome}</Tooltip>
                    </Circle>
                ) : null)}

                {pontos.map(p => (
                    <CircleMarker key={p.chave} center={[p.lat, p.lng]} radius={Math.min(7 + p.pessoas * 1.5, 16)}
                        pathOptions={{
                            color: p.sem_grupo ? '#dc2626' : '#ffffff', weight: p.sem_grupo ? 3 : 2,
                            dashArray: p.sem_grupo ? '4 3' : undefined,
                            fillColor: corDe(p.congregacao_id), fillOpacity: 0.9,
                        }}>
                        <Popup>
                            <div style={{ minWidth: 180 }}>
                                <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{p.nome}</p>
                                <p style={{ margin: '2px 0', color: '#555' }}>{p.pessoas} pessoa{p.pessoas !== 1 ? 's' : ''}{p.bairro ? ` · ${p.bairro}` : ''}</p>
                                <p style={{ margin: '2px 0', fontSize: 13 }}>{p.nomes.join(', ')}</p>
                                {p.sem_grupo && <p style={{ margin: '4px 0', color: '#dc2626', fontWeight: 600 }}>Ninguém da casa está num grupo</p>}
                                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#777' }}>
                                    Posição: {p.fonte === 'censo' ? 'Censo' : p.fonte === 'morada' ? 'morada' : p.fonte === 'codigo-postal' ? 'código postal (aproximada)' : 'bairro (aproximada)'}
                                </p>
                                {p.familia_id && <Link href={`/admin/familias?q=${encodeURIComponent(p.nome.replace(/^Família /, ''))}`} style={{ fontSize: 13 }}>Ver a família</Link>}
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
            </MapContainer>
            </div>
        </div>
    )
}
