// Editar uma musica do repertorio (quem gere o louvor).
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getSessionData } from '@/lib/auth-utils'
import { podeGerirRepertorio } from '@/lib/louvor-permissoes'
import { musicaDoRepertorio } from '@/lib/ministerios-app'
import FormMusica from '@/components/app/FormMusica'

export const dynamic = 'force-dynamic'

export default async function EditarMusicaPage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')
    if (!(await podeGerirRepertorio(sessao))) redirect(`/louvor/musicas/${id}`)
    const m = await musicaDoRepertorio(sessao, id)
    if (!m) redirect('/louvor/musicas')
    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-md px-4 pt-20 pb-28 md:pt-8 space-y-5">
                <Link href={`/louvor/musicas/${id}`} className="a-foco inline-flex min-h-[44px] items-center gap-2 text-[16px] font-semibold" style={{ color: 'var(--a-destaque)' }}>
                    <ArrowLeft size={20} aria-hidden /> {m.titulo}
                </Link>
                <h1 className="text-[24px] font-bold">Editar música</h1>
                <FormMusica musica={{
                    id: m.id, titulo: m.titulo, artista: m.artista, tom: m.tom, bpm: m.bpm,
                    link_cifra: m.links.cifra, link_letra: m.links.letra, link_video: m.links.video, link_audio: m.links.audio,
                }} />
            </main>
        </div>
    )
}
