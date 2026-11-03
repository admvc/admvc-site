'use client'

// A grelha das fotos e a foto aberta (lightbox): setas, teclado, deslizar no telemovel,
// coracao (uma reaccao por aparelho), descarregar, partilhar e "pedir para retirar esta foto".
// A grelha usa as miniaturas (leves); ao abrir carrega a versao grande.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { ChevronLeft, ChevronRight, Download, Heart, X } from 'lucide-react'
import s from '@/app/fotos/fotos.module.css'
import g from './galeria.module.css'
import Partilhar from './Partilhar'

export type FotoDaGaleria = {
    id: number
    src: string
    mini: string
    largura: number | null
    altura: number | null
    gostos: number
    minha: boolean
}

export default function Galeria({ fotos: inicial, titulo }: { fotos: FotoDaGaleria[]; titulo: string }) {
    const [fotos, setFotos] = useState(inicial)
    const [aberta, setAberta] = useState<number | null>(null)
    const [aRetirar, setARetirar] = useState(false)
    const [motivo, setMotivo] = useState('')
    const [aEnviar, setAEnviar] = useState(false)
    const [mensagem, setMensagem] = useState<string | null>(null)
    const fecharRef = useRef<HTMLButtonElement>(null)
    const toqueX = useRef<number | null>(null)

    const fechar = useCallback(() => { setAberta(null); setARetirar(false) }, [])
    const anterior = useCallback(() => { setARetirar(false); setAberta((v) => (v === null ? null : (v + fotos.length - 1) % fotos.length)) }, [fotos.length])
    const seguinte = useCallback(() => { setARetirar(false); setAberta((v) => (v === null ? null : (v + 1) % fotos.length)) }, [fotos.length])

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

    const foto = aberta === null ? null : fotos[aberta]

    async function gostar(f: FotoDaGaleria) {
        const quer = !f.minha
        // optimista: o coracao muda logo; se falhar, volta atras
        setFotos((l) => l.map((x) => x.id === f.id ? { ...x, minha: quer, gostos: Math.max(0, x.gostos + (quer ? 1 : -1)) } : x))
        try {
            const r = await fetch('/api/public/fotos/reacao', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ foto: f.id, gosto: quer }),
            })
            const d = await r.json().catch(() => ({}))
            if (!r.ok) throw new Error(d.error || 'Falhou')
            setFotos((l) => l.map((x) => x.id === f.id ? { ...x, minha: !!d.minha, gostos: Number(d.total) || 0 } : x))
        } catch {
            setFotos((l) => l.map((x) => x.id === f.id ? { ...x, minha: f.minha, gostos: f.gostos } : x))
            setMensagem('Não consegui guardar o coração. Tente outra vez.')
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
                    return (
                        <figure key={f.id} className={s.foto} style={{ '--razao': razao } as CSSProperties}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={f.mini} alt={`${titulo} — fotografia ${n + 1}`} loading={n < 4 ? 'eager' : 'lazy'} decoding="async" />
                            <button type="button" className={s.fotoBotao} onClick={() => setAberta(n)} aria-label={`Ver a fotografia ${n + 1} em grande`} />
                            {f.gostos > 0 && (
                                <span className={g.contagemGrelha} aria-label={`${f.gostos} ${f.gostos === 1 ? 'coração' : 'corações'}`}>
                                    <Heart size={13} aria-hidden fill="currentColor" /> {f.gostos}
                                </span>
                            )}
                        </figure>
                    )
                })}
                <span className={s.espacoFinal} aria-hidden />
            </div>

            {mensagem && <p className={g.mensagem} role="status">{mensagem}</p>}

            {foto && (
                <div className={g.fundo} role="dialog" aria-modal="true" aria-label={`Fotografia ${(aberta ?? 0) + 1} de ${fotos.length}`} onClick={fechar}>
                    <div className={g.barra} onClick={(e) => e.stopPropagation()}>
                        <span className={g.contador}>{(aberta ?? 0) + 1} / {fotos.length}</span>
                        <button ref={fecharRef} type="button" className={g.fechar} onClick={fechar} aria-label="Fechar">
                            <X size={22} aria-hidden />
                        </button>
                    </div>

                    <div
                        className={g.zona}
                        onClick={(e) => e.stopPropagation()}
                        onTouchStart={(e) => { toqueX.current = e.touches[0]?.clientX ?? null }}
                        onTouchEnd={(e) => {
                            if (toqueX.current === null) return
                            const delta = (e.changedTouches[0]?.clientX ?? toqueX.current) - toqueX.current
                            if (Math.abs(delta) > 48) {
                                if (delta > 0) anterior()
                                else seguinte()
                            }
                            toqueX.current = null
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className={g.imagem} src={foto.src} alt={`${titulo} — fotografia ${(aberta ?? 0) + 1}`} draggable={false} />
                        {fotos.length > 1 && (
                            <>
                                <button type="button" className={`${g.seta} ${g.esquerda}`} onClick={anterior} aria-label="Fotografia anterior">
                                    <ChevronLeft size={26} aria-hidden />
                                </button>
                                <button type="button" className={`${g.seta} ${g.direita}`} onClick={seguinte} aria-label="Fotografia seguinte">
                                    <ChevronRight size={26} aria-hidden />
                                </button>
                            </>
                        )}
                    </div>

                    <div className={g.rodape} onClick={(e) => e.stopPropagation()}>
                        {aRetirar ? (
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
                                <button type="button" onClick={() => void gostar(foto)} aria-pressed={foto.minha}
                                    aria-label={foto.minha ? 'Tirar o coração' : 'Gostei desta foto'}
                                    className={`${g.botao} ${g.botaoEscuro} ${g.coracao} ${foto.minha ? g.coracaoAtivo : ''}`}>
                                    <Heart size={17} aria-hidden fill={foto.minha ? 'currentColor' : 'none'} /> {foto.gostos > 0 ? foto.gostos : 'Gosto'}
                                </button>
                                <a href={foto.src} download={`${titulo.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase()}-${(aberta ?? 0) + 1}.jpg`}
                                    target="_blank" rel="noopener noreferrer" className={`${g.botao} ${g.botaoEscuro}`}>
                                    <Download size={16} aria-hidden /> Descarregar
                                </a>
                                <Partilhar escuro titulo={`${titulo} — fotografia ${(aberta ?? 0) + 1}`} rotulo="Partilhar foto" />
                                <button type="button" className={g.retirar} onClick={() => setARetirar(true)}>Pedir para retirar esta foto</button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
