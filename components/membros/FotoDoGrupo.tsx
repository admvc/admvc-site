'use client'

// A imagem (ícone) do grupo ao lado do nome; quem gere o grupo pode trocá-la ou tirá-la.
import { useState, useTransition } from 'react'
import { ImagePlus, Users } from 'lucide-react'
import { guardarFotoGrupoAction } from '@/actions/grupo-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

export default function FotoDoGrupo({ grupoId, nome, url: inicial, podeMudar }: { grupoId: number; nome: string; url: string | null; podeMudar: boolean }) {
    const [url, setUrl] = useState(inicial)
    const [aGuardar, iniciar] = useTransition()
    const toast = useToast()
    const enviar = (fd: FormData) => iniciar(async () => {
        fd.set('grupo_id', String(grupoId))
        const r = await guardarFotoGrupoAction(fd)
        if ('error' in r) toast(r.error, 'erro')
        else { setUrl(r.url); toast(r.url ? 'Imagem do grupo guardada.' : 'Imagem tirada.', 'sucesso') }
    })
    return (
        <div className="flex items-center gap-3">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full" style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {url ? <img src={url} alt={`Imagem de ${nome}`} className="h-full w-full object-cover" /> : <Users size={28} aria-hidden />}
            </span>
            {podeMudar && (
                <div className="flex flex-wrap gap-2">
                    <label className="a-botao a-botao-secundario !min-h-[44px] cursor-pointer !px-3 text-[14px]">
                        <ImagePlus size={18} aria-hidden /> {aGuardar ? 'A guardar…' : url ? 'Trocar imagem' : 'Pôr imagem'}
                        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={aGuardar}
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) { const fd = new FormData(); fd.set('foto', f); enviar(fd) } e.target.value = '' }} />
                    </label>
                    {url && <button type="button" disabled={aGuardar} onClick={() => { const fd = new FormData(); fd.set('tirar', '1'); enviar(fd) }} className="a-botao a-botao-secundario !min-h-[44px] !px-3 text-[14px]">Tirar</button>}
                </div>
            )}
        </div>
    )
}
