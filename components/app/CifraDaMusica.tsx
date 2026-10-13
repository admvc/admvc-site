'use client'

// A cifra de uma musica: abrir no ecra cheio (rolagem automatica, mudar o tom,
// letra maior), e para quem gere: importar do CifraClub ou escrever/colar.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Guitar, Pencil, Trash2 } from 'lucide-react'
import CifraViewer from '@/components/louvor/CifraViewer'
import CifraEditor from '@/components/louvor/CifraEditor'
import { importarCifraDeUrlAction } from '@/actions/cifra-actions'
import { apagarMusica } from '@/actions/repertorio-app-actions'

export default function CifraDaMusica({ musica, gere }: {
    musica: { id: string; titulo: string; artista: string | null; tom: string | null; cifra: string | null; linkCifra: string | null }
    gere: boolean
}) {
    const router = useRouter()
    const [pendente, iniciar] = useTransition()
    const [ver, setVer] = useState(false)
    const [editar, setEditar] = useState(false)
    const [aviso, setAviso] = useState<string | null>(null)

    const importar = () => {
        setAviso(null)
        iniciar(async () => {
            const r = await importarCifraDeUrlAction(musica.id, musica.linkCifra!)
            if (!r.ok) setAviso(r.error || 'Não foi possível importar.')
            else router.refresh()
        })
    }

    return (
        <section className="a-card p-4 space-y-3" aria-labelledby="cifra">
            <h2 id="cifra" className="flex items-center gap-2 text-[19px] font-bold"><Guitar size={20} aria-hidden /> Cifra</h2>

            {musica.cifra ? (
                <button type="button" className="a-botao a-botao-principal w-full" onClick={() => setVer(true)}>
                    Abrir a cifra (rolagem automática)
                </button>
            ) : (
                <p className="text-[16px] a-suave">Ainda não tem cifra na app.</p>
            )}

            {gere && (
                <div className="grid gap-2">
                    {!musica.cifra && musica.linkCifra && /cifraclub\.com|cifras\.com\.br/.test(musica.linkCifra) && (
                        <button type="button" className="a-botao a-botao-secundario w-full" disabled={pendente} onClick={importar}>
                            <Download size={18} aria-hidden /> {pendente ? 'A importar…' : 'Importar do CifraClub'}
                        </button>
                    )}
                    <button type="button" className="a-botao a-botao-secundario w-full" onClick={() => setEditar(true)}>
                        <Pencil size={18} aria-hidden /> {musica.cifra ? 'Editar cifra' : 'Escrever ou colar'}
                    </button>
                </div>
            )}

            {aviso && <p role="alert" className="text-[15px] font-semibold" style={{ color: 'var(--a-erro)' }}>{aviso}</p>}

            {ver && musica.cifra && (
                <CifraViewer cifra={musica.cifra} titulo={musica.titulo} artista={musica.artista}
                    tomOriginal={musica.tom} tomTocado={musica.tom ?? undefined} onClose={() => setVer(false)} />
            )}
            {editar && (
                <div className="fixed inset-0 z-[200]">
                    <CifraEditor musicaId={musica.id} titulo={musica.titulo} cifraAtual={musica.cifra}
                        onClose={() => setEditar(false)} onSaved={() => router.refresh()} />
                </div>
            )}
        </section>
    )
}

export function ApagarMusica({ id }: { id: string }) {
    const router = useRouter()
    const [pendente, iniciar] = useTransition()
    const [confirmar, setConfirmar] = useState(false)
    const [aviso, setAviso] = useState<string | null>(null)
    return (
        <div className="space-y-2">
            {!confirmar ? (
                <button type="button" className="a-botao a-botao-secundario w-full" style={{ color: 'var(--a-erro)' }} onClick={() => setConfirmar(true)}>
                    <Trash2 size={18} aria-hidden /> Apagar música
                </button>
            ) : (
                <div className="a-card p-4 space-y-3">
                    <p className="text-[16px]">Apagar esta música do repertório?</p>
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" className="a-botao a-botao-secundario" onClick={() => setConfirmar(false)}>Não</button>
                        <button type="button" className="a-botao" style={{ background: 'var(--a-erro)', color: '#fff' }} disabled={pendente}
                            onClick={() => iniciar(async () => {
                                const r = await apagarMusica(id)
                                if (r.ok === false) setAviso(r.error)
                                else { router.push('/louvor/musicas'); router.refresh() }
                            })}>
                            Sim, apagar
                        </button>
                    </div>
                </div>
            )}
            {aviso && <p role="alert" className="text-[15px] font-semibold" style={{ color: 'var(--a-erro)' }}>{aviso}</p>}
        </div>
    )
}
