'use client'

// "Chave para o Holyrics": o módulo "Trazer as artes do culto" usa-a para pedir ao portal as artes do telão publicadas.
// A chave só aparece quando se gera (fica guardado apenas o código de verificação); trocar a chave desliga a antiga.
import { useState, useTransition } from 'react'
import { Copy, KeyRound } from 'lucide-react'
import { gerarChaveHolyrics } from '@/actions/midia-actions'

export default function ChaveHolyrics({ temChave }: { temChave: boolean }) {
    const [tem, setTem] = useState(temChave)
    const [chave, setChave] = useState('')
    const [erro, setErro] = useState('')
    const [copiado, setCopiado] = useState(false)
    const [aGerar, iniciar] = useTransition()

    const gerar = () => {
        if (tem && !confirm('Trocar a chave? O módulo do Holyrics deixa de funcionar até colares a chave nova.')) return
        setErro(''); setCopiado(false)
        iniciar(async () => {
            const r = await gerarChaveHolyrics()
            if ('chave' in r) { setChave(r.chave); setTem(true) } else setErro(r.error)
        })
    }

    return (
        <div className="space-y-3">
            <p className="text-xs text-muted leading-relaxed">
                O módulo <strong>Fotos do Culto ADMVC</strong> do Holyrics usa esta chave para trazer as artes do telão (Divulgação → &quot;Publicar para a igreja&quot;) para a pasta <strong>ARTES-CULTO</strong>.
                Cola a chave nas definições do módulo, no computador do telão.
            </p>
            {chave && (
                <div className="rounded-xl border border-soft bg-bg p-3 space-y-2">
                    <p className="text-[13px] font-bold uppercase tracking-wide text-figueira">Chave nova — copia agora, não volta a aparecer</p>
                    <p className="break-all font-mono text-sm text-fg select-all">{chave}</p>
                    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(chave); setCopiado(true) } catch { /* copiar à mão */ } }}
                        className="inline-flex items-center gap-2 rounded-lg bg-fg px-3 py-2 text-xs font-bold text-bg">
                        <Copy size={14} /> {copiado ? 'Copiada' : 'Copiar'}
                    </button>
                </div>
            )}
            <button type="button" onClick={gerar} disabled={aGerar} className="inline-flex items-center gap-2 rounded-xl border border-soft bg-bg px-4 py-2.5 text-xs font-bold text-fg hover:border-figueira/40 disabled:opacity-60">
                <KeyRound size={14} /> {aGerar ? 'A gerar…' : tem ? 'Trocar a chave' : 'Gerar a chave'}
            </button>
            {erro && <p role="alert" className="text-xs text-red-500">{erro}</p>}
        </div>
    )
}
