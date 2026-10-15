'use client'

// Escrever o esboço de uma pregação: tema, textos bíblicos, o esboço, notas
// só para quem prega e publicar (para a igreja o poder ler).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Eye, Search, Trash2 } from 'lucide-react'
import { apagarEsboco, guardarEsboco, type DadosEsboco } from '@/actions/esboco-actions'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'

export default function EditorEsboco({ id, inicial, voltar }: { id: string; inicial: DadosEsboco; voltar: string }) {
    const router = useRouter()
    const confirmar = useConfirm()
    const toast = useToast()
    const [pendente, iniciar] = useTransition()
    const [d, setD] = useState<DadosEsboco>(inicial)
    const [aviso, setAviso] = useState<string | null>(null)
    const [busca, setBusca] = useState('')
    const [versiculo, setVersiculo] = useState<{ ref: string; texto: string } | null>(null)
    const [aProcurar, setAProcurar] = useState(false)
    const mudar = (c: Partial<DadosEsboco>) => setD((x) => ({ ...x, ...c }))

    function guardar(depois?: () => void) {
        setAviso(null)
        iniciar(async () => {
            const r = await guardarEsboco(id, d)
            if ('error' in r) setAviso(r.error)
            else {
                toast('Esboço guardado.', 'sucesso')
                router.refresh()
                depois?.()
            }
        })
    }

    async function apagar() {
        const ok = await confirmar({ titulo: 'Apagar esboço', mensagem: 'Apagar este esboço? Não dá para desfazer.', botaoConfirmar: 'Apagar' })
        if (!ok) return
        iniciar(async () => {
            const r = await apagarEsboco(id)
            if ('error' in r) toast(r.error, 'erro')
            else router.push(voltar)
        })
    }

    async function procurar() {
        if (!busca.trim()) return
        setAProcurar(true)
        setVersiculo(null)
        try {
            const res = await fetch(`https://bible-api.com/${encodeURIComponent(busca.trim())}?translation=almeida`)
            if (!res.ok) throw new Error()
            const j = await res.json()
            setVersiculo({ ref: j.reference || busca, texto: String(j.text || '').trim() })
        } catch {
            setVersiculo({ ref: '', texto: 'Não encontrei. Experimente o nome do livro em inglês (ex.: John 3:16).' })
        }
        setAProcurar(false)
    }

    const campo = 'a-foco min-h-[48px] w-full rounded-[14px] border px-3 text-[16px]'
    const estilo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }

    return (
        <section className="space-y-4">
            <label className="block space-y-1">
                <span className="text-[15px] font-semibold">Tema</span>
                <input value={d.titulo} onChange={(e) => mudar({ titulo: e.target.value })} className={`${campo} font-semibold`} style={estilo} />
            </label>
            <label className="block space-y-1">
                <span className="text-[15px] font-semibold">Textos bíblicos</span>
                <input value={d.referencias} onChange={(e) => mudar({ referencias: e.target.value })} placeholder="ex.: Mateus 25:14-30; Lucas 19:11-27"
                    className={campo} style={estilo} />
            </label>

            <label className="block space-y-1">
                <span className="text-[15px] font-semibold">Esboço</span>
                <textarea value={d.texto_corpo} onChange={(e) => mudar({ texto_corpo: e.target.value })} rows={14}
                    placeholder={'Introdução\n\n1. …\n2. …\n\nConclusão'}
                    className="a-foco w-full rounded-[14px] border p-3 text-[16px] leading-relaxed" style={estilo} />
            </label>

            <details className="a-card p-4">
                <summary className="a-foco flex min-h-[44px] cursor-pointer items-center gap-2 text-[16px] font-semibold">
                    <BookOpen size={18} aria-hidden /> Procurar um versículo
                </summary>
                <div className="mt-3 space-y-3">
                    <div className="flex gap-2">
                        <input value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); procurar() } }}
                            placeholder="ex.: John 3:16" className={campo} style={estilo} aria-label="Versículo a procurar" />
                        <button type="button" className="a-botao a-botao-secundario !px-4" onClick={procurar} disabled={aProcurar} aria-label="Procurar">
                            <Search size={20} aria-hidden />
                        </button>
                    </div>
                    {versiculo && (
                        <div className="space-y-2">
                            {versiculo.ref && <p className="text-[15px] font-semibold">{versiculo.ref}</p>}
                            <p className="text-[15px] a-suave whitespace-pre-wrap">{versiculo.texto}</p>
                            {versiculo.ref && (
                                <button type="button" className="a-botao a-botao-secundario w-full"
                                    onClick={() => mudar({ texto_corpo: `${d.texto_corpo}${d.texto_corpo ? '\n\n' : ''}${versiculo.ref}\n${versiculo.texto}` })}>
                                    Juntar ao esboço
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </details>

            <label className="block space-y-1">
                <span className="text-[15px] font-semibold">Notas só para mim</span>
                <textarea value={d.notas_privadas} onChange={(e) => mudar({ notas_privadas: e.target.value })} rows={4}
                    className="a-foco w-full rounded-[14px] border p-3 text-[16px]" style={estilo} />
                <span className="block text-[14px] a-suave">Não aparecem a quem lê o esboço.</span>
            </label>
            <label className="block space-y-1">
                <span className="text-[15px] font-semibold">Palavras-chave</span>
                <input value={d.tags} onChange={(e) => mudar({ tags: e.target.value })} placeholder="ex.: fé, mordomia, parábolas" className={campo} style={estilo} />
            </label>

            <label className="a-card flex min-h-[56px] cursor-pointer items-center gap-3 p-4">
                <input type="checkbox" checked={d.publicado} onChange={(e) => mudar({ publicado: e.target.checked })} className="h-6 w-6" />
                <span>
                    <span className="block text-[16px] font-semibold">Publicar para a igreja</span>
                    <span className="block text-[14px] a-suave">Os membros podem ler o esboço depois do culto.</span>
                </span>
            </label>

            {aviso && <p role="alert" className="text-[15px] font-semibold" style={{ color: 'var(--a-erro)' }}>{aviso}</p>}

            <div className="sticky bottom-24 z-10 flex gap-2 md:bottom-4">
                <button type="button" className="a-botao a-botao-secundario !px-3" disabled={pendente} onClick={apagar} aria-label="Apagar esboço" style={{ color: 'var(--a-erro)' }}>
                    <Trash2 size={20} aria-hidden />
                </button>
                <button type="button" className="a-botao a-botao-secundario flex-1" disabled={pendente} onClick={() => guardar(() => router.push(`/pregacao/sermao/${id}`))}>
                    <Eye size={18} aria-hidden /> Ver
                </button>
                <button type="button" className="a-botao a-botao-principal flex-[2]" disabled={pendente} onClick={() => guardar()}>
                    {pendente ? 'A guardar…' : 'Guardar'}
                </button>
            </div>
        </section>
    )
}
