'use client'

// "Como vai ficar": um cartão flutuante com o telão, a capa do YouTube, o post e o story, a mudar na hora em que se mexe nas opções.
// Computador: cartão fixo no canto de baixo à direita (acompanha o scroll), que se recolhe para um botão. Telemóvel: botão flutuante
// que abre uma folha por baixo. Clicar numa miniatura abre-a em grande. Só se desenha o que está visível (sem pedidos escondidos).
import { useEffect, useState } from 'react'
import { ChevronDown, Eye } from 'lucide-react'
import JanelaGrande from './JanelaGrande'

export type ItemPrevia = { id: string; nome: string; src: string; aspecto: string }

const CHAVE = 'divulgacao-previa-aberta'

function useEcraGrande(): boolean | null {
    const [g, setG] = useState<boolean | null>(null)
    useEffect(() => {
        const m = window.matchMedia('(min-width: 768px)')
        const ler = () => setG(m.matches)
        ler()
        m.addEventListener('change', ler)
        return () => m.removeEventListener('change', ler)
    }, [])
    return g
}

function Miniatura({ item, aAtualizar, onAbrir }: { item: ItemPrevia; aAtualizar: boolean; onAbrir: (id: string) => void }) {
    return (
        <button type="button" onClick={() => onAbrir(item.id)} aria-label={`${item.nome}: ver em grande`} title="Ver em grande"
            className="a-foco block min-w-0 text-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.src} alt="" decoding="async" fetchPriority="high" className={`block w-full rounded-[10px] border transition-opacity ${aAtualizar ? 'opacity-60' : ''}`}
                style={{ aspectRatio: item.aspecto, borderColor: 'var(--a-borda)', background: 'var(--a-card)', objectFit: 'cover' }} />
            <span className="mt-1 block truncate text-[13px] font-semibold">{item.nome}</span>
        </button>
    )
}

function Grelha({ itens, aAtualizar, onAbrir }: { itens: ItemPrevia[]; aAtualizar: boolean; onAbrir: (id: string) => void }) {
    return (
        <div className="grid grid-cols-2 items-start gap-x-3 gap-y-2">
            {itens.map((it) => <Miniatura key={it.id} item={it} aAtualizar={aAtualizar} onAbrir={onAbrir} />)}
        </div>
    )
}

/** `esconder`: não aparece de todo (passos em que as prévias já estão na página). `recolher`: o cartão recolhe-se sozinho (ex.: com o editor das artes aberto) e volta ao que estava quando acaba; a preferência guardada não muda. */
export function PreviaFlutuante({ itens, aAtualizar, onAbrir, recolher = false, esconder = false }: { itens: ItemPrevia[]; aAtualizar: boolean; onAbrir: (id: string) => void; recolher?: boolean; esconder?: boolean }) {
    const grande = useEcraGrande()
    const [aberto, setAberto] = useState(true)       // computador
    const [folha, setFolha] = useState(false)        // telemóvel
    useEffect(() => { try { if (localStorage.getItem(CHAVE) === '0') setAberto(false) } catch { /* sem memória */ } }, [])
    const mudarAberto = (v: boolean) => { setAberto(v); try { localStorage.setItem(CHAVE, v ? '1' : '0') } catch { /* sem memória */ } }
    // recolhido à força: abrir à mão vale só enquanto durar; ao mudar `recolher` volta ao estado de antes
    const [aberturaManual, setAberturaManual] = useState(false)
    useEffect(() => { setAberturaManual(false) }, [recolher])
    const visivel = recolher ? aberturaManual : aberto
    const alterarVisivel = (v: boolean) => { if (recolher) setAberturaManual(v); else mudarAberto(v) }
    if (grande === null || esconder) return null

    if (grande) {
        return (
            <aside aria-label="Como vai ficar" className="fixed bottom-[92px] right-4 z-30">
                {visivel ? (
                    <div className="a-card max-h-[calc(100vh-120px)] w-[270px] space-y-2 overflow-auto p-3 shadow-xl">
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="text-[16px] font-bold">Como vai ficar</h2>
                            <span className="flex items-center gap-1">
                                <span className="text-[12px] a-suave" role="status">{aAtualizar ? 'A atualizar…' : ''}</span>
                                <button type="button" onClick={() => alterarVisivel(false)} aria-label="Recolher a pré-visualização" title="Recolher"
                                    className="a-foco flex h-11 w-11 items-center justify-center rounded-full"><ChevronDown size={20} aria-hidden /></button>
                            </span>
                        </div>
                        <Grelha itens={itens} aAtualizar={aAtualizar} onAbrir={onAbrir} />
                    </div>
                ) : (
                    <button type="button" onClick={() => alterarVisivel(true)} aria-expanded={false}
                        className="a-botao a-botao-principal !min-h-[48px] shadow-xl"><Eye size={18} aria-hidden /> Ver como fica</button>
                )}
            </aside>
        )
    }

    return (
        <>
            <button type="button" onClick={() => setFolha(true)} aria-haspopup="dialog"
                className="a-botao a-botao-principal fixed bottom-[calc(72px+env(safe-area-inset-bottom)+76px)] right-3 z-30 !min-h-[48px] shadow-xl"><Eye size={18} aria-hidden /> Ver como fica</button>
            {folha && (
                <JanelaGrande titulo="Como vai ficar" folha onFechar={() => setFolha(false)}>
                    <Grelha itens={itens} aAtualizar={aAtualizar} onAbrir={(id) => { setFolha(false); onAbrir(id) }} />
                </JanelaGrande>
            )}
        </>
    )
}

/** A janela com uma arte em grande: a pequena aparece logo e a inteira entra por cima quando chega. */
export function JanelaDaArte({ item, srcGrande, onFechar }: { item: ItemPrevia; srcGrande: string; onFechar: () => void }) {
    const [pronta, setPronta] = useState(false)
    const vertical = item.aspecto.startsWith('9') || item.aspecto.startsWith('4')
    const tamanho = vertical ? { height: 'min(74vh, 760px)', width: 'auto' as const } : { width: 'min(100%, 120vh)' }
    return (
        <JanelaGrande titulo={item.nome} onFechar={onFechar} larga={!vertical}>
            <div className="relative mx-auto" style={{ ...tamanho, aspectRatio: item.aspecto, maxWidth: '100%' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.src} alt="" className="absolute inset-0 h-full w-full rounded-[12px] object-cover" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={srcGrande} alt={item.nome} onLoad={() => setPronta(true)} className={`absolute inset-0 h-full w-full rounded-[12px] object-cover transition-opacity ${pronta ? 'opacity-100' : 'opacity-0'}`} />
            </div>
            {!pronta && <p className="mt-2 text-center text-[14px] a-suave" role="status">A preparar a versão grande…</p>}
        </JanelaGrande>
    )
}
