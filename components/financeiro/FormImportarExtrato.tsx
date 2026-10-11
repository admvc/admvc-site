'use client'

import { useState, useRef } from 'react'
import { Upload, Loader2, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react'
import { importarExtrato } from '@/actions/reconciliacao-actions'

export default function FormImportarExtrato({ contaId }: { contaId: number }) {
    const [loading, setLoading] = useState(false)
    const [resultado, setResultado] = useState<{ success: boolean; imported?: number; errors?: string[]; error?: string } | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setLoading(true)
        setResultado(null)

        try {
            const text = await file.text()
            const res = await importarExtrato(contaId, text)
            setResultado(res)
        } catch {
            setResultado({ success: false, error: 'Erro ao processar ficheiro.' })
        } finally {
            setLoading(false)
            if (fileRef.current) fileRef.current.value = ''
        }
    }

    return (
        <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer group">
                <div className="h-11 px-5 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-xl flex items-center gap-2 transition-all active:scale-95 text-[9px] font-black uppercase tracking-widest group-hover:bg-blue-500 group-hover:text-white">
                    {loading ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : (
                        <Upload size={14} />
                    )}
                    {loading ? 'A importar...' : 'Importar Extrato CSV'}
                </div>
                <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFile}
                    disabled={loading}
                    className="hidden"
                />
            </label>

            <p className="text-[10px] text-muted">
                <FileSpreadsheet size={10} className="inline mr-1" />
                Formato: data;descricao;valor;saldo (separado por ; ou ,)
            </p>

            {resultado && (
                <div className={`p-3 rounded-xl border text-xs ${
                    resultado.success
                        ? 'bg-green-500/5 border-green-500/20 text-green-400'
                        : 'bg-red-500/5 border-red-500/20 text-red-400'
                }`}>
                    {resultado.success ? (
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={14} />
                            <span>{resultado.imported} movimentos importados com sucesso.</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <AlertCircle size={14} />
                            <span>{resultado.error}</span>
                        </div>
                    )}
                    {resultado.errors && resultado.errors.length > 0 && (
                        <ul className="mt-2 space-y-0.5 text-[10px] text-orange-400">
                            {resultado.errors.slice(0, 5).map((err, i) => (
                                <li key={i}>- {err}</li>
                            ))}
                            {resultado.errors.length > 5 && (
                                <li>...e mais {resultado.errors.length - 5} erros</li>
                            )}
                        </ul>
                    )}
                </div>
            )}
        </div>
    )
}
