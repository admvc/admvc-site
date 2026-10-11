'use server'

import prisma, { getTenantClient } from '@/lib/prisma'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-utils'
import { invalidateSermoes } from '@/lib/cache'

async function getDb() {
    const h = await headers()
    const tenantId = Number(h.get('x-tenant-id') || 0)
    if (!tenantId) throw new Error('Igreja nao identificada.')
    return getTenantClient(tenantId)
}

// ── SERMÕES ─────────────────────────────────────────────────────────────────

export async function listarSermoes(mes: number, ano: number) {
    try {
        await requireAuth()
        const db = await getDb()

        const inicio = new Date(ano, mes - 1, 1)
        const fim = new Date(ano, mes, 1)

        const sermoes = await db.sermao.findMany({
            where: {
                data_pregacao: { gte: inicio, lt: fim },
            },
            include: {
                pregador: { select: { first_name: true, last_name: true } },
                evento: { select: { nome: true, data: true } },
            },
            orderBy: { data_pregacao: 'desc' },
        })

        return { ok: true, data: sermoes }
    } catch (error: any) {
        console.error('Erro ao listar sermões:', error)
        return { ok: false, error: error.message || 'Erro ao listar sermões.' }
    }
}

export async function buscarSermao(id: string) {
    try {
        await requireAuth()
        const db = await getDb()

        const sermao = await db.sermao.findUnique({
            where: { id },
            include: {
                pregador: { select: { id: true, first_name: true, last_name: true } },
                evento: { select: { id: true, nome: true, data: true } },
                escolasBiblicas: {
                    select: { id: true, titulo: true, data: true },
                },
            },
        })

        if (!sermao) return { ok: false, error: 'Sermão não encontrado.' }

        return { ok: true, data: sermao }
    } catch (error: any) {
        console.error('Erro ao buscar sermão:', error)
        return { ok: false, error: error.message || 'Erro ao buscar sermão.' }
    }
}

export async function criarSermao(formData: FormData) {
    try {
        await requireAuth()
        const db = await getDb()
        const tenantId = Number((await headers()).get('x-tenant-id') || 0)

        const titulo = formData.get('titulo') as string
        const texto_corpo = formData.get('texto_corpo') as string | null
        const referencias_biblicas = formData.get('referencias_biblicas') as string | null
        const notas_privadas = formData.get('notas_privadas') as string | null
        const tagsStr = formData.get('tags') as string | null
        const data_pregacao = formData.get('data_pregacao') as string
        const pregador_id = Number(formData.get('pregador_id'))
        const evento_id_raw = formData.get('evento_id')
        const evento_id = evento_id_raw ? Number(evento_id_raw) : null
        const publicado = formData.get('publicado') === 'true' || formData.get('publicado') === 'on'

        if (!titulo || !data_pregacao || !pregador_id) {
            return { ok: false, error: 'Preencha todos os campos obrigatórios (título, data, pregador).' }
        }

        const sermao = await db.sermao.create({
            data: {
                titulo,
                texto_corpo: texto_corpo || null,
                referencias_biblicas: referencias_biblicas ? JSON.parse(referencias_biblicas) : undefined,
                notas_privadas: notas_privadas || null,
                tags: tagsStr ? JSON.parse(tagsStr) : undefined,
                data_pregacao: new Date(data_pregacao),
                pregador_id,
                evento_id: evento_id || undefined,
                publicado,
                tenant_id: tenantId,
            },
        })

        revalidatePath('/pregacao')
        invalidateSermoes(tenantId).catch(() => {})
        return { ok: true, data: sermao }
    } catch (error: any) {
        console.error('Erro ao criar sermão:', error)
        return { ok: false, error: error.message || 'Erro ao criar sermão.' }
    }
}

export async function atualizarSermao(id: string, formData: FormData) {
    try {
        await requireAuth()
        const db = await getDb()

        const titulo = formData.get('titulo') as string
        const texto_corpo = formData.get('texto_corpo') as string | null
        const referencias_biblicas = formData.get('referencias_biblicas') as string | null
        const notas_privadas = formData.get('notas_privadas') as string | null
        const tagsStr = formData.get('tags') as string | null
        const data_pregacao = formData.get('data_pregacao') as string
        const pregador_id = Number(formData.get('pregador_id'))
        const evento_id_raw = formData.get('evento_id')
        const evento_id = evento_id_raw ? Number(evento_id_raw) : null
        const publicado = formData.get('publicado') === 'true' || formData.get('publicado') === 'on'

        if (!titulo || !data_pregacao || !pregador_id) {
            return { ok: false, error: 'Preencha todos os campos obrigatórios (título, data, pregador).' }
        }

        const sermao = await db.sermao.update({
            where: { id },
            data: {
                titulo,
                texto_corpo: texto_corpo || null,
                referencias_biblicas: referencias_biblicas ? JSON.parse(referencias_biblicas) : undefined,
                notas_privadas: notas_privadas || null,
                tags: tagsStr ? JSON.parse(tagsStr) : undefined,
                data_pregacao: new Date(data_pregacao),
                pregador_id,
                evento_id: evento_id || null,
                publicado,
            },
        })

        revalidatePath('/pregacao')
        return { ok: true, data: sermao }
    } catch (error: any) {
        console.error('Erro ao atualizar sermão:', error)
        return { ok: false, error: error.message || 'Erro ao atualizar sermão.' }
    }
}

