'use client'

// A grelha masonry das fotos e a foto aberta (visualizador em ecra inteiro): setas, teclado, deslizar no telemovel,
// reaccoes com emoji (uma de cada por aparelho), descarregar, partilhar, "pedir para retirar esta foto"
// e, depois da ultima foto, a passagem para o album anterior/seguinte.
// A grelha usa as miniaturas (leves); ao abrir carrega a versao grande.
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react'
import { EMOJIS_FOTOS, EMOJI_NOMES, type EmojiFoto } from '@/lib/fotos-galeria'
import s from '@/app/fotos/fotos.module.css'
import g from './galeria.module.css'
import Partilhar from './Partilhar'

export type FotoDaGaleria = {
    id: number
    src: string
    mini: string
    largura: number | null
    altura: number | null
    reacoes: Record<string, number>
    minhas: string[]
}

export type AlbumVizinho = { slug: string; titulo: string; data: string; capa: string | null }

export default function Galeria({ fotos: inicial, titulo, maisRecente = null, maisAntigo = null }: {
    fotos: FotoDaGaleria[]
    titulo: string
    maisRecente?: AlbumVizinho | null
    maisAntigo?: AlbumVizinho | null
}) {
    const [fotos, setFotos] = useState(inicial)
    const [aberta, setAberta] = useState<number | null>(null)
    const [aRetirar, setARetirar] = useState(false)
    const [motivo, setMotivo] = useState('')
    const [aEnviar, setAEnviar] = useState(false)
    const [mensagem, setMensagem] = useState<string | null>(null)
    const fecharRef = useRef<HTMLButtonElement>(null)
    const toque = useRef<{ x: number; y: number } | null>(null)

    // Depois da ultima foto vem o "fim do album" (indice = nº de fotos) com os albuns vizinhos.
    const temFim = !!(maisRecente || maisAntigo)
    const ultimo = temFim ? fotos.length : fotos.length - 1

    const fechar = useCallback(() => { setAberta(null); setARetirar(false) }, [])
    const anterior = useCallback(() => { setARetirar(false); setAberta((v) => (v === null ? null : (v + ultimo) % (ultimo + 1))) }, [ultimo])
    const seguinte = useCallback(() => { setARetirar(false); setAberta((v) => (v === null ? null : (v + 1) % (ultimo + 1))) }, [ultimo])

    useEffect(() => {
        if (aberta === null) return
        const antes = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        fecharRef.current?.focus()

        const tecla = (e: KeyboardEvent) => {
            const emCampo = (e.target as HTMLElement | null)?.tagName === 'TEXTAREA'
            if (e.key === 'Escape') fechar()
            if (emCampo) return
            if (e.key === 'ArrowLeft') anterior()
            if (e.key === 'ArrowRight') seguinte()
        }
        window.addEventListener('keydown', tecla)
        return () => {
            document.body.style.overflow = antes
            window.removeEventListener('keydown', tecla)
        }
    }, [aberta, fechar, anterior, seguinte])

    useEffect(() => {
        if (!mensagem) return
        const t = setTimeout(() => setMensagem(null), 6000)
        return () => clearTimeout(t)
    }, [mensagem])

    // Pre-carrega a foto seguinte, para o deslizar nao esperar
    useEffect(() => {
        if (aberta === null) return
        const prox = fotos[aberta + 1]
        if (prox) { const i = new Image(); i.src = prox.src }
    }, [aberta, fotos])

    const foto = aberta === null ? null : fotos[aberta] ?? null
    const noFim = aberta !== null && aberta >= fotos.length

    async function reagir(f: FotoDaGaleria, emoji: EmojiFoto) {
        const quer = !f.minhas.includes(emoji)
        const antes = f.reacoes[emoji] ?? 0
        const poe = (x: FotoDaGaleria, tem: boolean, n: number): FotoDaGaleria => ({
            ...x,
            minhas: tem ? [...x.minhas.filter((e) => e !== emoji), emoji] : x.minhas.filter((e) => e !== emoji),
            reacoes: { ...x.reacoes, [emoji]: Math.max(0, n) },
        })
        // optimista: muda logo; se falhar, volta atras
        setFotos((l) => l.map((x) => x.id === f.id ? poe(x, quer, antes + (quer ? 1 : -1)) : x))
        try {
            const r = await fetch('/api/public/fotos/reacao', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ foto: f.id, emoji, gosto: quer }),
            })
            const d = await r.json().catch(() => ({}))
            if (!r.ok) throw new Error(d.error || 'Falhou')
            setFotos((l) => l.map((x) => {
                if (x.id !== f.id) return x
                const certo = poe(x, !!d.minha, Number(d.total) || 0)
                return d.contagens ? { ...certo, reacoes: d.contagens } : certo
            }))
        } catch {
            setFotos((l) => l.map((x) => x.id === f.id ? poe(x, !quer, antes) : x))
            setMensagem('Não consegui guardar a reação. Tente outra vez.')
        }
    }

    async function pedirRetirada(f: FotoDaGaleria) {
        setAEnviar(true)
        try {
            const r = await fetch('/api/public/fotos/retirar', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ foto: f.id, motivo: motivo.trim() }),
            })
            const d = await r.json().catch(() => ({}))
            if (!r.ok) throw new Error(d.error || 'Não foi possível enviar o pedido.')
            // a foto fica escondida ja: sai desta pagina
            const restantes = fotos.filter((x) => x.id !== f.id)
            setFotos(restantes)
            setARetirar(false); setMotivo('')
            setAberta(restantes.length ? Math.min(aberta ?? 0, restantes.length - 1) : null)
            setMensagem('Pedido enviado. A foto já foi escondida e a equipa de mídia vai decidir.')
        } catch (e) {
            setMensagem(e instanceof Error ? e.message : 'Não foi possível enviar o pedido.')
        } finally {
            setAEnviar(false)
        }
    }

    return (
        <>
            <div className={s.fotos}>
                {fotos.map((f, n) => {
                    const razao = f.largura && f.altura ? f.largura / f.altura : 1.5
                    const ativas = EMOJIS_FOTOS.filter((e) => (f.reacoes[e] ?? 0) > 0)
                    return (
                        <figure key={f.id} className={s.foto}>
                            <div className={s.fotoMoldura} style={{ aspectRatio: String(razao) }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={f.mini} alt={`${titulo} — fotografia ${n + 1}`} loading={n < 6 ? 'eager' : 'lazy'} decoding="async" />
                                <button type="button" className={s.fotoBotao} onClick={() => setAberta(n)} aria-label={`Ver a fotografia ${n + 1} em grande`} />
                                {ativas.length > 0 && (
                                    <span className={g.contagemGrelha} aria-label={ativas.map((e) => `${f.reacoes[e]} ${EMOJI_NOMES[e]}`).join(', ')}>
                                        {ativas.map((e) => <span key={e}><span aria-hidden>{e}</span> {f.reacoes[e]}</span>)}
                                    </span>
                                )}
                            </div>
                        </figure>
                    )
                })}
            </div>

            {mensagem && <p className={g.mensagem} role="status">{mensagem}</p>}

            {aberta !== null && (
                <div className={g.fundo} role="dialog" aria-modal="true" aria-label={noFim ? 'Fim do álbum' : `Fotografia ${aberta + 1} de ${fotos.length}`} onClick={fechar}>
                    <div className={g.barra} onClick={(e) => e.stopPropagation()}>
                        <span className={g.contador}>{noFim ? 'Fim do álbum' : `${aberta + 1} / ${fotos.length}`}</span>
                        <button ref={fecharRef} type="button" className={g.fechar} onClick={fechar} aria-label="Fechar">
                            <X size={22} aria-hidden />
                        </button>
                    </div>

                    <div
                        className={g.zona}
                        onClick={(e) => e.stopPropagation()}
                        onTouchStart={(e) => { const t = e.touches[0]; toque.current = t ? { x: t.clientX, y: t.clientY } : null }}
                        onTouchEnd={(e) => {
                            const ini = toque.current
                            toque.current = null
                            const t = e.changedTouches[0]
                            if (!ini || !t) return
                            const dx = t.clientX - ini.x
                            const dy = t.clientY - ini.y
                            if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
                                if (dx > 0) anterior()
                                else seguinte()
                            } else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.6) {
                                fechar()
                            }
                        }}
                    >
                        {foto ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img key={foto.id} className={g.imagem} src={foto.src} alt={`${titulo} — fotografia ${aberta + 1}`} draggable={false} />
                        ) : (
                            <div className={g.fim}>
                                <p className={g.fimTitulo}>Chegou ao fim de «{titulo}»</p>
                                <div className={g.fimAlbuns}>
                                    {maisAntigo && <CartaoVizinho a={maisAntigo} rotulo="Álbum anterior" />}
                                    {maisRecente && <CartaoVizinho a={maisRecente} rotulo="Álbum seguinte" />}
                                </div>
                                <button type="button" className={`${g.botao} ${g.botaoEscuro}`} onClick={() => setAberta(0)}>Ver outra vez desde o início</button>
                            </div>
                        )}
                        {ultimo > 0 && (
                            <>
                                <button type="button" className={`${g.seta} ${g.esquerda}`} onClick={anterior} aria-label="Anterior">
                                    <ChevronLeft size={26} aria-hidden />
                                </button>
                                <button type="button" className={`${g.seta} ${g.direita}`} onClick={seguinte} aria-label="Seguinte">
                                    <ChevronRight size={26} aria-hidden />
                                </button>
                            </>
                        )}
                    </div>

                    <div className={g.rodape} onClick={(e) => e.stopPropagation()}>
                        {!foto ? null : aRetirar ? (
                            <form className={g.painelRetirar} onSubmit={(e) => { e.preventDefault(); void pedirRetirada(foto) }}>
                                <p className={g.painelTexto}>
                                    Quer que esta foto seja retirada? Fica escondida já e a equipa de mídia decide.
                                </p>
                                <label className={g.painelRotulo} htmlFor="motivo-retirar">Motivo (opcional, sem nomes nem contactos)</label>
                                <textarea id="motivo-retirar" className={g.painelCampo} rows={2} maxLength={200} value={motivo}
                                    onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: a minha filha não quer aparecer" />
                                <div className={g.painelBotoes}>
                                    <button type="submit" disabled={aEnviar} className={`${g.botao} ${g.botaoEscuro}`}>{aEnviar ? 'A enviar…' : 'Enviar pedido'}</button>
                                    <button type="button" className={`${g.botao} ${g.botaoEscuro}`} onClick={() => setARetirar(false)}>Cancelar</button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <div className={g.reacoes} role="group" aria-label="Reagir a esta fotografia">
                                    {EMOJIS_FOTOS.map((e) => {
                                        const ativo = foto.minhas.includes(e)
                                        const n = foto.reacoes[e] ?? 0
                                        return (
                                            <button key={e} type="button" onClick={() => void reagir(foto, e)} aria-pressed={ativo}
                                                aria-label={`${EMOJI_NOMES[e]}${n ? `, ${n}` : ''}`}
                                                className={`${g.reacao} ${ativo ? g.reacaoAtiva : ''}`}>
                                                <span className={g.emoji} aria-hidden>{e}</span>
                                                <span className={g.reacaoN}>{n > 0 ? n : ''}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                                <a href={foto.src} download={`${titulo.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase()}-${aberta + 1}.jpg`}
                                    target="_blank" rel="noopener noreferrer" className={`${g.botao} ${g.botaoEscuro}`}>
                                    <Download size={16} aria-hidden /> Descarregar
                                </a>
                                <Partilhar escuro titulo={`${titulo} — fotografia ${aberta + 1}`} rotulo="Partilhar foto" />
                                <button type="button" className={g.retirar} onClick={() => setARetirar(true)}>Pedir para retirar esta foto</button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}

function CartaoVizinho({ a, rotulo }: { a: AlbumVizinho; rotulo: string }) {
    return (
        <Link href={`/fotos/${a.slug}`} className={g.vizinho}>
            {a.capa && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={a.capa} alt="" loading="lazy" decoding="async" />
            )}
            <span className={g.vizinhoTexto}>
                <span className={g.vizinhoRotulo}>{rotulo}</span>
                <span className={g.vizinhoTitulo}>{a.titulo}</span>
                <span className={g.vizinhoData}>{a.data}</span>
            </span>
        </Link>
    )
}
