'use client'

// A cifra de uma musica: abrir no ecra cheio (rolagem automatica, mudar o tom,
// letra maior), e para quem gere: abrir o CifraClub, copiar e colar aqui (cifra
// ou so a letra). O CifraClub recusa pedidos do servidor (403), por isso nao ha
// importacao automatica.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardPaste, ExternalLink, Guitar, Pencil, Trash2, X } from 'lucide-react'
import CifraViewer from '@/components/louvor/CifraViewer'
import CifraEditor from '@/components/louvor/CifraEditor'
import { salvarCifraInternaAction } from '@/actions/louvor-actions'
import { importarCifraClub } from '@/lib/cifra'
import { apagarMusica } from '@/actions/repertorio-app-actions'

export default function CifraDaMusica({ musica, gere }: {
    musica: { id: string; titulo: string; artista: string | null; tom: string | null; cifra: string | null; linkCifra: string | null }
    gere: boolean
}) {
    const router = useRouter()
    const [pendente, iniciar] = useTransition()
    const [ver, setVer] = useState(false)
    const [editar, setEditar] = useState(false)
    const [aviso, setAviso] = useState<string | null>(null)
    const [colar, setColar] = useState(false)
    const [texto, setTexto] = useState('')

    // O link guardado na musica; sem ele, a pesquisa do CifraClub pelo titulo
    const linkCifraClub = musica.linkCifra
        || `https://www.cifraclub.com.br/?q=${encodeURIComponent([musica.titulo, musica.artista].filter(Boolean).join(' '))}`

    const guardarColado = () => {
        setAviso(null)
        iniciar(async () => {
            // Acordes por cima da letra passam a [Am]letra; so letra fica como esta
            const r = await salvarCifraInternaAction(musica.id, importarCifraClub(texto))
            if (!r.ok) { setAviso(r.error || 'Não foi possível guardar.'); return }
            setColar(false); setTexto(''); router.refresh()
        })
    }

    return (
        <section className="a-card p-4 space-y-3" aria-labelledby="cifra">
            <h2 id="cifra" className="flex items-center gap-2 text-[19px] font-bold"><Guitar size={20} aria-hidden /> Cifra</h2>

            {musica.cifra ? (
                <button type="button" className="a-botao a-botao-principal w-full" onClick={() => setVer(true)}>
                    Abrir a cifra (rolagem automática)
                </button>
            ) : (
                <p className="text-[16px] a-suave">Ainda não tem cifra na app.</p>
            )}

            {gere && (
                <div className="grid gap-2">
                    {!musica.cifra && (
                        <p className="text-[15px] a-suave">Abra a música no CifraClub, copie a cifra (ou só a letra) e cole-a aqui.</p>
                    )}
                    <a href={linkCifraClub} target="_blank" rel="noopener noreferrer" className="a-botao a-botao-secundario w-full">
                        <ExternalLink size={18} aria-hidden /> Abrir no CifraClub
                    </a>
                    <button type="button" className="a-botao a-botao-secundario w-full" onClick={() => { setAviso(null); setColar(true) }}>
                        <ClipboardPaste size={18} aria-hidden /> Colar cifra ou letra
                    </button>
                    {musica.cifra && (
                        <button type="button" className="a-botao a-botao-secundario w-full" onClick={() => setEditar(true)}>
                            <Pencil size={18} aria-hidden /> Editar cifra
                        </button>
                    )}
                </div>
            )}

            {aviso && !colar && <p role="alert" className="text-[15px] font-semibold" style={{ color: 'var(--a-erro)' }}>{aviso}</p>}

            {colar && (
                <div className="app-novo fixed inset-0 z-[200] flex items-end justify-center md:items-center md:p-4" role="dialog" aria-modal="true" aria-labelledby="colar-titulo">
                    <div className="absolute inset-0 bg-black/60" onClick={() => !pendente && setColar(false)} />
                    <div className="a-card relative flex max-h-[92dvh] w-full max-w-lg flex-col gap-3 p-4 !rounded-b-none md:!rounded-b-[18px]"
                        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                        <div className="flex items-center justify-between gap-2">
                            <h2 id="colar-titulo" className="text-[20px] font-bold">Colar cifra ou letra</h2>
                            <button type="button" className="a-botao a-botao-secundario !px-3" aria-label="Fechar" onClick={() => setColar(false)} disabled={pendente}>
                                <X size={22} aria-hidden />
                            </button>
                        </div>
                        <p className="text-[15px] a-suave">
                            Cole o texto copiado do CifraClub (ou de outro site). Os acordes por cima da letra ficam no sítio certo; se for só a letra, fica só a letra.
                            {musica.cifra && ' Substitui a cifra que já está guardada.'}
                        </p>
                        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus spellCheck={false}
                            aria-label="Texto da cifra ou da letra" placeholder={'Cole aqui…'}
                            className="a-foco min-h-[45dvh] w-full flex-1 resize-none rounded-[14px] border p-3 font-mono text-[15px] leading-relaxed"
                            style={{ background: 'var(--a-bg)', color: 'var(--a-texto)', borderColor: 'var(--a-borda)' }} />
                        {aviso && <p role="alert" className="text-[15px] font-semibold" style={{ color: 'var(--a-erro)' }}>{aviso}</p>}
                        <button type="button" className="a-botao a-botao-principal w-full" disabled={pendente || texto.trim().length < 10} onClick={guardarColado}>
                            {pendente ? 'A guardar…' : 'Guardar'}
                        </button>
                    </div>
                </div>
            )}

            {ver && musica.cifra && (
                <CifraViewer cifra={musica.cifra} titulo={musica.titulo} artista={musica.artista}
                    tomOriginal={musica.tom} tomTocado={musica.tom ?? undefined} onClose={() => setVer(false)} />
            )}
            {editar && (
                <div className="fixed inset-0 z-[200]">
                    <CifraEditor musicaId={musica.id} titulo={musica.titulo} cifraAtual={musica.cifra}
                        onClose={() => setEditar(false)} onSaved={() => router.refresh()} />
                </div>
            )}
        </section>
    )
}

export function ApagarMusica({ id }: { id: string }) {
    const router = useRouter()
    const [pendente, iniciar] = useTransition()
    const [confirmar, setConfirmar] = useState(false)
    const [aviso, setAviso] = useState<string | null>(null)
    return (
        <div className="space-y-2">
            {!confirmar ? (
                <button type="button" className="a-botao a-botao-secundario w-full" style={{ color: 'var(--a-erro)' }} onClick={() => setConfirmar(true)}>
                    <Trash2 size={18} aria-hidden /> Apagar música
                </button>
            ) : (
                <div className="a-card p-4 space-y-3">
                    <p className="text-[16px]">Apagar esta música do repertório?</p>
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" className="a-botao a-botao-secundario" onClick={() => setConfirmar(false)}>Não</button>
                        <button type="button" className="a-botao" style={{ background: 'var(--a-erro)', color: '#fff' }} disabled={pendente}
                            onClick={() => iniciar(async () => {
                                const r = await apagarMusica(id)
                                if (r.ok === false) setAviso(r.error)
                                else { router.push('/louvor/musicas'); router.refresh() }
                            })}>
                            Sim, apagar
                        </button>
                    </div>
                </div>
            )}
            {aviso && <p role="alert" className="text-[15px] font-semibold" style={{ color: 'var(--a-erro)' }}>{aviso}</p>}
        </div>
    )
}