export async function removerSermao(id: string) {
    try {
        await requireAuth()
        const db = await getDb()

        await db.sermao.delete({ where: { id } })

        revalidatePath('/pregacao')
        return { ok: true }
    } catch (error: any) {
        console.error('Erro ao remover sermão:', error)
        return { ok: false, error: error.message || 'Erro ao remover sermão.' }
    }
}

export async function partilharSermaoWhatsApp(id: string) {
    try {
        await requireAuth()
        const db = await getDb()

        const sermao = await db.sermao.findUnique({
            where: { id },
            include: {
                pregador: { select: { first_name: true, last_name: true } },
            },
        })

        if (!sermao) return { ok: false, error: 'Sermão não encontrado.' }

        await db.sermao.update({
            where: { id },
            data: { partilhado_whatsapp: true },
        })

        const refs = Array.isArray(sermao.referencias_biblicas)
            ? (sermao.referencias_biblicas as any[])
                .map((r: any) => `${r.livro} ${r.capitulo}:${r.versiculo_inicio}${r.versiculo_fim ? '-' + r.versiculo_fim : ''}`)
                .join(', ')
            : ''

        const dataFormatada = new Date(sermao.data_pregacao).toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        })

        const mensagem = [
            `📖 *${sermao.titulo}*`,
            `🗓 ${dataFormatada}`,
            `🎤 ${sermao.pregador.first_name} ${sermao.pregador.last_name}`,
            refs ? `📜 ${refs}` : '',
            '',
            sermao.texto_corpo
                ? sermao.texto_corpo.replace(/<[^>]*>/g, '').substring(0, 500)
                : '',
        ]
            .filter(Boolean)
            .join('\n')

        revalidatePath('/pregacao')
        return { ok: true, data: mensagem }
    } catch (error: any) {
        console.error('Erro ao partilhar sermão:', error)
        return { ok: false, error: error.message || 'Erro ao partilhar sermão.' }
    }
}

// ── ESCOLA BÍBLICA DOMINICAL (EBD) ─────────────────────────────────────────

export async function listarEBD(mes: number, ano: number) {
    try {
        await requireAuth()
        const db = await getDb()

        const inicio = new Date(ano, mes - 1, 1)
        const fim = new Date(ano, mes, 1)

        const aulas = await db.escolaBiblica.findMany({
            where: {
                data: { gte: inicio, lt: fim },
            },
            include: {
                professor: { select: { first_name: true, last_name: true } },
                sermao: { select: { id: true, titulo: true } },
                _count: { select: { presencas: true } },
            },
            orderBy: { data: 'desc' },
        })

        return { ok: true, data: aulas }
    } catch (error: any) {
        console.error('Erro ao listar EBD:', error)
        return { ok: false, error: error.message || 'Erro ao listar aulas de EBD.' }
    }
}

export async function criarEBD(formData: FormData) {
    try {
        await requireAuth()
        const db = await getDb()
        const tenantId = Number((await headers()).get('x-tenant-id') || 0)

        const titulo = formData.get('titulo') as string
        const tema = formData.get('tema') as string | null
        const data = formData.get('data') as string
        const link_aula = formData.get('link_aula') as string | null
        const conteudo = formData.get('conteudo') as string | null
        const material_apoio = formData.get('material_apoio') as string | null
        const perguntas_discussao = formData.get('perguntas_discussao') as string | null
        const professor_id = Number(formData.get('professor_id'))
        const sermao_id_raw = formData.get('sermao_id')
        const sermao_id = sermao_id_raw ? (sermao_id_raw as string) : null
        const turma_id_raw = formData.get('turma_id')
        const turma_id = turma_id_raw ? (turma_id_raw as string) : null

        if (!titulo || !data || !professor_id) {
            return { ok: false, error: 'Preencha todos os campos obrigatórios (título, data, professor).' }
        }

        const aula = await db.escolaBiblica.create({
            data: {
                titulo,
                tema: tema || null,
                data: new Date(data),
                link_aula: link_aula || null,
                conteudo: conteudo || null,
                material_apoio: material_apoio || null,
                perguntas_discussao: perguntas_discussao ? JSON.parse(perguntas_discussao) : undefined,
                professor_id,
                sermao_id: sermao_id || undefined,
                turma_id: turma_id || undefined,
                tenant_id: tenantId,
            },
        })

        revalidatePath('/pregacao')
        return { ok: true, data: aula }
    } catch (error: any) {
        console.error('Erro ao criar EBD:', error)
        return { ok: false, error: error.message || 'Erro ao criar aula de EBD.' }
    }
}

export async function atualizarEBD(id: string, formData: FormData) {
    try {
        await requireAuth()
        const db = await getDb()

        const titulo = formData.get('titulo') as string
        const tema = formData.get('tema') as string | null
        const data = formData.get('data') as string
        const material_apoio = formData.get('material_apoio') as string | null
        const perguntas_discussao = formData.get('perguntas_discussao') as string | null
        const professor_id = Number(formData.get('professor_id'))
        const sermao_id_raw = formData.get('sermao_id')
        const sermao_id = sermao_id_raw ? (sermao_id_raw as string) : null

        if (!titulo || !data || !professor_id) {
            return { ok: false, error: 'Preencha todos os campos obrigatórios (título, data, professor).' }
        }

        const aula = await db.escolaBiblica.update({
            where: { id },
            data: {
                titulo,
                tema: tema || null,
                data: new Date(data),
                material_apoio: material_apoio || null,
                perguntas_discussao: perguntas_discussao ? JSON.parse(perguntas_discussao) : undefined,
                professor_id,
                sermao_id: sermao_id || null,
            },
        })

        revalidatePath('/pregacao')
        return { ok: true, data: aula }
    } catch (error: any) {
        console.error('Erro ao atualizar EBD:', error)
        return { ok: false, error: error.message || 'Erro ao atualizar aula de EBD.' }
    }
}

