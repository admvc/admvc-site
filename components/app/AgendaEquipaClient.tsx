'use client'

// Formulários da agenda de uma equipa: marcar / mudar um encontro, registar o que se fez (quem esteve e
// uma foto, como nos Grupos e PGs), apagar.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Check, Loader2, Pencil, Plus } from 'lucide-react'
import { apagarEncontro, guardarEncontro, registarEncontro } from '@/actions/agenda-departamento-actions'
import { reduzirImagensDoForm } from '@/lib/reduzir-imagem'
import { TIPOS_AGENDA_DEPTO } from '@/lib/agenda'
import { useConfirm } from '@/components/ui/ConfirmDialog'

export type Encontro = {
    id: number; titulo: string; tipo: string; inicio: string; fim: string | null
    local: string | null; descricao: string | null; registo: string | null; presentes: number | null
    foto_url: string | null; presentesIds: number[]
}
export type PessoaEquipa = { id: number; nome: string }

const campo = 'a-foco min-h-[48px] w-full rounded-[14px] border px-3 text-[16px]'
const estilo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }

function useAcao() {
    const router = useRouter()
    const [erro, setErro] = useState<string | null>(null)
    const [pendente, iniciar] = useTransition()
    const correr = (f: () => Promise<{ ok: boolean; error?: string }>, depois?: () => void) => iniciar(async () => {
        setErro(null)
        const r = await f()
        if (!r.ok) { setErro(r.error ?? 'Erro.'); return }
        depois?.(); router.refresh()
    })
    return { erro, pendente, correr }
}

