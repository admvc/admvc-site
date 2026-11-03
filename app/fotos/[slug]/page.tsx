// /fotos/<slug> — um album publicado: cabecalho com o nome do culto e a data, grelha das fotos
// e a foto aberta em grande. Sem login; so existe se estiver publicado.
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { ArrowLeft } from 'lucide-react'
import { tenantPublico } from '@/lib/divulgacao-publica'
import { albumPublico, dataPorExtenso, reacoesDoAparelho } from '@/lib/fotos'
import { aparelhoValido, COOKIE_APARELHO, hashDoAparelho } from '@/lib/fotos-gestao'
import { urlDaFoto } from '@/lib/fotos-armazenamento'
import Galeria from '@/components/fotos/Galeria'
import Partilhar from '@/components/fotos/Partilhar'
import s from '../fotos.module.css'

export const dynamic = 'force-dynamic'

async function carregar(slug: string) {
    const tenantId = await tenantPublico()
    return tenantId ? albumPublico(tenantId, decodeURIComponent(slug)) : null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params
    const album = await carregar(slug).catch(() => null)
    if (!album) return { title: 'Álbum não encontrado · ADMVC', robots: { index: false, follow: false } }

    const titulo = `${album.titulo} · Fotografias ADMVC`
    const descricao = `As fotografias de ${dataPorExtenso(album.data).toLowerCase()}.`
    const capa = album.capa ? urlDaFoto(album.capa) : undefined
    return {
        title: titulo,
        description: descricao,
        robots: { index: false, follow: false },
        openGraph: {
            title: titulo,
            description: descricao,
            type: 'article',
            ...(capa ? { images: [{ url: capa }] } : {}),
        },
        twitter: { card: capa ? 'summary_large_image' : 'summary', title: titulo, description: descricao, ...(capa ? { images: [capa] } : {}) },
    }
}

export default async function Album({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const album = await carregar(slug).catch((err) => {
        console.error('[FOTOS] Falha a ler o álbum:', err)
        return null
    })
    if (!album) notFound()

    // Os coracoes deste aparelho (cookie) — sem login
    const ap = (await cookies()).get(COOKIE_APARELHO)?.value
    const minhas = await reacoesDoAparelho(album.fotos.map((f) => f.id), aparelhoValido(ap) ? hashDoAparelho(ap) : null).catch(() => new Set<number>())

    const fotos = album.fotos.map((f) => ({
        id: f.id,
        src: urlDaFoto(f.chave),
        mini: urlDaFoto(f.miniatura ?? f.chave),
        largura: f.largura,
        altura: f.altura,
        gostos: f._count.reacoes,
        minha: minhas.has(f.id),
    }))

    return (
        <div className={s.pagina}>
            <header className={s.topo}>
                <Link href="/fotos" className={s.voltar}>
                    <ArrowLeft size={15} aria-hidden /> Todas as fotografias
                </Link>
                <Link href="/fotos" className={s.marca}>
                    ADMVC <span className={s.marcaPequena}>Fotografias</span>
                </Link>
            </header>

            <section className={s.cabecalhoAlbum}>
                <div className={s.cabecalhoTexto}>
                    <p className={s.dataGrande}>{dataPorExtenso(album.data)}</p>
                    <h1 className={s.tituloAlbum}>{album.titulo}</h1>
                    {album.descricao && <p className={s.descricaoAlbum}>{album.descricao}</p>}
                    <p className={s.albumContagem} style={{ marginTop: 16 }}>
                        {album.fotos.length} {album.fotos.length === 1 ? 'fotografia' : 'fotografias'}
                    </p>
                </div>
                <div className={s.acoesAlbum}>
                    <Partilhar titulo={`${album.titulo} · Fotografias ADMVC`} />
                </div>
            </section>

            <Galeria fotos={fotos} titulo={album.titulo} />

            <footer className={s.rodape}>
                <span>ADMVC · Figueira da Foz</span>
                <Link href="/fotos">Todos os álbuns</Link>
            </footer>
        </div>
    )
}
