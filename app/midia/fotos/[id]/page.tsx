// Gestão de um álbum: título/data/capa, publicar/esconder, marcar várias fotos com etiquetas, ver as mais gostadas.
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getSessionData } from '@/lib/auth-utils'
import { podeFazerAgenda } from '@/lib/agenda-midia'
import { garantirEtiquetas } from '@/lib/fotos-gestao'
import { albumParaGestao } from '@/lib/fotos-midia'
import GestaoAlbum from './GestaoAlbum'

export const dynamic = 'force-dynamic'

export default async function MidiaAlbumFotos({ params }: { params: Promise<{ id: string }> }) {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')
    if (!(await podeFazerAgenda(sessao))) redirect(`/membros/dashboard?error=${encodeURIComponent('Só a Mídia e a administração gerem as fotos.')}`)
    const { id } = await params
    const albumId = Number(id)
    if (!Number.isInteger(albumId) || albumId <= 0) notFound()

    const [album, etiquetas] = await Promise.all([albumParaGestao(sessao.tenantId, albumId), garantirEtiquetas(sessao.tenantId)])
    if (!album) notFound()

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-5xl space-y-5 px-4 pt-20 pb-28 md:pt-8">
                <Link href="/midia/fotos" className="inline-flex min-h-[44px] items-center gap-2 text-[15px] a-suave"><ArrowLeft size={16} aria-hidden /> Todos os álbuns</Link>
                <GestaoAlbum
                    album={album}
                    etiquetas={etiquetas.map((e) => ({ id: e.id, nome: e.nome, cor: e.cor, icone: e.icone, esconde: e.esconde }))} />
            </main>
        </div>
    )
}
