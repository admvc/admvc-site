// lib/rotina-alertas.ts
// Rotinas do culto — parte com base de dados: os cultos, quem recebe o alerta das artes, o registo (sem repetir), o envio
// (email + push) e o que o Início, a Divulgação e o Holyrics lêem. A conta pura está em lib/rotina-config.ts.
import prisma from '@/lib/prisma'
import { enviarEmail, emailConfigurado } from '@/lib/email-transport'
import { sendPushToMembro } from '@/lib/web-push'
import { urlDoPortal } from '@/lib/redefinir-senha'
import {
    cartaoVisivel, destinatarios, estadoDoKit, lerConfig, lisboaEscrita, momentoDoAlerta, quandoDoCulto, textoAlerta,
    type Alerta, type EstadoKit, type Momento, type PassoRotina, type RotinaConfig,
} from '@/lib/rotina-config'

export const TIPOS_DE_CULTO = ['CULTO_REGULAR', 'CULTO_ESPECIAL']

export async function configDaIgreja(tenantId: number): Promise<RotinaConfig> {
    const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { rotina_culto: true } })
    return lerConfig(t?.rotina_culto)
}

/** Os destinatários das artes de um culto: escalados numa função do telão + o líder do departamento dessas escalas. */
export async function destinatariosDoCulto(tenantId: number, eventoId: number, cfg: RotinaConfig) {
    const escalas = await prisma.escala.findMany({
        where: { tenant_id: tenantId, evento_id: eventoId, motivo_recusa: null },
        select: { membro_id: true, funcao: true, funcao_ref: { select: { nome: true } }, departamento: { select: { lider_id: true } } },
    })
    return destinatarios(escalas.map((e) => ({ membroId: e.membro_id, funcao: e.funcao_ref?.nome || e.funcao, liderId: e.departamento.lider_id })), cfg.funcoes)
}

/** Quem já postou (registo 'postado') por culto: { eventoId → { nome, quando } }. */
export async function quemPostou(tenantId: number, eventoIds: number[]) {
    if (eventoIds.length === 0) return new Map<number, { nome: string; quando: Date }>()
    const regs = await prisma.rotinaRegisto.findMany({
        where: { tenant_id: tenantId, evento_id: { in: eventoIds }, tipo: 'postado' }, orderBy: { criado_em: 'asc' },
        select: { evento_id: true, membro_id: true, criado_em: true },
    })
    const ids = [...new Set(regs.map((r) => r.membro_id).filter((x): x is number => !!x))]
    const membros = ids.length ? await prisma.membro.findMany({ where: { id: { in: ids } }, select: { id: true, first_name: true, last_name: true } }) : []
    const nome = new Map(membros.map((m) => [m.id, `${m.first_name} ${m.last_name}`.trim()]))
    const saida = new Map<number, { nome: string; quando: Date }>()
    for (const r of regs) if (!saida.has(r.evento_id)) saida.set(r.evento_id, { nome: (r.membro_id && nome.get(r.membro_id)) || 'alguém da equipa', quando: r.criado_em })
    return saida
}

/** "Já postei": grava uma vez por pessoa e culto. */
export async function registarPostado(tenantId: number, eventoId: number, membroId: number) {
    try {
        await prisma.rotinaRegisto.create({ data: { tenant_id: tenantId, evento_id: eventoId, tipo: 'postado', membro_id: membroId, chave: `postado:${eventoId}:${membroId}` } })
    } catch (e) {
        if ((e as { code?: string }).code !== 'P2002') throw e   // já tinha carregado: não faz mal
    }
}

/** O membro é destinatário (escalado no telão ou líder dessas escalas) deste culto? */
export async function souDestinatario(tenantId: number, eventoId: number, membroId: number) {
    const cfg = await configDaIgreja(tenantId)
    return (await destinatariosDoCulto(tenantId, eventoId, cfg)).some((d) => d.membroId === membroId)
}

// ---- o alerta (cron) ---------------------------------------------------------------------------------------------------------

export type PlanoCulto = {
    evento: { id: number; nome: string; data: Date }
    estado: EstadoKit
    alerta: Alerta
    postado: boolean
    destinatarios: { membroId: number; papel: 'escalado' | 'lider'; nome: string; email: string; jaAvisado: boolean }[]
}

