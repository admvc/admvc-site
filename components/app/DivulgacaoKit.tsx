'use client'

// Kit de artes de um culto: escolher estilo + cores, marcar as artes do telão e das redes, pôr a foto do preletor,
// ver, guardar e descarregar, e copiar a legenda e a mensagem de WhatsApp.
// As imagens vêm de /api/divulgacao/imagem (geradas na hora); o que fica guardado é só a receita.
import { useEffect, useMemo, useState, useTransition } from 'react'
import { Check, Copy, Download, ImagePlus, Save, Trash2 } from 'lucide-react'
import { guardarKitDivulgacao } from '@/actions/divulgacao-actions'
import { ALVOS, ESTILOS, FUNDOS_PRONTOS, PALETAS, PECAS, REDES, type PecaId, type RedeId } from '@/lib/divulgacao'
import { nomeDaPeca, nomeDaRede, paramsDaPeca, paramsDaRede, type FotoKit, type Receita } from '@/lib/divulgacao-kit'
import { textosDoCulto } from '@/lib/divulgacao-textos'
import { reduzirImagem } from '@/lib/reduzir-imagem'

type Props = {
    eventoId: number
    eventoNome: string
    dataISO: string                               // data/hora do culto (Lisboa "escrita" em UTC)
    hojeISO: string                               // agora, no mesmo formato (para "Hoje" / "Amanhã" nos textos)
    local: string                                 // cidade da igreja, para a legenda
    receitaInicial: Receita
    guardado: boolean
    contas: { nome: string; iban: string }[]
}

const campo = 'a-foco min-h-[48px] w-full rounded-[14px] border px-3 text-[16px]'
const estiloCampo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }
const chip = 'flex min-h-[48px] cursor-pointer items-center gap-2 rounded-[14px] border px-3 text-[15px] has-[:checked]:ring-2 has-[:checked]:ring-[var(--a-acento,#f5a524)]'

// Texto que só conta quando se sai do campo (cada mudança volta a desenhar as imagens)
function CampoTexto({ valor, onCommit, ...resto }: { valor: string; onCommit: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur'>) {
    const [v, setV] = useState(valor)
    useEffect(() => setV(valor), [valor])
    return (
        <input {...resto} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== valor && onCommit(v)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (v !== valor) onCommit(v) } }}
            className={campo} style={estiloCampo} />
    )
}

type Enviada = { url: string; largura: number; altura: number; recorte: boolean; fundoClaro?: boolean }

// Envia uma imagem (foto do preletor ou fundo) para o Blob público. Os PNG com fundo transparente ficam PNG (recortes).
async function enviarImagem(file: File, tipo: 'foto' | 'fundo', tirarBranco = false): Promise<Enviada> {
    const fd = new FormData()
    fd.set('file', await reduzirImagem(file, tipo === 'fundo' ? 2600 : 2000))
    fd.set('tipo', tipo)
    if (tirarBranco) fd.set('tirarBranco', '1')
    const res = await fetch('/api/upload/divulgacao-foto', { method: 'POST', body: fd })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j.url) throw new Error(j.error ?? 'Não foi possível enviar a imagem.')
    return j
}

