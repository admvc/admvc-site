// /admin/familias/mapa — onde moram as famílias (só administradores; a morada é um dado sensível).
// Um ponto por casa, as zonas dos grupos por cima, tabela por bairro e as moradas por localizar.
import { requireRole } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { lerArea } from '@/lib/area-grupo'
import { pontosDasFamilias, porLocalizar, temMorada, chaveMorada, type MembroMapa } from '@/lib/mapa-familias'
import PainelMapaFamilias, { type Pendente } from '@/components/familias/PainelMapaFamilias'
import Breadcrumbs from '@/components/Breadcrumbs'

export const dynamic = 'force-dynamic'

export default async function MapaFamiliasPage() {
    const sessao = await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
    const db = getTenantClient(sessao.tenantId)
    // Admin de congregação: só as casas da sua congregação
    const daCongregacao = sessao.role === 'CONGREGATION_ADMIN' && sessao.congregacaoId ? { congregacao_id: sessao.congregacaoId } : {}

    const [membros, grupos, congregacoes] = await Promise.all([
        db.membro.findMany({
            where: { is_active: true, ...daCongregacao },
            select: {
                id: true, first_name: true, last_name: true, familia_id: true, congregacao_id: true,
                address_1: true, address_number: true, postal_code: true, neighborhood: true, id_city: true,
                latitude: true, longitude: true, geo_fonte: true, geo_chave: true, geo_falhou: true,
                familia: { select: { surname: true } },
                _count: { select: { grupos: true, lider_de_grupo: true } },
            },
        }),
        db.grupo.findMany({ select: { id: true, nome: true, area: true, latitude: true, longitude: true } }),
        db.congregacao.findMany({ select: { id: true, nome: true }, orderBy: { id: 'asc' } }),
    ])

    const lista: MembroMapa[] = membros.map(m => ({
        ...m, familia_nome: m.familia?.surname ?? null, em_grupo: m._count.grupos + m._count.lider_de_grupo > 0,
    }))
    const { pontos } = pontosDasFamilias(lista)

    const pendentes: Pendente[] = lista
        .filter(m => !(m.latitude != null && m.geo_chave === chaveMorada(m)))
        .map(m => ({
            id: m.id, nome: `${m.first_name} ${m.last_name}`.trim(),
            motivo: !temMorada(m) ? 'sem-morada' as const : porLocalizar(m) ? 'por-localizar' as const : 'nao-encontrada' as const,
        }))
        // Quem não tem ponto mas a casa (família) já está no mapa não precisa de aparecer
        .filter(p => {
            const m = lista.find(x => x.id === p.id)!
            return !(m.familia_id && pontos.some(pt => pt.familia_id === m.familia_id)) || p.motivo === 'por-localizar'
        })

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <Breadcrumbs items={[{ label: 'Famílias', href: '/admin/familias' }, { label: 'Mapa' }]} />
            <header className="space-y-1">
                <h1 className="text-2xl font-bold text-fg">Mapa das famílias</h1>
                <p className="text-[15px] text-muted">
                    Onde moram as famílias da igreja, e as zonas dos grupos. Só os administradores veem este mapa.
                </p>
            </header>
            <PainelMapaFamilias
                pontos={pontos}
                grupos={grupos.map(g => ({ id: g.id, nome: g.nome, area: lerArea(g.area) as [number, number][] | null, lat: g.latitude, lng: g.longitude }))}
                congregacoes={congregacoes}
                pendentes={pendentes}
            />
        </main>
    )
}
