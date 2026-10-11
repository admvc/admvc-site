// app/grupos/admin/page.tsx
import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import nextDynamic from 'next/dynamic'
import Link from 'next/link'
import Breadcrumb from '@/components/ui/Breadcrumb'
import GeocodificarBotao from '@/components/grupos/GeocodificarBotao'
import { Users, MapPin, Map, Globe, Settings } from 'lucide-react'

// Carregamento lazy — o Leaflet só funciona no browser
const MapaGrupos = nextDynamic(() => import('@/components/grupos/MapaGrupos'), {
    ssr: false,
    loading: () => (
        <div className="h-[500px] rounded-[1.5rem] bg-soft/30 border border-soft flex items-center justify-center animate-pulse">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted">A carregar mapa...</p>
        </div>
    )
})

const REGIOES_DEFAULT = ['Norte', 'Centro', 'Sul', 'Lisboa', 'Online']

const COR_REGIAO: Record<string, string> = {
    Norte: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    Centro: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
    Sul: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    Lisboa: 'bg-red-500/10 text-red-700 border-red-500/20',
    Online: 'bg-soft text-muted border-soft',
}

export default async function AdminGruposPage({ searchParams }: { searchParams: Promise<{ congregacao?: string }> }) {
    const db = await getDb()
    const params = await searchParams
    const session = await getSessionData()
    const tenantId = await getTenantIdFromHeaders()
    const congFilter = session?.role === 'CONGREGATION_ADMIN' && session.congregacaoId
        ? session.congregacaoId
        : params.congregacao ? Number(params.congregacao) : undefined

    const [grupos, tenantConfig] = await Promise.all([
        db.grupo.findMany({
            where: congFilter ? { congregacaoId: congFilter } : undefined,
            include: {
                lideres: { select: { id: true, first_name: true, last_name: true, avatar_file: true } },
                membros: { select: { id: true } },
            },
            orderBy: [{ regiao: 'asc' }, { nome: 'asc' }]
        }),
        tenantId ? db.tenant.findUnique({
            where: { id: tenantId },
            select: { regioes_custom: true }
        }) : null,
    ])

    const REGIOES = (tenantConfig?.regioes_custom as string[]) || REGIOES_DEFAULT

    const comCoords = grupos.filter(g => g.latitude && g.longitude).length
    const semCoords = grupos.length - comCoords
    const publicos = grupos.filter(g => g.publico).length

    // Agrupa por região
    const porRegiao = REGIOES.reduce((acc, r) => {
        acc[r] = grupos.filter(g => g.regiao === r)
        return acc
    }, {} as Record<string, typeof grupos>)
    const semRegiao = grupos.filter(g => !g.regiao || !REGIOES.includes(g.regiao))

    return (
        <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-700 pb-32">

            <Breadcrumb items={[
                { label: 'Painel Admin', href: '/admin/dashboard', isBackIcon: true },
                { label: 'Comunidade', hideOnMobile: true },
                { label: 'Pequenos Grupos' }
            ]} />

            {/* HEADER */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-soft">
                <div className="space-y-2">
                    <span className="text-figueira font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-2">
                        <Users size={14} /> Gestao de Celulas
                    </span>
                    <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-fg leading-none">
                        Pequenos <span className="text-muted/30">Grupos.</span>
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/admin/configuracoes"
                        className="flex items-center gap-2 bg-bg2 border border-soft text-muted px-4 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:text-fg hover:border-figueira/30 transition-all">
                        <Settings size={13} /> Gerir Grupos
                    </Link>
                    <Link href="/grupos" target="_blank"
                        className="flex items-center gap-2 bg-bg2 border border-soft text-muted px-4 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:text-fg hover:border-figueira/30 transition-all">
                        <Globe size={13} /> Ver Site Publico
                    </Link>
                </div>
            </header>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total Grupos', value: grupos.length, cor: 'text-fg' },
                    { label: 'No Mapa', value: comCoords, cor: 'text-emerald-600' },
                    { label: 'Sem Coords', value: semCoords, cor: semCoords > 0 ? 'text-orange-600' : 'text-emerald-600' },
                    { label: 'No Site Pub.', value: publicos, cor: 'text-blue-600' },
                ].map(k => (
                    <div key={k.label} className="bg-bg2 border border-soft rounded-2xl px-5 py-4">
                        <p className="text-[8px] font-black uppercase tracking-widest text-muted">{k.label}</p>
                        <p className={`text-2xl font-black italic ${k.cor}`}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* ALERTA + BOTAO DE GEOCODIFICACAO */}
            {semCoords > 0 && (
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <MapPin size={16} className="text-orange-500 shrink-0" />
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-orange-700">
                                {semCoords} grupo{semCoords !== 1 ? 's' : ''} sem coordenadas GPS
                            </p>
                            <p className="text-[9px] font-bold text-orange-600/70 uppercase tracking-widest mt-0.5">
                                Clica para geocodificar automaticamente via OpenStreetMap
                            </p>
                        </div>
                    </div>
                    <GeocodificarBotao />
                </div>
            )}

            {/* MAPA ADMIN */}
            <section className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-5 border-b border-soft">
                    <Map size={16} className="text-figueira" />
                    <h2 className="text-sm font-black uppercase tracking-widest text-fg">Mapa de Grupos</h2>
                    <span className="text-[8px] font-black uppercase tracking-widest bg-soft border border-soft px-2 py-1 rounded-lg text-muted ml-auto">
                        {comCoords} no mapa
                    </span>
                </div>
                <div className="p-5">
                    <MapaGrupos grupos={grupos} altura="480px" mostrarLegenda />
                </div>
            </section>

            {/* GRUPOS POR REGIÃO */}
            <section className="space-y-6">
                <h2 className="text-sm font-black uppercase tracking-widest text-fg flex items-center gap-3">
                    <Users size={15} className="text-figueira" /> Grupos por Regiao
                </h2>

                {[...REGIOES.map(r => ({ regiao: r, lista: porRegiao[r] || [] })),
                ...(semRegiao.length > 0 ? [{ regiao: 'Sem Regiao', lista: semRegiao }] : [])
                ].filter(({ lista }) => lista.length > 0).map(({ regiao, lista }) => (
                    <div key={regiao} className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                        {/* CABEÇALHO DA REGIÃO */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-soft">
                            <div className="flex items-center gap-3">
                                <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${COR_REGIAO[regiao] || 'bg-soft text-muted border-soft'}`}>
                                    {regiao}
                                </span>
                                <span className="text-[9px] font-black text-muted uppercase tracking-widest">
                                    {lista.length} grupo{lista.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>

                        {/* LISTA DE GRUPOS */}
                        <div className="divide-y divide-soft">
                            {lista.map(grupo => (
                                <div key={grupo.id} className="flex items-center gap-4 px-6 py-4 hover:bg-soft/10 transition-colors">
                                    {/* INDICADOR DE COORDS */}
                                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${grupo.latitude ? 'bg-emerald-500' : 'bg-orange-400'}`}
                                        title={grupo.latitude ? 'No mapa' : 'Sem coordenadas'} />

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-[11px] font-black uppercase text-fg leading-none">{grupo.nome}</p>
                                            {grupo.publico && (
                                                <span className="text-[7px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-600 border border-blue-500/20 px-1.5 py-0.5 rounded">
                                                    Publico
                                                </span>
                                            )}
                                            {grupo.categoria && (
                                                <span className="text-[7px] font-bold text-muted uppercase tracking-widest">{grupo.categoria}</span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 mt-1">
                                            {grupo.dia_semana && grupo.horario && (
                                                <span className="text-[9px] font-bold text-muted uppercase tracking-widest">
                                                    📅 {grupo.dia_semana} {grupo.horario}
                                                </span>
                                            )}
                                            {grupo.cidade && (
                                                <span className="text-[9px] font-bold text-muted uppercase tracking-widest">
                                                    📍 {grupo.cidade}
                                                </span>
                                            )}
                                            {grupo.lideres.length > 0 && (
                                                <span className="text-[9px] font-bold text-muted uppercase tracking-widest">
                                                    👤 {grupo.lideres[0].first_name} {grupo.lideres[0].last_name}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-[8px] font-black text-muted uppercase tracking-widest bg-soft px-2.5 py-1 rounded-lg">
                                            {grupo.membros.length} membros
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </section>
        </main>
    )
}