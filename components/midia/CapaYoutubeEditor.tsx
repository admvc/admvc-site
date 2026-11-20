'use client'

// Editor da capa do YouTube (separador YouTube): escolher o padrão (miniaturas) e editar título, subtítulo, preletor, data e hora, cores,
// fundo e foto. Tudo fica na receita do kit do culto (kit.capaYt) e é a MESMA capa que as miniaturas, o Aplicar, o Descarregar, o
// cron, o agendamento automático e o botão do Holyrics usam. As miniaturas seguem o que se escreve (receita do ecrã, ainda por guardar).
import { RotateCcw } from 'lucide-react'
import { PALETAS } from '@/lib/divulgacao'
import { quandoDoEvento, type Receita } from '@/lib/divulgacao-kit'
import { enderecoDaCapa } from '@/lib/youtube-capa-dados'
import { LIMITES_CAPA_YT, PADROES_CAPA, capaYtIgualAoOriginal, capaYtVazia, type CapaYt, type PadraoCapa } from '@/lib/youtube-capa-receita'
import CampoPreletor from '@/components/midia/CampoPreletor'

const campo = 'a-foco min-h-[48px] w-full rounded-[14px] border px-3 text-[16px]'
const estiloCampo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }
const ANEL = 'has-[:checked]:ring-2 has-[:checked]:ring-[var(--a-acento,#f5a524)]'

export const nomeDoPadraoCapa = (p: PadraoCapa) => PADROES_CAPA.find((x) => x.id === p)?.nome ?? ''

function Bolinha({ a, b, tamanho = 24 }: { a: string; b: string; tamanho?: number }) {
    return <span aria-hidden className="inline-block shrink-0 rounded-full border border-black/20" style={{ width: tamanho, height: tamanho, background: `linear-gradient(135deg, ${a} 50%, ${b} 50%)` }} />
}

function Linha({ id, rotulo, ajuda, valor, onChange, max, placeholder }: { id: string; rotulo: string; ajuda: string; valor: string; onChange: (v: string) => void; max: number; placeholder: string }) {
    return (
        <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
                <label htmlFor={id} className="text-[15px] font-semibold">{rotulo}</label>
                <span className="shrink-0 text-[13px] a-suave" aria-live="polite">{valor.length}/{max}</span>
            </div>
            <input id={id} value={valor} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={campo} style={estiloCampo} />
            <p className="text-[13px] a-suave">{ajuda}</p>
        </div>
    )
}

