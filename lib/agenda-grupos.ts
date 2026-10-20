// Quem gere a agenda de um GRUPO e quem pode criar regras repetidas. Administradores e Pastor (cargo na ficha) gerem a
// agenda de todos os grupos e criam reuniões e cultos direcionados; o líder de um grupo cria as reuniões e os cultos
// direcionados do SEU grupo. Reuniões de um departamento: quem gere o departamento.
import { isAdmin, type SessionData } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { podeGerirEscalasDoDepartamento } from '@/lib/escalas-permissoes'

/** O cargo "Pastor"/"Pastora" na ficha (church_role ou um dos cargos). */
export async function ePastor(sessao: Pick<SessionData, 'membroId' | 'tenantId'>): Promise<boolean> {
    const m = await getTenantClient(sessao.tenantId).membro.findFirst({ where: { id: sessao.membroId }, select: { church_role: true, cargos: { select: { nome: true } } } })
    return !!m && [m.church_role ?? '', ...m.cargos.map((c) => c.nome)].some((c) => /pastor/i.test(c))
}

/** Administração ou Pastor: vê e gere a agenda de todos os grupos. */
export async function geralNaAgenda(sessao: Pick<SessionData, 'membroId' | 'tenantId' | 'role'>): Promise<boolean> {
    return isAdmin(sessao.role) || (await ePastor(sessao))
}

/** Filtro de grupo: os que eu lidero. */
export const grupoQueLidero = (membroId: number) => ({ lideres: { some: { id: membroId } } })
/** Filtro de grupo: os de que faço parte (membro ou líder). */
export const grupoOndeEstou = (membroId: number) => ({ OR: [{ membros: { some: { id: membroId } } }, { lideres: { some: { id: membroId } } }] })

export async function podeGerirGrupo(sessao: Pick<SessionData, 'membroId' | 'tenantId' | 'role'>, grupoId: number): Promise<boolean> {
    const db = getTenantClient(sessao.tenantId)
    if (await geralNaAgenda(sessao)) return (await db.grupo.count({ where: { id: grupoId } })) > 0
    return (await db.grupo.count({ where: { id: grupoId, ...grupoQueLidero(sessao.membroId) } })) > 0
}

/** Pode criar/mudar uma regra deste tipo? (alvo = CULTO | ENCONTRO) */
export async function podeCriarRegra(
    sessao: SessionData,
    r: { alvo: string; grupo_id: number | null; departamento_id: number | null },
): Promise<boolean> {
    // culto direcionado: administração, Pastor ou o líder desse grupo; reunião do grupo: o mesmo
    if (r.grupo_id) return podeGerirGrupo(sessao, r.grupo_id)
    if (r.alvo === 'CULTO') return false
    if (r.departamento_id) return podeGerirEscalasDoDepartamento(sessao, r.departamento_id)
    return false
}

/** Ids dos grupos onde estou (para marcar "o teu grupo" nos cultos direcionados). */
export async function meusGruposIds(sessao: Pick<SessionData, 'membroId' | 'tenantId'>): Promise<number[]> {
    const db = getTenantClient(sessao.tenantId)
    return (await db.grupo.findMany({ where: grupoOndeEstou(sessao.membroId), select: { id: true } })).map((g) => g.id)
}
