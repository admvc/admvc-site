// Os grupos em que participo ou que lidero, num so cartao FECHADO: cada grupo e uma linha (nome + proximo encontro);
// tocar abre os detalhes dele (quando e onde se juntam, o mapa, quem lidera, a agenda e as pessoas).
// So aparece quando ha algum.
import Link from 'next/link'
import { ChevronDown, Clock, MapPin, Settings, Users } from 'lucide-react'
import type { MeuGrupo } from '@/lib/inicio-app'
import MapaDoGrupo from './MapaDoGrupo'
import { diaCurto, hora } from './datas'

export default function MeusGrupos({ grupos }: { grupos: MeuGrupo[] }) {
    if (grupos.length === 0) return null
    return (
        <section className="a-card space-y-1 p-4" aria-labelledby="grupos">
            <h2 id="grupos" className="text-[19px] font-bold">{grupos.length === 1 ? 'O meu grupo' : `Os meus grupos (${grupos.length})`}</h2>
            <ul className="a-divide">
                {grupos.map((g) => (
                    <li key={g.id}>
                        <details className="group">
                            <summary className="a-foco flex min-h-[60px] cursor-pointer list-none items-center gap-3 py-2">
                                {g.foto
                                    // eslint-disable-next-line @next/next/no-img-element
                                    ? <img src={g.foto} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                                    : <Users size={20} className="shrink-0" style={{ color: 'var(--a-destaque)' }} aria-hidden />}
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[17px] font-semibold">{g.nome}</span>
                                    <span className="block truncate text-[14px] a-suave">
                                        {g.proximo ? `Próximo: ${diaCurto(g.proximo)} · ${hora(g.proximo)}` : (g.quando || 'Sem encontro marcado')}
                                    </span>
                                </span>
                                <ChevronDown size={20} className="shrink-0 a-suave transition-transform group-open:rotate-180" aria-hidden />
                            </summary>
                            <div className="space-y-2 pb-3">
                                {g.quando && (
                                    <p className="flex items-center gap-2 text-[16px]"><Clock size={18} className="a-suave shrink-0" aria-hidden /> {g.quando}</p>
                                )}
                                {g.morada && (
                                    <p className="flex items-start gap-2 text-[16px]">
                                        <MapPin size={18} className="a-suave mt-0.5 shrink-0" aria-hidden />
                                        {g.mapa ? (
                                            <a href={g.mapa} target="_blank" rel="noopener noreferrer" className="a-foco underline" style={{ color: 'var(--a-destaque)' }}>{g.morada}</a>
                                        ) : g.morada}
                                    </p>
                                )}
                                {(g.area || (g.latitude != null && g.longitude != null)) && (
                                    <MapaDoGrupo latitude={g.latitude} longitude={g.longitude} area={g.area} />
                                )}
                                {g.lideres.length > 0 && (
                                    <p className="text-[15px] a-suave">{g.lideres.length === 1 ? 'Líder' : 'Líderes'}: {g.lideres.join(', ')}</p>
                                )}
                                {g.apoio ? (
                                    <Link href={g.apoio.href} className="a-botao a-botao-secundario !min-h-[44px] w-full">{g.apoio.texto}</Link>
                                ) : (<>
                                    <Link href={`/membros/grupo/${g.id}/agenda`} className="a-botao a-botao-secundario !min-h-[44px] w-full">Agenda do grupo</Link>
                                    <Link href={`/grupos/gestao/${g.id}`} className="a-botao a-botao-secundario !min-h-[44px] w-full">
                                        {g.souLider ? <><Settings size={18} aria-hidden /> Gerir o grupo</> : 'Ver o grupo e as pessoas'}
                                    </Link>
                                </>)}
                            </div>
                        </details>
                    </li>
                ))}
            </ul>
        </section>
    )
}
