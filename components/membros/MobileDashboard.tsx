'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import {
    Users, Car, Coffee, Calendar, BookOpen, ChevronDown, ChevronRight,
    MessageCircle, X, GraduationCap, Heart, Globe, Wallet, Church,
    Clock, HandHeart
} from 'lucide-react'
import { createPortal } from 'react-dom'

import QrCodeModal from '@/components/membros/QrCodeModal'
import CardDepartamentoMembro from '@/components/membros/CardDepartamentoMembro'
import ModalCursosMembro from '@/components/membros/ModalCursosMembro'
import BotoesEscala from '@/components/membros/BotoesEscala'

interface EscalaItem {
    id: number
    ids: number[]
    funcoes: string[]
    confirmado: boolean
    motivo_recusa: string | null
    horario: string | null
    evento: { id: number; nome: string; data: string }
    departamento: { id: number; nome: string }
}

interface EventoItem {
    id: number
    nome: string
    data: string
}

interface Props {
    membro: any
    escalas: EscalaItem[]
    departamentos: any[]
    membroId: number
    role: string
    proximosEventos?: EventoItem[]
    temEscalaCantina?: boolean
    cursosAtivos?: any[]
    meusInteresseIds?: string[]
    redesSociais?: { instagram?: string; facebook?: string; youtube?: string; website?: string }
}

