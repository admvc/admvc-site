'use client'

import { useState, useEffect } from 'react'
import {
    MonitorPlay, CheckCircle2, XCircle, Loader2,
    ArrowLeft, ArrowRight, Type, Menu,
    Monitor, ListVideo, Film, Music, FileText, Square,
    ChevronDown, ChevronRight, TerminalSquare, ChevronUp, Image as ImageIcon,
    StopCircle, BookOpen, X
} from 'lucide-react'

// TIPAGENS DA API
type HolyricsItem = {
    id: string;
    type: 'title' | 'plain_text' | 'audio' | 'song' | 'video' | 'image' | 'presentation';
    name: string;
    text?: string;
    background_color?: string;
    collapsed?: boolean;
}

type PlaylistGroup = {
    id: string;
    titleInfo: HolyricsItem;
    items: HolyricsItem[];
    isExpanded: boolean;
}

type LogItem = {
    id: number;
    time: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'request';
}

type HolyricsFavorite = {
    id: string;
    name: string;
}

interface Props {
    holyricsUrl: string
    holyricsToken: string
}

// LISTA DE LIVROS DA BÍBLIA
const bibleBooks = [
    "Gênesis", "Êxodo", "Levítico", "Números", "Deuteronômio", "Josué", "Juízes", "Rute",
    "1 Samuel", "2 Samuel", "1 Reis", "2 Reis", "1 Crônicas", "2 Crônicas", "Esdras", "Neemias", "Ester",
    "Jó", "Salmos", "Provérbios", "Eclesiastes", "Cânticos", "Isaías", "Jeremias", "Lamentações", "Ezequiel", "Daniel",
    "Oseias", "Joel", "Amós", "Obadias", "Jonas", "Miqueias", "Naum", "Habacuque", "Sofonias", "Ageu", "Zacarias", "Malaquias",
    "Mateus", "Marcos", "Lucas", "João", "Atos", "Romanos", "1 Coríntios", "2 Coríntios", "Gálatas", "Efésios",
    "Filipenses", "Colossenses", "1 Tessalonicenses", "2 Tessalonicenses", "1 Timóteo", "2 Timóteo", "Tito", "Filemom",
    "Hebreus", "Tiago", "1 Pedro", "2 Pedro", "1 João", "2 João", "3 João", "Judas", "Apocalipse"
]