export async function removerEBD(id: string) {
    try {
        await requireAuth()
        const db = await getDb()

        await db.escolaBiblica.delete({ where: { id } })

        revalidatePath('/pregacao')
        return { ok: true }
    } catch (error: any) {
        console.error('Erro ao remover EBD:', error)
        return { ok: false, error: error.message || 'Erro ao remover aula de EBD.' }
    }
}

export async function registarPresencasEBD(escolaBiblicaId: string, presenteIds: number[]) {
    try {
        await requireAuth()
        const db = await getDb()

        // Apaga todas as presenças existentes para esta aula
        await db.presencaEBD.deleteMany({
            where: { escola_biblica_id: escolaBiblicaId },
        })

        // Cria as novas presenças
        if (presenteIds.length > 0) {
            await db.presencaEBD.createMany({
                data: presenteIds.map((membroId) => ({
                    escola_biblica_id: escolaBiblicaId,
                    membro_id: membroId,
                    presente: true,
                })),
            })
        }

        revalidatePath('/pregacao')
        return { ok: true }
    } catch (error: any) {
        console.error('Erro ao registar presenças:', error)
        return { ok: false, error: error.message || 'Erro ao registar presenças.' }
    }
}

export async function buscarRelatorioEBD() {
    try {
        await requireAuth()
        const db = await getDb()

        const totalAulas = await db.escolaBiblica.count()
        const totalPresencas = await db.presencaEBD.count({ where: { presente: true } })

        const membrosAssíduos = await db.presencaEBD.groupBy({
            by: ['membro_id'],
            where: { presente: true },
            _count: { membro_id: true },
            orderBy: { _count: { membro_id: 'desc' } },
            take: 10,
        })

        const membrosIds = membrosAssíduos.map((m) => m.membro_id)
        const membros = await db.membro.findMany({
            where: { id: { in: membrosIds } },
            select: { id: true, first_name: true, last_name: true },
        })

        const membrosMap = new Map(membros.map((m) => [m.id, m]))
        const membrosRanking = membrosAssíduos.map((m) => {
            const membro = membrosMap.get(m.membro_id)
            return {
                membro_id: m.membro_id,
                nome: membro ? `${membro.first_name} ${membro.last_name}` : 'Desconhecido',
                presencas: m._count.membro_id,
            }
        })

        const aulas = await db.escolaBiblica.findMany({
            where: { tema: { not: null } },
            select: { tema: true },
        })

        const temaContagem: Record<string, number> = {}
        for (const aula of aulas) {
            if (aula.tema) {
                temaContagem[aula.tema.trim()] = (temaContagem[aula.tema.trim()] || 0) + 1
            }
        }

        const topTemas = Object.entries(temaContagem)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([tema, count]) => ({ tema, count }))

        revalidatePath('/ensino')
        return { ok: true, data: { totalAulas, totalPresencas, membrosRanking, topTemas } }
    } catch (error: any) {
        console.error('Erro ao buscar relatório EBD:', error)
        return { ok: false, error: error.message || 'Erro ao buscar relatório.' }
    }
}

// ── CURSOS EBD ──────────────────────────────────────────────────────────────

export async function listarCursos(ano?: number) {
    try {
        await requireAuth()
        const db = await getDb()

        const cursos = await db.cursoEBD.findMany({
            where: ano ? { ano } : undefined,
            include: {
                turmas: {
                    include: {
                        professores: { select: { id: true, first_name: true, last_name: true } },
                        _count: { select: { matriculas: true, aulas: true, atividades: true } },
                    },
                },
                _count: { select: { turmas: true } },
            },
            orderBy: [{ ano: 'desc' }, { trimestre: 'desc' }],
        })

        return { ok: true, data: cursos }
    } catch (error: any) {
        console.error('Erro ao listar cursos:', error)
        return { ok: false, error: error.message || 'Erro ao listar cursos.' }
    }
}

