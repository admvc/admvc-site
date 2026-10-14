'use client'

// Entrada no dia: procurar pelo nome ou código e tocar "Chegou", ou ler o QR
// da inscrição com a câmara. Mostra logo se está confirmada e se pagou.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { alterarInscricaoAction, entradaPorCodigoAction } from '@/actions/inscricao-actions'
import { useToast } from '@/components/ui/ConfirmDialog'
import { ArrowLeft, QrCode, Search, Check, Undo2, X, Loader2 } from 'lucide-react'

type Linha = { id: number; nome: string; codigo: string; estado: string; pago: boolean; presente: boolean }

export default function EntradaClient({ slug, titulo, cor, cobra, inscricoes }: { slug: string; titulo: string; cor: string; cobra: boolean; inscricoes: Linha[] }) {
    const toast = useToast()
    const [lista, setLista] = useState(inscricoes)
    const [busca, setBusca] = useState('')
    const [aGuardar, setAGuardar] = useState<number | null>(null)
    const [camara, setCamara] = useState(false)
    const [ultima, setUltima] = useState<{ nome: string; aviso: string | null } | null>(null)
    const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null)

    useEffect(() => setLista(inscricoes), [inscricoes])

    const presentes = lista.filter(i => i.presente).length
    const termo = busca.trim().toLowerCase()
    const visiveis = lista.filter(i => !termo || i.nome.toLowerCase().includes(termo) || i.codigo.toLowerCase().includes(termo))

    const avisoDe = (i: { estado: string; pago: boolean }) =>
        [i.estado !== 'CONFIRMADA' ? 'ainda não confirmada' : null, cobra && !i.pago ? 'falta pagar' : null].filter(Boolean).join(' · ') || null

    async function marcar(i: Linha, chegou: boolean) {
        setAGuardar(i.id)
        const r = await alterarInscricaoAction(i.id, chegou ? 'CHEGOU' : 'NAO_CHEGOU')
        setAGuardar(null)
        if (!r.ok) { toast(r.error || 'Não foi possível guardar.', 'erro'); return }
        setLista(l => l.map(x => x.id === i.id ? { ...x, presente: chegou } : x))
        if (chegou) setUltima({ nome: i.nome, aviso: avisoDe(i) })
    }

    async function lido(texto: string) {
        const r = await entradaPorCodigoAction(slug, texto)
        if (!r.ok) { toast(r.error, 'erro'); return }
        setLista(l => l.map(x => x.id === r.id ? { ...x, presente: true } : x))
        setUltima({ nome: r.jaEstava ? `${r.nome} (já tinha entrado)` : r.nome, aviso: avisoDe(r) })
    }

    async function abrirCamara() {
        setCamara(true)
        await new Promise(res => setTimeout(res, 50)) // esperar pelo <div id="leitor-qr">
        try {
            const { Html5Qrcode } = await import('html5-qrcode')
            const scanner = new Html5Qrcode('leitor-qr')
            scannerRef.current = scanner
            const lado = Math.min(Math.floor(Math.min(window.innerWidth - 40, 350) * 0.7), 260)
            await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: lado, height: lado } },
                async (texto) => { await fecharCamara(); await lido(texto) }, () => {})
        } catch {
            toast('Não foi possível abrir a câmara. Procure pelo nome ou pelo código.', 'erro')
            setCamara(false)
        }
    }
    async function fecharCamara() {
        try { await scannerRef.current?.stop() } catch { /* já parada */ }
        scannerRef.current = null
        setCamara(false)
    }

    return (
        <div className="space-y-4">
            <Link href={`/inscricoes/${slug}`} className="inline-flex items-center gap-1 text-[15px] a-suave"><ArrowLeft size={16} aria-hidden /> {titulo}</Link>
            <header className="flex items-end justify-between gap-3">
                <h1 className="text-[26px] font-bold">Entrada</h1>
                <p className="text-[17px] font-semibold"><span style={{ color: cor }}>{presentes}</span> de {lista.length} chegaram</p>
            </header>

            {ultima && (
                <div role="status" className="a-card p-4 flex items-start gap-3" style={{ borderColor: ultima.aviso ? '#d97706' : cor, borderWidth: 2 }}>
                    <Check size={26} style={{ color: cor }} className="shrink-0" aria-hidden />
                    <div className="flex-1">
                        <p className="text-[18px] font-bold">{ultima.nome}</p>
                        <p className="text-[15px]" style={{ color: ultima.aviso ? '#b45309' : undefined }}>{ultima.aviso ? `Atenção: ${ultima.aviso}` : 'Tudo certo. Bem-vinda!'}</p>
                    </div>
                    <button type="button" onClick={() => setUltima(null)} aria-label="Fechar" className="a-suave"><X size={18} /></button>
                </div>
            )}

            {camara ? (
                <div className="a-card p-3 space-y-2">
                    <div id="leitor-qr" className="w-full overflow-hidden rounded-xl" />
                    <button type="button" onClick={fecharCamara} className="a-botao a-botao-secundario w-full">Fechar câmara</button>
                </div>
            ) : (
                <button type="button" onClick={abrirCamara} className="a-botao w-full !min-h-[52px] text-white" style={{ background: cor }}>
                    <QrCode size={20} aria-hidden /> Ler o QR da inscrição
                </button>
            )}

            <label className="flex items-center gap-2 a-card px-3">
                <Search size={16} className="a-suave shrink-0" aria-hidden />
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Procurar nome ou código" aria-label="Procurar"
                    className="flex-1 bg-transparent py-3 text-[17px] outline-none min-w-0" />
            </label>

            <ul className="space-y-2">
                {visiveis.map(i => {
                    const aviso = avisoDe(i)
                    return (
                        <li key={i.id} className="a-card p-3 flex items-center gap-3" style={i.presente ? { background: `${cor}12` } : undefined}>
                            <div className="flex-1 min-w-0">
                                <p className="text-[17px] font-semibold truncate">{i.presente && <Check size={16} className="inline -mt-1 mr-1" style={{ color: cor }} aria-label="Chegou" />}{i.nome}</p>
                                <p className="text-[14px] a-suave"><span className="font-mono tracking-widest">{i.codigo}</span>{aviso ? ` · ${aviso}` : ''}</p>
                            </div>
                            {i.presente ? (
                                <button type="button" onClick={() => marcar(i, false)} disabled={aGuardar === i.id}
                                    className="flex items-center gap-1 rounded-xl px-3 min-h-[44px] text-[14px] font-semibold border" style={{ borderColor: 'var(--a-borda)' }}>
                                    {aGuardar === i.id ? <Loader2 size={15} className="animate-spin" /> : <Undo2 size={15} />} Desfazer
                                </button>
                            ) : (
                                <button type="button" onClick={() => marcar(i, true)} disabled={aGuardar === i.id}
                                    className="flex items-center gap-1 rounded-xl px-4 min-h-[44px] text-[15px] font-semibold text-white" style={{ background: cor }}>
                                    {aGuardar === i.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Chegou
                                </button>
                            )}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
