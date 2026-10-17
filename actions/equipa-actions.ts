'use server'

// Equipa de um departamento: mudar as funções de um integrante (em vez de o tirar e voltar a pôr).
// Pode o administrador e quem gere o departamento (o líder ou quem ele nomeou).

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { podeGerirEscalasDoDepartamento } from '@/lib/escalas-permissoes'
import { audit } from '@/lib/audit'

export async function definirFuncoesDoIntegrante(integranteId: number, funcaoIds: number[]) {
    try {
        const sessao = await requireAuth()
        const db = getTenantClient(sessao.tenantId)
        const integrante = await db.integranteDepartamento.findUnique({
            where: { id: Number(integranteId) },
            select: { id: true, departamento_id: true, membro: { select: { id: true, first_name: true, last_name: true } } },
        })
        if (!integrante) return { ok: false, error: 'Pessoa não encontrada nesta equipa.' }
        if (!(await podeGerirEscalasDoDepartamento(sessao, integrante.departamento_id))) {
            return { ok: false, error: 'Só o líder da equipa ou a administração mudam as funções.' }
        }
        // Só funções deste departamento
        const validas = await db.funcaoDepartamento.findMany({
            where: { id: { in: funcaoIds.map(Number) }, departamento_id: integrante.departamento_id },
            select: { id: true, nome: true },
        })
        await db.$transaction([
            db.funcaoSelecionada.deleteMany({ where: { integrante_departamento_id: integrante.id } }),
            db.funcaoSelecionada.createMany({ data: validas.map((f) => ({ integrante_departamento_id: integrante.id, funcao_id: f.id })) }),
        ])
        audit({
            tenant_id: sessao.tenantId, categoria: 'ESCALAS', acao: 'EDITAR', alvo_id: integrante.membro.id, alvo_tipo: 'MEMBRO',
            alvo_nome: `${integrante.membro.first_name} ${integrante.membro.last_name}`.trim(),
            descricao: `Funções na equipa #${integrante.departamento_id}: ${validas.map((f) => f.nome).join(', ') || 'nenhuma'}`,
        }).catch(() => {})
        revalidatePath(`/membros/gestao/equipa/${integrante.departamento_id}`)
        revalidatePath('/admin/configuracoes')
        return { ok: true }
    } catch (err) {
        console.error('[EQUIPA] Funções do integrante:', err)
        return { ok: false, error: 'Não foi possível guardar as funções.' }
    }
}