export async function criarCurso(formData: FormData) {
    try {
        const session = await requireAuth()
        const db = await getDb()
        const tenantId = Number((await headers()).get('x-tenant-id') || 0)
        const titulo = formData.get('titulo') as string
        const descricao = formData.get('descricao') as string | null
        const ementa = formData.get('ementa') as string | null
        const categoria = (formData.get('categoria') as string) || 'EBD'
        const trimestreRaw = formData.get('trimestre') as string | null
        const trimestre = trimestreRaw ? Number(trimestreRaw) : null
        const ano = Number(formData.get('ano'))
        const data_inicio = formData.get('data_inicio') as string
        const data_fim = formData.get('data_fim') as string
        const carga_horariaRaw = formData.get('carga_horaria') as string | null
        const carga_horaria = carga_horariaRaw ? Number(carga_horariaRaw) : null
        const vagas_maximasRaw = formData.get('vagas_maximas') as string | null
        const vagas_maximas = vagas_maximasRaw ? Number(vagas_maximasRaw) : null
        const material_ref = formData.get('material_ref') as string | null
        const nota_minima = Number(formData.get('nota_minima') || 7)
        const presenca_minima = Number(formData.get('presenca_minima') || 75)

        // Curso externo
        const is_externo = formData.get('is_externo') === 'true' || formData.get('is_externo') === 'on'
        const link_externo = formData.get('link_externo') as string | null
        const responsavel_nome = formData.get('responsavel_nome') as string | null
        const responsavel_tel = formData.get('responsavel_tel') as string | null

        // Restricao inscricao
        const tipo_inscricao = (formData.get('tipo_inscricao') as string) || 'LIVRE'
        const departamento_idsRaw = formData.get('departamento_ids') as string | null
        const grupo_idsRaw = formData.get('grupo_ids') as string | null

        // Agendamento
        const data_abertura_raw = formData.get('data_abertura_inscricoes') as string | null

        if (!titulo || !ano || !data_inicio || !data_fim) {
            return { ok: false, error: 'Preencha todos os campos obrigatórios.' }
        }

        const curso = await db.cursoEBD.create({
            data: {
                titulo,
                descricao: descricao || null,
                ementa: ementa || null,
                categoria: categoria as any,
                trimestre: trimestre || undefined,
                ano,
                data_inicio: new Date(data_inicio),
                data_fim: new Date(data_fim),
                carga_horaria: carga_horaria || undefined,
                vagas_maximas: vagas_maximas || undefined,
                material_ref: material_ref || null,
                nota_minima,
                presenca_minima,
                is_externo,
                link_externo: link_externo || null,
                responsavel_nome: responsavel_nome || null,
                responsavel_tel: responsavel_tel || null,
                tipo_inscricao: tipo_inscricao as any,
                departamento_ids: departamento_idsRaw ? JSON.parse(departamento_idsRaw) : undefined,
                grupo_ids: grupo_idsRaw ? JSON.parse(grupo_idsRaw) : undefined,
                data_abertura_inscricoes: data_abertura_raw ? new Date(data_abertura_raw) : undefined,
                criado_por_id: session.membroId,
                tenant_id: tenantId,
            },
        })

        revalidatePath('/ensino')
        return { ok: true, data: curso }
    } catch (error: any) {
        console.error('Erro ao criar curso:', error)
        return { ok: false, error: error.message || 'Erro ao criar curso.' }
    }
}

export async function atualizarCurso(id: string, formData: FormData) {
    try {
        await requireAuth()
        const db = await getDb()

        const titulo = formData.get('titulo') as string
        const descricao = formData.get('descricao') as string | null
        const ementa = formData.get('ementa') as string | null
        const categoria = (formData.get('categoria') as string) || 'EBD'
        const trimestreRaw = formData.get('trimestre') as string | null
        const trimestre = trimestreRaw ? Number(trimestreRaw) : null
        const ano = Number(formData.get('ano'))
        const data_inicio = formData.get('data_inicio') as string
        const data_fim = formData.get('data_fim') as string
        const carga_horariaRaw = formData.get('carga_horaria') as string | null
        const carga_horaria = carga_horariaRaw ? Number(carga_horariaRaw) : null
        const vagas_maximasRaw = formData.get('vagas_maximas') as string | null
        const vagas_maximas = vagas_maximasRaw ? Number(vagas_maximasRaw) : null
        const material_ref = formData.get('material_ref') as string | null
        const nota_minima = Number(formData.get('nota_minima') || 7)
        const presenca_minima = Number(formData.get('presenca_minima') || 75)
        const status = formData.get('status') as string | null
        const is_externo = formData.get('is_externo') === 'true' || formData.get('is_externo') === 'on'
        const link_externo = formData.get('link_externo') as string | null
        const responsavel_nome = formData.get('responsavel_nome') as string | null
        const responsavel_tel = formData.get('responsavel_tel') as string | null
        const tipo_inscricao = (formData.get('tipo_inscricao') as string) || 'LIVRE'
        const data_abertura_raw = formData.get('data_abertura_inscricoes') as string | null

        const curso = await db.cursoEBD.update({
            where: { id },
            data: {
                titulo,
                descricao: descricao || null,
                ementa: ementa || null,
                categoria: categoria as any,
                trimestre: trimestre || null,
                ano,
                data_inicio: new Date(data_inicio),
                data_fim: new Date(data_fim),
                carga_horaria: carga_horaria || null,
                vagas_maximas: vagas_maximas || null,
                material_ref: material_ref || null,
                nota_minima,
                presenca_minima,
                is_externo,
                link_externo: link_externo || null,
                responsavel_nome: responsavel_nome || null,
                responsavel_tel: responsavel_tel || null,
                tipo_inscricao: tipo_inscricao as any,
                data_abertura_inscricoes: data_abertura_raw ? new Date(data_abertura_raw) : null,
                ...(status ? { status: status as any } : {}),
            },
        })

        revalidatePath('/ensino')
        return { ok: true, data: curso }
    } catch (error: any) {
        console.error('Erro ao atualizar curso:', error)
        return { ok: false, error: error.message || 'Erro ao atualizar curso.' }
    }
}

