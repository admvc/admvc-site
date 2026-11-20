'use server'

// Mídia → Rotina do culto: configurar (só a Mídia e a administração) e "Já postei" (escalados no telão, líderes e administração).
import { revalidatePath } from 'next/cache'
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { podeFazerAgenda } from '@/lib/agenda-midia'
import { lerConfig } from '@/lib/rotina-config'
import { registarPostado, souDestinatario } from '@/lib/rotina-alertas'

type Resultado = { ok: true } | { erro: string }

export async function guardarRotina(dados: { funcoes: string; horaAlerta: number; horaManha: number; musica: string; video: string; lumikitAcaoId: string; lumikitTipo: string }): Promise<Resultado> {
    const sessao = await getSessionData()
    if (!sessao || !(await podeFazerAgenda(sessao))) return { erro: 'Só a Mídia e a administração.' }
    const funcoes = String(dados.funcoes ?? '').split(/[,\n;]/).map((f) => f.trim()).filter(Boolean)
    const cfg = lerConfig({ ...dados, funcoes })
    if (Number(dados.horaAlerta) !== cfg.horaAlerta || Number(dados.horaManha) !== cfg.horaManha) return { erro: 'As horas têm de ser números de 0 a 23.' }
    await prisma.tenant.update({ where: { id: sessao.tenantId }, data: { rotina_culto: cfg } })
    revalidatePath('/midia/rotina')
    return { ok: true }
}

export async function jaPostei(eventoId: number): Promise<Resultado> {
    const sessao = await getSessionData()
    if (!sessao) return { erro: 'Entre na sua conta para registar.' }
    if (!Number.isInteger(eventoId) || eventoId <= 0) return { erro: 'Culto inválido.' }
    const culto = await prisma.evento.findFirst({ where: { id: eventoId, tenant_id: sessao.tenantId }, select: { id: true } })
    if (!culto) return { erro: 'Culto não encontrado.' }
    if (!isAdmin(sessao.role) && !(await souDestinatario(sessao.tenantId, eventoId, sessao.membroId))) return { erro: 'Só quem está escalado no telão, ou o líder da equipa.' }
    await registarPostado(sessao.tenantId, eventoId, sessao.membroId)
    revalidatePath('/divulgar'); revalidatePath('/midia/divulgacao'); revalidatePath('/membros/dashboard')
    return { ok: true }
}
