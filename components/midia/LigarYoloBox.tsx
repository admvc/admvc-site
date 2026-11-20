'use client'

// Mídia → Divulgação → "Ligar o YoloBox": a chave fixa (RTMP) que o YoloBox usa para transmitir para o YouTube. O servidor e a chave
// lêem-se do YouTube na hora e só ficam neste ecrã (não se gravam em lado nenhum; ao fechar, desaparecem).
import { useEffect, useState } from 'react'
import { colarChaveYoloBox, estadoYoloBox, gerarOutraChaveYoloBox, mostrarChaveYoloBox } from '@/app/midia/divulgacao/lives-actions'

type Chave = { servidor: string; chave: string; criadaAgora: boolean; antigaApagada?: boolean }

function Copiavel({ rotulo, valor }: { rotulo: string; valor: string }) {
    const [copiado, setCopiado] = useState(false)
    async function copiar() {
        try { await navigator.clipboard.writeText(valor); setCopiado(true); setTimeout(() => setCopiado(false), 2000) } catch { setCopiado(false) }
    }
    return (
        <div className="space-y-1">
            <span className="text-[14px] a-suave">{rotulo}</span>
            <div className="flex items-stretch gap-2">
                <code className="min-w-0 flex-1 break-all rounded-[12px] border px-3 py-2 text-[14px]" style={{ borderColor: 'var(--a-borda)', background: 'var(--a-card)' }}>{valor}</code>
                <button type="button" onClick={copiar} className="a-botao a-botao-secundario !min-h-[44px] shrink-0" aria-label={`Copiar ${rotulo}`}>{copiado ? 'Copiado' : 'Copiar'}</button>
            </div>
        </div>
    )
}

