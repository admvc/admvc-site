'use client'

// Ecrã do banco de fundos: separadores por categoria, envio de várias imagens (reduzidas aqui, no telemóvel),
// renomear no cartão, mudar de categoria, mover (ordem) e apagar com confirmação.
import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Trash2, Upload } from 'lucide-react'
import { reduzirImagem } from '@/lib/reduzir-imagem'
import { formatarBytes } from '@/lib/fotos-limites'
import { CATEGORIAS_FUNDO, MAX_LADO_FUNDO, nomeLimpo, textoDaCategoria, type CategoriaFundo, type Fundo } from '@/lib/fundos'

async function pedir(url: string, init?: RequestInit): Promise<{ ok: boolean; erro?: string; dados: Record<string, unknown> }> {
    try {
        const r = await fetch(url, init)
        const j = await r.json().catch(() => ({}))
        return { ok: r.ok, erro: r.ok ? undefined : (j.error ?? 'Não foi possível concluir.'), dados: j }
    } catch {
        return { ok: false, erro: 'Sem ligação. Tente outra vez.', dados: {} }
    }
}

export default function FundosClient({ inicial }: { inicial: Fundo[] }) {
    const [fundos, setFundos] = useState<Fundo[]>(inicial)
    const [cat, setCat] = useState<CategoriaFundo>(() => CATEGORIAS_FUNDO.find((c) => inicial.some((f) => f.categoria === c.id))?.id ?? 'ADMVC')
    const [aEnviar, setAEnviar] = useState<{ feitos: number; total: number } | null>(null)
    const [erros, setErros] = useState<string[]>([])
    const [confirmar, setConfirmar] = useState<number | null>(null)
    const [msg, setMsg] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const daCategoria = fundos.filter((f) => f.categoria === cat).sort((a, b) => a.ordem - b.ordem || a.id - b.id)

    async function enviar(lista: FileList | null) {
        if (!lista || lista.length === 0) return
        const ficheiros = [...lista]
        const falhas: string[] = []
        setErros([]); setMsg(null)
        setAEnviar({ feitos: 0, total: ficheiros.length })
        for (let i = 0; i < ficheiros.length; i++) {
            const f = ficheiros[i]
            const reduzida = await reduzirImagem(f, MAX_LADO_FUNDO, 0.88)
            const fd = new FormData()
            fd.set('file', reduzida)
            fd.set('categoria', cat)
            fd.set('nome', nomeLimpo(f.name))
            const r = await pedir('/api/fundos', { method: 'POST', body: fd })
            if (r.ok && r.dados.fundo) setFundos((antes) => [...antes, r.dados.fundo as Fundo])
            else falhas.push(`${f.name}: ${r.erro}`)
            setAEnviar({ feitos: i + 1, total: ficheiros.length })
        }
        setAEnviar(null)
        setErros(falhas)
        if (falhas.length < ficheiros.length) setMsg(`${ficheiros.length - falhas.length} ${ficheiros.length - falhas.length === 1 ? 'fundo guardado' : 'fundos guardados'}.`)
        if (inputRef.current) inputRef.current.value = ''
    }

    async function renomear(f: Fundo, texto: string) {
        const nome = nomeLimpo(texto)
        if (!nome) { setFundos((a) => a.map((x) => x.id === f.id ? { ...x } : x)); setErros(['Escreva um nome.']); return }
        if (nome === f.nome) return
        const r = await pedir(`/api/fundos/${f.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome }) })
        if (r.ok) { setFundos((a) => a.map((x) => x.id === f.id ? { ...x, nome } : x)); setErros([]); setMsg('Nome guardado.') }
        else setErros([r.erro ?? 'Não foi possível renomear.'])
    }

    async function mudarCategoria(f: Fundo, categoria: CategoriaFundo) {
        const r = await pedir(`/api/fundos/${f.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoria }) })
        if (r.ok && r.dados.fundo) {
            setFundos((a) => a.map((x) => x.id === f.id ? (r.dados.fundo as Fundo) : x)); setErros([])
            setMsg(`Passou para ${textoDaCategoria(categoria)}.`)
        } else setErros([r.erro ?? 'Não foi possível mudar de categoria.'])
    }

    async function mover(f: Fundo, dir: -1 | 1) {
        const ids = daCategoria.map((x) => x.id)
        const i = ids.indexOf(f.id), j = i + dir
        if (j < 0 || j >= ids.length) return
        const r = await pedir(`/api/fundos/${f.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mover: dir }) })
        if (!r.ok) { setErros([r.erro ?? 'Não foi possível mudar a ordem.']); return }
        // espelha no ecrã: renumera a categoria pela nova ordem
        ;[ids[i], ids[j]] = [ids[j], ids[i]]
        setFundos((a) => a.map((x) => ids.includes(x.id) ? { ...x, ordem: ids.indexOf(x.id) + 1 } : x))
    }

    async function apagar(f: Fundo) {
        const r = await pedir(`/api/fundos/${f.id}`, { method: 'DELETE' })
        if (r.ok) { setFundos((a) => a.filter((x) => x.id !== f.id)); setConfirmar(null); setErros([]); setMsg('Fundo apagado.') }
        else setErros([r.erro ?? 'Não foi possível apagar.'])
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Categorias">
                {CATEGORIAS_FUNDO.map((c) => (
                    <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} onClick={() => { setCat(c.id); setConfirmar(null) }}
                        className="min-h-[44px] rounded-full px-4 text-[15px] font-semibold"
                        style={cat === c.id ? { background: 'var(--a-destaque)', color: '#fff' } : { background: 'var(--a-borda)' }}>
                        {c.texto} <span className="opacity-70">{fundos.filter((f) => f.categoria === c.id).length}</span>
                    </button>
                ))}
            </div>

            <div className="a-card flex flex-wrap items-center gap-3 p-3">
                <input ref={inputRef} id="fundos-ficheiros" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/*" multiple className="sr-only"
                    onChange={(e) => enviar(e.target.files)} disabled={!!aEnviar} />
                <label htmlFor="fundos-ficheiros" className="a-botao !min-h-[48px] cursor-pointer" style={{ background: 'var(--a-destaque)', color: '#fff', opacity: aEnviar ? 0.6 : 1 }} aria-disabled={!!aEnviar}>
                    <Upload size={18} aria-hidden /> Enviar imagens para {textoDaCategoria(cat)}
                </label>
                <p className="text-[14px] a-suave" role="status">
                    {aEnviar ? `A enviar ${aEnviar.feitos} de ${aEnviar.total}…` : msg ?? 'Pode escolher várias de uma vez.'}
                </p>
            </div>

            {erros.length > 0 && (
                <ul role="alert" className="space-y-1 text-[14px] font-semibold" style={{ color: 'var(--a-erro, #dc2626)' }}>
                    {erros.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
            )}

            {daCategoria.length === 0 ? (
                <p className="a-card p-4 a-suave">Ainda não há fundos em {textoDaCategoria(cat)}. Toque em &quot;Enviar imagens&quot;.</p>
            ) : (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {daCategoria.map((f, i) => (
                        <li key={f.id} className="a-card overflow-hidden" data-fundo={f.id}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={f.url} alt={f.nome} loading="lazy" className="aspect-video w-full object-cover" />
                            <div className="space-y-2 p-3">
                                <label className="block">
                                    <span className="sr-only">Nome do fundo</span>
                                    <input defaultValue={f.nome} key={f.nome} maxLength={60} className="a-input w-full" style={{ minHeight: 44 }}
                                        onBlur={(e) => renomear(f, e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
                                </label>
                                <p className="text-[13px] a-suave">{f.largura}×{f.altura} px · {formatarBytes(f.bytes)}</p>
                                <div className="flex flex-wrap items-center gap-2">
                                    <label className="flex-1 min-w-[130px]">
                                        <span className="sr-only">Categoria</span>
                                        <select value={f.categoria} onChange={(e) => mudarCategoria(f, e.target.value as CategoriaFundo)} className="a-input w-full" style={{ minHeight: 44 }}>
                                            {CATEGORIAS_FUNDO.map((c) => <option key={c.id} value={c.id}>{c.texto}</option>)}
                                        </select>
                                    </label>
                                    <button type="button" onClick={() => mover(f, -1)} disabled={i === 0} aria-label="Mover para trás" className="a-botao a-botao-secundario !min-h-[44px] !px-3"><ArrowLeft size={17} aria-hidden /></button>
                                    <button type="button" onClick={() => mover(f, 1)} disabled={i === daCategoria.length - 1} aria-label="Mover para a frente" className="a-botao a-botao-secundario !min-h-[44px] !px-3"><ArrowRight size={17} aria-hidden /></button>
                                </div>
                                {confirmar === f.id ? (
                                    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirmar">
                                        <span className="text-[14px] font-semibold">Apagar este fundo?</span>
                                        <button type="button" onClick={() => apagar(f)} className="a-botao !min-h-[44px] !px-3 text-[15px]" style={{ background: '#dc2626', color: '#fff' }}>Sim, apagar</button>
                                        <button type="button" onClick={() => setConfirmar(null)} className="a-botao a-botao-secundario !min-h-[44px] !px-3 text-[15px]">Não</button>
                                    </div>
                                ) : (
                                    <button type="button" onClick={() => setConfirmar(f.id)} className="a-botao a-botao-secundario !min-h-[44px] !px-3 text-[15px]"><Trash2 size={17} aria-hidden /> Apagar</button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
