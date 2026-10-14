'use client'

// Criar ou editar um evento com inscrição. Um formulário só, com tudo o que a
// página pública mostra. Depois de guardar, vai para a gestão do evento.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { guardarEventoAction } from '@/actions/inscricao-actions'
import { Loader2, Save } from 'lucide-react'

export interface ValoresEvento {
    titulo: string; subtitulo: string; descricao: string; local: string
    data: string; hora: string; ate_data: string; ate_hora: string
    preco: string; pagamento: string; precisa_confirmacao: boolean; aberto_visitantes: boolean
    campos: string; cor_principal: string; cor_fundo: string; estado: string; organizador: string
    imagem_url: string | null
}

export default function FormEvento({ id, slug, valores, organizadores }: {
    id: number | null; slug: string | null; valores: ValoresEvento; organizadores: { valor: string; nome: string }[]
}) {
    const router = useRouter()
    const [aGuardar, setAGuardar] = useState(false)
    const [erro, setErro] = useState<string | null>(null)
    const [cor, setCor] = useState(valores.cor_principal)
    const [fundo, setFundo] = useState(valores.cor_fundo)

    async function guardar(f: FormData) {
        setAGuardar(true); setErro(null)
        try {
            const r = await guardarEventoAction(id, f)
            if ('error' in r) { setErro(r.error); return }
            router.push(`/inscricoes/${r.slug}`)
            router.refresh()
        } catch {
            setErro('Sem ligação. Tente de novo.')
        } finally {
            setAGuardar(false)
        }
    }

    const campo = 'w-full rounded-[14px] border px-4 py-3 text-[16px] bg-[var(--a-bg)]'
    const estilo = { borderColor: 'var(--a-borda)' }
    const rotulo = 'block text-[15px] font-semibold'

    return (
        <form action={guardar} className="space-y-5">
            <fieldset className="a-card p-4 space-y-4">
                <legend className="px-1 text-[17px] font-bold">O evento</legend>
                <label className="block space-y-1"><span className={rotulo}>Título</span>
                    <input name="titulo" required defaultValue={valores.titulo} className={campo} style={estilo} /></label>
                <label className="block space-y-1"><span className={rotulo}>Subtítulo <span className="font-normal a-suave">(opcional)</span></span>
                    <input name="subtitulo" defaultValue={valores.subtitulo} className={campo} style={estilo} /></label>
                <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1"><span className={rotulo}>Dia</span>
                        <input type="date" name="data" required defaultValue={valores.data} className={campo} style={estilo} /></label>
                    <label className="block space-y-1"><span className={rotulo}>Hora</span>
                        <input type="time" name="hora" required defaultValue={valores.hora} className={campo} style={estilo} /></label>
                </div>
                <label className="block space-y-1"><span className={rotulo}>Local</span>
                    <input name="local" defaultValue={valores.local} placeholder="Igreja ADMVC · Figueira da Foz" className={campo} style={estilo} /></label>
                <label className="block space-y-1"><span className={rotulo}>Quem organiza (e gere as inscrições)</span>
                    <select name="organizador" required defaultValue={valores.organizador} className={campo} style={estilo}>
                        <option value="" disabled>Escolher…</option>
                        {organizadores.map(o => <option key={o.valor} value={o.valor}>{o.nome}</option>)}
                    </select></label>
                <label className="block space-y-1"><span className={rotulo}>Texto da página</span>
                    <textarea name="descricao" rows={10} defaultValue={valores.descricao} className={`${campo} font-mono text-[14px]`} style={estilo} />
                    <span className="block text-[13px] a-suave">Linha em branco = parágrafo novo. "## Título" = título. "• item" = lista.</span></label>
            </fieldset>

            <fieldset className="a-card p-4 space-y-4">
                <legend className="px-1 text-[17px] font-bold">Inscrições</legend>
                <label className="block space-y-1"><span className={rotulo}>Estado</span>
                    <select name="estado" defaultValue={valores.estado} className={campo} style={estilo}>
                        <option value="RASCUNHO">Rascunho (só a organização vê a página)</option>
                        <option value="ABERTO">Abertas</option>
                        <option value="FECHADO">Fechadas</option>
                    </select></label>
                <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1"><span className={rotulo}>Inscrições até <span className="font-normal a-suave">(opcional)</span></span>
                        <input type="date" name="ate_data" defaultValue={valores.ate_data} className={campo} style={estilo} /></label>
                    <label className="block space-y-1"><span className={rotulo}>Hora</span>
                        <input type="time" name="ate_hora" defaultValue={valores.ate_hora} className={campo} style={estilo} /></label>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-3">
                    <label className="block space-y-1"><span className={rotulo}>Preço (€)</span>
                        <input name="preco" inputMode="decimal" defaultValue={valores.preco} placeholder="0" className={campo} style={estilo} /></label>
                    <label className="block space-y-1"><span className={rotulo}>Como pagar</span>
                        <input name="pagamento" defaultValue={valores.pagamento} placeholder="MB WAY para o +351 9…" className={campo} style={estilo} /></label>
                </div>
                <label className="block space-y-1"><span className={rotulo}>Caixas a marcar <span className="font-normal a-suave">(uma por linha; * no fim = obrigatória)</span></span>
                    <textarea name="campos" rows={3} defaultValue={valores.campos} placeholder="Levo 1 prato de salgados e 1 sumo *" className={campo} style={estilo} /></label>
                <label className="flex items-center gap-3 text-[16px]"><input type="checkbox" name="precisa_confirmacao" defaultChecked={valores.precisa_confirmacao} className="h-5 w-5" />
                    A organização confirma cada inscrição</label>
                <label className="flex items-center gap-3 text-[16px]"><input type="checkbox" name="aberto_visitantes" defaultChecked={valores.aberto_visitantes} className="h-5 w-5" />
                    Visitantes também se podem inscrever</label>
            </fieldset>

            <fieldset className="a-card p-4 space-y-4">
                <legend className="px-1 text-[17px] font-bold">Aspeto da página</legend>
                <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1"><span className={rotulo}>Cor principal</span>
                        <input type="color" name="cor_principal" value={cor} onChange={e => setCor(e.target.value)} className="h-12 w-full rounded-xl" /></label>
                    <label className="block space-y-1"><span className={rotulo}>Fundo</span>
                        <input type="color" name="cor_fundo" value={fundo} onChange={e => setFundo(e.target.value)} className="h-12 w-full rounded-xl" /></label>
                </div>
                <div className="rounded-2xl p-4 text-center" style={{ background: fundo }}>
                    <p className="font-serif text-2xl" style={{ color: cor }}>Pré-visualização</p>
                    <span className="inline-block mt-2 rounded-xl px-4 py-2 text-white font-semibold" style={{ background: cor }}>Enviar inscrição</span>
                </div>
                <label className="block space-y-1"><span className={rotulo}>Imagem / cartaz <span className="font-normal a-suave">(JPG, PNG ou WEBP)</span></span>
                    <input type="file" name="imagem" accept="image/jpeg,image/png,image/webp" className="block w-full text-[15px]" /></label>
                {valores.imagem_url && (
                    <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={valores.imagem_url} alt="Imagem atual" className="h-16 w-auto rounded-lg" />
                        <label className="flex items-center gap-2 text-[15px]"><input type="checkbox" name="tirar_imagem" className="h-5 w-5" /> Tirar a imagem</label>
                    </div>
                )}
            </fieldset>

            {slug && <p className="text-[14px] a-suave">Endereço da página: /i/{slug} (não muda)</p>}
            {erro && <p role="alert" className="rounded-xl px-4 py-3 font-semibold" style={{ background: 'var(--a-erro-suave)', color: 'var(--a-erro)' }}>{erro}</p>}
            <button type="submit" disabled={aGuardar} className="a-botao a-botao-principal w-full !min-h-[56px]">
                {aGuardar ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Save size={18} aria-hidden />}
                {aGuardar ? 'A guardar…' : 'Guardar'}
            </button>
        </form>
    )
}
