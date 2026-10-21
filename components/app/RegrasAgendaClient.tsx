'use client'

// Regras repetidas da agenda: formulário (criar / mudar) e ações da lista (desativar, ativar, apagar).
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil, Plus, Power, Trash2 } from 'lucide-react'
import { apagarRegra, atualizarRegra, criarRegra, desativarRegra, reativarRegra, type ResultadoRegra } from '@/actions/agenda-regras-actions'
import { DIAS_DA_SEMANA, SEMANAS_DO_MES } from '@/lib/agenda-regras'
import { TIPOS_AGENDA_DEPTO } from '@/lib/agenda'
import { useConfirm } from '@/components/ui/ConfirmDialog'

export type AlvoOpcao = { chave: string; nome: string }   // "g12" (grupo 12) ou "d3" (departamento 3)
export type RegraCliente = {
    id: number; alvo: string; titulo: string; tipo: string; dia_semana: number; semana_do_mes: number; hora: string; local: string | null
    ativo: boolean; chaveAlvo: string
}

const campo = 'a-foco min-h-[48px] w-full rounded-[14px] border px-3 text-[16px]'
const estilo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }
const dd = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

function Resumo({ r }: { r: Extract<ResultadoRegra, { ok: true }> }) {
    return (
        <div role="status" className="space-y-1 rounded-[14px] border p-3 text-[15px]" style={{ borderColor: 'var(--a-ok, #16a34a)' }}>
            <p className="font-semibold">{r.criados > 0 ? `Marquei ${r.criados} ${r.criados === 1 ? 'data' : 'datas'} (se já havia culto nessa noite, só muda o título): ${r.datas.slice(0, 6).map(dd).join(', ')}${r.datas.length > 6 ? '…' : ''}` : 'Guardado. Não havia datas novas para criar.'}</p>
            {r.ficaram ? <p className="a-suave">{r.ficaram} {r.ficaram === 1 ? 'ficou' : 'ficaram'} como estava (já alterado ou com escala).</p> : null}
            {r.avisos.map((a) => <p key={a} style={{ color: 'var(--a-aviso, #b45309)' }}>{a}</p>)}
        </div>
    )
}

