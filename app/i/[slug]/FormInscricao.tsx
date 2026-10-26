'use client'

// Formulário de inscrição: igual para membros e visitantes. Depois de enviar
// mostra o código e como pagar (a resposta não diz se a pessoa é membro).
import { useState } from 'react'
import { inscreverAction, type ResultadoInscricao } from '@/actions/inscricao-actions'
import type { CampoEvento } from '@/lib/inscricoes'
import { Loader2, CheckCircle2, Send } from 'lucide-react'
import QRCode from 'react-qr-code'

interface Props {
    slug: string
    cor: string
    campos: CampoEvento[]
    prefill: { nome: string; telefone: string; email: string } | null
    visitantes: boolean
    preco: number | null
    pagamento: string | null
    precisaConfirmacao: boolean
    precoACombinar?: boolean
}

export default function FormInscricao({ slug, cor, campos, prefill, visitantes, preco, pagamento, precisaConfirmacao, precoACombinar }: Props) {
    const [aEnviar, setAEnviar] = useState(false)
    const [erro, setErro] = useState<string | null>(null)
    const [resultado, setResultado] = useState<Extract<ResultadoInscricao, { ok: true }> | null>(null)

    async function enviar(formData: FormData) {
        setAEnviar(true)
        setErro(null)
        try {
            const r = await inscreverAction(slug, formData)
            if ('error' in r) setErro(r.error)
            else setResultado(r)
        } catch {
            setErro('Sem ligação. Verifica a internet e tenta de novo.')
        } finally {
            setAEnviar(false)
        }
    }

    if (resultado?.repetida) {
        return (
            <div className="text-center space-y-2" role="status">
                <CheckCircle2 size={44} className="mx-auto" style={{ color: cor }} aria-hidden />
                <p className="text-xl font-semibold">Já tínhamos uma inscrição com este telemóvel.</p>
                <p className="opacity-80">Não precisas de fazer mais nada. Se tiveres alguma dúvida, fala com a organização.</p>
            </div>
        )
    }

    if (resultado) {
        return (
            <div className="space-y-4" role="status">
                <div className="text-center space-y-2">
                    <CheckCircle2 size={48} className="mx-auto" style={{ color: cor }} aria-hidden />
                    <p className="text-2xl font-semibold">Inscrição recebida!</p>
                    {precisaConfirmacao && <p className="opacity-80">A organização vai confirmar a tua inscrição.</p>}
                </div>
                <div className="rounded-2xl p-4 text-center" style={{ background: `${cor}14` }}>
                    <p className="text-sm uppercase tracking-widest opacity-70">O teu código</p>
                    <p className="text-4xl font-bold tracking-[0.2em]" style={{ color: cor }}>{resultado.codigo}</p>
                    {resultado.codigo && (
                        <div className="mt-3 inline-block bg-white p-3 rounded-xl">
                            <QRCode value={resultado.codigo} size={140} fgColor="#3B2A22" />
                        </div>
                    )}
                    <p className="text-sm opacity-70 mt-1">Mostra este código à entrada.</p>
                </div>
                {preco != null && preco > 0 && (
                    <div className="rounded-2xl p-4 space-y-1" style={{ border: `1px solid ${cor}40` }}>
                        <p className="font-semibold">Pagamento: {preco.toLocaleString('pt-PT')} €</p>
                        {pagamento && <p>{pagamento}</p>}
                        <p>Na descrição, escreve o código <strong>{resultado.codigo}</strong>.</p>
                    </div>
                )}
                {precoACombinar && (
                    <p className="rounded-2xl p-4" style={{ border: `1px solid ${cor}40` }}>O valor e a forma de pagamento combinamos contigo quando entrarmos em contacto.</p>
                )}
                <p className="text-sm text-center opacity-70">Tira uma captura de ecrã para guardares o código.</p>
            </div>
        )
    }

    const campo = 'w-full rounded-2xl border px-4 py-3.5 text-[17px] outline-none bg-white'
    const estiloCampo = { borderColor: `${cor}55` }

    return (
        <form action={enviar} className="space-y-4" noValidate>
            <h2 className="text-xl font-semibold">Inscreve-te</h2>
            {prefill && <p className="text-sm opacity-75">Preenchemos com os teus dados da app. Confirma e envia.</p>}

            <label className="block space-y-1.5">
                <span className="font-semibold">Nome completo</span>
                <input name="nome" required autoComplete="name" defaultValue={prefill?.nome} className={campo} style={estiloCampo} />
            </label>
            <label className="block space-y-1.5">
                <span className="font-semibold">Telemóvel / WhatsApp</span>
                <input name="telefone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="912 345 678" defaultValue={prefill?.telefone} className={campo} style={estiloCampo} />
            </label>
            <label className="block space-y-1.5">
                <span className="font-semibold">Email <span className="font-normal opacity-70">(opcional)</span></span>
                <input name="email" type="email" autoComplete="email" defaultValue={prefill?.email} className={campo} style={estiloCampo} />
            </label>

            {campos.map(c => (
                <label key={c.id} className="flex items-start gap-3 rounded-2xl p-3.5 cursor-pointer" style={{ background: `${cor}10` }}>
                    <input type="checkbox" name={`campo_${c.id}`} required={c.obrigatorio} className="mt-1 h-5 w-5 shrink-0" style={{ accentColor: cor }} />
                    <span className="font-semibold">{c.rotulo}</span>
                </label>
            ))}

            {!prefill && visitantes && (
                <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" name="quer_contacto" className="mt-1 h-5 w-5 shrink-0" style={{ accentColor: cor }} />
                    <span>Ainda não sou da igreja e gostava que me contactassem.</span>
                </label>
            )}

            <label className="flex items-start gap-3 cursor-pointer text-[15px]">
                <input type="checkbox" name="consentimento" required className="mt-1 h-5 w-5 shrink-0" style={{ accentColor: cor }} />
                <span>
                    Autorizo a igreja a guardar estes dados para gerir a inscrição e me contactar sobre o evento.{' '}
                    <a href="/privacidade" target="_blank" className="underline">Privacidade</a>
                </span>
            </label>

            {erro && <p role="alert" className="rounded-2xl px-4 py-3 font-semibold" style={{ background: '#fde8e4', color: '#9b2c1a' }}>{erro}</p>}

            <button type="submit" disabled={aEnviar}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-lg font-semibold text-white shadow-md disabled:opacity-60"
                style={{ background: cor }}>
                {aEnviar ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Send size={20} aria-hidden />}
                {aEnviar ? 'A enviar…' : 'Enviar inscrição'}
            </button>
        </form>
    )
}