export function FormEncontro({ deptoId, e, onFim }: { deptoId: number; e?: Encontro; onFim?: () => void }) {
    const [aberto, setAberto] = useState(!!e)
    const { erro, pendente, correr } = useAcao()
    if (!aberto) {
        return (
            <button type="button" onClick={() => setAberto(true)} className="a-botao a-botao-principal w-full"><Plus size={20} aria-hidden /> Marcar encontro</button>
        )
    }
    const fechar = () => { setAberto(false); onFim?.() }
    return (
        <form className="a-card space-y-3 p-4" action={(fd) => correr(() => guardarEncontro(fd), fechar)}>
            <input type="hidden" name="departamento_id" value={deptoId} />
            {e && <input type="hidden" name="id" value={e.id} />}
            <label className="block space-y-1"><span className="text-[15px] font-semibold">O quê</span>
                <input name="titulo" required defaultValue={e?.titulo} placeholder="Ex.: Ensaio geral" className={campo} style={estilo} /></label>
            <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1"><span className="text-[15px] font-semibold">Tipo</span>
                    <select name="tipo" defaultValue={e?.tipo ?? 'REUNIAO'} className={campo} style={estilo}>
                        {Object.entries(TIPOS_AGENDA_DEPTO).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                    </select></label>
                <label className="block space-y-1"><span className="text-[15px] font-semibold">Dia</span>
                    <input name="dia" type="date" required defaultValue={e?.inicio.slice(0, 10)} className={campo} style={estilo} /></label>
                <label className="block space-y-1"><span className="text-[15px] font-semibold">Hora</span>
                    <input name="hora" type="time" required defaultValue={e?.inicio.slice(11, 16)} className={campo} style={estilo} /></label>
                <label className="block space-y-1"><span className="text-[15px] font-semibold">Até (opcional)</span>
                    <input name="hora_fim" type="time" defaultValue={e?.fim?.slice(11, 16)} className={campo} style={estilo} /></label>
            </div>
            <label className="block space-y-1"><span className="text-[15px] font-semibold">Onde</span>
                <input name="local" defaultValue={e?.local ?? ''} placeholder="Ex.: Sala 2, igreja" className={campo} style={estilo} /></label>
            <label className="block space-y-1"><span className="text-[15px] font-semibold">Notas para a equipa</span>
                <textarea name="descricao" rows={2} defaultValue={e?.descricao ?? ''} className={`${campo} py-2`} style={estilo} /></label>
            {erro && <p role="alert" className="text-[15px]" style={{ color: 'var(--a-erro)' }}>{erro}</p>}
            <div className="flex gap-2">
                <button disabled={pendente} className="a-botao a-botao-principal flex-1">{pendente && <Loader2 size={18} className="animate-spin" aria-hidden />} Guardar</button>
                <button type="button" onClick={fechar} className="a-botao a-botao-secundario">Cancelar</button>
            </div>
            {!e && <p className="text-[14px] a-suave">A equipa recebe um aviso no telemóvel.</p>}
        </form>
    )
}

/** Registo depois do encontro: o que se fez, quem esteve (tocar nas pessoas) e uma foto. */
function FormRegisto({ deptoId, e, equipa, onFim }: { deptoId: number; e: Encontro; equipa: PessoaEquipa[]; onFim: () => void }) {
    const { erro, pendente, correr } = useAcao()
    const [marcados, setMarcados] = useState<Set<number>>(() => new Set(e.presentesIds))
    const [previa, setPrevia] = useState<string | null>(null)
    const [tirarFoto, setTirarFoto] = useState(false)
    const alternar = (id: number) => setMarcados((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
    const todos = marcados.size === equipa.length
    return (
        <form className="space-y-3 pt-2" action={(fd) => correr(async () => registarEncontro(await reduzirImagensDoForm(fd)), onFim)}>
            <input type="hidden" name="departamento_id" value={deptoId} /><input type="hidden" name="id" value={e.id} />
            <label className="block space-y-1"><span className="text-[15px] font-semibold">O que se fez</span>
                <textarea name="registo" rows={3} defaultValue={e.registo ?? ''} placeholder="Ex.: ensaiámos 4 músicas novas; decidimos…" className={`${campo} py-2`} style={estilo} /></label>

            {equipa.length > 0 ? (
                <fieldset className="space-y-2">
                    <input type="hidden" name="com_lista" value="1" />
                    <div className="flex items-center gap-2">
                        <legend className="mr-auto text-[15px] font-semibold">Quem esteve · {marcados.size} de {equipa.length}</legend>
                        <button type="button" onClick={() => setMarcados(todos ? new Set() : new Set(equipa.map((p) => p.id)))} className="a-foco min-h-[40px] text-[15px] font-semibold" style={{ color: 'var(--a-destaque)' }}>
                            {todos ? 'Limpar' : 'Marcar todos'}
                        </button>
                    </div>
                    <ul className="grid gap-2 sm:grid-cols-2">
                        {equipa.map((p) => {
                            const sim = marcados.has(p.id)
                            return (
                                <li key={p.id}>
                                    <label className="a-foco flex min-h-[48px] cursor-pointer items-center gap-3 rounded-[14px] border px-3 text-[16px]"
                                        style={{ ...estilo, ...(sim ? { borderColor: 'var(--a-destaque)', background: 'color-mix(in srgb, var(--a-destaque) 12%, var(--a-card))' } : {}) }}>
                                        <input type="checkbox" name="presentes_ids" value={p.id} checked={sim} onChange={() => alternar(p.id)} className="h-5 w-5 shrink-0" />
                                        <span className="min-w-0 truncate">{p.nome}</span>
                                        {sim && <Check size={18} className="ml-auto shrink-0" style={{ color: 'var(--a-destaque)' }} aria-hidden />}
                                    </label>
                                </li>
                            )
                        })}
                    </ul>
                </fieldset>
            ) : (
                <label className="block space-y-1"><span className="text-[15px] font-semibold">Quantos estiveram</span>
                    <input name="presentes" type="number" min={0} defaultValue={e.presentes ?? ''} className={`${campo} max-w-[140px]`} style={estilo} /></label>
            )}

            <div className="space-y-2">
                <span className="block text-[15px] font-semibold">Foto do encontro</span>
                {(previa || (e.foto_url && !tirarFoto)) && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={previa ?? e.foto_url!} alt="Foto do encontro" className="max-h-56 w-full rounded-[14px] object-cover" />
                )}
                <label className="a-botao a-botao-secundario !min-h-[48px] cursor-pointer">
                    <Camera size={18} aria-hidden /> {e.foto_url || previa ? 'Trocar a foto' : 'Tirar ou escolher foto'}
                    <input type="file" name="foto" accept="image/*" capture="environment" className="sr-only"
                        onChange={(ev) => { const f = ev.target.files?.[0]; setPrevia(f ? URL.createObjectURL(f) : null); setTirarFoto(false) }} />
                </label>
                {e.foto_url && !previa && (
                    <label className="flex min-h-[40px] items-center gap-2 text-[15px]">
                        <input type="checkbox" name="tirar_foto" value="1" checked={tirarFoto} onChange={(ev) => setTirarFoto(ev.target.checked)} className="h-5 w-5" /> Tirar a foto
                    </label>
                )}
            </div>

            {erro && <p role="alert" className="text-[15px]" style={{ color: 'var(--a-erro)' }}>{erro}</p>}
            <div className="flex gap-2">
                <button disabled={pendente} className="a-botao a-botao-principal">{pendente && <Loader2 size={18} className="animate-spin" aria-hidden />} Guardar</button>
                <button type="button" onClick={onFim} className="a-botao a-botao-secundario">Cancelar</button>
            </div>
        </form>
    )
}

export function AcoesEncontro({ deptoId, e, passado, equipa = [] }: { deptoId: number; e: Encontro; passado: boolean; equipa?: PessoaEquipa[] }) {
    const [modo, setModo] = useState<'nada' | 'editar' | 'registo'>('nada')
    const { erro, pendente, correr } = useAcao()
    const confirmar = useConfirm()
    if (modo === 'editar') return <FormEncontro deptoId={deptoId} e={e} onFim={() => setModo('nada')} />
    if (modo === 'registo') return <FormRegisto deptoId={deptoId} e={e} equipa={equipa} onFim={() => setModo('nada')} />
    return (
        <div className="flex flex-wrap gap-4 pt-1 text-[15px] font-semibold" style={{ color: 'var(--a-destaque)' }}>
            {passado && <button type="button" onClick={() => setModo('registo')} className="a-foco min-h-[40px]">{e.registo ? 'Mudar o registo' : 'Registar o que se fez'}</button>}
            <button type="button" onClick={() => setModo('editar')} className="a-foco inline-flex min-h-[40px] items-center gap-1"><Pencil size={15} aria-hidden /> Mudar</button>
            <button type="button" disabled={pendente} className="a-foco min-h-[40px]" style={{ color: 'var(--a-erro)' }}
                onClick={async () => { if (await confirmar({ mensagem: `Apagar "${e.titulo}"?`, tipo: 'perigo' })) correr(() => apagarEncontro(e.id, deptoId)) }}>Apagar</button>
            {erro && <p role="alert" style={{ color: 'var(--a-erro)' }}>{erro}</p>}
        </div>
    )
}