export default function MobileDashboard({ membro, escalas, departamentos, membroId, role, proximosEventos = [], temEscalaCantina = false, cursosAtivos = [], meusInteresseIds = [], redesSociais }: Props) {
    const [agendaAberta, setAgendaAberta] = useState(false)
    const [cursosAberto, setCursosAberto] = useState(false)
    const [mostrarTodosEventos, setMostrarTodosEventos] = useState(false)
    const [ministeriosAberto, setMinisteriosAberto] = useState(false)
    const [ondeEuSirvoAberto, setOndeEuSirvoAberto] = useState(false)
    const [redesAberto, setRedesAberto] = useState(false)

    const nomeCompleto = `${membro.first_name} ${membro.last_name || ''}`.trim()
    const temDepartamento = departamentos.length > 0

    // Versículo do dia — roda entre versículos com base no dia do ano
    const versiculos = [
        { texto: 'Porque onde estiverem dois ou três reunidos em meu nome, ali eu estou no meio deles.', ref: 'Mateus 18:20' },
        { texto: 'O Senhor é o meu pastor; nada me faltará.', ref: 'Salmos 23:1' },
        { texto: 'Tudo posso naquele que me fortalece.', ref: 'Filipenses 4:13' },
        { texto: 'Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento.', ref: 'Provérbios 3:5' },
        { texto: 'O Senhor é a minha luz e a minha salvação; a quem temerei?', ref: 'Salmos 27:1' },
        { texto: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigénito.', ref: 'João 3:16' },
        { texto: 'Buscai primeiro o Reino de Deus e a sua justiça, e todas estas coisas vos serão acrescentadas.', ref: 'Mateus 6:33' },
        { texto: 'Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus.', ref: 'Isaías 41:10' },
        { texto: 'E conhecereis a verdade, e a verdade vos libertará.', ref: 'João 8:32' },
        { texto: 'Mas os que esperam no Senhor renovarão as suas forças.', ref: 'Isaías 40:31' },
        { texto: 'Lâmpada para os meus pés é a tua palavra e luz para o meu caminho.', ref: 'Salmos 119:105' },
        { texto: 'Alegrai-vos sempre no Senhor; outra vez digo: alegrai-vos!', ref: 'Filipenses 4:4' },
        { texto: 'Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia.', ref: 'Salmos 46:1' },
        { texto: 'Eu sou o caminho, a verdade e a vida.', ref: 'João 14:6' },
        { texto: 'Tudo o que fizerem, façam de todo o coração, como para o Senhor.', ref: 'Colossenses 3:23' },
        { texto: 'Porque os meus pensamentos não são os vossos pensamentos.', ref: 'Isaías 55:8' },
        { texto: 'O amor é paciente, o amor é bondoso.', ref: '1 Coríntios 13:4' },
        { texto: 'Clama a mim, e responder-te-ei, e anunciar-te-ei coisas grandes.', ref: 'Jeremias 33:3' },
        { texto: 'O Senhor é bom, um refúgio no dia da angústia.', ref: 'Naum 1:7' },
        { texto: 'Em tudo dai graças, porque esta é a vontade de Deus.', ref: '1 Tessalonicenses 5:18' },
        { texto: 'Não vos inquieteis por coisa alguma; antes, as vossas petições sejam em tudo conhecidas diante de Deus.', ref: 'Filipenses 4:6' },
        { texto: 'Sede fortes e corajosos. Não temais, nem vos espanteis.', ref: 'Deuteronómio 31:6' },
        { texto: 'Porque eu bem sei os pensamentos que tenho a vosso respeito, diz o Senhor; pensamentos de paz.', ref: 'Jeremias 29:11' },
        { texto: 'Grande é o Senhor e muito digno de louvor.', ref: 'Salmos 145:3' },
        { texto: 'Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.', ref: 'Mateus 11:28' },
        { texto: 'Aquele que habita no esconderijo do Altíssimo, à sombra do Omnipotente descansará.', ref: 'Salmos 91:1' },
        { texto: 'Eis que estou à porta e bato; se alguém ouvir a minha voz e abrir a porta, entrarei.', ref: 'Apocalipse 3:20' },
        { texto: 'Bem-aventurados os pacificadores, porque eles serão chamados filhos de Deus.', ref: 'Mateus 5:9' },
        { texto: 'A fé é a certeza daquilo que esperamos e a prova das coisas que não vemos.', ref: 'Hebreus 11:1' },
        { texto: 'Todas as coisas contribuem juntamente para o bem daqueles que amam a Deus.', ref: 'Romanos 8:28' },
        { texto: 'O Senhor é fiel; ele vos fortalecerá e vos guardará do maligno.', ref: '2 Tessalonicenses 3:3' },
    ]
    const diaDoAno = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
    const versiculoHoje = versiculos[diaDoAno % versiculos.length]

    const gridBtnClass = "bg-bg2 border border-soft rounded-2xl py-5 flex flex-col items-center gap-2.5 active:scale-95 transition-all"

    return (
        <div className="space-y-5 px-4 pt-16 pb-28 animate-in fade-in duration-500">

            {/* ── VERSÍCULO DO DIA + QR CODE ────────────── */}
            <div className="bg-bg2 border border-soft rounded-2xl p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5">
                        <BookOpen size={12} className="text-figueira shrink-0" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-figueira">Versículo do Dia</p>
                    </div>
                    <p className="text-xs text-fg/80 italic leading-snug line-clamp-2">
                        &ldquo;{versiculoHoje.texto}&rdquo;
                    </p>
                    <p className="text-[9px] font-bold text-muted uppercase tracking-widest">{versiculoHoje.ref}</p>
                </div>
                <QrCodeModal
                    membroId={membro.id}
                    qrCode={membro.qr_code || null}
                    membroNome={nomeCompleto}
                />
            </div>

            {/* ── BANNER POS CANTINA (escala activa hoje) ── */}
            {temEscalaCantina && (
                <Link href="/cantina/pos" className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 active:scale-[0.98] transition-all">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                        <Coffee size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-black uppercase text-fg">Abrir Ponto de Venda</h3>
                        <p className="text-[9px] text-amber-600 font-bold mt-0.5">Estás escalado na Cantina hoje</p>
                    </div>
                    <ChevronRight size={16} className="text-amber-500 shrink-0" />
                </Link>
            )}

            {/* ── ONDE EU SIRVO (full-width, só se tem departamento) ── */}
            {temDepartamento && (
                <button onClick={() => setOndeEuSirvoAberto(true)} className="w-full bg-figueira/5 border border-figueira/20 rounded-2xl py-4 flex items-center justify-center gap-3 active:scale-[0.98] transition-all">
                    <Users size={24} className="text-figueira" />
                    <span className="text-sm font-black uppercase tracking-widest text-figueira">Onde Eu Sirvo</span>
                    <span className="bg-figueira/10 text-figueira text-xs font-black px-2.5 py-0.5 rounded-lg">{departamentos.length}</span>
                </button>
            )}

            {/* ── GRELHA DE ÍCONES (3 colunas) ─────────── */}
            <div className="grid grid-cols-3 gap-3">
                <button onClick={() => setAgendaAberta(true)}>
                    <div className={gridBtnClass}>
                        <Calendar size={28} className="text-blue-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-fg text-center leading-tight px-1">Agenda</span>
                    </div>
                </button>

                <Link href="/boleia" className={gridBtnClass}>
                    <Car size={28} className="text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-fg text-center leading-tight px-1">Boleia</span>
                </Link>

                <button onClick={() => setCursosAberto(true)}>
                    <div className={gridBtnClass}>
                        <GraduationCap size={28} className="text-purple-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-fg text-center leading-tight px-1">Cursos</span>
                    </div>
                </button>

                <Link href="/cantina/menu-local" className={gridBtnClass}>
                    <Coffee size={28} className="text-amber-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-fg text-center leading-tight px-1">Cantina</span>
                </Link>

                <Link href="/financeiro/donativos" className={gridBtnClass}>
                    <HandHeart size={28} className="text-pink-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-fg text-center leading-tight px-1">Contribua</span>
                </Link>

                {temDepartamento ? (
                    <button onClick={() => setMinisteriosAberto(true)}>
                        <div className={gridBtnClass}>
                            <Church size={28} className="text-figueira" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-fg text-center leading-tight px-1">Ministérios</span>
                        </div>
                    </button>
                ) : (
                    <div className={`${gridBtnClass} opacity-30 pointer-events-none`}>
                        <Church size={28} className="text-muted" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted text-center leading-tight px-1">Ministérios</span>
                    </div>
                )}

                <Link href="/membros/mural" className={gridBtnClass}>
                    <Heart size={28} className="text-red-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-fg text-center leading-tight px-1">Orações</span>
                </Link>

                <button onClick={() => setRedesAberto(true)}>
                    <div className={gridBtnClass}>
                        <Globe size={28} className="text-cyan-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-fg text-center leading-tight px-1">Redes Sociais</span>
                    </div>
                </button>

                <Link href="/membros/dashboard?tab=financeiro" className={gridBtnClass}>
                    <Wallet size={28} className="text-teal-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-fg text-center leading-tight px-1">Extrato</span>
                </Link>
            </div>

            {/* ── DEVOCIONAL / BÍBLIA (full-width) ─────── */}
            <div className="bg-bg2 border border-soft rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                    <BookOpen size={16} className="text-figueira" />
                    <span className="text-xs font-black uppercase tracking-widest text-figueira">Devocional</span>
                </div>
                <p className="text-sm text-fg/80 italic leading-relaxed">
                    &ldquo;{versiculoHoje.texto}&rdquo;
                </p>
                <p className="text-xs font-bold text-muted uppercase tracking-widest mt-2">{versiculoHoje.ref}</p>
                <button
                    onClick={() => {
                        const texto = `📖 *${versiculoHoje.ref}*\n\n_"${versiculoHoje.texto}"_\n\n🙏 Bom dia!`
                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank')
                    }}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-50 text-green-600 border border-green-200 text-xs font-black uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all active:scale-95"
                >
                    <MessageCircle size={14} /> Partilhar
                </button>
            </div>

            {/* ── MODAL CURSOS ──────────────────────── */}
            <ModalCursosMembro
                aberto={cursosAberto}
                onClose={() => setCursosAberto(false)}
                cursos={cursosAtivos}
                meusInteresseIds={meusInteresseIds}
            />

            {/* ── MODAL ONDE EU SIRVO ────────────────── */}
            {ondeEuSirvoAberto && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
                    onClick={() => setOndeEuSirvoAberto(false)}
                >
                    <div
                        className="bg-bg w-full max-w-md rounded-t-[2rem] border-t border-soft shadow-2xl animate-in slide-in-from-bottom-4 duration-200 max-h-[80vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-soft shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-figueira/10 text-figueira flex items-center justify-center">
                                    <Users size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg">Onde Eu Sirvo</h3>
                                    <p className="text-xs font-bold text-muted uppercase tracking-widest">{departamentos.length} departamento{departamentos.length !== 1 ? 's' : ''}</p>
                                </div>
                            </div>
                            <button onClick={() => setOndeEuSirvoAberto(false)}
                                className="w-8 h-8 flex items-center justify-center bg-soft text-muted hover:text-fg rounded-xl transition-all">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-3 flex-1">
                            {departamentos.map((depto: any) => (
                                <CardDepartamentoMembro
                                    key={depto.id}
                                    depto={depto}
                                    membroId={membroId}
                                    role={role}
                                    podeGerirEscalas={depto.pode_gerir_escalas}
                                />
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── MODAL MINISTÉRIOS (escalas + equipa) ── */}
            {ministeriosAberto && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
                    onClick={() => setMinisteriosAberto(false)}
                >
                    <div
                        className="bg-bg w-full max-w-md rounded-t-[2rem] border-t border-soft shadow-2xl animate-in slide-in-from-bottom-4 duration-200 max-h-[85vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-soft shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-figueira/10 text-figueira flex items-center justify-center">
                                    <Church size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg">Ministérios</h3>
                                    <p className="text-xs font-bold text-muted uppercase tracking-widest">Escalas e Equipa</p>
                                </div>
                            </div>
                            <button onClick={() => setMinisteriosAberto(false)}
                                className="w-8 h-8 flex items-center justify-center bg-soft text-muted hover:text-fg rounded-xl transition-all">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {/* Próximas Escalas */}
                            <div className="px-4 pt-4 pb-2">
                                <h4 className="text-xs font-black uppercase tracking-widest text-muted mb-3">Próximas Escalas</h4>
                                {escalas.length > 0 ? (
                                    <div className="space-y-2">
                                        {escalas.map((esc) => {
                                            const statusBadge = esc.motivo_recusa
                                                ? { label: 'Indisponível', cor: 'bg-red-500/10 text-red-500 border-red-500/20' }
                                                : esc.confirmado
                                                    ? { label: 'Confirmado', cor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' }
                                                    : { label: 'Pendente', cor: 'bg-orange-500/10 text-orange-600 border-orange-500/20' }
                                            return (
                                                <div key={esc.id} className={`border rounded-xl p-3 space-y-2 ${esc.confirmado ? 'border-emerald-500/20' : 'border-soft'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-1.5 rounded-lg text-center shrink-0 min-w-[44px] ${esc.confirmado ? 'bg-emerald-500 text-white' : 'bg-fg text-bg'}`}>
                                                            <span className="block text-[7px] font-black uppercase opacity-70">
                                                                {new Date(esc.evento.data).toLocaleDateString('pt-PT', { month: 'short' })}
                                                            </span>
                                                            <span className="text-base block font-black italic leading-tight">
                                                                {new Date(esc.evento.data).toLocaleDateString('pt-PT', { day: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h5 className="font-black uppercase italic text-fg text-xs truncate">{esc.evento.nome}</h5>
                                                            <span className="text-[9px] font-bold text-figueira uppercase tracking-widest">{esc.departamento.nome}</span>
                                                            {esc.funcoes?.filter(Boolean).length > 0 && (
                                                                <p className="text-[9px] text-muted mt-0.5">{esc.funcoes.join(' · ')}</p>
                                                            )}
                                                        </div>
                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border shrink-0 ${statusBadge.cor}`}>
                                                            {statusBadge.label}
                                                        </span>
                                                    </div>
                                                    <BotoesEscala
                                                        escalaIds={esc.ids}
                                                        confirmado={esc.confirmado}
                                                        motivoRecusa={esc.motivo_recusa ?? null}
                                                        colapsado
                                                    />
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-xs font-black uppercase tracking-widest text-muted text-center py-6">
                                        Sem escalas agendadas
                                    </p>
                                )}
                            </div>

                            {/* Departamentos / Equipa */}
                            <div className="px-4 pt-4 pb-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-muted mb-3">Meus Departamentos</h4>
                                <div className="space-y-3">
                                    {departamentos.map((depto: any) => (
                                        <CardDepartamentoMembro
                                            key={depto.id}
                                            depto={depto}
                                            membroId={membroId}
                                            role={role}
                                            podeGerirEscalas={depto.pode_gerir_escalas}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── MODAL REDES SOCIAIS ────────────────── */}
            {redesAberto && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
                    onClick={() => setRedesAberto(false)}
                >
                    <div
                        className="bg-bg w-full max-w-md rounded-t-[2rem] border-t border-soft shadow-2xl animate-in slide-in-from-bottom-4 duration-200 max-h-[50vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-soft shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                                    <Globe size={18} />
                                </div>
                                <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg">Redes Sociais</h3>
                            </div>
                            <button onClick={() => setRedesAberto(false)}
                                className="w-8 h-8 flex items-center justify-center bg-soft text-muted hover:text-fg rounded-xl transition-all">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-2 flex-1">
                            {redesSociais?.instagram && (
                                <a href={redesSociais.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                    <span className="text-sm">📸</span>
                                    <span className="text-xs font-black uppercase tracking-widest text-fg">Instagram</span>
                                    <ChevronRight size={14} className="text-muted ml-auto" />
                                </a>
                            )}
                            {redesSociais?.facebook && (
                                <a href={redesSociais.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                    <span className="text-sm">📘</span>
                                    <span className="text-xs font-black uppercase tracking-widest text-fg">Facebook</span>
                                    <ChevronRight size={14} className="text-muted ml-auto" />
                                </a>
                            )}
                            {redesSociais?.youtube && (
                                <a href={redesSociais.youtube} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                    <span className="text-sm">🎬</span>
                                    <span className="text-xs font-black uppercase tracking-widest text-fg">YouTube</span>
                                    <ChevronRight size={14} className="text-muted ml-auto" />
                                </a>
                            )}
                            {redesSociais?.website && (
                                <a href={redesSociais.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                    <span className="text-sm">🌐</span>
                                    <span className="text-xs font-black uppercase tracking-widest text-fg">Website</span>
                                    <ChevronRight size={14} className="text-muted ml-auto" />
                                </a>
                            )}
                            {!redesSociais?.instagram && !redesSociais?.facebook && !redesSociais?.youtube && !redesSociais?.website && (
                                <div className="text-center py-8">
                                    <Globe size={28} className="mx-auto text-muted/20 mb-2" />
                                    <p className="text-xs font-black uppercase tracking-widest text-muted">Sem redes sociais configuradas</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── MODAL AGENDA ─────────────────────────── */}
            {agendaAberta && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
                    onClick={() => { setAgendaAberta(false); setMostrarTodosEventos(false) }}
                >
                    <div
                        className="bg-bg w-full max-w-md rounded-t-[2rem] border-t border-soft shadow-2xl animate-in slide-in-from-bottom-4 duration-200 max-h-[80vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-soft shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-figueira/10 text-figueira flex items-center justify-center">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg">Agenda</h3>
                                    <p className="text-xs font-bold text-muted uppercase tracking-widest">{proximosEventos.length} eventos</p>
                                </div>
                            </div>
                            <button onClick={() => { setAgendaAberta(false); setMostrarTodosEventos(false) }}
                                className="w-8 h-8 flex items-center justify-center bg-soft text-muted hover:text-fg rounded-xl transition-all">
                                <X size={14} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-4 space-y-2 flex-1">
                            {(mostrarTodosEventos ? proximosEventos : proximosEventos.slice(0, 4)).map((evento) => {
                                const d = new Date(evento.data)
                                const dia = d.toLocaleDateString('pt-PT', { day: '2-digit' })
                                const mes = d.toLocaleDateString('pt-PT', { month: 'short' })
                                const diaSemana = d.toLocaleDateString('pt-PT', { weekday: 'short' })
                                const hora = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
                                const dataCompleta = d.toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
                                const dataCapitalizada = dataCompleta.charAt(0).toUpperCase() + dataCompleta.slice(1)

                                return (
                                    <details key={evento.id} className="bg-bg2 border border-soft rounded-xl overflow-hidden group/ev">
                                        <summary className="flex items-center gap-3 p-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none">
                                            <div className="p-2 rounded-lg bg-fg text-bg text-center min-w-[44px] shrink-0">
                                                <span className="block text-[9px] font-black uppercase opacity-60">{mes}</span>
                                                <span className="block text-lg font-black italic leading-tight">{dia}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-black uppercase italic text-fg truncate">{evento.nome}</h4>
                                                <p className="text-xs text-muted font-bold mt-0.5">{diaSemana} · {hora}</p>
                                            </div>
                                            <ChevronRight size={14} className="text-muted shrink-0 transition-transform group-open/ev:rotate-90" />
                                        </summary>
                                        <div className="px-3 pb-3 pt-1 border-t border-soft space-y-3 animate-in fade-in duration-200">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2 text-xs text-fg font-medium">
                                                    <Calendar size={12} className="text-figueira shrink-0" /> {dataCapitalizada}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted">
                                                    <Clock size={12} className="shrink-0" /> {hora}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const texto = `⛪ *${evento.nome.toUpperCase()}*\n📅 ${dataCapitalizada}\n⏰ ${hora}\n\n🙏 Vemo-nos lá!`
                                                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank')
                                                }}
                                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-50 text-green-600 border border-green-200 text-xs font-black uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all active:scale-95"
                                            >
                                                <MessageCircle size={14} /> Partilhar no WhatsApp
                                            </button>
                                        </div>
                                    </details>
                                )
                            })}
                            {proximosEventos.length === 0 && (
                                <div className="text-center py-8">
                                    <Calendar size={28} className="mx-auto text-muted/20 mb-2" />
                                    <p className="text-xs font-black uppercase tracking-widest text-muted">Sem eventos agendados</p>
                                </div>
                            )}
                            {proximosEventos.length > 4 && (
                                <button onClick={() => setMostrarTodosEventos(!mostrarTodosEventos)}
                                    className="w-full py-2.5 text-xs font-black uppercase tracking-widest text-figueira hover:text-fg transition-colors flex items-center justify-center gap-1.5">
                                    <ChevronDown size={12} className={`transition-transform ${mostrarTodosEventos ? 'rotate-180' : ''}`} />
                                    {mostrarTodosEventos ? 'Ver menos' : `Ver todos (${proximosEventos.length})`}
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