// Uma foto do preletor: carregar, clicar na imagem para dizer onde está o rosto (o corte segue esse ponto), tirar
function CampoFoto({ titulo, ajuda, foto, onChange }: { titulo: string; ajuda: string; foto: FotoKit | null; onChange: (f: FotoKit | null) => void }) {
    const [aEnviar, setAEnviar] = useState(false)
    const [erro, setErro] = useState('')
    // a última foto escolhida (para voltar a enviar sem o fundo branco) e se o servidor viu um fundo claro
    const [original, setOriginal] = useState<{ file: File; claro: boolean } | null>(null)

    async function enviar(file: File | undefined, tirarBranco = false) {
        if (!file) return
        setErro(''); setAEnviar(true)
        try {
            const j = await enviarImagem(file, 'foto', tirarBranco)
            setOriginal({ file, claro: !!j.fundoClaro })
            onChange({ url: j.url, foco: '50% 30%', w: j.largura, h: j.altura, recorte: j.recorte })
        } catch (e) {
            setErro(e instanceof Error ? e.message : 'Não foi possível enviar a foto.')
        } finally {
            setAEnviar(false)
        }
    }

    const [fx, fy] = (foto?.foco ?? '50% 30%').split(' ').map((n) => parseInt(n, 10))
    return (
        <div className="space-y-2">
            <span className="block text-[15px] font-semibold">{titulo}</span>
            <p className="text-[14px] a-suave">{ajuda}</p>
            {foto ? (
                <div className="space-y-2">
                    <div className="relative max-w-xs overflow-hidden rounded-xl border" style={{ borderColor: 'var(--a-borda)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={foto.url} alt={titulo} className="block w-full cursor-crosshair"
                            onClick={(e) => {
                                const r = e.currentTarget.getBoundingClientRect()
                                const x = Math.round(((e.clientX - r.left) / r.width) * 100), y = Math.round(((e.clientY - r.top) / r.height) * 100)
                                onChange({ ...foto, foco: `${x}% ${y}%` })
                            }} />
                        <span aria-hidden className="pointer-events-none absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow" style={{ left: `${fx}%`, top: `${fy}%`, background: 'rgba(0,0,0,0.25)' }} />
                    </div>
                    {foto.recorte
                        ? <p className="text-[14px] font-semibold">Recorte (fundo transparente): o preletor aparece de pé sobre o fundo.</p>
                        : <p className="text-[14px] a-suave">Clique na cara do preletor: o corte das artes fica à volta desse ponto.</p>}
                    {!foto.recorte && original?.claro && (
                        <button type="button" disabled={aEnviar} onClick={() => enviar(original.file, true)} className="a-botao a-botao-secundario !min-h-[44px]">
                            {aEnviar ? 'A tirar o fundo…' : 'Tirar o fundo branco (fica recortado)'}
                        </button>
                    )}
                    <button type="button" onClick={() => onChange(null)} className="a-botao a-botao-secundario !min-h-[44px]"><Trash2 size={18} aria-hidden /> Tirar a foto</button>
                </div>
            ) : (
                <label className="a-botao a-botao-secundario !min-h-[48px] cursor-pointer">
                    <ImagePlus size={18} aria-hidden /> {aEnviar ? 'A enviar…' : 'Escolher foto'}
                    <input type="file" accept="image/*" className="sr-only" disabled={aEnviar} onChange={(e) => { enviar(e.target.files?.[0]); e.target.value = '' }} />
                </label>
            )}
            {erro && <p role="alert" className="text-[15px]" style={{ color: 'var(--a-erro, #dc2626)' }}>{erro}</p>}
        </div>
    )
}

// Fundo da arte: só cores, um dos prontos ou um enviado (fica no Blob público)
function EscolherFundo({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
    const [aEnviar, setAEnviar] = useState(false)
    const [erro, setErro] = useState('')
    const proprio = valor.startsWith('https://')
    async function enviar(file: File | undefined) {
        if (!file) return
        setErro(''); setAEnviar(true)
        try { onChange((await enviarImagem(file, 'fundo')).url) }
        catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível enviar o fundo.') }
        finally { setAEnviar(false) }
    }
    return (
        <fieldset className="space-y-2">
            <legend className="text-[17px] font-bold">Imagem de fundo</legend>
            <p className="text-[14px] a-suave">No telão aparece no estilo &quot;Foto de fundo&quot;; nas redes fica atrás do preletor.</p>
            <div className="flex flex-wrap items-center gap-2">
                <label className={chip} style={estiloCampo}>
                    <input type="radio" name="fundo" checked={!valor} onChange={() => onChange('')} className="sr-only" /> Só cores
                </label>
                {FUNDOS_PRONTOS.map((f) => (
                    <label key={f.id} className={chip} style={estiloCampo}>
                        <input type="radio" name="fundo" checked={valor === f.id} onChange={() => onChange(f.id)} className="sr-only" />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/images/divulgacao/fundos/${f.ficheiro}`} alt="" className="h-8 w-14 rounded object-cover" /> {f.nome}
                    </label>
                ))}
                {proprio && (
                    <label className={chip} style={estiloCampo}>
                        <input type="radio" name="fundo" checked readOnly className="sr-only" />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={valor} alt="" className="h-8 w-14 rounded object-cover" /> O meu fundo
                    </label>
                )}
                <label className="a-botao a-botao-secundario !min-h-[48px] cursor-pointer">
                    <ImagePlus size={18} aria-hidden /> {aEnviar ? 'A enviar…' : proprio ? 'Trocar o meu fundo' : 'Enviar um fundo'}
                    <input type="file" accept="image/*" className="sr-only" disabled={aEnviar} onChange={(e) => { enviar(e.target.files?.[0]); e.target.value = '' }} />
                </label>
            </div>
            {erro && <p role="alert" className="text-[15px]" style={{ color: 'var(--a-erro, #dc2626)' }}>{erro}</p>}
        </fieldset>
    )
}

function CaixaTexto({ titulo, valor, onChange, onRefazer }: { titulo: string; valor: string; onChange: (v: string) => void; onRefazer: () => void }) {
    const [copiado, setCopiado] = useState(false)
    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[16px] font-semibold">{titulo}</span>
                <span className="flex gap-2">
                    <button type="button" onClick={onRefazer} className="a-botao a-botao-secundario !min-h-[40px] !px-3 text-[14px]">Refazer</button>
                    <button type="button" onClick={async () => { await navigator.clipboard?.writeText(valor); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }} className="a-botao a-botao-secundario !min-h-[40px] !px-3 text-[14px]">
                        <Copy size={16} aria-hidden /> {copiado ? 'Copiado' : 'Copiar'}
                    </button>
                </span>
            </div>
            <textarea value={valor} onChange={(e) => onChange(e.target.value)} rows={12} aria-label={titulo} className="a-foco w-full rounded-[14px] border p-3 text-[16px] leading-relaxed" style={estiloCampo} />
        </div>
    )
}

export default function DivulgacaoKit({ eventoId, eventoNome, dataISO, hojeISO, local, receitaInicial, guardado, contas }: Props) {
    const [r, setR] = useState<Receita>(receitaInicial)
    const [guardadoJson, setGuardadoJson] = useState(guardado ? JSON.stringify(receitaInicial) : '')
    const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
    const [meuVerso, setMeuVerso] = useState(!!receitaInicial.verso)   // "Escolher eu": os campos aparecem antes de haver texto
    const [aGuardar, iniciar] = useTransition()
    const [editado, setEditado] = useState<{ legenda?: string; whatsapp?: string }>({})

    const atual = JSON.stringify(r)
    const alterado = atual !== guardadoJson
    const data = useMemo(() => new Date(dataISO), [dataISO])
    const mudar = (p: Partial<Receita>) => { setR((x) => ({ ...x, ...p })); setMsg(null) }
    const alternarPeca = (id: PecaId) => mudar({ pecas: PECAS.map((p) => p.id).filter((x) => (x === id ? !r.pecas.includes(x) : r.pecas.includes(x))) })
    const alternarRede = (id: RedeId) => mudar({ redes: REDES.map((p) => p.id).filter((x) => (x === id ? !r.redes.includes(x) : r.redes.includes(x))) })

    const guardar = () => iniciar(async () => {
        const res = await guardarKitDivulgacao(eventoId, r)
        if (res.ok) { setGuardadoJson(atual); setMsg({ ok: true, texto: 'Artes guardadas. Ficam aqui para descarregar quando quiser.' }) }
        else setMsg({ ok: false, texto: 'error' in res ? res.error : 'Não foi possível guardar.' })
    })

    const paleta = PALETAS.find((p) => p.id === r.paleta) ?? PALETAS[0]
    const dia = dataISO.slice(0, 10)
    const lista = r.pecas.map((id, i) => ({ id, n: i + 1, q: paramsDaPeca(r, id, dia) }))
    const ev = { nome: eventoNome, data }
    const nomeRede = (id: RedeId) => REDES.find((x) => x.id === id)?.nome ?? id

    // Legenda e WhatsApp: saem do culto e do preletor; podem editar-se (a edição fica até carregar em "Refazer")
    const gerados = useMemo(() => textosDoCulto({ nome: r.titulo || eventoNome, data, preletor: r.preletor, local, hoje: new Date(hojeISO) }), [r.titulo, r.preletor, eventoNome, data, local, hojeISO])
    const mostrarPreletor = r.pecas.includes('palavra') || r.redes.length > 0

    return (
        <div className="space-y-6">
            <section className="a-card space-y-4 p-4">
                <fieldset className="space-y-2">
                    <legend className="text-[17px] font-bold">Estilo do telão</legend>
                    <div className="flex flex-wrap gap-2">
                        {ESTILOS.map((e) => (
                            <label key={e.id} className={`${chip} px-4`} style={estiloCampo}>
                                <input type="radio" name="estilo" checked={r.estilo === e.id} onChange={() => mudar({ estilo: e.id })} className="sr-only" />
                                {e.nome}
                            </label>
                        ))}
                    </div>
                </fieldset>

                <fieldset className="space-y-2">
                    <legend className="text-[17px] font-bold">Cores · {paleta.nome}</legend>
                    <div className="flex flex-wrap gap-2">
                        {PALETAS.map((p) => (
                            <label key={p.id} title={p.nome} className={`${chip} text-[14px]`} style={estiloCampo}>
                                <input type="radio" name="paleta" checked={r.paleta === p.id} onChange={() => mudar({ paleta: p.id })} className="sr-only" />
                                <span aria-hidden className="flex h-7 w-12 overflow-hidden rounded-md border" style={{ borderColor: 'var(--a-borda)' }}>
                                    <span className="flex-1" style={{ background: p.fundo }} /><span className="w-3" style={{ background: p.c1 }} /><span className="w-3" style={{ background: p.c2 }} />
                                </span>
                                {p.nome}
                            </label>
                        ))}
                    </div>
                </fieldset>

                <EscolherFundo valor={r.fundo} onChange={(v) => mudar(v ? { fundo: v, estilo: 'foto' } : { fundo: '' })} />

                <fieldset className="space-y-2">
                    <legend className="text-[17px] font-bold">Artes para o telão</legend>
                    <div className="flex flex-wrap gap-2">
                        {PECAS.map((p) => {
                            const ligada = r.pecas.includes(p.id)
                            return (
                                <label key={p.id} className={chip} style={estiloCampo}>
                                    <input type="checkbox" checked={ligada} onChange={() => alternarPeca(p.id)} className="sr-only" />
                                    <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded border" style={{ borderColor: 'var(--a-borda)' }}>{ligada && <Check size={14} />}</span>
                                    {p.nome}
                                </label>
                            )
                        })}
                    </div>
                </fieldset>

                <fieldset className="space-y-2">
                    <legend className="text-[17px] font-bold">Artes para as redes sociais</legend>
                    <div className="flex flex-wrap gap-2">
                        {REDES.map((p) => {
                            const ligada = r.redes.includes(p.id)
                            return (
                                <label key={p.id} className={chip} style={estiloCampo}>
                                    <input type="checkbox" checked={ligada} onChange={() => alternarRede(p.id)} className="sr-only" />
                                    <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded border" style={{ borderColor: 'var(--a-borda)' }}>{ligada && <Check size={14} />}</span>
                                    {p.nome}
                                </label>
                            )
                        })}
                    </div>
                </fieldset>

                <div className="grid gap-3 md:grid-cols-2">
                    {mostrarPreletor && (
                        <div className="space-y-1">
                            <span className="block text-[15px] font-semibold">Preletor (Palavra e redes; deixe vazio se ainda não sabe)</span>
                            <CampoTexto valor={r.preletor} onCommit={(v) => mudar({ preletor: v })} placeholder="Ex.: Irmão Genesis" maxLength={60} />
                        </div>
                    )}
                    {r.redes.length > 0 && (
                        <div className="space-y-1">
                            <span className="block text-[15px] font-semibold">Título e linha de cima nas redes</span>
                            <CampoTexto valor={r.titulo} onCommit={(v) => mudar({ titulo: v })} placeholder={`Título (vazio = ${eventoNome}). Use | para mudar de linha`} maxLength={60} />
                            <CampoTexto valor={r.subtitulo} onCommit={(v) => mudar({ subtitulo: v })} placeholder="Linha de cima (ex.: Jovens & Gerações)" maxLength={40} />
                        </div>
                    )}
                    {r.pecas.includes('oracao-dirigida') && (
                        <div className="space-y-1">
                            <span className="block text-[15px] font-semibold">Oração por…</span>
                            <select value={r.alvoTexto ? '' : r.alvo} onChange={(e) => mudar({ alvo: e.target.value, alvoTexto: '' })} className={campo} style={estiloCampo}>
                                {Object.entries(ALVOS).map(([id, [, nome]]) => <option key={id} value={id}>{nome}</option>)}
                                {r.alvoTexto && <option value="">Outro: {r.alvoTexto}</option>}
                            </select>
                            <CampoTexto valor={r.alvoTexto} onCommit={(v) => mudar({ alvoTexto: v })} placeholder="Ou escreva outro (ex.: Enfermos)" maxLength={40} />
                        </div>
                    )}
                    {r.pecas.includes('palavra') && (
                        <div className="space-y-1">
                            <span className="block text-[15px] font-semibold">Palavra no telão (sem tema = &quot;Momento da Palavra&quot;)</span>
                            <CampoTexto valor={r.tema} onCommit={(v) => mudar({ tema: v })} placeholder="Tema da mensagem" maxLength={80} />
                            <CampoTexto valor={r.ref} onCommit={(v) => mudar({ ref: v })} placeholder="Texto bíblico (ex.: 1 Samuel 17:22-26)" maxLength={80} />
                            {(r.fotoV ?? r.fotoH)?.recorte && (
                                <label className="flex min-h-[44px] items-center gap-2 text-[15px]">
                                    <input type="checkbox" checked={r.palavraComFoto} onChange={(e) => mudar({ palavraComFoto: e.target.checked })} className="h-5 w-5" />
                                    Pôr o preletor (recorte) ao lado do tema
                                </label>
                            )}
                        </div>
                    )}
                    {r.pecas.includes('oferta') && (
                        <div className="space-y-1">
                            <span className="block text-[15px] font-semibold">IBAN da oferta</span>
                            {contas.length > 0 && (
                                <select value={contas.find((c) => c.iban === r.iban)?.iban ?? ''} onChange={(e) => e.target.value && mudar({ iban: e.target.value })} className={campo} style={estiloCampo}>
                                    <option value="">Escolher uma conta da igreja…</option>
                                    {contas.map((c) => <option key={c.iban} value={c.iban}>{c.nome}</option>)}
                                </select>
                            )}
                            <CampoTexto valor={r.iban} onCommit={(v) => mudar({ iban: v })} placeholder="PT50 0000 0000 0000 0000 0000 0" maxLength={40} />
                        </div>
                    )}
                    {r.pecas.includes('boas-vindas') && (
                        <div className="space-y-1">
                            <span className="block text-[15px] font-semibold">Endereço do QR (boas-vindas)</span>
                            <CampoTexto valor={r.qr} onCommit={(v) => mudar({ qr: v })} maxLength={300} inputMode="url" />
                        </div>
                    )}
                    <div className="space-y-1">
                        <span className="block text-[15px] font-semibold">Versículo no rodapé do telão</span>
                        <select value={r.semVersiculo ? 'sem' : meuVerso ? 'meu' : 'auto'}
                            onChange={(e) => {
                                const v = e.target.value
                                setMeuVerso(v === 'meu')
                                mudar(v === 'sem' ? { semVersiculo: true } : v === 'meu' ? { semVersiculo: false } : { semVersiculo: false, verso: '', versoRef: '' })
                            }}
                            className={campo} style={estiloCampo}>
                            <option value="auto">Um da lista (muda de culto para culto)</option>
                            <option value="meu">Escolher eu</option>
                            <option value="sem">Sem versículo</option>
                        </select>
                        {!r.semVersiculo && meuVerso && (
                            <>
                                <CampoTexto valor={r.verso} onCommit={(v) => mudar({ verso: v })} placeholder="Texto do versículo" maxLength={220} />
                                <CampoTexto valor={r.versoRef} onCommit={(v) => mudar({ versoRef: v })} placeholder="Referência (ex.: Salmos 23:1)" maxLength={60} />
                            </>
                        )}
                    </div>
                </div>

                {r.redes.length > 0 && (
                    <div className="space-y-3 border-t pt-4" style={{ borderColor: 'var(--a-borda)' }}>
                        <h3 className="text-[17px] font-bold">Foto do preletor</h3>
                        <p className="text-[14px] a-suave">Uma foto recortada (PNG com fundo transparente, do remove.bg ou do Canva) fica muito melhor: o preletor aparece de pé sobre o fundo, e também na Palavra do telão.</p>
                        <div className="grid gap-4 md:grid-cols-2">
                            <CampoFoto titulo="Foto ao alto (post e story)" ajuda="Uma foto em pé, do preletor da cintura para cima, funciona melhor." foto={r.fotoV} onChange={(f) => mudar({ fotoV: f })} />
                            <CampoFoto titulo="Foto deitada (capa da live)" ajuda="Opcional: sem ela, a capa usa a foto ao alto." foto={r.fotoH} onChange={(f) => mudar({ fotoH: f })} />
                        </div>
                        {(r.fotoH || r.fotoV) && (
                            <label className="block max-w-xs space-y-1">
                                <span className="block text-[15px] font-semibold">Véu de cor sobre a foto</span>
                                <select value={String(r.tinta)} onChange={(e) => mudar({ tinta: Number(e.target.value) })} className={campo} style={estiloCampo}>
                                    <option value="0">Nenhum</option><option value="0.15">Leve</option><option value="0.25">Médio</option><option value="0.4">Forte (camisas de cor que destoam)</option>
                                </select>
                            </label>
                        )}
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={guardar} disabled={aGuardar || !alterado || (r.pecas.length === 0 && r.redes.length === 0)} className="a-botao a-botao-principal">
                        <Save size={18} aria-hidden /> {aGuardar ? 'A guardar…' : guardadoJson ? 'Guardar alterações' : 'Guardar kit'}
                    </button>
                    {guardadoJson && !alterado
                        ? <a href={`/api/divulgacao/zip?evento=${eventoId}`} className="a-botao a-botao-secundario"><Download size={18} aria-hidden /> Descarregar tudo (ZIP)</a>
                        : guardadoJson && <span className="text-[15px] a-suave">Guarde as alterações para descarregar o ZIP.</span>}
                    {msg && <span role="status" className="text-[15px]" style={{ color: msg.ok ? 'var(--a-ok, #16a34a)' : 'var(--a-erro, #dc2626)' }}>{msg.texto}</span>}
                </div>
            </section>

            {r.redes.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-[19px] font-bold">Redes sociais</h2>
                    <div className="grid items-start gap-4 md:grid-cols-3">
                        {r.redes.map((id) => {
                            const q = paramsDaRede(r, id, ev)
                            return (
                                <figure key={id} className={`space-y-2 ${id === 'youtube' ? 'md:col-span-3' : ''}`}>
                                    <figcaption className="text-[16px] font-semibold">{nomeRede(id)}</figcaption>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={`/api/divulgacao/imagem?${q}`} alt={nomeRede(id)} loading="lazy" className={`w-full rounded-xl border ${id === 'youtube' ? 'max-w-xl' : ''}`}
                                        style={{ borderColor: 'var(--a-borda)', aspectRatio: id === 'post' ? '4 / 5' : id === 'story' ? '9 / 16' : '16 / 9', background: 'var(--a-card)' }} />
                                    <a href={`/api/divulgacao/imagem?${q}&download=1`} download={nomeDaRede(id)} className="a-botao a-botao-secundario !min-h-[44px]"><Download size={18} aria-hidden /> Descarregar</a>
                                </figure>
                            )
                        })}
                    </div>
                </section>
            )}

            {r.redes.length > 0 && (
                <section className="a-card space-y-4 p-4">
                    <h2 className="text-[19px] font-bold">Textos para publicar</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        <CaixaTexto titulo="Legenda Instagram / Facebook" valor={editado.legenda ?? gerados.legenda} onChange={(v) => setEditado((x) => ({ ...x, legenda: v }))} onRefazer={() => setEditado((x) => ({ ...x, legenda: undefined }))} />
                        <CaixaTexto titulo="Mensagem de WhatsApp" valor={editado.whatsapp ?? gerados.whatsapp} onChange={(v) => setEditado((x) => ({ ...x, whatsapp: v }))} onRefazer={() => setEditado((x) => ({ ...x, whatsapp: undefined }))} />
                    </div>
                </section>
            )}

            {lista.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-[19px] font-bold">Telão</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        {lista.map(({ id, n, q }) => (
                            <figure key={id} className="space-y-2">
                                <figcaption className="text-[16px] font-semibold">{PECAS.find((p) => p.id === id)?.nome}</figcaption>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={`/api/divulgacao/imagem?${q}`} alt={PECAS.find((p) => p.id === id)?.nome} loading="lazy" className="w-full rounded-xl border" style={{ borderColor: 'var(--a-borda)', aspectRatio: '16 / 9', background: 'var(--a-card)' }} />
                                <a href={`/api/divulgacao/imagem?${q}&download=1`} download={nomeDaPeca(r, id, n)} className="a-botao a-botao-secundario !min-h-[44px]"><Download size={18} aria-hidden /> Descarregar (1920×1080)</a>
                            </figure>
                        ))}
                    </div>
                </section>
            )}
            {lista.length === 0 && r.redes.length === 0 && <p className="a-suave">Marque pelo menos uma arte para a ver aqui.</p>}
        </div>
    )
}
