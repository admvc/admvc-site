'use server'

import { getTenantClient } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole } from '@/lib/auth-utils'
import { requireLouvorPermission } from '@/lib/louvor-permissoes'
import { getTenantIdFromHeaders } from '@/lib/db'

async function getDb() {
    const tenantId = await getTenantIdFromHeaders()
    if (!tenantId) throw new Error('Igreja nao identificada.')
    return getTenantClient(tenantId)
}

// ── SINCRONIZAR ACERVO (actualizado — preserva links existentes) ──────────────
export async function sincronizarAcervoLocal(musicasHolyrics: any[]) {
    try {
        const sessao = await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const db = getTenantClient(sessao.tenantId)
        let inseridas = 0
        let atualizadas = 0

        for (const m of musicasHolyrics) {
            const existe = await db.musica.findFirst({ where: { holyrics_id: String(m.id) } })

            if (existe) {
                // Actualiza titulo e artista MAS preserva os links que o admin preencheu
                await db.musica.update({
                    where: { id: existe.id },
                    data: {
                        titulo: m.title,
                        artista: m.artist || null,
                        // NÃO sobrescreve link_letra, link_cifra, link_audio, link_video, tom, bpm
                    }
                })
                atualizadas++
            } else {
                await db.musica.create({
                    data: {
                        tenant_id: sessao.tenantId,
                        holyrics_id: String(m.id),
                        titulo: m.title,
                        artista: m.artist || null,
                    }
                })
                inseridas++
            }
        }

        return { success: true, inseridas, atualizadas }
    } catch (error: any) {
        return { success: false, error: 'Erro ao sincronizar acervo: ' + error.message }
    }
}

// ── GUARDAR CIFRA INTERNA ────────────────────────────────────────────────────
export async function salvarCifraInternaAction(musicaId: string, cifra: string) {
    try {
        const sessao = await requireLouvorPermission()
        // Guardar a cifra como recebida (o editor já converte no client)
        await getTenantClient(sessao.tenantId).musica.update({
            where: { id: musicaId },
            data: { cifra_interna: cifra?.trim() || null }
        })
        revalidatePath('/louvor')
        revalidatePath('/membros/dashboard')
        return { ok: true }
    } catch (error: any) {
        return { ok: false, error: 'Erro ao guardar cifra.' }
    }
}

// ── RELATÓRIO DE LOUVOR ──

export async function buscarRelatorioLouvorAction(mes: number, ano: number) {
    try {
        await requireAuth()
        const db = await getDb()
        const tenantId = await getTenantIdFromHeaders()

        const inicioMes = new Date(ano, mes - 1, 1)
        const fimMes = new Date(ano, mes, 0, 23, 59, 59)

        // Buscar repertórios do mês com evento + música + escalas do depto louvor
        const repertorios = await db.repertorioEvento.findMany({
            where: {
                tenant_id: tenantId,
                evento: {
                    data: { gte: inicioMes, lte: fimMes }
                }
            },
            include: {
                musica: { select: { id: true, titulo: true, artista: true, tom: true } },
                evento: {
                    select: {
                        id: true, nome: true, data: true,
                        escalas: {
                            where: {
                                departamento: { e_louvor: true }
                            },
                            select: {
                                funcao: true,
                                confirmado: true,
                                membro: { select: { id: true, first_name: true, last_name: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { evento: { data: 'asc' } }
        })

        // Agrupar por evento
        const eventosMap = new Map<number, {
            id: number
            nome: string
            data: string
            musicas: { titulo: string; artista: string | null; tomOriginal: string | null; tomTocado: string }[]
            equipa: { nome: string; funcao: string }[]
        }>()

        repertorios.forEach(rep => {
            const ev = rep.evento
            if (!eventosMap.has(ev.id)) {
                eventosMap.set(ev.id, {
                    id: ev.id,
                    nome: ev.nome,
                    data: ev.data.toISOString(),
                    musicas: [],
                    equipa: ev.escalas
                        .filter(e => e.confirmado)
                        .map(e => ({
                            nome: `${e.membro.first_name} ${e.membro.last_name}`,
                            funcao: e.funcao
                        }))
                })
            }
            eventosMap.get(ev.id)!.musicas.push({
                titulo: rep.musica.titulo,
                artista: rep.musica.artista,
                tomOriginal: rep.musica.tom,
                tomTocado: rep.tom_tocado
            })
        })

        return { ok: true, eventos: Array.from(eventosMap.values()) }
    } catch (error: any) {
        return { ok: false, eventos: [], error: error.message }
    }
}