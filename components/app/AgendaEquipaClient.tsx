'use client'

// Formulários da agenda de uma equipa: marcar / mudar um encontro, registar o que se fez, apagar.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil, Plus } from 'lucide-react'
import { apagarEncontro, guardarEncontro, registarEncontro } from '@/actions/agenda-departamento-actions'
import { TIPOS_AGENDA_DEPTO } from '@/lib/agenda'
import { useConfirm } from '@/components/ui/ConfirmDialog'

export type Encontro = {
    id: number; titulo: string; tipo: string; inicio: string; fim: string | null
    local: string | null; descricao: string | null; registo: string | null; presentes: number | null
}

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

export function AcoesEncontro({ deptoId, e, passado }: { deptoId: number; e: Encontro; passado: boolean }) {
    const [modo, setModo] = useState<'nada' | 'editar' | 'registo'>('nada')
    const { erro, pendente, correr } = useAcao()
    const confirmar = useConfirm()
    if (modo === 'editar') return <FormEncontro deptoId={deptoId} e={e} onFim={() => setModo('nada')} />
    if (modo === 'registo') {
        return (
            <form className="space-y-2 pt-2" action={(fd) => correr(() => registarEncontro(fd), () => setModo('nada'))}>
                <input type="hidden" name="departamento_id" value={deptoId} /><input type="hidden" name="id" value={e.id} />
                <label className="block space-y-1"><span className="text-[15px] font-semibold">O que se fez</span>
                    <textarea name="registo" rows={3} defaultValue={e.registo ?? ''} placeholder="Ex.: ensaiámos 4 músicas novas; decidimos…" className={`${campo} py-2`} style={estilo} /></label>
                <label className="block space-y-1"><span className="text-[15px] font-semibold">Quantos estiveram</span>
                    <input name="presentes" type="number" min={0} defaultValue={e.presentes ?? ''} className={`${campo} max-w-[140px]`} style={estilo} /></label>
                {erro && <p role="alert" className="text-[15px]" style={{ color: 'var(--a-erro)' }}>{erro}</p>}
                <div className="flex gap-2">
                    <button disabled={pendente} className="a-botao a-botao-principal">Guardar</button>
                    <button type="button" onClick={() => setModo('nada')} className="a-botao a-botao-secundario">Cancelar</button>
                </div>
            </form>
        )
    }
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