/** O que o alerta desta hora faria (sem enviar nada). `momento` null = esta hora não tem alerta. */
export async function planearAlertas(tenantId: number, agora: Date, forcar?: Momento['tipo']): Promise<{ momento: Momento | null; cultos: PlanoCulto[] }> {
    const cfg = await configDaIgreja(tenantId)
    let momento = momentoDoAlerta(agora, cfg)
    if (forcar) {   // só no ensaio: ver o que faria a outra hora
        const l = lisboaEscrita(agora), dia = Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate())
        momento = forcar === 'alerta_d1'
            ? { tipo: 'alerta_d1', quando: 'amanha', de: new Date(dia + 86400000), ate: new Date(dia + 2 * 86400000) }
            : { tipo: 'alerta_dia', quando: 'hoje', de: new Date(dia), ate: new Date(dia + 86400000) }
    }
    if (!momento) return { momento: null, cultos: [] }

    const eventos = await prisma.evento.findMany({
        where: { tenant_id: tenantId, tipo: { in: TIPOS_DE_CULTO }, data: { gte: momento.de, lt: momento.ate } },
        orderBy: { data: 'asc' }, select: { id: true, nome: true, data: true },
    })
    const ids = eventos.map((e) => e.id)
    const [kits, postados, avisos] = await Promise.all([
        prisma.kitDivulgacao.findMany({ where: { tenant_id: tenantId, evento_id: { in: ids } }, select: { evento_id: true, publicado_em: true } }),
        quemPostou(tenantId, ids),
        prisma.rotinaRegisto.findMany({ where: { tenant_id: tenantId, evento_id: { in: ids }, tipo: momento.tipo }, select: { evento_id: true, membro_id: true } }),
    ])
    const cultos: PlanoCulto[] = []
    for (const e of eventos) {
        const estado = estadoDoKit(kits.find((k) => k.evento_id === e.id))
        const dest = await destinatariosDoCulto(tenantId, e.id, cfg)
        const membros = dest.length ? await prisma.membro.findMany({ where: { id: { in: dest.map((d) => d.membroId) } }, select: { id: true, first_name: true, last_name: true, email: true } }) : []
        cultos.push({
            evento: e, estado, postado: postados.has(e.id),
            alerta: textoAlerta({ estado, quando: momento.quando, nome: e.nome, data: e.data, eventoId: e.id }),
            destinatarios: dest.flatMap((d) => {
                const m = membros.find((x) => x.id === d.membroId)
                return m ? [{ ...d, nome: `${m.first_name} ${m.last_name}`.trim(), email: m.email, jaAvisado: avisos.some((a) => a.evento_id === e.id && a.membro_id === d.membroId) }] : []
            }),
        })
    }
    return { momento, cultos }
}

function htmlDoEmail(nome: string, a: Alerta, link: string) {
    return `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:20px;color:#111">
<p style="margin:0 0 12px;font-size:16px">A paz, ${nome.split(' ')[0]}!</p>
<p style="margin:0 0 16px;font-size:16px;line-height:1.4">${a.texto}</p>
<p style="margin:0"><a href="${link}" style="display:inline-block;background:#111;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">${a.acao === 'postar' ? 'Abrir as artes' : 'Abrir a Divulgação'}</a></p>
</div>`
}

export type ResultadoEnvio = { culto: string; membroId: number; email: boolean; push: boolean; saltado?: string }

/** Corre o alerta desta hora: envia email + push a quem ainda não foi avisado deste culto e tipo, e regista (sem repetir). */
export async function enviarAlertas(tenantId: number, agora: Date, opcoes?: { ensaio?: boolean; forcar?: Momento['tipo'] }) {
    const { momento, cultos } = await planearAlertas(tenantId, agora, opcoes?.forcar)
    if (!momento) return { momento: null, cultos: [] as { culto: string; estado: EstadoKit; postado: boolean; destinatarios: number; envios: ResultadoEnvio[] }[] }
    const base = urlDoPortal()
    const saida = []
    for (const c of cultos) {
        const envios: ResultadoEnvio[] = []
        for (const d of c.destinatarios) {
            const rotulo = `${c.evento.nome}`
            if (c.postado) { envios.push({ culto: rotulo, membroId: d.membroId, email: false, push: false, saltado: 'já postado' }); continue }
            if (d.jaAvisado) { envios.push({ culto: rotulo, membroId: d.membroId, email: false, push: false, saltado: 'já avisado' }); continue }
            if (opcoes?.ensaio) { envios.push({ culto: rotulo, membroId: d.membroId, email: !!d.email && emailConfigurado(), push: true }); continue }
            // reserva o aviso ANTES de enviar: se o cron correr duas vezes, a segunda não repete
            try {
                await prisma.rotinaRegisto.create({ data: { tenant_id: tenantId, evento_id: c.evento.id, tipo: momento.tipo, membro_id: d.membroId, chave: `${momento.tipo}:${c.evento.id}:${d.membroId}`, detalhes: { estado: c.estado, papel: d.papel } } })
            } catch (e) {
                if ((e as { code?: string }).code === 'P2002') { envios.push({ culto: rotulo, membroId: d.membroId, email: false, push: false, saltado: 'já avisado' }); continue }
                throw e
            }
            const link = `${base}${c.alerta.url}`
            const email = d.email && emailConfigurado()
                ? (await enviarEmail({ from: 'Igreja ADMVC <escalas@igrejaadmvc.org>', to: d.email, subject: c.alerta.assunto, html: htmlDoEmail(d.nome, c.alerta, link) })).ok : false
            const push = (await sendPushToMembro(d.membroId, { title: c.alerta.titulo, body: c.alerta.texto, url: c.alerta.url }).catch(() => ({ sent: false }))).sent
            envios.push({ culto: rotulo, membroId: d.membroId, email, push })
        }
        saida.push({ culto: c.evento.nome, estado: c.estado, postado: c.postado, destinatarios: c.destinatarios.length, envios })
    }
    return { momento: momento.tipo, cultos: saida }
}

