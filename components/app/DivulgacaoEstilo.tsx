'use client'

// "Estilo e cores" compacto: padrões por grupo, estilos em miniaturas pequenas,
// cores em bolinhas com as duas cores, e "Ver todos em grande" com o culto verdadeiro em cada estilo.
import { useState } from 'react'
import { LayoutGrid } from 'lucide-react'
import { ESTILOS, PALETAS, MODELOS_REDES, redesDoEstilo, type EstiloId } from '@/lib/divulgacao'
import { GRUPOS_PADRAO, PADROES, coresDaPaleta, padraoDaReceita, type Padrao } from '@/lib/divulgacao-padroes'
import { paramsDaPeca, paramsDaRede, type Receita } from '@/lib/divulgacao-kit'
import JanelaGrande from './JanelaGrande'

const estiloCampo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }
const ANEL = 'relative has-[:checked]:ring-2 has-[:checked]:ring-[var(--a-acento,#f5a524)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2'

/** As duas cores de uma paleta numa bolinha (metade e metade). */
export function Bolinha({ paleta, tamanho = 18 }: { paleta: string; tamanho?: number }) {
    const [a, b] = coresDaPaleta(paleta)
    return <span aria-hidden className="inline-block shrink-0 rounded-full border border-black/20" style={{ width: tamanho, height: tamanho, background: `linear-gradient(135deg, ${a} 50%, ${b} 50%)` }} />
}

type Props = {
    r: Receita
    rv: Receita                       // a receita "assente" (para desenhar as miniaturas grandes)
    mudar: (p: Partial<Receita>) => void
    escolherEstilo: (id: EstiloId) => void
    escolhidoAuto: Padrao | null      // o padrão que o nome do culto sugeriu (só conta enquanto o kit não foi guardado)
    dia: string
    ev: { nome: string; data: Date }
}