export function FormRegra({ opcoesEncontro, opcoesCulto, podeCulto, regra, onFim }: {
    opcoesEncontro: AlvoOpcao[]; opcoesCulto: AlvoOpcao[]; podeCulto: boolean; regra?: RegraCliente; onFim?: () => void
}) {
    const router = useRouter()
    const [aberto, setAberto] = useState(!!regra)
    const [alvo, setAlvo] = useState<'ENCONTRO' | 'CULTO'>((regra?.alvo as 'ENCONTRO' | 'CULTO') ?? 'ENCONTRO')
    const [onde, setOnde] = useState(regra?.chaveAlvo ?? '')
    const [titulo, setTitulo] = useState(regra?.titulo ?? '')
    const [tocou, setTocou] = useState(!!regra)
    const [erro, setErro] = useState<string | null>(null)
    const [res, setRes] = useState<Extract<ResultadoRegra, { ok: true }> | null>(null)
    const [pendente, iniciar] = useTransition()

    const opcoes = alvo === 'CULTO' ? opcoesCulto : opcoesEncontro
    const nomeOnde = opcoes.find((o) => o.chave === onde)?.nome ?? ''
    const curto = nomeOnde.replace(/^Departamento de /i, '')
    const sugestao = nomeOnde ? (alvo === 'CULTO' ? `Culto na Direção de ${curto}` : `Reunião — ${nomeOnde}`) : ''

    if (!aberto) {
        return <button type="button" onClick={() => setAberto(true)} className="a-botao a-botao-principal w-full"><Plus size={20} aria-hidden /> Nova regra repetida</button>
    }

    const enviar = (fd: FormData) => iniciar(async () => {
        setErro(null); setRes(null)
        fd.set('alvo', alvo)
        const [tipo, id] = [onde.slice(0, 1), onde.slice(1)]
        fd.set(tipo === 'g' ? 'grupo_id' : 'departamento_id', id)
        if (!fd.get('titulo')) fd.set('titulo', sugestao)
        const r = regra ? await atualizarRegra(regra.id, fd) : await criarRegra(fd)
        if ('error' in r) { setErro(r.error); return }
        setRes(r)
        router.refresh()
        if (regra) onFim?.()
    })

    return (
        <form className="a-card space-y-3 p-4" action={enviar}>
            {!regra && podeCulto && (
                <fieldset className="flex flex-wrap gap-2">
                    {([['ENCONTRO', 'Reunião do grupo ou departamento'], ['CULTO', 'Culto da igreja direcionado a um grupo']] as const).map(([v, nome]) => (
                        <label key={v} className="flex min-h-[48px] cursor-pointer items-center rounded-[14px] border px-3 text-[15px] has-[:checked]:ring-2 has-[:checked]:ring-[var(--a-acento,#f5a524)]" style={estilo}>
                            <input type="radio" name="alvo_ui" checked={alvo === v} onChange={() => { setAlvo(v); setOnde('') }} className="sr-only" /> {nome}
                        </label>
                    ))}
                </fieldset>
            )}
            <label className="block space-y-1"><span className="text-[15px] font-semibold">{alvo === 'CULTO' ? 'Grupo a quem o culto é direcionado' : 'Grupo ou departamento'}</span>
                <select required value={onde} onChange={(e) => setOnde(e.target.value)} className={campo} style={estilo}>
                    <option value="">Escolher…</option>
                    {opcoes.map((o) => <option key={o.chave} value={o.chave}>{o.nome}</option>)}
                </select></label>
            <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1"><span className="text-[15px] font-semibold">Toda a</span>
                    <select name="semana_do_mes" defaultValue={regra?.semana_do_mes ?? 1} className={campo} style={estilo}>
                        {SEMANAS_DO_MES.map((s) => <option key={s.valor} value={s.valor}>{s.nome} semana</option>)}
                    </select></label>
                <label className="block space-y-1"><span className="text-[15px] font-semibold">Dia</span>
                    <select name="dia_semana" defaultValue={regra?.dia_semana ?? 1} className={campo} style={estilo}>
                        {DIAS_DA_SEMANA.map((d, i) => <option key={d} value={i}>{d}</option>)}
                    </select></label>
                <label className="block space-y-1"><span className="text-[15px] font-semibold">Hora</span>
                    <input name="hora" type="time" required defaultValue={regra?.hora ?? '20:00'} className={campo} style={estilo} /></label>
                {alvo === 'ENCONTRO' && (
                    <label className="block space-y-1"><span className="text-[15px] font-semibold">Tipo</span>
                        <select name="tipo" defaultValue={regra?.tipo ?? 'REUNIAO'} className={campo} style={estilo}>
                            {Object.entries(TIPOS_AGENDA_DEPTO).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
                        </select></label>
                )}
            </div>
            <label className="block space-y-1"><span className="text-[15px] font-semibold">Título</span>
                <input name="titulo" value={tocou ? titulo : sugestao} onChange={(e) => { setTocou(true); setTitulo(e.target.value) }} placeholder="Ex.: Reunião — Grupo de Homens" className={campo} style={estilo} /></label>
            {alvo === 'ENCONTRO' && (
                <label className="block space-y-1"><span className="text-[15px] font-semibold">Local (opcional)</span>
                    <input name="local" defaultValue={regra?.local ?? ''} placeholder="Ex.: Sala 2, igreja" className={campo} style={estilo} /></label>
            )}
            <div className="flex gap-2">
                <button disabled={pendente || !onde} className="a-botao a-botao-principal flex-1">{pendente && <Loader2 size={18} className="animate-spin" aria-hidden />} {regra ? 'Guardar' : 'Criar e gerar os próximos 3 meses'}</button>
                <button type="button" onClick={() => { setAberto(false); onFim?.() }} className="a-botao a-botao-secundario">Fechar</button>
            </div>
            <p className="text-[14px] a-suave">As datas vão para a agenda e para o telemóvel de {alvo === 'CULTO' ? 'todos' : 'quem é do grupo'}. Continuam a ser criadas sozinhas, mês a mês.</p>
            {erro && <p role="alert" className="text-[15px]" style={{ color: 'var(--a-erro)' }}>{erro}</p>}
            {res && <Resumo r={res} />}
        </form>
    )
}

export function AcoesRegra({ regra, opcoesEncontro, opcoesCulto, podeCulto }: { regra: RegraCliente; opcoesEncontro: AlvoOpcao[]; opcoesCulto: AlvoOpcao[]; podeCulto: boolean }) {
    const router = useRouter()
    const confirmar = useConfirm()
    const [editar, setEditar] = useState(false)
    const [erro, setErro] = useState<string | null>(null)
    const [res, setRes] = useState<Extract<ResultadoRegra, { ok: true }> | null>(null)
    const [pendente, iniciar] = useTransition()
    const correr = (f: () => Promise<ResultadoRegra>) => iniciar(async () => {
        setErro(null); setRes(null)
        const r = await f()
        if ('error' in r) { setErro(r.error); return }
        setRes(r); router.refresh()
    })
    if (editar) return <FormRegra regra={regra} opcoesEncontro={opcoesEncontro} opcoesCulto={opcoesCulto} podeCulto={podeCulto} onFim={() => setEditar(false)} />
    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-4 pt-1 text-[15px] font-semibold" style={{ color: 'var(--a-destaque)' }}>
                <button type="button" onClick={() => setEditar(true)} className="a-foco inline-flex min-h-[40px] items-center gap-1"><Pencil size={15} aria-hidden /> Mudar</button>
                {regra.ativo
                    ? <button type="button" disabled={pendente} onClick={async () => { if (await confirmar({ mensagem: `Parar "${regra.titulo}"? Os encontros futuros ainda por mexer são cancelados.`, tipo: 'perigo' })) correr(() => desativarRegra(regra.id)) }} className="a-foco inline-flex min-h-[40px] items-center gap-1"><Power size={15} aria-hidden /> Parar</button>
                    : <button type="button" disabled={pendente} onClick={() => correr(() => reativarRegra(regra.id))} className="a-foco inline-flex min-h-[40px] items-center gap-1"><Power size={15} aria-hidden /> Voltar a ligar</button>}
                <button type="button" disabled={pendente} onClick={async () => { if (await confirmar({ mensagem: `Apagar a regra "${regra.titulo}"? O que já aconteceu fica; o que está por mexer no futuro desaparece.`, tipo: 'perigo' })) correr(() => apagarRegra(regra.id)) }} className="a-foco inline-flex min-h-[40px] items-center gap-1" style={{ color: 'var(--a-erro)' }}><Trash2 size={15} aria-hidden /> Apagar</button>
            </div>
            {erro && <p role="alert" className="text-[15px]" style={{ color: 'var(--a-erro)' }}>{erro}</p>}
            {res && <Resumo r={res} />}
        </div>
    )
}