/** Plano B: a chave criada à mão no YouTube Studio. Só serve para o portal encontrar a stream; a chave não fica gravada. */
function ColarChave({ aoLigar }: { aoLigar: () => void }) {
    const [aberto, setAberto] = useState(false)
    const [chave, setChave] = useState('')
    const [ocupado, setOcupado] = useState(false)
    const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
    async function usar() {
        setOcupado(true); setMsg(null)
        const r = await colarChaveYoloBox(chave)
        setOcupado(false)
        if ('erro' in r) { setMsg({ ok: false, texto: r.erro }); return }
        setMsg({ ok: true, texto: r.mensagem }); setChave(''); aoLigar()
    }
    if (!aberto) return (
        <button type="button" className="a-foco w-full text-center text-[15px] underline" style={{ color: 'var(--a-destaque)' }} onClick={() => setAberto(true)}>
            Não funcionou? Usar uma chave criada no YouTube Studio
        </button>
    )
    return (
        <div className="space-y-2 rounded-[14px] border p-3" style={{ borderColor: 'var(--a-borda)' }}>
            <ol className="list-decimal space-y-1 pl-5 text-[15px]">
                <li>No <strong>YouTube Studio</strong>, abra <strong>Emitir em direto → Stream</strong>.</li>
                <li>Em <strong>Chave de stream</strong>, escolha ou crie uma chave <strong>Reutilizável</strong> (ex.: “ADMVC · YoloBox”) e copie-a.</li>
                <li>Cole-a aqui e no YoloCast (Destinations → RTMP / SRT, com o servidor <code>rtmp://a.rtmp.youtube.com/live2</code>).</li>
            </ol>
            <div className="flex flex-wrap gap-2">
                <input type="password" autoComplete="off" value={chave} onChange={(e) => setChave(e.target.value)} placeholder="Cole a chave de stream" aria-label="Chave de stream"
                    className="a-foco min-h-[44px] min-w-0 flex-1 rounded-[12px] border px-3 text-[15px]" style={{ borderColor: 'var(--a-borda)', background: 'var(--a-card)', color: 'var(--a-texto)' }} />
                <button type="button" className="a-botao a-botao-principal !min-h-[44px]" disabled={ocupado || chave.trim().length < 8} onClick={usar}>{ocupado ? 'A ligar…' : 'Usar esta chave'}</button>
            </div>
            <p className="text-[13px] a-suave">O portal não guarda a chave: só a usa para encontrar a stream no canal e ligar-lhe as lives.</p>
            {msg && <p role={msg.ok ? 'status' : 'alert'} className="text-[15px] font-semibold" style={{ color: msg.ok ? 'var(--a-ok, #16a34a)' : 'var(--a-erro)' }}>{msg.texto}</p>}
        </div>
    )
}

export default function LigarYoloBox({ aoMudar }: { aoMudar?: () => void }) {
    const [estado, setEstado] = useState<{ ligado: boolean; temChave: boolean; mensagem?: string } | null>(null)
    const [chave, setChave] = useState<Chave | null>(null)
    const [erro, setErro] = useState<string | null>(null)
    const [ocupado, setOcupado] = useState(false)
    const [confirmar, setConfirmar] = useState(false)

    useEffect(() => {
        let vivo = true
        void estadoYoloBox().then((r) => {
            if (!vivo) return
            if ('erro' in r) setErro(r.erro)
            else if (r.ligado) setEstado({ ligado: true, temChave: r.temChave })
            else setEstado({ ligado: false, temChave: false, mensagem: (r as { mensagem?: string }).mensagem })
        })
        return () => { vivo = false }
    }, [])

    async function mostrar() {
        setOcupado(true); setErro(null)
        const r = await mostrarChaveYoloBox()
        setOcupado(false)
        if ('erro' in r) { setErro(r.erro); return }
        setChave(r); setEstado({ ligado: true, temChave: true }); aoMudar?.()
    }

    async function outra() {
        setOcupado(true); setErro(null)
        const r = await gerarOutraChaveYoloBox()
        setOcupado(false); setConfirmar(false)
        if ('erro' in r) { setErro(r.erro); return }
        setChave(r); aoMudar?.()
    }

    return (
        <div className="space-y-3">
            {!estado && !erro && <p className="a-suave" role="status">A ver…</p>}
            {erro && <p role="alert" className="rounded-[12px] border p-3 text-[15px]" style={{ borderColor: 'var(--a-borda)' }}>{erro}</p>}
            {estado && !estado.ligado && <p className="text-[15px] a-suave">{estado.mensagem}</p>}

            {estado?.ligado && !chave && (
                <>
                    <p className="text-[15px] a-suave">{estado.temChave
                        ? 'A chave fixa já existe. Mostre-a só quando for colar no YoloCast: quem a tiver pode transmitir para o canal.'
                        : 'Ainda não há chave fixa. Ao criar, o portal pede ao YouTube uma chave que serve para todas as lives (só se cola no YoloBox uma vez).'}</p>
                    <button type="button" className="a-botao a-botao-principal !min-h-[48px] w-full" disabled={ocupado} onClick={mostrar}>
                        {ocupado ? 'A abrir…' : estado.temChave ? 'Mostrar servidor e chave' : 'Criar a chave e mostrar'}
                    </button>
                    <ColarChave aoLigar={() => { setEstado({ ligado: true, temChave: true }); aoMudar?.() }} />
                </>
            )}

            {chave && (
                <div className="space-y-3">
                    {chave.criadaAgora && <p role="status" className="rounded-[12px] border p-3 text-[15px]" style={{ borderColor: 'var(--a-destaque)' }}>{chave.antigaApagada !== undefined ? 'Chave nova criada. Cole-a no YoloCast (a antiga deixou de servir).' : 'Chave criada.'}{chave.antigaApagada === false ? ' A antiga não foi apagada no YouTube: apague-a no YouTube Studio.' : ''}</p>}
                    <Copiavel rotulo="Servidor (URL)" valor={chave.servidor} />
                    <Copiavel rotulo="Chave da transmissão" valor={chave.chave} />
                    <ol className="list-decimal space-y-1 pl-5 text-[15px]">
                        <li>No YoloBox Ultra, abra o <strong>YoloCast</strong>.</li>
                        <li>Vá a <strong>Destinations</strong> e toque em <strong>Add Platform</strong>.</li>
                        <li>Escolha <strong>RTMP / SRT</strong> e cole o servidor e a chave.</li>
                        <li>Guarde. No dia do culto, escolha esse destino e toque em <strong>Transmitir</strong>: a live arranca sozinha.</li>
                    </ol>
                    <p className="text-[14px] a-suave">Não envie esta chave por mensagem nem a guarde em notas.</p>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" className="a-botao a-botao-secundario !min-h-[44px]" onClick={() => { setChave(null); setConfirmar(false) }}>Esconder</button>
                        {!confirmar && <button type="button" className="a-botao a-botao-secundario !min-h-[44px]" onClick={() => setConfirmar(true)}>Gerar outra chave</button>}
                    </div>
                    {confirmar && (
                        <div role="group" aria-label="Confirmar nova chave" className="space-y-3 rounded-[14px] border p-3" style={{ borderColor: 'var(--a-destaque)' }}>
                            <p className="text-[15px]">Vai criar uma chave nova e a antiga deixa de servir. O YoloBox <strong>não transmite</strong> até colar a nova no YoloCast (passos acima). Continuar?</p>
                            <div className="flex gap-2">
                                <button type="button" className="a-botao a-botao-principal !min-h-[48px] flex-1" disabled={ocupado} onClick={outra}>{ocupado ? 'A gerar…' : 'Gerar outra chave'}</button>
                                <button type="button" className="a-botao a-botao-secundario !min-h-[48px]" disabled={ocupado} onClick={() => setConfirmar(false)}>Cancelar</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