export async function removerCurso(id: string) {
    try {
        await requireAuth()
        const db = await getDb()
        await db.cursoEBD.delete({ where: { id } })
        revalidatePath('/ensino')
        return { ok: true }
    } catch (error: any) {
        console.error('Erro ao remover curso:', error)
        return { ok: false, error: error.message || 'Erro ao remover curso.' }
    }
}

// ── TURMAS EBD ──────────────────────────────────────────────────────────────

export async function criarTurma(formData: FormData) {
    try {
        await requireAuth()
        const db = await getDb()
        const tenantId = Number((await headers()).get('x-tenant-id') || 0)

        const nome = formData.get('nome') as string
        const faixa_etaria = formData.get('faixa_etaria') as string | null
        const curso_id = formData.get('curso_id') as string
        const professor_ids_raw = formData.get('professor_ids') as string
        const professor_ids = professor_ids_raw ? professor_ids_raw.split(',').map(Number).filter(Boolean) : []

        if (!nome || !curso_id || professor_ids.length === 0) {
            return { ok: false, error: 'Preencha todos os campos obrigatórios (incluindo pelo menos 1 professor).' }
        }

        const turma = await db.turmaEBD.create({
            data: {
                nome,
                faixa_etaria: faixa_etaria || null,
                curso_id,
                professores: { connect: professor_ids.map(id => ({ id })) },
                tenant_id: tenantId,
            },
        })

        revalidatePath('/ensino')
        return { ok: true, data: turma }
    } catch (error: any) {
        console.error('Erro ao criar turma:', error)
        return { ok: false, error: error.message || 'Erro ao criar turma.' }
    }
}

export async function removerTurma(id: string) {
    try {
        await requireAuth()
        const db = await getDb()
        await db.turmaEBD.delete({ where: { id } })
        revalidatePath('/ensino')
        return { ok: true }
    } catch (error: any) {
        console.error('Erro ao remover turma:', error)
        return { ok: false, error: error.message || 'Erro ao remover turma.' }
    }
}

export async function buscarTurma(id: string) {
    try {
        await requireAuth()
        const db = await getDb()

        const turma = await db.turmaEBD.findUnique({
            where: { id },
            include: {
                curso: {
                    select: {
                        id: true, titulo: true, categoria: true, trimestre: true, ano: true,
                        carga_horaria: true, nota_minima: true, presenca_minima: true, status: true,
                        data_inicio: true, data_fim: true, data_abertura_inscricoes: true,
                        aprovado_em: true, created_at: true, updated_at: true,
                    },
                },
                professores: { select: { id: true, first_name: true, last_name: true } },
                matriculas: {
                    include: {
                        membro: { select: { id: true, first_name: true, last_name: true } },
                    },
                    orderBy: { membro: { first_name: 'asc' } },
                },
                aulas: {
                    include: {
                        professor: { select: { first_name: true, last_name: true } },
                        _count: { select: { presencas: true } },
                        presencas: { select: { membro_id: true } },
                    },
                    orderBy: { data: 'desc' },
                },
                atividades: {
                    include: {
                        notas: {
                            select: { id: true, atividade_id: true, membro_id: true, nota: true, entregue: true, respostas: true, observacao: true },
                        },
                        _count: { select: { notas: true } },
                    },
                    orderBy: { created_at: 'desc' },
                },
            },
        })

        if (!turma) return { ok: false, error: 'Turma não encontrada.' }
        return { ok: true, data: turma }
    } catch (error: any) {
        console.error('Erro ao buscar turma:', error)
        return { ok: false, error: error.message || 'Erro ao buscar turma.' }
    }
}

// ── MATRÍCULAS ──────────────────────────────────────────────────────────────

export async function matricularAlunos(turmaId: string, membroIds: number[]) {
    try {
        await requireAuth()
        const db = await getDb()
        const tenantId = Number((await headers()).get('x-tenant-id') || 0)

        // Validar que a turma existe e o curso está EM_CURSO
        const turma = await db.turmaEBD.findUnique({
            where: { id: turmaId },
            include: { curso: { select: { status: true } } },
        })
        if (!turma) return { ok: false, error: 'Turma não encontrada.' }
        if (turma.curso.status !== 'EM_CURSO') {
            return { ok: false, error: 'Só é possível matricular alunos em cursos aprovados (EM_CURSO).' }
        }

        // Buscar matrículas existentes
        const existentes = await db.matriculaEBD.findMany({
            where: { turma_id: turmaId },
            select: { membro_id: true },
        })
        const jaMatriculados = new Set(existentes.map(e => e.membro_id))

        const novos = membroIds.filter(id => !jaMatriculados.has(id))
        if (novos.length > 0) {
            await db.matriculaEBD.createMany({
                data: novos.map(membro_id => ({
                    turma_id: turmaId,
                    membro_id,
                    tenant_id: tenantId,
                })),
            })
        }

        revalidatePath('/ensino')
        return { ok: true, data: { matriculados: novos.length } }
    } catch (error: any) {
        console.error('Erro ao matricular alunos:', error)
        return { ok: false, error: error.message || 'Erro ao matricular alunos.' }
    }
}

export async function removerMatricula(turmaId: string, membroId: number) {
    try {
        await requireAuth()
        const db = await getDb()

        await db.matriculaEBD.delete({
            where: { turma_id_membro_id: { turma_id: turmaId, membro_id: membroId } },
        })

        revalidatePath('/ensino')
        return { ok: true }
    } catch (error: any) {
        console.error('Erro ao remover matrícula:', error)
        return { ok: false, error: error.message || 'Erro ao remover matrícula.' }
    }
}

