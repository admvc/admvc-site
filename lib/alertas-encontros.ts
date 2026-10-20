// Alertas de encontro das equipas: o que um membro precisa de ver no Início (encontros novos, mudados ou cancelados nos
// próximos 14 dias, das equipas onde está, marcados por outra pessoa e ainda não fechados). Horas = hora de Lisboa gravada em UTC.
import { getTenantClient } from '@/lib/prisma'
import type { SessionData } from '@/lib/auth-utils'
import { grupoOndeEstou } from '@/lib/agenda-grupos'

export type EstadoAlerta = 'novo' | 'mudou' | 'cancelado'
export type RespostaEncontro = 'VOU' | 'NAO_POSSO'

export interface AlertaEncontro {
    id: number
    titulo: string
    tipo: string
    inicio: string          // ISO (hora de Lisboa escrita em UTC)
    fim: string | null
    local: string | null
    equipa: { id: number; nome: string; tipo: 'departamento' | 'grupo' }
    estado: EstadoAlerta
    resposta: RespostaEncontro | null
}

/** "Agora" na convenção das horas dos encontros (a hora de Lisboa escrita em UTC). */
export function agoraLisboa(): Date {
    return new Date(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Lisbon', dateStyle: 'short', timeStyle: 'medium' }).format(new Date()).replace(' ', 'T') + 'Z')
}

/** Um encontro é "mudado" se foi alterado mais de 2 minutos depois de criado (deixa corrigir um gralha logo a seguir sem alarmar). */
const MUDOU_DEPOIS_MS = 2 * 60 * 1000

/** O filtro de "equipas onde estou": integrante ou líder. */
export const daMinhaEquipa = (membroId: number) => ({ OR: [{ lider_id: membroId }, { integrantes: { some: { membro_id: membroId } } }] })

export async function alertasDoMembro(sessao: Pick<SessionData, 'membroId' | 'tenantId'>, dias = 14): Promise<AlertaEncontro[]> {
    const db = getTenantClient(sessao.tenantId)
    const agora = agoraLisboa()
    const encontros = await db.agendaDepartamento.findMany({
        where: {
            inicio: { gte: agora, lt: new Date(agora.getTime() + dias * 86400000) },
            AND: [
                { OR: [{ departamento: daMinhaEquipa(sessao.membroId) }, { grupo: grupoOndeEstou(sessao.membroId) }] },   // da minha equipa ou do meu grupo
                { OR: [{ criado_por: null }, { criado_por: { not: sessao.membroId } }] },   // quem marcou o encontro não precisa do alerta
            ],
        },
        orderBy: { inicio: 'asc' },
        select: {
            id: true, titulo: true, tipo: true, inicio: true, fim: true, local: true, criado_em: true, atualizado_em: true, cancelado_em: true,
            departamento: { select: { id: true, nome: true } },
            grupo: { select: { id: true, nome: true } },
            respostas: { where: { membro_id: sessao.membroId }, select: { resposta: true } },
            alertas_fechados: { where: { membro_id: sessao.membroId }, select: { fechado_em: true } },
        },
    })
    return encontros
        // fechado e sem alterações depois = não aparece; mudou ou foi cancelado depois de fechado = volta a aparecer
        .filter((e) => { const f = e.alertas_fechados[0]?.fechado_em; return !f || f < e.atualizado_em })
        .map((e) => ({
            id: e.id, titulo: e.titulo, tipo: e.tipo, inicio: e.inicio.toISOString(), fim: e.fim?.toISOString() ?? null, local: e.local,
            equipa: e.departamento ? { ...e.departamento, tipo: 'departamento' as const } : { id: e.grupo!.id, nome: e.grupo!.nome, tipo: 'grupo' as const },
            estado: e.cancelado_em ? 'cancelado' as const : e.atualizado_em.getTime() - e.criado_em.getTime() > MUDOU_DEPOIS_MS ? 'mudou' as const : 'novo' as const,
            resposta: (e.respostas[0]?.resposta as RespostaEncontro | undefined) ?? null,
        }))
}
