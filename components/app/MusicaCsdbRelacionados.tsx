// Ficha da música: "outras gravações desta música" e "versões/traduções" (ex.: a original em inglês).
// Componente de SERVIDOR: pede ao CSDB (com cache de 30 dias). Se o CSDB falhar, não aparece nada
// e a ficha continua a funcionar.
import { obterFaixa, relacionadosDaFaixa, type RelacionadosCsdb } from '@/lib/csdb'
import { formatarDuracao, nomeIdioma } from '@/lib/csdb-dados'

export default async function MusicaCsdbRelacionados({ trackId, tenantId }: { trackId: number; tenantId: number }) {
    let rel: RelacionadosCsdb
    try {
        const faixa = await obterFaixa(trackId, tenantId)
        rel = await relacionadosDaFaixa(faixa, tenantId)
    } catch {
        return null
    }
    const gravacoes = rel.gravacoes.filter((g) => g.id !== trackId).slice(0, 6)
    const versoes = rel.versoes.slice(0, 6)
    if (!rel.original && gravacoes.length === 0 && versoes.length === 0) return null

    return (
        <section className="a-card p-4 space-y-4" aria-labelledby="relacionadas">
            <h2 id="relacionadas" className="text-[19px] font-bold">Outras versões</h2>

            {rel.original && (
                <div>
                    <p className="text-[14px] a-suave">Versão da música original</p>
                    <p className="text-[16px] font-semibold">
                        {rel.original.titulo}
                        {rel.original.idioma ? <span className="font-normal a-suave"> · {nomeIdioma(rel.original.idioma)}</span> : null}
                    </p>
                </div>
            )}

            {versoes.length > 0 && (
                <div>
                    <p className="text-[14px] a-suave">Versões e traduções</p>
                    <ul className="a-divide">
                        {versoes.map((v) => (
                            <li key={v.id} className="py-2 text-[16px] font-semibold">
                                {v.titulo}
                                <span className="font-normal a-suave">{[nomeIdioma(v.idioma), v.ano].filter(Boolean).map((x) => ` · ${x}`).join('')}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {gravacoes.length > 0 && (
                <div>
                    <p className="text-[14px] a-suave">Outras gravações desta música</p>
                    <ul className="a-divide">
                        {gravacoes.map((g) => (
                            <li key={g.id} className="py-2">
                                <span className="block truncate text-[16px] font-semibold">{g.artista || g.titulo}</span>
                                <span className="block text-[14px] a-suave">
                                    {[g.titulo !== (g.artista ?? '') ? g.titulo : null, g.ano, g.tom ? `tom ${g.tom}` : null, g.bpm ? `${g.bpm} bpm` : null, formatarDuracao(g.duracao_seg)].filter(Boolean).join(' · ')}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    )
}