// ---- o cartão do Início --------------------------------------------------------------------------------------------------------

export type CartaoRotina = { eventoId: number; nome: string; data: string; quando: 'hoje' | 'amanha'; alerta: Alerta }

/** O alerta das artes para este membro no Início (enquanto o culto não passar e ninguém tiver postado). */
export async function cartoesRotinaDoMembro(tenantId: number, membroId: number, agora = new Date()): Promise<CartaoRotina[]> {
    const cfg = await configDaIgreja(tenantId)
    const l = lisboaEscrita(agora)
    const dia = Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate())
    const eventos = await prisma.evento.findMany({
        where: {
            tenant_id: tenantId, tipo: { in: TIPOS_DE_CULTO }, data: { gte: l, lt: new Date(dia + 2 * 86400000) },
            escalas: { some: { membro_id: membroId, motivo_recusa: null } },
        },
        orderBy: { data: 'asc' }, select: { id: true, nome: true, data: true },
    })
    // também os cultos em que sou líder do departamento escalado no telão
    const doLider = await prisma.evento.findMany({
        where: { tenant_id: tenantId, tipo: { in: TIPOS_DE_CULTO }, data: { gte: l, lt: new Date(dia + 2 * 86400000) }, escalas: { some: { motivo_recusa: null, departamento: { lider_id: membroId } } } },
        orderBy: { data: 'asc' }, select: { id: true, nome: true, data: true },
    })
    const candidatos = [...new Map([...eventos, ...doLider].map((e) => [e.id, e])).values()].filter((e) => cartaoVisivel(e.data, agora, cfg.horaAlerta))
    if (candidatos.length === 0) return []
    const ids = candidatos.map((e) => e.id)
    const [kits, postados] = await Promise.all([
        prisma.kitDivulgacao.findMany({ where: { tenant_id: tenantId, evento_id: { in: ids } }, select: { evento_id: true, publicado_em: true } }),
        quemPostou(tenantId, ids),
    ])
    const saida: CartaoRotina[] = []
    for (const e of candidatos.sort((a, b) => a.data.getTime() - b.data.getTime())) {
        if (postados.has(e.id)) continue
        if (!(await souDestinatario(tenantId, e.id, membroId))) continue
        const quando = quandoDoCulto(e.data, agora)
        if (!quando) continue
        saida.push({ eventoId: e.id, nome: e.nome, data: e.data.toISOString(), quando, alerta: textoAlerta({ estado: estadoDoKit(kits.find((k) => k.evento_id === e.id)), quando, nome: e.nome, data: e.data, eventoId: e.id }) })
    }
    return saida
}

// ---- Holyrics: o culto de hoje, o registo do início --------------------------------------------------------------------------

/** Escrita "AAAA-MM-DDTHH:MM" (hora de Lisboa) de uma data guardada em "hora de parede". */
export const dataEscrita = (d: Date) => d.toISOString().slice(0, 16)

/** O culto de hoje mais próximo da hora atual (hora de Lisboa). */
export async function cultoDeHoje(tenantId: number, agora = new Date()) {
    const l = lisboaEscrita(agora)
    const dia = Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate())
    const eventos = await prisma.evento.findMany({
        where: { tenant_id: tenantId, tipo: { in: TIPOS_DE_CULTO }, data: { gte: new Date(dia), lt: new Date(dia + 86400000) } },
        select: { id: true, nome: true, data: true },
    })
    return eventos.sort((a, b) => Math.abs(a.data.getTime() - l.getTime()) - Math.abs(b.data.getTime() - l.getTime()))[0] ?? null
}

export async function registarInicioCulto(tenantId: number, eventoId: number, operador: string, passos: PassoRotina[]) {
    await prisma.rotinaRegisto.create({
        data: { tenant_id: tenantId, evento_id: eventoId, tipo: 'inicio_culto', ok: passos.every((p) => p.ok), detalhes: { operador, passos } },
    })
}

/** Histórico dos 'inicio_culto' dos últimos cultos (para a secção "Rotina do culto"). */
export async function historicoInicios(tenantId: number, limite = 12) {
    const regs = await prisma.rotinaRegisto.findMany({ where: { tenant_id: tenantId, tipo: 'inicio_culto' }, orderBy: { criado_em: 'desc' }, take: limite })
    const eventos = regs.length ? await prisma.evento.findMany({ where: { id: { in: [...new Set(regs.map((r) => r.evento_id))] } }, select: { id: true, nome: true, data: true } }) : []
    return regs.map((r) => {
        const d = (r.detalhes && typeof r.detalhes === 'object' ? r.detalhes : {}) as { operador?: string; passos?: PassoRotina[] }
        const ev = eventos.find((e) => e.id === r.evento_id)
        return { id: r.id, evento: ev ? { nome: ev.nome, data: ev.data.toISOString() } : null, ok: r.ok, operador: d.operador ?? '', passos: Array.isArray(d.passos) ? d.passos : [], criadoEm: r.criado_em.toISOString() }
    })
}
