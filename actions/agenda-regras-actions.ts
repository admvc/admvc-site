'use server'

// Regras repetidas da agenda ("toda a 1.ª segunda, 20h00, Grupo de Homens"): criar, mudar, desativar, apagar.
// Cada alteração volta a gerar os próximos 3 meses (sem mexer no que já existe) — ver lib/agenda-regras.ts.

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { podeCriarRegra } from '@/lib/agenda-grupos'
import { desfazerRegraFutura, gerarRegra, type RegraGerar } from '@/lib/agenda-regras'
import { tipoAgendaValido } from '@/lib/agenda'

export type ResultadoRegra =
    | { ok: true; criados: number; avisos: string[]; datas: string[]; ficaram?: number }
    | { ok: false; error: string }

const texto = (v: FormDataEntryValue | null, max: number) => String(v ?? '').trim().slice(0, max)

function refrescar() {
    revalidatePath('/membros/agenda')
    revalidatePath('/membros/agenda/regras')
    revalidatePath('/membros/dashboard')
}

function lerFormulario(f: FormData) {
    const alvo = f.get('alvo') === 'CULTO' ? 'CULTO' : 'ENCONTRO'
    const grupo = Number(f.get('grupo_id')) || null
    const depto = Number(f.get('departamento_id')) || null
    const dia = Number(f.get('dia_semana'))
    const semana = Number(f.get('semana_do_mes'))
    const hora = String(f.get('hora') ?? '20:00')
    return {
        alvo, titulo: texto(f.get('titulo'), 120), tipo: alvo === 'CULTO' ? 'CULTO_REGULAR' : tipoAgendaValido(f.get('tipo')),
        grupo_id: grupo, departamento_id: grupo ? null : depto, dia_semana: dia, semana_do_mes: semana, hora,
        local: texto(f.get('local'), 120) || null,
    }
}

function validar(r: ReturnType<typeof lerFormulario>): string | null {
    if (!r.titulo) return 'Escreva o título (ex.: Reunião — Grupo de Homens).'
    if (!Number.isInteger(r.dia_semana) || r.dia_semana < 0 || r.dia_semana > 6) return 'Escolha o dia da semana.'
    if (![1, 2, 3, 4, 5, -1].includes(r.semana_do_mes)) return 'Escolha qual semana do mês.'
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.hora)) return 'Escolha a hora.'
    if (r.alvo === 'ENCONTRO' && !r.grupo_id && !r.departamento_id) return 'Escolha o grupo ou o departamento.'
    if (r.alvo === 'CULTO' && !r.grupo_id) return 'Escolha o grupo a quem o culto é direcionado.'
    return null
}

export async function criarRegra(formData: FormData): Promise<ResultadoRegra> {
    try {
        const sessao = await requireAuth()
        const r = lerFormulario(formData)
        const erro = validar(r)
        if (erro) return { ok: false, error: erro }
        if (!(await podeCriarRegra(sessao, r))) return { ok: false, error: r.alvo === 'CULTO' ? 'Só os líderes do grupo, o Pastor e a administração marcam cultos direcionados.' : 'Só o líder do grupo, o Pastor ou a administração.' }

        const db = getTenantClient(sessao.tenantId)
        const criada = await db.regraAgenda.create({ data: { ...r, tenant_id: sessao.tenantId, criado_por: sessao.membroId } as never })
        const gerado = await gerarRegra(db, sessao.tenantId, criada as RegraGerar)
        refrescar()
        return { ok: true, ...gerado }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Não foi possível guardar a regra.' }
    }
}

async function minhaRegra(id: number) {
    const sessao = await requireAuth()
    const db = getTenantClient(sessao.tenantId)
    const regra = await db.regraAgenda.findFirst({ where: { id } })
    if (!regra) throw new Error('Regra não encontrada.')
    if (!(await podeCriarRegra(sessao, regra))) throw new Error('Sem permissão para esta regra.')
    return { sessao, db, regra }
}

/** Muda a regra: o que ainda não foi mexido no futuro refaz-se com os dados novos. */
export async function atualizarRegra(id: number, formData: FormData): Promise<ResultadoRegra> {
    try {
        const { sessao, db, regra } = await minhaRegra(id)
        const r = lerFormulario(formData)
        const erro = validar({ ...r, alvo: regra.alvo, tipo: r.tipo })
        if (erro) return { ok: false, error: erro }
        // o tipo de regra e o alvo não mudam; podem mudar título, dia, semana, hora, local e o grupo/departamento
        if (!(await podeCriarRegra(sessao, { alvo: regra.alvo, grupo_id: r.grupo_id, departamento_id: r.departamento_id }))) return { ok: false, error: 'Sem permissão para este grupo.' }
        const { removidos: _r, ficaram } = await desfazerRegraFutura(db, regra)
        const nova = await db.regraAgenda.update({
            where: { id },
            data: { titulo: r.titulo, tipo: regra.alvo === 'CULTO' ? 'CULTO_REGULAR' : r.tipo, dia_semana: r.dia_semana, semana_do_mes: r.semana_do_mes, hora: r.hora, local: r.local, grupo_id: r.grupo_id, departamento_id: r.grupo_id ? null : r.departamento_id },
        })
        const gerado = await gerarRegra(db, sessao.tenantId, nova as RegraGerar)
        refrescar()
        return { ok: true, ...gerado, ficaram }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Não foi possível mudar a regra.' }
    }
}

export async function desativarRegra(id: number): Promise<ResultadoRegra> {
    try {
        const { db, regra } = await minhaRegra(id)
        const { ficaram } = await desfazerRegraFutura(db, regra)
        await db.regraAgenda.update({ where: { id }, data: { ativo: false } })
        refrescar()
        return { ok: true, criados: 0, avisos: [], datas: [], ficaram }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Não foi possível desativar.' }
    }
}

export async function reativarRegra(id: number): Promise<ResultadoRegra> {
    try {
        const { sessao, db, regra } = await minhaRegra(id)
        const nova = await db.regraAgenda.update({ where: { id }, data: { ativo: true } })
        const gerado = await gerarRegra(db, sessao.tenantId, { ...nova, alvo: regra.alvo } as RegraGerar)
        refrescar()
        return { ok: true, ...gerado }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Não foi possível reativar.' }
    }
}

/** Apaga a regra e o que ela ainda tem por mexer no futuro; o que já aconteceu (ou foi alterado) fica. */
export async function apagarRegra(id: number): Promise<ResultadoRegra> {
    try {
        const { db, regra } = await minhaRegra(id)
        const { ficaram } = await desfazerRegraFutura(db, regra)
        await db.regraAgenda.delete({ where: { id } })
        refrescar()
        return { ok: true, criados: 0, avisos: [], datas: [], ficaram }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Não foi possível apagar.' }
    }
}