// ── ATIVIDADES E NOTAS ──────────────────────────────────────────────────────

export async function criarAtividade(formData: FormData) {
    try {
        await requireAuth()
        const db = await getDb()
        const tenantId = Number((await headers()).get('x-tenant-id') || 0)

        const titulo = formData.get('titulo') as string
        const tipo = formData.get('tipo') as string
        const descricao = formData.get('descricao') as string | null
        const perguntasRaw = formData.get('perguntas') as string | null
        const data_entrega = formData.get('data_entrega') as string | null
        const peso = Number(formData.get('peso') || 1)
        const nota_maxima = Number(formData.get('nota_maxima') || 10)
        const turma_id = formData.get('turma_id') as string

        if (!titulo || !tipo || !turma_id) {
            return { ok: false, error: 'Preencha todos os campos obrigatórios.' }
        }

        const atividade = await db.atividadeEBD.create({
            data: {
                titulo,
                tipo: tipo as any,
                descricao: descricao || null,
                perguntas: perguntasRaw ? JSON.parse(perguntasRaw) : undefined,
                data_entrega: data_entrega ? new Date(data_entrega) : null,
                peso,
                nota_maxima,
                turma_id,
                tenant_id: tenantId,
            },
        })

        revalidatePath('/ensino')
        return { ok: true, data: atividade }
    } catch (error: any) {
        console.error('Erro ao criar atividade:', error)
        return { ok: false, error: error.message || 'Erro ao criar atividade.' }
    }
}

export async function editarAtividade(formData: FormData) {
    try {
        await requireAuth()
        const db = await getDb()

        const atividadeId = formData.get('atividade_id') as string
        const titulo = formData.get('titulo') as string
        const tipo = formData.get('tipo') as string
        const descricao = formData.get('descricao') as string | null
        const perguntasRaw = formData.get('perguntas') as string | null
        const data_entrega = formData.get('data_entrega') as string | null
        const peso = Number(formData.get('peso') || 1)
        const nota_maxima = Number(formData.get('nota_maxima') || 10)

        if (!atividadeId || !titulo || !tipo) {
            return { ok: false, error: 'Preencha todos os campos obrigatorios.' }
        }

        await db.atividadeEBD.update({
            where: { id: atividadeId },
            data: {
                titulo,
                tipo: tipo as any,
                descricao: descricao || null,
                perguntas: perguntasRaw ? JSON.parse(perguntasRaw) : undefined,
                data_entrega: data_entrega ? new Date(data_entrega) : null,
                peso,
                nota_maxima,
            },
        })

        revalidatePath('/ensino')
        revalidatePath('/admin/formacao/ebd')
        return { ok: true }
    } catch (error: any) {
        console.error('Erro ao editar atividade:', error)
        return { ok: false, error: error.message || 'Erro ao editar atividade.' }
    }
}

export async function removerAtividade(id: string) {
    try {
        await requireAuth()
        const db = await getDb()
        await db.atividadeEBD.delete({ where: { id } })
        revalidatePath('/ensino')
        return { ok: true }
    } catch (error: any) {
        console.error('Erro ao remover atividade:', error)
        return { ok: false, error: error.message || 'Erro ao remover atividade.' }
    }
}

export async function salvarNotas(atividadeId: string, notas: { membro_id: number; nota: number | null; entregue: boolean; observacao?: string }[]) {
    try {
        await requireAuth()
        const db = await getDb()
        const tenantId = Number((await headers()).get('x-tenant-id') || 0)

        for (const n of notas) {
            await db.notaEBD.upsert({
                where: { atividade_id_membro_id: { atividade_id: atividadeId, membro_id: n.membro_id } },
                create: {
                    atividade_id: atividadeId,
                    membro_id: n.membro_id,
                    nota: n.nota,
                    entregue: n.entregue,
                    observacao: n.observacao || null,
                    tenant_id: tenantId,
                },
                update: {
                    nota: n.nota,
                    entregue: n.entregue,
                    observacao: n.observacao || null,
                },
            })
        }

        revalidatePath('/ensino')
        return { ok: true }
    } catch (error: any) {
        console.error('Erro ao salvar notas:', error)
        return { ok: false, error: error.message || 'Erro ao salvar notas.' }
    }
}

// ── RESPONDER ATIVIDADE (pelo aluno) ─────────────────────────────────────────

