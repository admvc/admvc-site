'use client'

import { useState } from 'react'
import { Save, Loader2, X, Eye, Edit3, HelpCircle, Download } from 'lucide-react'
import { parseCifra, importarCifraClub } from '@/lib/cifra'
import { salvarCifraInternaAction } from '@/actions/louvor-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

interface Props {
    musicaId: string
    titulo: string
    cifraAtual?: string | null
    onClose: () => void
    onSaved?: (cifra: string) => void
}

export default function CifraEditor({ musicaId, titulo, cifraAtual, onClose, onSaved }: Props) {
    const toast = useToast()
    const [texto, setTexto] = useState(cifraAtual || '')
    const [saving, setSaving] = useState(false)
    const [preview, setPreview] = useState(false)
    const [showHelp, setShowHelp] = useState(false)
    const [showImport, setShowImport] = useState(!cifraAtual)
    const [importTexto, setImportTexto] = useState('')
    const [importMsg, setImportMsg] = useState('')

    const { linhas } = parseCifra(texto)

    async function handleSave() {
        setSaving(true)
        // Se a cifra não tem brackets, converter automaticamente
        const cifraFinal = texto.includes('[') ? texto : importarCifraClub(texto)
        const res = await salvarCifraInternaAction(musicaId, cifraFinal)
        setSaving(false)
        if (res.ok) {
            onSaved?.(cifraFinal)
            onClose()
        } else {
            toast(res.error || 'Erro ao guardar.', 'erro')
        }
    }

    function handleImport() {
        const convertido = importarCifraClub(importTexto)
        setTexto(convertido)
        setImportTexto('')
        setShowImport(false)
        if (convertido.includes('[')) {
            setImportMsg(`Convertido com sucesso! ${(convertido.match(/\[/g) || []).length} acordes detectados.`)
        } else {
            setImportMsg('Aviso: nenhum acorde detectado. Verifica o formato.')
        }
        setTimeout(() => setImportMsg(''), 5000)
    }

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col">

            {/* HEADER */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0 bg-zinc-900">
                <div className="min-w-0">
                    <p className="text-[8px] font-black uppercase tracking-widest text-emerald-400">Editor de Cifra</p>
                    <h3 className="text-sm font-black uppercase tracking-tighter text-white truncate">{titulo}</h3>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => { setShowImport(!showImport); setShowHelp(false) }}
                        className={`h-8 px-3 flex items-center gap-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${showImport ? 'bg-orange-500 text-white' : 'bg-white/10 text-white/60'}`}>
                        <Download size={12} /> Importar
                    </button>
                    <button onClick={() => { setShowHelp(!showHelp); setShowImport(false) }}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg ${showHelp ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/60'}`}>
                        <HelpCircle size={14} />
                    </button>
                    <button onClick={() => setPreview(!preview)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg ${preview ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/60'}`}>
                        {preview ? <Edit3 size={14} /> : <Eye size={14} />}
                    </button>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white/60 hover:text-red-400">
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* HELP */}
            {showHelp && (
                <div className="px-4 py-3 border-b border-white/10 bg-blue-500/10 text-blue-300 text-[10px] leading-relaxed shrink-0">
                    <p className="font-black uppercase tracking-widest mb-1">Como escrever:</p>
                    <p>Coloca os acordes entre <strong>[colchetes]</strong> antes da silaba:</p>
                    <p className="font-mono mt-1 bg-black/30 px-2 py-1 rounded text-xs">
                        [Am]Quando eu chorei Tu en[G]xugaste as minhas la[F]grimas
                    </p>
                    <p className="mt-1">Linhas em branco separam estrofes. Podes usar [Em] [Am7] [F#m] [Bb7] etc.</p>
                </div>
            )}

            {/* IMPORT */}
            {showImport && (
                <div className="px-4 py-3 border-b border-white/10 bg-orange-500/5 shrink-0 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-300">
                        Importar do CifraClub
                    </p>
                    <p className="text-[9px] text-orange-200/60">
                        Abre a musica no CifraClub, seleciona o texto da cifra e cola aqui abaixo. O sistema converte automaticamente.
                    </p>
                    <textarea
                        value={importTexto}
                        onChange={e => setImportTexto(e.target.value)}
                        placeholder={"Cole aqui o texto copiado do CifraClub...\n\nExemplo:\nAm            G              F\nQuando eu chorei Tu enxugaste as minhas lagrimas\nDm                    Am\nQuando clamei Tu me ouviste"}
                        rows={8}
                        className="w-full bg-black/50 text-white font-mono text-sm p-4 rounded-xl outline-none resize-none border border-orange-500/20 placeholder:text-white/20 leading-relaxed"
                        spellCheck={false}
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <button onClick={handleImport} disabled={!importTexto.trim()}
                            className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-orange-600">
                            <Download size={12} /> Converter e Importar
                        </button>
                        <button onClick={() => { setShowImport(false); setImportTexto('') }}
                            className="px-4 py-2.5 rounded-xl bg-white/10 text-white/60 text-[9px] font-black uppercase tracking-widest hover:bg-white/20">
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* MENSAGEM DE IMPORTAÇÃO */}
            {importMsg && (
                <div className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest shrink-0 ${importMsg.includes('sucesso') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                    {importMsg}
                </div>
            )}

            {/* BODY — ocupa todo o espaço disponível */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                {preview ? (
                    <div className="flex-1 overflow-y-auto px-5 py-4 font-mono text-base whitespace-pre-wrap leading-loose">
                        {linhas.map((segs, i) => (
                            <div key={i} className="min-h-[1.6em]">
                                {segs.length === 0 && <br />}
                                {segs.map((seg, j) => (
                                    seg.tipo === 'acorde' ? (
                                        <span key={j} className="text-emerald-400 font-black text-lg">{seg.valor}</span>
                                    ) : (
                                        <span key={j} className="text-white/80">{seg.valor}</span>
                                    )
                                ))}
                            </div>
                        ))}
                    </div>
                ) : (
                    <textarea
                        value={texto}
                        onChange={e => setTexto(e.target.value)}
                        placeholder={`[Am]Quando eu chorei Tu en[G]xugaste as minhas la[F]grimas\n[Dm]Quando clamei Tu me ou[Am]viste\n\n[C]Grande es Tu Se[G]nhor`}
                        className="flex-1 bg-black text-white font-mono text-base p-5 outline-none resize-none placeholder:text-white/15 leading-loose"
                        spellCheck={false}
                        autoFocus={!showImport}
                    />
                )}
            </div>

            {/* FOOTER */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 shrink-0 bg-zinc-900">
                <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest">
                    {texto.split('\n').length} linhas · {texto.length} caracteres
                </p>
                <div className="flex gap-2">
                    <button onClick={onClose}
                        className="px-4 py-2.5 rounded-xl bg-white/10 text-white/60 text-[9px] font-black uppercase tracking-widest hover:bg-white/20">
                        Cancelar
                    </button>
                    <button onClick={handleSave} disabled={saving || !texto.trim()}
                        className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2">
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        Guardar Cifra
                    </button>
                </div>
            </div>
        </div>
    )
}
