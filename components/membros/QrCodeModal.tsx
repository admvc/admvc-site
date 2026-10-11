'use client'

import { useState } from 'react'
import { QrCode, RefreshCw, Loader2 } from 'lucide-react'
import QRCode from 'react-qr-code'
import { gerarQrCodeMembro } from '@/actions/cantina-local-actions'
import { createPortal } from 'react-dom'

interface Props {
    membroId: number
    qrCode: string | null
    membroNome: string
}

export default function QrCodeModal({ membroId, qrCode: initial, membroNome }: Props) {
    const [aberto, setAberto] = useState(false)
    const [qrCode, setQrCode] = useState(initial)
    const [loading, setLoading] = useState(false)

    async function gerar() {
        setLoading(true)
        const res = await gerarQrCodeMembro(membroId)
        if (res.success && res.qrCode) setQrCode(res.qrCode)
        setLoading(false)
    }

    return (
        <>
            {/* MINI QR TRIGGER */}
            <button onClick={() => setAberto(true)} className="shrink-0">
                {qrCode ? (
                    <div className="bg-white rounded-xl p-1.5">
                        <QRCode value={qrCode} size={44} level="L" />
                    </div>
                ) : (
                    <div className="h-[52px] w-[52px] bg-soft rounded-xl flex items-center justify-center">
                        <QrCode size={20} className="text-muted" />
                    </div>
                )}
            </button>

            {/* MODAL FULLSCREEN */}
            {aberto && createPortal(
                <div
                    className="fixed inset-0 z-[200] bg-bg/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200"
                    onClick={() => setAberto(false)}
                >
                    <div className="text-center space-y-6" onClick={e => e.stopPropagation()}>
                        <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase tracking-widest text-figueira">Cartao Cantina</p>
                            <h2 className="text-xl font-black uppercase italic tracking-tighter text-fg">{membroNome}</h2>
                        </div>

                        {qrCode ? (
                            <div className="space-y-4">
                                <div className="bg-white rounded-3xl p-6 mx-auto w-fit shadow-lg">
                                    <QRCode value={qrCode} size={220} level="M" />
                                </div>
                                <p className="text-[10px] text-muted font-bold">Mostre este QR Code no POS da Cantina</p>
                                <p className="text-[8px] text-muted/40 mt-2">Toque em qualquer lugar para fechar</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-soft rounded-3xl p-10 mx-auto w-fit">
                                    <QrCode size={60} className="text-muted" />
                                </div>
                                <p className="text-[10px] text-muted">Ainda nao tem cartao. Gere um para identificacao rapida.</p>
                                <button onClick={gerar} disabled={loading}
                                    className="inline-flex items-center gap-2 bg-figueira text-white px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-50">
                                    {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                    Gerar Cartao
                                </button>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