export async function responderAtividade(atividadeId: string, respostas: any[]) {
    try {
        const session = await requireAuth()
        const db = await getDb()
        const tenantId = Number((await headers()).get('x-tenant-id') || 0)

        // Verificar se a atividade tem perguntas
        const atividade = await db.atividadeEBD.findUnique({ where: { id: atividadeId } })
        if (!atividade) return { ok: false, error: 'Atividade não encontrada.' }

        const perguntas = (atividade.perguntas as any[]) || []

        // Auto-correcção para multipla escolha e verdadeiro/falso
        let acertos = 0
        let totalCorrigiveis = 0
        for (const p of perguntas) {
            if (p.tipo === 'MULTIPLA' || p.tipo === 'VERDADEIRO_FALSO') {
                totalCorrigiveis++
                const resposta = respostas.find((r: any) => r.pergunta_id === p.id)
                if (resposta && String(resposta.resposta) === String(p.correta)) {
                    acertos++
                }
            }
        }

        // Calcular nota automatica se todas as perguntas sao corrigiveis
        const temEscrita = perguntas.some(p => p.tipo === 'ESCRITA')
        const notaAuto = !temEscrita && totalCorrigiveis > 0
            ? (acertos / totalCorrigiveis) * atividade.nota_maxima
            : null

        await db.notaEBD.upsert({
            where: { atividade_id_membro_id: { atividade_id: atividadeId, membro_id: session.membroId } },
            create: {
                atividade_id: atividadeId,
                membro_id: session.membroId,
                respostas: respostas,
                entregue: true,
                nota: notaAuto != null ? Math.round(notaAuto * 100) / 100 : null,
                tenant_id: tenantId,
            },
            update: {
                respostas: respostas,
                entregue: true,
                nota: notaAuto != null ? Math.round(notaAuto * 100) / 100 : undefined,
            },
        })

        revalidatePath('/ensino')
        return { ok: true, nota: notaAuto }
    } catch (error: any) {
        console.error('Erro ao responder atividade:', error)
        return { ok: false, error: error.message || 'Erro ao responder.' }
    }
}

// ── CÁLCULO DE APROVAÇÃO ────────────────────────────────────────────────────

export async function calcularAprovacao(turmaId: string) {
    try {
        await requireAuth()
        const db = await getDb()

        const turma = await db.turmaEBD.findUnique({
            where: { id: turmaId },
            include: {
                curso: { select: { nota_minima: true, presenca_minima: true } },
                matriculas: { select: { membro_id: true } },
                aulas: {
                    select: {
                        id: true,
                        presencas: { select: { membro_id: true, presente: true } },
                    },
                },
                atividades: {
                    select: {
                        id: true,
                        peso: true,
                        nota_maxima: true,
                        notas: { select: { membro_id: true, nota: true } },
                    },
                },
            },
        })

        if (!turma) return { ok: false, error: 'Turma não encontrada.' }

        const totalAulas = turma.aulas.length
        const { nota_minima, presenca_minima } = turma.curso
        const resultados: { membro_id: number; nota_final: number; percentual_presenca: number; aprovado: boolean }[] = []

        for (const mat of turma.matriculas) {
            // Calcular presença
            let presencas = 0
            for (const aula of turma.aulas) {
                const presente = aula.presencas.find(p => p.membro_id === mat.membro_id && p.presente)
                if (presente) presencas++
            }
            const percentualPresenca = totalAulas > 0 ? (presencas / totalAulas) * 100 : 0

            // Calcular média ponderada
            let somaPeso = 0
            let somaNotaPonderada = 0
            for (const atv of turma.atividades) {
                const notaAluno = atv.notas.find(n => n.membro_id === mat.membro_id)
                if (notaAluno?.nota != null) {
                    const notaNormalizada = (notaAluno.nota / atv.nota_maxima) * 10
                    somaNotaPonderada += notaNormalizada * atv.peso
                    somaPeso += atv.peso
                }
            }
            const notaFinal = somaPeso > 0 ? somaNotaPonderada / somaPeso : 0

            const aprovado = notaFinal >= nota_minima && percentualPresenca >= presenca_minima

            // Atualizar matrícula
            await db.matriculaEBD.update({
                where: { turma_id_membro_id: { turma_id: turmaId, membro_id: mat.membro_id } },
                data: {
                    nota_final: Math.round(notaFinal * 100) / 100,
                    percentual_presenca: Math.round(percentualPresenca * 100) / 100,
                    aprovado,
                    status: 'CONCLUIDA',
                },
            })

            resultados.push({
                membro_id: mat.membro_id,
                nota_final: Math.round(notaFinal * 100) / 100,
                percentual_presenca: Math.round(percentualPresenca * 100) / 100,
                aprovado,
            })
        }

        // Verificar se TODAS as turmas do curso já foram calculadas
        // Se sim, marcar o curso como CONCLUIDO
        const todasTurmas = await db.turmaEBD.findMany({
            where: { curso_id: turma.curso_id },
            include: {
                matriculas: { select: { status: true } },
            },
        })
        const todasConcluidas = todasTurmas.every(t =>
            t.matriculas.length > 0 && t.matriculas.every(m => m.status === 'CONCLUIDA')
        )
        if (todasConcluidas) {
            await db.cursoEBD.update({
                where: { id: turma.curso_id },
                data: { status: 'CONCLUIDO' },
            })
        }

        revalidatePath('/ensino')
        revalidatePath('/admin/formacao/ebd')
        return { ok: true, data: resultados }
    } catch (error: any) {
        console.error('Erro ao calcular aprovação:', error)
        return { ok: false, error: error.message || 'Erro ao calcular aprovação.' }
    }
}

// ── WORKFLOW DE APROVAÇÃO ────────────────────────────────────────────────────

