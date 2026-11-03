// Arrumar o repertório: ligar músicas ao CSDB e juntar duplicadas. Só quem gere o repertório.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getSessionData } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { podeGerirRepertorio } from '@/lib/louvor-permissoes'
import { csdbConfigurado } from '@/lib/csdb'
import { agruparDuplicados, contarPreenchidos, idsForaDoCsdb, type CamposMusica } from '@/lib/musicas-juntar'
import LigarCsdb from './LigarCsdb'
import Duplicados from './Duplicados'

export const dynamic = 'force-dynamic'

export default async function LigarPage() {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')
    if (!(await podeGerirRepertorio(sessao))) redirect('/louvor/musicas')
    const db = getTenantClient(sessao.tenantId)
    const [musicas, fora] = await Promise.all([
        db.musica.findMany({ orderBy: { titulo: 'asc' }, include: { _count: { select: { eventos: true } } } }),
        idsForaDoCsdb(sessao.tenantId),
    ])

    const linhas = musicas.map((m) => ({ id: m.id, titulo: m.titulo, artista: m.artista, tom: m.tom, ligada: m.csdb_track_id != null }))
    const semLigacao = linhas.filter((m) => !m.ligada && !fora.has(m.id))
    const marcadas = linhas.filter((m) => !m.ligada && fora.has(m.id))
    const grupos = agruparDuplicados(musicas.map((m) => ({
        id: m.id, titulo: m.titulo, titulo_norm: m.titulo_norm, artista: m.artista,
        csdb_track_id: m.csdb_track_id, csdb_work_id: m.csdb_work_id,
        cultos: m._count.eventos, preenchidos: contarPreenchidos(m as unknown as CamposMusica),
        tom: m.tom,
    }))).map((g) => ({
        motivo: g.motivo,
        sugerida: g.sugerida,
        musicas: g.musicas.map((m) => ({ id: m.id, titulo: m.titulo, artista: m.artista, tom: m.tom, cultos: m.cultos, ligada: m.csdb_track_id != null })),
    }))

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-3xl px-4 pt-20 pb-28 md:pt-8 space-y-6">
                <header className="space-y-1">
                    <Link href="/louvor/musicas" className="a-foco inline-flex min-h-[44px] items-center gap-1 text-[16px] a-suave">
                        <ArrowLeft size={18} aria-hidden /> Repertório
                    </Link>
                    <h1 className="text-[24px] font-bold leading-tight">Arrumar o repertório</h1>
                    <p className="text-[15px] a-suave">{linhas.length} músicas · {linhas.length - semLigacao.length - marcadas.length} ligadas ao CSDB</p>
                </header>
                <LigarCsdb musicas={semLigacao} marcadas={marcadas} csdbOk={csdbConfigurado()} />
                <Duplicados grupos={grupos} />
            </main>
        </div>
    )
}
