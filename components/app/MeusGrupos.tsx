// Os grupos em que participo ou que lidero: quando e onde se juntam (com o mapa
// do local e da zona que o grupo abrange), e quem lidera.
// So aparece quando ha algum.
import Link from 'next/link'
import { Clock, MapPin, Settings, Users } from 'lucide-react'
import type { MeuGrupo } from '@/lib/inicio-app'
import MapaDoGrupo from './MapaDoGrupo'

export default function MeusGrupos({ grupos }: { grupos: MeuGrupo[] }) {
    if (grupos.length === 0) return null
    return (
        <section className="space-y-2" aria-labelledby="grupos">
            <h2 id="grupos" className="text-[19px] font-bold">{grupos.length === 1 ? 'O meu grupo' : 'Os meus grupos'}</h2>
            <ul className="space-y-3">
                {grupos.map((g) => (
                    <li key={g.id} className="a-card p-4 space-y-2">
                        <p className="flex items-center gap-2 text-[17px] font-bold">
                            <Users size={20} style={{ color: 'var(--a-destaque)' }} aria-hidden /> {g.nome}
                        </p>
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
                        {g.souLider && (
                            <Link href={`/grupos/gestao/${g.id}`} className="a-botao a-botao-secundario !min-h-[44px] w-full">
                                <Settings size={18} aria-hidden /> Gerir o grupo
                            </Link>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    )
}