export default function CapaYoutubeEditor({ eventoId, r, rv, mudar, eventoNome, dataISO, aAtualizar }: {
    eventoId: number; r: Receita; rv: Receita; mudar: (p: Partial<Receita>) => void; eventoNome: string; dataISO: string; aAtualizar: boolean
}) {
    const c = r.capaYt
    const alterar = (p: Partial<CapaYt>) => mudar({ capaYt: { ...c, ...p } })
    const auto = quandoDoEvento(new Date(dataISO))
    const kitTemFoto = !!(r.fotoH || r.fotoV)
    const fotoMuda = c.padrao !== 'igual' && c.padrao !== 'centrado'   // nos outros a foto vai para a esquerda ou para a direita
    const radio = 'a-foco flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border px-3 text-[15px] ' + ANEL

    return (
        <div className="space-y-4 border-t pt-3" style={{ borderColor: 'var(--a-borda)' }}>
            <div role="radiogroup" aria-label="Padrão da capa" className="space-y-2">
                <p className="text-[15px] font-semibold">Padrão</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {PADROES_CAPA.map((p) => {
                        const sel = c.padrao === p.id
                        return (
                            <button key={p.id} type="button" role="radio" aria-checked={sel} onClick={() => alterar({ padrao: p.id })} title={p.nota}
                                className="a-foco min-w-0 overflow-hidden rounded-[12px] border text-left aria-checked:ring-2 aria-checked:ring-[var(--a-acento,#f5a524)]"
                                style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={enderecoDaCapa(eventoId, { ...rv, capaYt: { ...rv.capaYt, padrao: p.id } }, 'agendada', { w: 240 })} alt="" loading="lazy" decoding="async"
                                    className={`block w-full transition-opacity ${aAtualizar ? 'opacity-60' : ''}`} style={{ aspectRatio: '16 / 9', background: 'var(--a-borda)', objectFit: 'cover' }} />
                                <span className="block px-2 py-1.5 text-[14px] font-semibold leading-tight">{p.nome}</span>
                            </button>
                        )
                    })}
                </div>
                <p className="text-[13px] a-suave">{PADROES_CAPA.find((p) => p.id === c.padrao)?.nota}.</p>
            </div>

            <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
                <Linha id="cy-titulo" rotulo="Título grande" valor={c.titulo} onChange={(v) => alterar({ titulo: v })} max={LIMITES_CAPA_YT.titulo}
                    placeholder={r.tema || eventoNome} ajuda="Vazio = o tema da mensagem (ou o nome do culto). | muda de linha; *assim* fica em destaque." />
                <Linha id="cy-sub" rotulo="Subtítulo" valor={c.subtitulo} onChange={(v) => alterar({ subtitulo: v })} max={LIMITES_CAPA_YT.subtitulo}
                    placeholder={eventoNome} ajuda="Vazio = o nome do culto." />
                <div className="space-y-1">
                    <label htmlFor="cy-preletor" className="block text-[15px] font-semibold">Preletor</label>
                    <CampoPreletor id="cy-preletor" value={c.preletor} maxLength={LIMITES_CAPA_YT.preletor} placeholder={r.preletor || 'O do culto'} onChange={(t) => alterar({ preletor: t })} />
                    <p className="text-[13px] a-suave">Vazio = o preletor do culto.</p>
                </div>
                <Linha id="cy-quando" rotulo="Data e hora" valor={c.quando} onChange={(v) => alterar({ quando: v })} max={LIMITES_CAPA_YT.quando}
                    placeholder={`${auto.quando} · ${auto.hora}`} ajuda="Vazio = automático (o dia e a hora do culto)." />
            </div>

            <fieldset className="space-y-2">
                <legend className="text-[15px] font-semibold">Cores</legend>
                <div className="flex flex-wrap gap-1">
                    <label title="As do padrão" className={`flex h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-[14px] ${ANEL}`} style={estiloCampo}>
                        <input type="radio" name="cy-cores" checked={c.paleta === ''} onChange={() => alterar({ paleta: '' })} className="sr-only" /> Do padrão
                    </label>
                    {PALETAS.map((p) => (
                        <label key={p.id} title={p.nome} className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full ${ANEL}`}>
                            <input type="radio" name="cy-cores" checked={c.paleta === p.id} onChange={() => alterar({ paleta: p.id })} className="sr-only" aria-label={p.nome} />
                            <Bolinha a={p.fundo} b={p.acento} />
                        </label>
                    ))}
                </div>
                <p className="text-[13px] a-suave">{c.paleta ? PALETAS.find((p) => p.id === c.paleta)?.nome : c.padrao === 'igual' ? 'As cores do kit.' : c.padrao === 'evento' ? 'As cores da categoria do culto.' : 'Verde e dourado da marca.'}</p>
            </fieldset>

            <div className="grid gap-4 md:grid-cols-2">
                <fieldset className="space-y-2">
                    <legend className="text-[15px] font-semibold">Fundo</legend>
                    <div className="flex flex-wrap gap-2">
                        <label className={radio} style={estiloCampo}><input type="radio" name="cy-fundo" checked={c.fundo === 'cores' || !r.fundo} onChange={() => alterar({ fundo: 'cores' })} className="sr-only" /> Só cores</label>
                        <label className={`${radio} ${r.fundo ? '' : 'opacity-50'}`} style={estiloCampo}>
                            <input type="radio" name="cy-fundo" checked={c.fundo === 'foto' && !!r.fundo} disabled={!r.fundo} onChange={() => alterar({ fundo: 'foto' })} className="sr-only" /> Fundo do kit
                        </label>
                    </div>
                    {!r.fundo && <p className="text-[13px] a-suave">O kit não tem imagem de fundo (escolha-a em &quot;Imagem de fundo&quot;, no separador Telão).</p>}
                </fieldset>
                <fieldset className="space-y-2">
                    <legend className="text-[15px] font-semibold">Foto do preletor</legend>
                    <div className="flex flex-wrap gap-2">
                        {([['direita', 'À direita'], ['esquerda', 'À esquerda'], ['sem', 'Sem foto']] as const).map(([v, nome]) => {
                            const desligado = v !== 'sem' && !fotoMuda
                            return (
                                <label key={v} className={`${radio} ${desligado || (v !== 'sem' && !kitTemFoto) ? 'opacity-50' : ''}`} style={estiloCampo}>
                                    <input type="radio" name="cy-foto" checked={c.foto === v} disabled={desligado} onChange={() => alterar({ foto: v })} className="sr-only" /> {nome}
                                </label>
                            )
                        })}
                    </div>
                    <p className="text-[13px] a-suave">{!kitTemFoto ? 'O kit ainda não tem foto do preletor (separador Telão → Foto do preletor).' : fotoMuda ? 'A foto vem do kit.' : 'Neste padrão a posição da foto segue o estilo (ou não tem foto).'}</p>
                </fieldset>
            </div>

            <button type="button" onClick={() => mudar({ capaYt: capaYtVazia() })} disabled={capaYtIgualAoOriginal(c)}
                className="a-botao a-botao-secundario !min-h-[44px] disabled:opacity-50"><RotateCcw size={16} aria-hidden /> Repor</button>
        </div>
    )
}
