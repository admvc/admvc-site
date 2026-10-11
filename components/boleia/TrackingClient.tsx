'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft, Navigation, Square, Loader2, Car, MapPin, Clock, User } from 'lucide-react'
import { iniciarTracking, pararTracking } from '@/actions/boleia-actions'

const MapaTracking = dynamic(() => import('@/components/boleia/MapaTracking'), {
    ssr: false,
    loading: () => <div className="w-full h-[50vh] rounded-2xl bg-bg2 border border-soft animate-pulse" />,
})

interface Participante {
    membroId: number
    nome: string
    papel: 'MOTORISTA' | 'PASSAGEIRO'
}

interface PosicaoAtiva {
    membroId: number
    nome: string
    papel: string
    latitude: number
    longitude: number
    atualizadoEm: string
}

interface Props {
    ofertaId: number
    membroId: number
    isMotorista: boolean
    participantes: Participante[]
    enderecoPartida: string
    dataHoraSaida: string
    eventoNome: string | null
    latitudePartida: number | null
    longitudePartida: number | null
}

export default function TrackingClient({
    ofertaId,
    membroId,
    isMotorista,
    participantes,
    enderecoPartida,
    dataHoraSaida,
    eventoNome,
    latitudePartida,
    longitudePartida,
}: Props) {
    const [ativo, setAtivo] = useState(false)
    const [loading, setLoading] = useState(false)
    const [posicoes, setPosicoes] = useState<PosicaoAtiva[]>([])
    const [erro, setErro] = useState('')
    const watchIdRef = useRef<number | null>(null)
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Calcular distancia entre dois pontos (Haversine)
    const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371
        const dLat = (lat2 - lat1) * Math.PI / 180
        const dLon = (lon2 - lon1) * Math.PI / 180
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    }

    // Buscar posicoes dos outros participantes
    const fetchPosicoes = useCallback(async () => {
        try {
            const res = await fetch(`/api/boleia/tracking?ofertaId=${ofertaId}`)
            if (res.ok) {
                const data = await res.json()
                setPosicoes(data.posicoes || [])
            }
        } catch { /* silencioso */ }
    }, [ofertaId])

    // Enviar posicao ao servidor
    const enviarPosicao = useCallback(async (lat: number, lng: number) => {
        try {
            await fetch('/api/boleia/tracking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ofertaId, latitude: lat, longitude: lng }),
            })
        } catch { /* silencioso */ }
    }, [ofertaId])

    // Iniciar tracking
    const handleIniciar = async () => {
        setLoading(true)
        setErro('')

        if (!navigator.geolocation) {
            setErro('Geolocalização não suportada neste dispositivo.')
            setLoading(false)
            return
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const res = await iniciarTracking(ofertaId, pos.coords.latitude, pos.coords.longitude)
                if (res.success) {
                    setAtivo(true)

                    // Iniciar watchPosition para enviar atualizacoes
                    watchIdRef.current = navigator.geolocation.watchPosition(
                        (p) => enviarPosicao(p.coords.latitude, p.coords.longitude),
                        () => {},
                        { enableHighAccuracy: true, maximumAge: 5000 }
                    )

                    // Iniciar polling para receber posicoes dos outros
                    pollingRef.current = setInterval(fetchPosicoes, 7000)
                    fetchPosicoes()
                } else {
                    setErro(res.error || 'Erro ao iniciar tracking.')
                }
                setLoading(false)
            },
            (err) => {
                setErro('Não foi possível obter a sua localização. Verifique as permissões.')
                setLoading(false)
            },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    // Parar tracking
    const handleParar = async () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current)
            watchIdRef.current = null
        }
        if (pollingRef.current) {
            clearInterval(pollingRef.current)
            pollingRef.current = null
        }
        await pararTracking(ofertaId)
        setAtivo(false)
        setPosicoes([])
    }

    // Cleanup ao sair da pagina
    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
            if (pollingRef.current) clearInterval(pollingRef.current)
        }
    }, [])

    // Se nao estou a partilhar, mas quero ver os outros (passageiro modo passivo)
    useEffect(() => {
        if (!ativo) {
            // Polling mais lento para ver se alguem ja esta a partilhar
            const passivePolling = setInterval(fetchPosicoes, 10000)
            fetchPosicoes()
            return () => clearInterval(passivePolling)
        }
    }, [ativo, fetchPosicoes])

    const dataFormatada = new Date(dataHoraSaida).toLocaleString('pt-PT', {
        weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    })

    // Calcular distancia entre motorista e passageiro
    const posMotorista = posicoes.find(p => p.papel === 'MOTORISTA')
    const posPassageiro = posicoes.find(p => p.membroId === membroId)
    const distanciaKm = posMotorista && posPassageiro
        ? calcularDistancia(posMotorista.latitude, posMotorista.longitude, posPassageiro.latitude, posPassageiro.longitude)
        : null

    return (
        <div className="min-h-screen bg-bg px-4 pt-16 pb-28 space-y-4 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex items-center gap-3">
                <Link href="/boleia/minhas" className="w-9 h-9 flex items-center justify-center bg-bg2 border border-soft text-muted rounded-xl hover:text-fg transition-all">
                    <ArrowLeft size={16} />
                </Link>
                <div className="flex-1 min-w-0">
                    <h1 className="text-sm font-black uppercase italic tracking-tighter text-fg">Tracking em Tempo Real</h1>
                    <p className="text-xs text-muted font-bold truncate">{eventoNome || enderecoPartida}</p>
                </div>
            </div>

            {/* INFO CARD */}
            <div className="bg-bg2 border border-soft rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs text-fg font-bold">
                    <Clock size={14} className="text-figueira" /> {dataFormatada}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                    <MapPin size={14} /> {enderecoPartida}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                    <User size={14} /> {participantes.length} participante{participantes.length !== 1 ? 's' : ''}
                </div>
                {distanciaKm !== null && (
                    <div className="flex items-center gap-2 text-xs font-black text-figueira">
                        <Car size={14} />
                        {distanciaKm < 1
                            ? `${Math.round(distanciaKm * 1000)} metros de distância`
                            : `${distanciaKm.toFixed(1)} km de distância`
                        }
                    </div>
                )}
            </div>

            {/* MAPA */}
            <MapaTracking
                posicoes={posicoes}
                meuMembroId={membroId}
                latitudePartida={latitudePartida}
                longitudePartida={longitudePartida}
            />

            {/* PARTICIPANTES */}
            <div className="bg-bg2 border border-soft rounded-2xl p-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Participantes</p>
                {participantes.map(p => {
                    const posicaoAtiva = posicoes.find(pos => pos.membroId === p.membroId)
                    return (
                        <div key={p.membroId} className="flex items-center gap-3 py-1">
                            <div className={`w-3 h-3 rounded-full shrink-0 ${posicaoAtiva ? 'bg-emerald-500 animate-pulse' : 'bg-muted/30'}`} />
                            <span className="text-xs font-bold text-fg flex-1">{p.nome}</span>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                                p.papel === 'MOTORISTA'
                                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                    : 'bg-figueira/10 text-figueira border-figueira/20'
                            }`}>
                                {p.papel === 'MOTORISTA' ? 'Motorista' : 'Passageiro'}
                            </span>
                        </div>
                    )
                })}
            </div>

            {/* ERRO */}
            {erro && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-2xl text-xs font-bold">
                    {erro}
                </div>
            )}

            {/* BOTÃO INICIAR / PARAR */}
            <div className="fixed bottom-20 left-4 right-4 z-30">
                {!ativo ? (
                    <button
                        onClick={handleIniciar}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-figueira text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50"
                    >
                        {loading
                            ? <><Loader2 size={16} className="animate-spin" /> A obter localização...</>
                            : <><Navigation size={16} /> {isMotorista ? 'Iniciar Viagem' : 'Partilhar Localização'}</>
                        }
                    </button>
                ) : (
                    <button
                        onClick={handleParar}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                    >
                        <Square size={16} /> Parar {isMotorista ? 'Viagem' : 'Partilha'}
                    </button>
                )}
            </div>
        </div>
    )
}