export default function HolyricsController({ holyricsUrl, holyricsToken }: Props) {
    const ipAddress = holyricsUrl
    const apiToken = holyricsToken

    // ESTADOS DA CONEXÃO
    const [status, setStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState('')

    // ESTADOS DA UI E DADOS
    const [playlistGroups, setPlaylistGroups] = useState<PlaylistGroup[]>([])
    const [favorites, setFavorites] = useState<HolyricsFavorite[]>([])
    const [loadingPlaylist, setLoadingPlaylist] = useState(false)
    const [logs, setLogs] = useState<LogItem[]>([])
    const [isTerminalOpen, setIsTerminalOpen] = useState(false)
    const [isFavoritesMenuOpen, setIsFavoritesMenuOpen] = useState(false)

    // ESTADOS DA BÍBLIA
    const [isBibleOpen, setIsBibleOpen] = useState(false)
    const [selectedBook, setSelectedBook] = useState('Gênesis')
    const [chapter, setChapter] = useState('1')
    const [verse, setVerse] = useState('1')

    // FUNÇÃO PARA ADICIONAR LOGS NO ECRÃ
    const addLog = (message: string, type: LogItem['type'] = 'info') => {
        const time = new Date().toLocaleTimeString('pt-PT', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        setLogs(prev => [{ id: Date.now() + Math.random(), time, message, type }, ...prev].slice(0, 20))
    }

    // BUSCAR A PLAYLIST
    const fetchPlaylistReal = async () => {
        setLoadingPlaylist(true)
        const baseUrl = ipAddress.replace(/\/$/, '')
        try {
            addLog(`A solicitar Playlist...`, 'request')
            const response = await fetch(`${baseUrl}/api/GetMediaPlaylist?token=${apiToken}`)
            const json = await response.json()

            if (json.status === 'ok' && json.data) {
                const groups: PlaylistGroup[] = []
                let currentGroup: PlaylistGroup | null = null

                json.data.forEach((item: HolyricsItem) => {
                    if (item.type === 'title') {
                        currentGroup = { id: item.id, titleInfo: item, items: [], isExpanded: !item.collapsed }
                        groups.push(currentGroup)
                    } else {
                        if (!currentGroup) {
                            currentGroup = {
                                id: 'root',
                                titleInfo: { id: 'root', type: 'title', name: 'Sem Categoria', background_color: '333333' },
                                items: [],
                                isExpanded: true
                            }
                            groups.push(currentGroup)
                        }
                        currentGroup.items.push(item)
                    }
                })
                setPlaylistGroups(groups)
                addLog(`Playlist carregada com sucesso!`, 'success')
            } else {
                throw new Error("Formato de resposta inválido.")
            }
        } catch (error: any) {
            addLog(`Erro ao carregar Playlist: ${error.message}`, 'error')
        } finally {
            setLoadingPlaylist(false)
        }
    }

    // BUSCAR OS FAVORITOS
    const fetchFavorites = async () => {
        const baseUrl = ipAddress.replace(/\/$/, '')
        try {
            addLog(`A solicitar Favoritos...`, 'request')
            const response = await fetch(`${baseUrl}/api/GetFavorites?token=${apiToken}`)
            const json = await response.json()

            if (json.status === 'ok' && json.data) {
                setFavorites(json.data)
                addLog(`Favoritos carregados (${json.data.length} itens)`, 'success')
            }
        } catch (error: any) {
            addLog(`Erro ao carregar Favoritos: ${error.message}`, 'error')
        }
    }

    // AUTO-CONNECT AO CARREGAR A PÁGINA
    useEffect(() => {
        if (!ipAddress || !apiToken) {
            addLog('Configuracao Holyrics nao encontrada. Configure em Admin > Midia.', 'error')
            return
        }

        const connect = async () => {
            setStatus('testing')
            setErrorMessage('')
            const baseUrl = ipAddress.replace(/\/$/, '')

            try {
                addLog(`A conectar a ${baseUrl}...`, 'info')
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 4000)

                const res = await fetch(`${baseUrl}/api/GetMediaPlaylist?token=${apiToken}`, { signal: controller.signal })

                if (!res.ok) throw new Error(`Status HTTP: ${res.status}`)

                clearTimeout(timeoutId)
                setStatus('connected')
                addLog(`Conectado com sucesso!`, 'success')

                await fetchPlaylistReal()
                await fetchFavorites()
            } catch (error: any) {
                setStatus('error')
                const msg = error.name === 'AbortError' ? 'Tempo esgotado (Timeout)' : error.message
                setErrorMessage(`Falha na comunicação: ${msg}`)
                addLog(`Falha na conexão: ${msg}`, 'error')
            }
        }

        connect()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // ENVIAR COMANDOS
    const sendCommand = async (action: string, extraParams: string = '', payload?: any) => {
        if (status !== 'connected') {
            addLog(`[BLOQUEADO] Não conectado.`, 'error')
            return
        }

        const baseUrl = ipAddress.replace(/\/$/, '')
        const url = `${baseUrl}/api/${action}?token=${apiToken}${extraParams}`

        const options: RequestInit = { method: payload ? 'POST' : 'GET' }
        if (payload) {
            options.headers = { 'Content-Type': 'application/json' }
            options.body = JSON.stringify(payload)
            addLog(`[POST] /api/${action} | Payload: ${JSON.stringify(payload)}`, 'request')
        } else {
            addLog(`[GET] /api/${action}${extraParams}`, 'request')
        }

        try {
            const response = await fetch(url, options)
            const responseText = await response.text()
            if (response.ok) {
                addLog(`[SUCESSO] ${responseText.substring(0, 100)}`, 'success')
            } else {
                addLog(`[ERRO HTTP ${response.status}] ${responseText}`, 'error')
            }
        } catch (error: any) {
            addLog(`[FALHA DE REDE] ${error.message}`, 'error')
            addLog(`A tentar forçar o envio em modo cego (no-cors)...`, 'info')
            try {
                await fetch(url, { ...options, mode: 'no-cors' })
                addLog(`[NO-CORS] Pedido forçado`, 'info')
            } catch (fallbackErr: any) {
                addLog(`[FALHA FATAL] ${fallbackErr.message}`, 'error')
            }
        }
    }

    // EXECUTAR UM FAVORITO
    const executeFavorite = (favId: string) => {
        setIsFavoritesMenuOpen(false)
        sendCommand('FavoriteAction', '', { id: favId })
    }

    // PROJETAR BÍBLIA
    const projectBible = () => {
        sendCommand('PlayBibleAction', '', {
            book: selectedBook,
            chapter: parseInt(chapter),
            verse: parseInt(verse)
        })
        setIsBibleOpen(false)
    }

    const toggleGroup = (groupId: string) => {
        setPlaylistGroups(prev => prev.map(g => g.id === groupId ? { ...g, isExpanded: !g.isExpanded } : g))
    }

    const renderIcone = (tipo: string) => {
        switch (tipo) {
            case 'video': return <Film size={14} />
            case 'image': return <ImageIcon size={14} />
            case 'audio': return <Music size={14} />
            case 'song': return <Music size={14} className="text-figueira" />
            case 'presentation': return <FileText size={14} />
            case 'plain_text': return <Type size={14} />
            default: return <Monitor size={14} />
        }
    }

    return (
        <main className="max-w-screen-2xl mx-auto p-4 sm:p-6 pb-20 animate-in fade-in duration-700 h-screen flex flex-col">
            {/* CABEÇALHO — apenas status de conexão (read-only) */}
            <header className="mb-4 flex items-center justify-between bg-bg2 border border-soft px-4 py-3 rounded-2xl shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${status === 'connected' ? 'bg-green-500 text-white' : status === 'testing' ? 'bg-soft text-muted' : 'bg-soft text-muted'}`}>
                        {status === 'testing' ? <Loader2 size={16} className="animate-spin" /> : <MonitorPlay size={16} />}
                    </div>
                    <div>
                        <h1 className="text-sm font-black italic uppercase tracking-tighter text-fg leading-none">Holyrics</h1>
                        <span className="text-[8px] font-bold uppercase tracking-widest text-muted flex items-center gap-1">
                            {status === 'connected' ? <CheckCircle2 size={8} className="text-green-500" /> : status === 'testing' ? <Loader2 size={8} className="animate-spin" /> : <XCircle size={8} className="text-red-400" />}
                            {status === 'connected' ? 'Conectado' : status === 'testing' ? 'A conectar...' : 'Desconectado'}
                        </span>
                    </div>
                </div>
                {ipAddress && (
                    <span className="text-[8px] font-bold uppercase tracking-widest text-muted bg-soft px-2 py-1 rounded">
                        {ipAddress.replace(/^https?:\/\//, '')}
                    </span>
                )}
            </header>

            {/* ÁREA DE TRABALHO PRINCIPAL (SPLIT VIEW) */}
            <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 opacity-100 transition-opacity duration-500">

                {/* COLUNA ESQUERDA: LISTA DE REPRODUÇÃO */}
                <div className={`lg:w-1/3 xl:w-1/4 bg-bg2 border border-soft rounded-3xl flex flex-col overflow-hidden shadow-sm transition-all duration-300 ${status !== 'connected' && 'opacity-50 pointer-events-none grayscale'}`}>
                    <div className="p-4 border-b border-soft flex justify-between items-center shrink-0 bg-soft/10">
                        <div className="flex items-center gap-2">
                            <ListVideo className="text-figueira" size={18} />
                            <h3 className="text-xs font-black uppercase italic tracking-tighter text-fg">Escala do Culto</h3>
                        </div>
                        {loadingPlaylist ? <Loader2 size={14} className="animate-spin text-muted" /> : (
                            <button onClick={fetchPlaylistReal} className="p-1.5 bg-bg border border-soft rounded-md hover:text-figueira transition-colors" title="Atualizar Lista">
                                <Loader2 size={12} className="rotate-180" />
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
                        {playlistGroups.map((group) => (
                            <div key={group.id} className="space-y-1.5">
                                <button
                                    onClick={() => toggleGroup(group.id)}
                                    className="w-full flex items-center justify-between p-2.5 rounded-lg transition-all hover:brightness-110 active:scale-[0.99] text-white shadow-sm"
                                    style={{ backgroundColor: group.titleInfo.background_color ? `#${group.titleInfo.background_color}` : '#333' }}
                                >
                                    <div className="flex items-center gap-2">
                                        {group.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        <span className="text-[10px] font-black uppercase tracking-widest drop-shadow-md truncate">{group.titleInfo.name}</span>
                                    </div>
                                    <span className="text-[9px] font-bold bg-black/20 px-1.5 py-0.5 rounded-md">{group.items.length}</span>
                                </button>

                                {group.isExpanded && (
                                    <div className="space-y-1 pl-1.5 animate-in slide-in-from-top-1 duration-200">
                                        {group.items.map((item) => (
                                            <div
                                                key={item.id}
                                                onClick={() => {
                                                    sendCommand('MediaPlaylistAction', '', { action: 'play', id: item.id })
                                                }}
                                                className="group flex items-start gap-2.5 p-2.5 rounded-xl border bg-bg border-soft hover:border-figueira/50 hover:shadow-md transition-all cursor-pointer"
                                            >
                                                <div className="p-1.5 bg-soft/50 text-muted rounded-md shrink-0 mt-0.5 group-hover:bg-figueira/10 group-hover:text-figueira transition-colors">
                                                    {renderIcone(item.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-[11px] font-black text-fg truncate group-hover:text-figueira transition-colors">{item.name}</h4>
                                                    {item.text && (
                                                        <p className="text-[8px] font-bold text-muted line-clamp-1 mt-0.5 leading-relaxed">"{item.text.replace(/\n/g, ' ')}"</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* COLUNA DIREITA: TELAS E CONTROLES */}
                <div className={`lg:w-2/3 xl:w-3/4 flex flex-col gap-4 transition-all duration-300 h-full ${status !== 'connected' && 'opacity-50 pointer-events-none grayscale'}`}>

                    {/* BARRA DE FERRAMENTAS */}
                    <div className="bg-bg2 border border-soft p-3 rounded-2xl shadow-sm flex flex-wrap gap-2 shrink-0">
                        {/* Navegação Básica */}
                        <div className="flex gap-2 mr-auto">
                            <button onClick={() => sendCommand('ActionPrevious')} className="bg-bg border border-soft hover:border-figueira hover:text-figueira text-fg px-4 py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95">
                                <ArrowLeft size={16} /> <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Anterior</span>
                            </button>
                            <button onClick={() => sendCommand('ActionNext')} className="bg-bg border border-soft hover:border-figueira hover:text-figueira text-fg px-4 py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95">
                                <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Próximo</span> <ArrowRight size={16} />
                            </button>
                        </div>

                        {/* Ações Especiais e Favoritos */}
                        <div className="flex gap-2 relative">
                            {/* MENU HAMBURGER DOS FAVORITOS */}
                            <button
                                onClick={() => setIsFavoritesMenuOpen(!isFavoritesMenuOpen)}
                                className={`bg-bg border border-soft hover:border-blue-500 hover:text-blue-500 text-fg px-4 py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95 ${isFavoritesMenuOpen && 'border-blue-500 text-blue-500 shadow-md'}`}
                                title="Favoritos"
                            >
                                <Menu size={16} /> <span className="text-[9px] font-black uppercase tracking-widest hidden xl:inline">Favoritos</span>
                            </button>

                            {/* DROPDOWN DOS FAVORITOS */}
                            {isFavoritesMenuOpen && (
                                <div className="absolute top-full mt-2 right-0 md:right-auto md:left-0 w-56 bg-bg border border-soft rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    <div className="bg-soft/20 px-4 py-2 border-b border-soft/50 flex justify-between items-center">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-muted">Acesso Rápido</span>
                                        <span className="text-[9px] bg-bg2 px-1.5 rounded text-fg">{favorites.length}</span>
                                    </div>
                                    <div className="flex flex-col max-h-60 overflow-y-auto scrollbar-hide p-2 gap-1">
                                        {favorites.length === 0 ? (
                                            <div className="p-4 text-center text-muted text-[10px] font-bold">Nenhum favorito guardado no Holyrics.</div>
                                        ) : (
                                            favorites.map((fav) => (
                                                <button
                                                    key={fav.id}
                                                    onClick={() => executeFavorite(fav.id)}
                                                    className="text-left px-3 py-2.5 hover:bg-soft/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-fg transition-colors truncate"
                                                >
                                                    {fav.name}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Botão da Bíblia */}
                            <button
                                onClick={() => setIsBibleOpen(true)}
                                className="bg-bg border border-soft hover:border-blue-500 hover:text-blue-500 text-fg px-4 py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95"
                                title="Abrir Bíblia"
                            >
                                <BookOpen size={16} /> <span className="text-[9px] font-black uppercase tracking-widest hidden xl:inline">Bíblia</span>
                            </button>

                            <button onClick={() => sendCommand('ToggleF8')} className="bg-bg border border-soft hover:border-orange-500 hover:text-orange-500 text-fg px-4 py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95" title="Esconder/Mostrar Texto">
                                <Type size={16} /> <span className="text-[9px] font-black uppercase tracking-widest hidden xl:inline">Limpar Texto</span>
                            </button>

                            <button
                                onClick={() => sendCommand('MediaPlayerAction', '', { action: 'stop' })}
                                className="bg-bg border border-soft hover:border-red-500 hover:text-red-500 text-fg px-4 py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95"
                                title="Parar Mídia no VLC"
                            >
                                <StopCircle size={16} /> <span className="text-[9px] font-black uppercase tracking-widest hidden xl:inline">Stop Mídia</span>
                            </button>

                            <button onClick={() => sendCommand('CloseCurrentPresentation')} className="bg-red-500/10 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-600 px-4 py-2 rounded-xl flex items-center gap-2 transition-all active:scale-95" title="Fechar Apresentação Atual">
                                <Square size={16} className="fill-current" /> <span className="text-[9px] font-black uppercase tracking-widest hidden xl:inline">Apagar Tudo</span>
                            </button>
                        </div>
                    </div>

                    {/* MONITORES (TELÃO PRINCIPAL E RETORNO) - AJUSTADOS PARA 16:9 */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full items-center justify-center p-2 bg-bg/50 rounded-3xl border border-soft/50 shrink-0">

                        {/* Monitor Principal */}
                        <div className="flex-1 w-full aspect-video bg-black rounded-2xl border-4 border-bg2 shadow-2xl relative overflow-hidden flex flex-col group">
                            <div className="absolute top-3 left-3 bg-red-600 text-white text-[8px] px-2 py-1 rounded-full font-black uppercase tracking-widest z-10 flex items-center gap-1.5 shadow-md">
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                Telão Principal
                            </div>

                            {status === 'connected' ? (
                                <iframe
                                    src={`http://${ipAddress.replace(/^https?:\/\//, '').split(':')[0]}:8080/view/standard`}
                                    className="absolute inset-0 w-full h-full border-0 pointer-events-none"
                                    title="Telão Principal"
                                />
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center opacity-30 group-hover:opacity-50 transition-opacity">
                                    <Monitor size={48} strokeWidth={1} className="text-white mb-2" />
                                    <span className="text-[10px] text-white font-bold uppercase tracking-widest">Aguardando Imagem</span>
                                </div>
                            )}
                        </div>

                        {/* Monitor Retorno */}
                        <div className="flex-1 w-full aspect-video bg-neutral-900 rounded-2xl border-4 border-bg2 shadow-xl relative overflow-hidden flex flex-col group">
                            <div className="absolute top-3 left-3 bg-blue-600 text-white text-[8px] px-2 py-1 rounded-full font-black uppercase tracking-widest z-10 flex items-center gap-1.5 shadow-md">
                                <MonitorPlay size={10} />
                                Retorno (Palco)
                            </div>

                            {status === 'connected' ? (
                                <iframe
                                    src={`http://${ipAddress.replace(/^https?:\/\//, '').split(':')[0]}:8080/view/text2`}
                                    className="absolute inset-0 w-full h-full border-0 pointer-events-none"
                                    title="Retorno de Palco"
                                />
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity">
                                    <Monitor size={40} strokeWidth={1} className="text-white mb-2" />
                                    <span className="text-[9px] text-white font-bold uppercase tracking-widest">Visão do Altar</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* TERMINAL DE LOGS — sempre interativo, fora da zona bloqueada */}
            <div className="bg-black/95 rounded-2xl shadow-inner flex flex-col overflow-hidden border border-white/10 shrink-0 transition-all duration-300 mt-4">
                <button
                    onClick={() => setIsTerminalOpen(!isTerminalOpen)}
                    className="bg-white/5 hover:bg-white/10 p-3 flex items-center justify-between w-full transition-colors active:bg-white/15"
                >
                    <div className="flex items-center gap-2">
                        <TerminalSquare size={14} className="text-white/60" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/60">
                            Terminal de Logs {logs.length > 0 && `(${logs.length})`}
                        </span>
                    </div>
                    {isTerminalOpen ? <ChevronDown size={14} className="text-white/60" /> : <ChevronUp size={14} className="text-white/60" />}
                </button>

                {isTerminalOpen && (
                    <div className="p-3 h-40 overflow-y-auto font-mono text-[9px] space-y-1.5 bg-black/50 scrollbar-hide">
                        {logs.length === 0 ? (
                            <p className="text-white/30 text-center italic mt-10">A aguardar comandos...</p>
                        ) : (
                            logs.map((log) => (
                                <div key={log.id} className="flex gap-2 leading-relaxed border-b border-white/5 pb-1">
                                    <span className="text-white/30 shrink-0">[{log.time}]</span>
                                    <span className={`
                                        ${log.type === 'request' ? 'text-blue-400' : ''}
                                        ${log.type === 'success' ? 'text-green-400' : ''}
                                        ${log.type === 'error' ? 'text-red-400 font-bold' : ''}
                                        ${log.type === 'info' ? 'text-white/60' : ''}
                                        break-all
                                    `}>
                                        {log.message}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* MODAL DA BÍBLIA */}
            {isBibleOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-bg border border-soft rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden">

                        {/* Cabeçalho do Modal */}
                        <div className="flex justify-between items-center p-4 border-b border-soft bg-soft/10">
                            <div className="flex items-center gap-2 text-fg">
                                <BookOpen size={20} className="text-blue-500" />
                                <h2 className="text-sm font-black uppercase tracking-widest">Bíblia Sagrada</h2>
                            </div>
                            <button onClick={() => setIsBibleOpen(false)} className="text-muted hover:text-red-500 transition-colors p-1">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Corpo do Modal */}
                        <div className="p-6 flex flex-col md:flex-row gap-6">

                            {/* Seleção de Livro (Scrollable) */}
                            <div className="flex-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block">Livro</label>
                                <div className="h-48 overflow-y-auto pr-2 space-y-1 scrollbar-thin scrollbar-thumb-soft scrollbar-track-transparent">
                                    {bibleBooks.map((book) => (
                                        <button
                                            key={book}
                                            onClick={() => setSelectedBook(book)}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${selectedBook === book ? 'bg-blue-500 text-white shadow-md' : 'hover:bg-soft/30 text-fg'}`}
                                        >
                                            {book}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Controles de Cap/Vers e Botão */}
                            <div className="flex flex-col gap-4 justify-center md:w-48">
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block">Capítulo</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={chapter}
                                            onChange={(e) => setChapter(e.target.value)}
                                            className="w-full bg-bg2 border border-soft rounded-xl px-4 py-3 text-center font-black text-lg text-fg outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted mb-2 block">Versículo</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={verse}
                                            onChange={(e) => setVerse(e.target.value)}
                                            className="w-full bg-bg2 border border-soft rounded-xl px-4 py-3 text-center font-black text-lg text-fg outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={projectBible}
                                    className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white px-4 py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                                >
                                    <MonitorPlay size={16} /> Projetar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </main>
    )
}