export async function aprovarCurso(cursoId: string) {
    try {
        const session = await requireAuth()
        const db = await getDb()

        // Validar que o curso existe e está PLANEADO
        const curso = await db.cursoEBD.findUnique({
            where: { id: cursoId },
            include: { turmas: { select: { id: true } } },
        })
        if (!curso) return { ok: false, error: 'Curso não encontrado.' }
        if (curso.aprovado || curso.status !== 'PLANEADO') {
            return { ok: false, error: 'Este curso já foi aprovado ou não está em estado PLANEADO.' }
        }
        if (curso.turmas.length === 0) {
            return { ok: false, error: 'Crie pelo menos uma turma antes de aprovar o curso.' }
        }

        await db.cursoEBD.update({
            where: { id: cursoId },
            data: {
                aprovado: true,
                aprovado_por_id: session.membroId,
                aprovado_em: new Date(),
                status: 'EM_CURSO',
            },
        })

        revalidatePath('/ensino')
        revalidatePath('/admin/formacao/ebd')
        return { ok: true }
    } catch (error: any) {
        console.error('Erro ao aprovar curso:', error)
        return { ok: false, error: error.message || 'Erro ao aprovar curso.' }
    }
}

export async function agendarAberturaCurso(cursoId: string, dataAbertura: string) {
    try {
        await requireAuth()
        const db = await getDb()

        await db.cursoEBD.update({
            where: { id: cursoId },
            data: {
                data_abertura_inscricoes: new Date(dataAbertura),
            },
        })

        revalidatePath('/ensino')
        return { ok: true }
    } catch (error: any) {
        console.error('Erro ao agendar abertura:', error)
        return { ok: false, error: error.message || 'Erro ao agendar abertura.' }
    }
}

// ── INTERESSE EM CURSO (pelo membro) ────────────────────────────────────────

export async function manifestarInteresse(cursoId: string, mensagem?: string) {
    try {
        const session = await requireAuth()
        const db = await getDb()
        const tenantId = Number((await headers()).get('x-tenant-id') || 0)

        const curso = await db.cursoEBD.findUnique({ where: { id: cursoId } })
        if (!curso) return { ok: false, error: 'Curso não encontrado.' }
        if (!curso.aprovado || curso.status !== 'EM_CURSO') {
            return { ok: false, error: 'Este curso ainda não está disponível para inscrições.' }
        }

        if (curso.data_abertura_inscricoes && new Date() < new Date(curso.data_abertura_inscricoes)) {
            return { ok: false, error: 'As inscrições ainda não abriram.' }
        }

        // Verificar se já manifestou interesse
        const existente = await db.interesseCurso.findUnique({
            where: { curso_id_membro_id: { curso_id: cursoId, membro_id: session.membroId } },
        })
        if (existente) return { ok: false, error: 'Já manifestou interesse neste curso.' }

        await db.interesseCurso.create({
            data: {
                curso_id: cursoId,
                membro_id: session.membroId,
                mensagem: mensagem || null,
                tenant_id: tenantId,
            },
        })

        revalidatePath('/ensino')
        return { ok: true }
    } catch (error: any) {
        console.error('Erro ao manifestar interesse:', error)
        return { ok: false, error: error.message || 'Erro ao manifestar interesse.' }
    }
}

export async function cancelarInteresse(cursoId: string) {
    try {
        const session = await requireAuth()
        const db = await getDb()

        await db.interesseCurso.delete({
            where: { curso_id_membro_id: { curso_id: cursoId, membro_id: session.membroId } },
        })

        revalidatePath('/ensino')
        return { ok: true }
    } catch (error: any) {
        console.error('Erro ao cancelar interesse:', error)
        return { ok: false, error: error.message || 'Erro ao cancelar interesse.' }
    }
}

// ── APROVAR / REJEITAR INTERESSE (pelo gestor) ──────────────────────────────

export async function aprovarInteresse(interesseId: number, turmaId: string) {
    try {
        const session = await requireAuth()
        const db = await getDb()
        const tenantId = Number((await headers()).get('x-tenant-id') || 0)

        const interesse = await db.interesseCurso.findUnique({ where: { id: interesseId } })
        if (!interesse) return { ok: false, error: 'Interesse não encontrado.' }
        if (interesse.status !== 'PENDENTE') return { ok: false, error: 'Este interesse já foi processado.' }

        // Validar que a turma pertence ao curso do interesse
        const turma = await db.turmaEBD.findUnique({ where: { id: turmaId } })
        if (!turma || turma.curso_id !== interesse.curso_id) {
            return { ok: false, error: 'A turma selecionada não pertence a este curso.' }
        }

        // Aprovar interesse
        await db.interesseCurso.update({
            where: { id: interesseId },
            data: {
                status: 'APROVADO',
                aprovado_por_id: session.membroId,
                aprovado_em: new Date(),
                turma_id: turmaId,
            },
        })

        // Matricular o membro na turma
        await db.matriculaEBD.create({
            data: {
                turma_id: turmaId,
                membro_id: interesse.membro_id,
                tenant_id: tenantId,
            },
        })

        revalidatePath('/ensino')
        return { ok: true }
    } catch (error: any) {
        console.error('Erro ao aprovar interesse:', error)
        return { ok: false, error: error.message || 'Erro ao aprovar interesse.' }
    }
}

export async function rejeitarInteresse(interesseId: number) {
    try {
        const session = await requireAuth()
        const db = await getDb()

        await db.interesseCurso.update({
            where: { id: interesseId },
            data: { status: 'REJEITADO', aprovado_por_id: session.membroId, aprovado_em: new Date() },
        })

        revalidatePath('/ensino')
        return { ok: true }
    } catch (error: any) {
        console.error('Erro ao rejeitar interesse:', error)
        return { ok: false, error: error.message || 'Erro ao rejeitar interesse.' }
    }
}
