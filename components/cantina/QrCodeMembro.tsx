'use client'
import { useState } from 'react'
import { QrCode, RefreshCw, Loader2 } from 'lucide-react'
import QRCode from 'react-qr-code'
import { gerarQrCodeMembro } from '@/actions/cantina-local-actions'

interface Props { membroId: number; qrCode: string | null }

export default function QrCodeMembro({ membroId, qrCode: initial }: Props) {
    const [qrCode, setQrCode] = useState(initial)
    const [loading, setLoading] = useState(false)

    async function gerar() {
        setLoading(true)
        const res = await gerarQrCodeMembro(membroId)
        if (res.success && res.qrCode) setQrCode(res.qrCode)
        setLoading(false)
    }

    return (
        <div className="bg-bg2 border border-soft rounded-2xl p-6 text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
                <QrCode size={16} className="text-figueira" />
                <span className="text-[9px] font-black uppercase tracking-widest text-muted">Cartao Cantina</span>
            </div>
            {qrCode ? (
                <div className="space-y-2">
                    <div className="bg-white rounded-2xl p-4 mx-auto w-fit">
                        <QRCode value={qrCode} size={160} level="M" />
                    </div>
                    <p className="text-[9px] text-muted">Mostre este QR Code no POS da Cantina</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-[10px] text-muted">Ainda nao tem cartao. Gere um para identificacao rapida no POS.</p>
                    <button onClick={gerar} disabled={loading} className="inline-flex items-center gap-2 bg-figueira text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-50">
                        {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        Gerar Cartao
                    </button>
                </div>
            )}
        </div>
    )
}
