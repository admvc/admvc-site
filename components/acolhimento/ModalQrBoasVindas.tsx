'use client'

// Um QR de boas-vindas por congregação (/boasvindas?c=montemor): quem o lê fica
// registado nessa casa. Dá para abrir (tablet à entrada) ou descarregar para imprimir.
import { useState } from 'react'
import QRCode from 'react-qr-code'
import { QrCode, X, Download, ExternalLink } from 'lucide-react'
import { slugCongregacao } from '@/lib/congregacao-site'

export default function ModalQrBoasVindas({ congregacoes }: { congregacoes: Array<{ id: number; nome: string }> }) {
    const [isOpen, setIsOpen] = useState(false)
    const origem = typeof window !== 'undefined' ? window.location.origin : ''

    const opcoes = [
        ...congregacoes.map(c => ({ chave: slugCongregacao(c.nome), nome: c.nome, url: `${origem}/boasvindas?c=${slugCongregacao(c.nome)}` })),
        { chave: 'geral', nome: 'Geral (sem congregação)', url: `${origem}/boasvindas` },
    ]

    function descarregar(chave: string, nome: string) {
        const svg = document.querySelector<SVGSVGElement>(`#qr-${chave}`)
        if (!svg) return
        // O QR vem em módulos (viewBox 0 0 N N): escalar para 256
        const escala = 256 / (svg.viewBox.baseVal.width || 256)
        // SVG com margem branca e o nome por baixo, pronto a imprimir
        const conteudo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-24 -24 304 344" width="608" height="688">
<rect x="-24" y="-24" width="304" height="344" fill="#fff"/><g transform="scale(${escala})">${svg.innerHTML}</g>
<text x="128" y="296" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="700">Boas-vindas · ${nome.replace(/[<&>]/g, '')}</text></svg>`
        const a = document.createElement('a')
        a.href = URL.createObjectURL(new Blob([conteudo], { type: 'image/svg+xml' }))
        a.download = `qr-boas-vindas-${chave}.svg`
        a.click()
        // Libertar só depois: revogar logo a seguir ao clique pode cancelar a transferência
        setTimeout(() => URL.revokeObjectURL(a.href), 10000)
    }

    return (
        <>
            <button onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-fg text-bg px-3 py-2 rounded-xl text-[13px] md:text-[14px] font-bold uppercase tracking-wide hover:bg-figueira transition-all shadow-sm">
                <QrCode size={13} /> <span className="hidden sm:inline">Boas-Vindas</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bg/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-bg2 w-full sm:max-w-3xl border border-soft p-6 sm:p-8 rounded-t-[2rem] sm:rounded-[3rem] shadow-2xl relative text-left max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setIsOpen(false)} aria-label="Fechar"
                            className="absolute top-6 right-6 p-2 bg-soft text-muted rounded-full hover:bg-red-500 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                        <div className="mb-6 pr-10">
                            <h2 className="text-2xl font-bold text-fg flex items-center gap-2">
                                <QrCode size={20} className="text-figueira" /> QR de boas-vindas
                            </h2>
                            <p className="text-[14px] text-muted mt-1">
                                Um por congregação: quem o lê fica registado nessa casa. Descarregue para imprimir ou abra no tablet da entrada.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {opcoes.map(o => (
                                <div key={o.chave} className="bg-bg border border-soft rounded-2xl p-4 flex flex-col items-center gap-3">
                                    <p className="text-sm font-bold text-fg">{o.nome}</p>
                                    <div className="bg-white p-3 rounded-xl">
                                        <QRCode id={`qr-${o.chave}`} value={o.url} size={160} />
                                    </div>
                                    <p className="text-[13px] text-muted break-all text-center">{o.url.replace(/^https?:\/\//, '')}</p>
                                    <div className="flex gap-2 w-full">
                                        <a href={o.url} target="_blank" rel="noopener noreferrer"
                                            className="flex-1 flex items-center justify-center gap-1.5 bg-bg2 border border-soft text-fg py-2.5 rounded-xl text-[13px] font-bold uppercase tracking-wide hover:border-figueira/40">
                                            <ExternalLink size={13} /> Abrir
                                        </a>
                                        <button type="button" onClick={() => descarregar(o.chave, o.nome)}
                                            className="flex-1 flex items-center justify-center gap-1.5 bg-fg text-bg py-2.5 rounded-xl text-[13px] font-bold uppercase tracking-wide hover:bg-figueira">
                                            <Download size={13} /> Descarregar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
