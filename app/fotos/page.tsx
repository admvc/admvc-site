// /fotos — a galeria aberta da igreja: todos os albuns de cultos ja publicados.
// Sem login: quem tem o link entra e ve. Nao aparece no Google (noindex).
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { tenantPublico } from '@/lib/divulgacao-publica'
import { albunsPublicos, dataCurta } from '@/lib/fotos'
import { urlDaFoto } from '@/lib/fotos-armazenamento'
import s from './fotos.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Fotografias · ADMVC',
    description: 'Os cultos e os encontros da nossa igreja, guardados em imagem.',
    robots: { index: false, follow: false },
    openGraph: {
        title: 'Fotografias · ADMVC',
        description: 'Os cultos e os encontros da nossa igreja, guardados em imagem.',
        type: 'website',
    },
}

export default async function Fotos() {
    let albuns: Awaited<ReturnType<typeof albunsPublicos>> = []
    try {
        const tenantId = await tenantPublico()
        if (tenantId) albuns = await albunsPublicos(tenantId)
    } catch (err) {
        console.error('[FOTOS] Falha a ler os álbuns:', err)
    }

    return (
        <div className={s.pagina}>
            <header className={s.topo}>
                <Link href="/fotos" className={s.marca}>
                    ADMVC <span className={s.marcaPequena}>Fotografias</span>
                </Link>
                <span className={s.marcaPequena}>Figueira da Foz</span>
            </header>

            <section className={s.hero}>
                <p className={s.rotulo}>Álbuns dos nossos cultos</p>
                <h1 className={s.titulo}>Fotografias</h1>
                <p className={s.subtitulo}>
                    Momentos dos cultos e dos encontros da igreja, para rever, guardar e partilhar
                    com quem esteve lá — ou com quem não pôde estar.
                </p>
            </section>

            <div className={s.regua} />

            {albuns.length === 0 ? (
                <p className={s.vazio}>
                    Ainda não há álbuns publicados. Assim que a equipa de mídia publicar as fotografias
                    de um culto, elas aparecem aqui.
                </p>
            ) : (
                <section className={s.albuns} aria-label="Álbuns">
                    {albuns.map((a) => (
                        <Link key={a.slug} href={`/fotos/${a.slug}`} className={s.album}>
                            <div className={s.capa}>
                                {a.capa && (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={urlDaFoto(a.capa)} alt="" loading="lazy" decoding="async" />
                                )}
                            </div>
                            <div className={s.albumTexto}>
                                <span className={s.albumData}>{dataCurta(a.data)}</span>
                                <span className={s.albumContagem}>
                                    {a.fotos} {a.fotos === 1 ? 'fotografia' : 'fotografias'}
                                </span>
                            </div>
                            <h2 className={s.albumTitulo}>{a.titulo}</h2>
                        </Link>
                    ))}
                </section>
            )}

            <footer className={s.rodape}>
                <span>ADMVC · Figueira da Foz</span>
                <Link href="/">app.igrejaadmvc.org <ArrowRight size={12} aria-hidden style={{ display: 'inline', verticalAlign: '-1px' }} /></Link>
            </footer>
        </div>
    )
}