export default function EstiloECores({ r, rv, mudar, escolherEstilo, escolhidoAuto, dia, ev }: Props) {
    const [todos, setTodos] = useState(false)
    const atual = padraoDaReceita(r)
    const aplicarPadrao = (p: Padrao) => mudar(r.estilosSeparados ? { estilo: p.estilo, paleta: p.paleta } : { estilo: p.estilo, paleta: p.paleta, modeloRedes: redesDoEstilo(p.estilo) })
    const paleta = PALETAS.find((p) => p.id === r.paleta) ?? PALETAS[0]
    const chip = `a-foco flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border px-3 text-[15px] ${ANEL}`

    return (
        <div className="space-y-4">
            {/* Padrões por grupo */}
            <fieldset className="space-y-2">
                <legend className="text-[16px] font-bold">Padrões</legend>
                {GRUPOS_PADRAO.map((g) => (
                    <div key={g.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                        <span className="w-[76px] shrink-0 text-[13px] font-semibold a-suave">{g.nome}</span>
                        <div className="flex flex-wrap gap-2">
                            {PADROES.filter((p) => p.grupo === g.id).map((p) => (
                                <label key={p.id} className={chip} style={estiloCampo}>
                                    <input type="radio" name="padrao" checked={atual?.id === p.id} onChange={() => aplicarPadrao(p)} className="sr-only" />
                                    <Bolinha paleta={p.paleta} /> {p.nome}
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
                {escolhidoAuto && atual?.id === escolhidoAuto.id && (
                    <p className="text-[13px] a-suave" role="status">Escolhido pelo nome do culto ({escolhidoAuto.nome}). Pode mudar.</p>
                )}
            </fieldset>

            {/* Estilos: fila de miniaturas */}
            <fieldset className="min-w-0 space-y-2">
                <div className="flex items-center justify-between gap-2">
                    <legend className="text-[16px] font-bold">Estilo{r.estilosSeparados ? ' do telão' : ''}</legend>
                    <button type="button" onClick={() => setTodos(true)} className="a-foco inline-flex min-h-[44px] items-center gap-1 rounded-full px-3 text-[14px] font-semibold" style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }}>
                        <LayoutGrid size={16} aria-hidden /> Ver todos em grande
                    </button>
                </div>
                <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
                    {ESTILOS.map((e) => (
                        <label key={e.id} className={`block w-[120px] shrink-0 cursor-pointer snap-start overflow-hidden rounded-[12px] border ${ANEL}`} style={estiloCampo}>
                            <input type="radio" name="estilo" checked={r.estilo === e.id} onChange={() => escolherEstilo(e.id)} className="sr-only" />
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`/images/divulgacao/amostras/${e.id}-${r.paleta}.jpg`} alt="" loading="lazy" className="block w-full" style={{ aspectRatio: '16 / 9', background: 'var(--a-borda)' }} />
                            <span className="block truncate px-2 py-1 text-[13px] font-semibold">{e.nome}</span>
                        </label>
                    ))}
                </div>
            </fieldset>

            {/* Cores: bolinhas */}
            <fieldset className="space-y-2">
                <legend className="text-[16px] font-bold">Cores · <span className="font-normal">{paleta.nome}</span></legend>
                <div className="flex flex-wrap gap-2">
                    {PALETAS.map((p) => (
                        <label key={p.id} title={p.nome} className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full ${ANEL}`}>
                            <input type="radio" name="paleta" checked={r.paleta === p.id} onChange={() => mudar({ paleta: p.id })} aria-label={p.nome} className="sr-only" />
                            <Bolinha paleta={p.id} tamanho={34} />
                        </label>
                    ))}
                </div>
            </fieldset>

            {/* Estilos diferentes no telão e nas redes (raro: fica recolhido) */}
            <details className="rounded-[14px] border" style={{ borderColor: 'var(--a-borda)' }}>
                <summary className="a-foco flex min-h-[48px] cursor-pointer items-center px-3 text-[15px] font-semibold">Telão e redes com estilos diferentes{r.estilosSeparados ? ' · ligado' : ''}</summary>
                <div className="space-y-3 border-t p-3" style={{ borderColor: 'var(--a-borda)' }}>
                    <label className="a-foco flex min-h-[44px] cursor-pointer items-center gap-3 text-[15px]">
                        <input type="checkbox" checked={r.estilosSeparados} className="h-5 w-5 shrink-0"
                            onChange={(e) => mudar(e.target.checked ? { estilosSeparados: true } : { estilosSeparados: false, modeloRedes: redesDoEstilo(r.estilo) })} />
                        <span>Estilo próprio para o post e o story<span className="block text-[13px] a-suave">Desligado: o mesmo estilo no telão e nas redes.</span></span>
                    </label>
                    {r.estilosSeparados && (
                        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Estilo das redes">
                            {MODELOS_REDES.map((m) => (
                                <label key={m.id} className={`block w-[120px] cursor-pointer overflow-hidden rounded-[12px] border ${ANEL}`} style={estiloCampo}>
                                    <input type="radio" name="modeloRedes" checked={r.modeloRedes === m.id} onChange={() => mudar({ modeloRedes: m.id })} className="sr-only" />
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={`/images/divulgacao/amostras/redes-${m.id}.jpg`} alt="" loading="lazy" className="block w-full" style={{ aspectRatio: '16 / 9', objectFit: 'cover', background: 'var(--a-borda)' }} />
                                    <span className="block truncate px-2 py-1 text-[13px] font-semibold">{m.nome}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </details>

            {todos && <TodosEmGrande r={r} rv={rv} dia={dia} ev={ev} onEscolher={(id) => { escolherEstilo(id); setTodos(false) }} onFechar={() => setTodos(false)} />}
        </div>
    )
}

// Janela com o culto verdadeiro em cada estilo (telão ou post). Tocar num escolhe-o.
function TodosEmGrande({ r, rv, dia, ev, onEscolher, onFechar }: { r: Receita; rv: Receita; dia: string; ev: { nome: string; data: Date }; onEscolher: (id: EstiloId) => void; onFechar: () => void }) {
    const [ver, setVer] = useState<'telao' | 'post'>('telao')
    return (
        <JanelaGrande titulo="Todos os estilos, com este culto" onFechar={onFechar} larga>
            <div role="radiogroup" aria-label="Ver como" className="mb-3 flex gap-2">
                {([['telao', 'Telão'], ['post', 'Post']] as const).map(([id, nome]) => (
                    <button key={id} type="button" role="radio" aria-checked={ver === id} onClick={() => setVer(id)}
                        className="a-foco min-h-[44px] rounded-full border px-4 text-[15px] font-semibold aria-checked:ring-2 aria-checked:ring-[var(--a-acento,#f5a524)]" style={estiloCampo}>{nome}</button>
                ))}
            </div>
            <ul className={`grid gap-3 ${ver === 'telao' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
                {ESTILOS.map((e) => {
                    const q = ver === 'telao'
                        ? paramsDaPeca({ ...rv, estilo: e.id }, 'capa', dia, ev)
                        : paramsDaRede({ ...rv, estilo: e.id, estilosSeparados: false, modeloRedes: redesDoEstilo(e.id) }, 'post', ev)
                    return (
                        <li key={e.id}>
                            <button type="button" onClick={() => onEscolher(e.id)} aria-label={`Usar o estilo ${e.nome}`} className={`a-foco block w-full overflow-hidden rounded-[12px] border text-left ${r.estilo === e.id ? 'ring-2 ring-[var(--a-acento,#f5a524)]' : ''}`} style={estiloCampo}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={`/api/divulgacao/imagem?${q}&previa=1&w=400`} alt="" loading="lazy" decoding="async" className="block w-full" style={{ aspectRatio: ver === 'telao' ? '16 / 9' : '4 / 5', background: 'var(--a-borda)', objectFit: 'cover' }} />
                                <span className="flex items-center justify-between gap-2 px-2 py-1.5 text-[14px] font-semibold"><span className="truncate">{e.nome}</span>{r.estilo === e.id && <span className="shrink-0 text-[12px] a-suave">Em uso</span>}</span>
                            </button>
                        </li>
                    )
                })}
            </ul>
        </JanelaGrande>
    )
}
