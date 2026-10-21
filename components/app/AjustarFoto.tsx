'use client'

// "Ajustar foto": enquadrar a foto do preletor em cada arte das redes (post 4:5, story 9:16, capa 16:9). Arrastar para mover,
// barra para aproximar. A pré-visualização usa as MESMAS contas do servidor (lib/divulgacao-enquadrar.ts), por isso o que se vê
// aqui é o que sai no PNG. O ajuste fica na receita, por formato, preso a esta foto.
import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { REDES, type Paleta, type RedeId } from '@/lib/divulgacao'
import type { FotoKit } from '@/lib/divulgacao-kit'
import { CAIXA_FOTO, LIMITES, ajustePorOmissao, enquadrarFoto, enquadrarRecorte, limitarAjuste, type Ajuste } from '@/lib/divulgacao-enquadrar'

type Props = { formato: RedeId; foto: FotoKit; paleta: Paleta; inicial: Ajuste | null; onFeito: (a: Ajuste | null) => void; onFechar: () => void }

export default function AjustarFoto({ formato, foto, paleta, inicial, onFeito, onFechar }: Props) {
    const f = REDES.find((r) => r.id === formato)!
    const W = f.largura, H = f.altura
    const caixa = CAIXA_FOTO[formato]
    const recorte = !!foto.recorte
    const [a, setA] = useState<Ajuste>(() => limitarAjuste(inicial ?? ajustePorOmissao(recorte, foto.foco), recorte))
    const [escala, setEscala] = useState(0.3)
    const arrasto = useRef<{ x: number; y: number; a: Ajuste } | null>(null)

    // o tamanho do ecrã de ajuste: cabe na largura (máx. 420 px) e em ~60% da altura do telemóvel
    useEffect(() => {
        const medir = () => setEscala(Math.min((Math.min(window.innerWidth - 32, 420)) / W, (window.innerHeight * 0.58) / H))
        medir(); window.addEventListener('resize', medir)
        return () => window.removeEventListener('resize', medir)
    }, [W, H])
    useEffect(() => {
        const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
        window.addEventListener('keydown', tecla)
        return () => window.removeEventListener('keydown', tecla)
    }, [onFechar])

    const pos = useMemo(() => (recorte ? enquadrarRecorte(foto.w!, foto.h!, caixa, a) : enquadrarFoto(foto.w!, foto.h!, caixa, a)), [recorte, foto.w, foto.h, caixa, a])

    function arrastar(e: React.PointerEvent) {
        if (!arrasto.current) return
        const dx = (e.clientX - arrasto.current.x) / escala, dy = (e.clientY - arrasto.current.y) / escala   // em px da arte
        const b = arrasto.current.a
        if (recorte) setA(limitarAjuste({ ...b, x: b.x + dx / caixa.width, y: b.y + dy / caixa.height }, true))
        else {
            const p = enquadrarFoto(foto.w!, foto.h!, caixa, b)   // a foto anda com o dedo: o ponto em foco anda ao contrário
            setA(limitarAjuste({ ...b, x: b.x - dx / p.width, y: b.y - dy / p.height }, false))
        }
    }

    const [zmin, zmax] = recorte ? LIMITES.recorte.zoom : LIMITES.foto.zoom
    const horizontal = formato === 'youtube'
    return (
        <div role="dialog" aria-modal="true" aria-label={`Ajustar a foto: ${f.nome}`} className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
            <div className="a-card flex max-h-[96vh] w-full max-w-[460px] flex-col gap-3 overflow-y-auto rounded-b-none p-4 sm:rounded-b-[18px]" style={{ background: 'var(--a-card)' }}>
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <h3 className="text-[18px] font-bold">Ajustar a foto</h3>
                        <p className="text-[14px] a-suave">{f.nome}. Arraste a foto{recorte ? ' (e a pessoa fica de pé no sítio que escolher)' : ''}; o rosto deve ficar fora da zona escura do texto.</p>
                    </div>
                    <button type="button" onClick={onFechar} aria-label="Fechar" className="a-foco flex h-10 w-10 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: 'var(--a-borda)' }}><X size={20} aria-hidden /></button>
                </div>

                {/* a arte inteira, em ponto pequeno: fundo, caixa da foto, zona do texto */}
                <div className="mx-auto select-none overflow-hidden rounded-xl border" style={{ width: W * escala, height: H * escala, position: 'relative', background: paleta.fundo, borderColor: 'var(--a-borda)', touchAction: 'none', cursor: 'grab' }}
                    onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); arrasto.current = { x: e.clientX, y: e.clientY, a } }}
                    onPointerMove={arrastar}
                    onPointerUp={() => { arrasto.current = null }} onPointerCancel={() => { arrasto.current = null }}>
                    <div style={{ position: 'absolute', left: caixa.left * escala, top: caixa.top * escala, width: caixa.width * escala, height: caixa.height * escala, overflow: 'hidden' }}>
                        {recorte && <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 45%, ${paleta.c1}99, transparent 62%)` }} />}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={foto.url} alt="" draggable={false} style={{ position: 'absolute', left: pos.left * escala, top: pos.top * escala, width: pos.width * escala, height: pos.height * escala, maxWidth: 'none', pointerEvents: 'none' }} />
                    </div>
                    {/* onde o texto vai ficar (por cima da foto, com a cor de fundo) */}
                    <div aria-hidden style={{ position: 'absolute', pointerEvents: 'none', display: 'flex', alignItems: horizontal ? 'center' : 'flex-end', justifyContent: horizontal ? 'flex-start' : 'center', padding: 8,
                        ...(horizontal
                            ? { left: 0, top: 0, bottom: 0, width: '52%', backgroundImage: `linear-gradient(90deg, ${paleta.fundo} 0%, ${paleta.fundo} 55%, transparent 100%)` }
                            : { left: 0, right: 0, bottom: 0, height: formato === 'story' ? '34%' : '36%', backgroundImage: `linear-gradient(0deg, ${paleta.fundo} 0%, ${paleta.fundo} 65%, transparent 100%)` }) }}>
                        <span className="rounded px-2 py-0.5 text-[12px] font-semibold" style={{ background: 'rgba(255,255,255,.18)', color: paleta.texto }}>Zona do texto</span>
                    </div>
                </div>

                <label className="block space-y-1">
                    <span className="flex justify-between text-[15px] font-semibold"><span>{recorte ? 'Tamanho da pessoa' : 'Aproximar'}</span><span className="a-suave">{a.zoom.toFixed(2)}×</span></span>
                    <input type="range" min={zmin} max={zmax} step={0.01} value={a.zoom} onChange={(e) => setA((x) => limitarAjuste({ ...x, zoom: Number(e.target.value) }, recorte))} className="a-foco h-8 w-full" />
                </label>

                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setA(limitarAjuste(ajustePorOmissao(recorte, foto.foco), recorte))} className="a-botao a-botao-secundario !min-h-[48px]">Repor</button>
                    <button type="button" onClick={() => onFeito(null)} className="a-botao a-botao-secundario !min-h-[48px]">Sem ajuste</button>
                    <button type="button" onClick={() => onFeito(a)} className="a-botao a-botao-principal !min-h-[48px] flex-1">Feito</button>
                </div>
            </div>
        </div>
    )
}

export type { Paleta }
