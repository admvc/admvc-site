'use server'

// Agenda de um departamento: o líder (ou quem ele nomeou) e a administração marcam, mudam e apagam
// encontros; depois do encontro registam o que se fez e quantos estiveram (para o relatório).
// Horas como hora de Lisboa gravada em UTC (docs/BASE-DE-DADOS.md).

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { podeGerirEscalasDoDepartamento } from '@/lib/escalas-permissoes'
import { tipoAgendaValido, TIPOS_AGENDA_DEPTO } from '@/lib/agenda'
import { sendPushToMembros } from '@/lib/web-push'

type R = { ok: true } | { ok: false; error: string }
const texto = (v: FormDataEntryValue | null, max: number) => String(v ?? '').trim().slice(0, max) || null

async function gestor(deptoId: number) {
    const sessao = await requireAuth()
    if (!(await podeGerirEscalasDoDepartamento(sessao, deptoId))) throw new Error('Só o líder da equipa ou a administração mudam a agenda.')
    return { sessao, db: getTenantClient(sessao.tenantId) }
}
function refrescar(deptoId: number) {
    revalidatePath(`/membros/gestao/equipa/${deptoId}/agenda`)
    revalidatePath('/membros/agenda')
}

export async function guardarEncontro(formData: FormData): Promise<R> {
    try {
        const deptoId = Number(formData.get('departamento_id'))
        const { sessao, db } = await gestor(deptoId)
        const id = Number(formData.get('id')) || null
        const titulo = texto(formData.get('titulo'), 120)
        const dia = String(formData.get('dia') ?? '')
        const hora = String(formData.get('hora') ?? '')
        const horaFim = String(formData.get('hora_fim') ?? '')
        if (!titulo) return { ok: false, error: 'Escreva o que é (ex.: Reunião de equipa).' }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !/^\d{2}:\d{2}$/.test(hora)) return { ok: false, error: 'Escolha o dia e a hora.' }
        const inicio = new Date(`${dia}T${hora}:00Z`)
        const fim = /^\d{2}:\d{2}$/.test(horaFim) ? new Date(`${dia}T${horaFim}:00Z`) : null
        if (fim && fim <= inicio) return { ok: false, error: 'A hora de fim tem de ser depois do início.' }
        const tipo = tipoAgendaValido(formData.get('tipo'))
        const dados = { titulo, tipo, inicio, fim, local: texto(formData.get('local'), 120), descricao: texto(formData.get('descricao'), 1000) }
        if (id) {
            const n = await db.agendaDepartamento.updateMany({ where: { id, departamento_id: deptoId }, data: dados })
            if (!n.count) return { ok: false, error: 'Encontro não encontrado.' }
        } else {
            await db.agendaDepartamento.create({ data: { ...dados, departamento_id: deptoId, tenant_id: sessao.tenantId, criado_por: sessao.membroId } })
            // Avisar a equipa (não quem marcou)
            const equipa = await db.integranteDepartamento.findMany({ where: { departamento_id: deptoId }, select: { membro_id: true } })
            const ids = equipa.map((i) => i.membro_id).filter((m) => m !== sessao.membroId)
            const quando = inicio.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
            if (ids.length) after(() => sendPushToMembros(ids, {
                title: `${TIPOS_AGENDA_DEPTO[tipo]}: ${titulo}`,
                body: `${quando}, às ${hora}${dados.local ? ` · ${dados.local}` : ''}`,
                url: `/membros/gestao/equipa/${deptoId}/agenda`,
            }).catch(() => {}))
        }
        refrescar(deptoId)
        return { ok: true }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Não foi possível guardar.' }
    }
}

export async function registarEncontro(formData: FormData): Promise<R> {
    try {
        const deptoId = Number(formData.get('departamento_id'))
        const { db } = await gestor(deptoId)
        const presentes = formData.get('presentes') ? Math.max(0, Math.min(999, Number(formData.get('presentes')) || 0)) : null
        const n = await db.agendaDepartamento.updateMany({
            where: { id: Number(formData.get('id')), departamento_id: deptoId },
            data: { registo: texto(formData.get('registo'), 3000), presentes },
        })
        if (!n.count) return { ok: false, error: 'Encontro não encontrado.' }
        refrescar(deptoId)
        return { ok: true }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Não foi possível guardar.' }
    }
}

export async function apagarEncontro(id: number, deptoId: number): Promise<R> {
    try {
        const { db } = await gestor(deptoId)
        await db.agendaDepartamento.deleteMany({ where: { id, departamento_id: deptoId } })
        refrescar(deptoId)
        return { ok: true }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Não foi possível apagar.' }
    }
}
