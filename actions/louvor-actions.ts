'use server'

import { getTenantClient } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole } from '@/lib/auth-utils'
import { requireLouvorPermission, podeUsarHolyrics } from '@/lib/louvor-permissoes'
import { getTenantIdFromHeaders } from '@/lib/db'
import { normalizarTitulo } from '@/lib/csdb-dados'
import { musicaParaLigar, jaExisteNoPortal, type MusicaDoPortal } from '@/lib/holyrics-cliente'

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
        let ligadas = 0
        let ignoradas = 0

        // Uma leitura so: as musicas do portal (para comparar pelo titulo normalizado, sem acentos)
        const portal: MusicaDoPortal[] = await db.musica.findMany({
            select: { id: true, titulo: true, artista: true, titulo_norm: true, holyrics_id: true },
        })

        for (const m of musicasHolyrics) {
            if (!m || typeof m.title !== 'string' || !m.title.trim() || m.id == null) continue
            const existe = await db.musica.findFirst({ where: { holyrics_id: String(m.id) } })

            if (!existe) {
                // Mesma musica ja no portal (outro acento/maiusculas) e ainda sem ligacao: liga em vez de duplicar
                const mesma = musicaParaLigar(portal, m.title, m.artist)
                if (mesma) {
                    await db.musica.update({
                        where: { id: mesma.id },
                        data: { holyrics_id: String(m.id), titulo_norm: normalizarTitulo(mesma.titulo), ...(mesma.artista ? {} : { artista: m.artist || null }) },
                    })
                    mesma.holyrics_id = String(m.id)
                    ligadas++
                    continue
                }
                // Ja existe ligada a outra entrada do Holyrics com o mesmo titulo: nao cria duplicado
                if (jaExisteNoPortal(portal, m.title, m.artist)) { ignoradas++; continue }
            }

            if (existe) {
                // Actualiza titulo e artista MAS preserva os links que o admin preencheu
                await db.musica.update({
                    where: { id: existe.id },
                    data: {
                        titulo: m.title,
                        titulo_norm: normalizarTitulo(m.title),
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
                        titulo_norm: normalizarTitulo(m.title),
                        artista: m.artist || null,
                    }
                })
                portal.push({ id: 'novo', titulo: m.title, artista: m.artist || null, titulo_norm: normalizarTitulo(m.title), holyrics_id: String(m.id) })
                inseridas++
            }
        }

        return { success: true, inseridas, atualizadas, ligadas, ignoradas }
    } catch (error: any) {
        return { success: false, error: 'Erro ao sincronizar acervo: ' + error.message }
    }
}

// ── LIGAR MUSICAS AO HOLYRICS ────────────────────────────────────────────────
// Ao enviar um culto, as musicas sem ligacao sao procuradas pelo titulo no
// Holyrics; guarda-se o que se encontrou para a proxima vez ir direto.
// So preenche ligacoes vazias (nunca troca uma que ja exista).
export async function ligarMusicasAoHolyrics(pares: { musicaId: string; holyricsId: string }[]) {
    const sessao = await requireAuth()
    if (!(await podeUsarHolyrics(sessao))) return { ok: false }
    const db = getTenantClient(sessao.tenantId)
    for (const p of pares.slice(0, 100)) {
        // Outra musica do repertorio ja pode ter esta ligacao (unica por igreja)
        await db.musica.updateMany({
            where: { id: String(p.musicaId), holyrics_id: null },
            data: { holyrics_id: String(p.holyricsId) },
        }).catch(() => {})
    }
    return { ok: true }
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
                musica: { select: { id: true, titulo: true, artista: true, tom: true, ano: true, compositores: true } },
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
            musicas: { titulo: string; artista: string | null; tomOriginal: string | null; tomTocado: string; ano: number | null; compositores: string[] }[]
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
                tomTocado: rep.tom_tocado,
                ano: rep.musica.ano,
                compositores: rep.musica.compositores,
            })
        })

        return { ok: true, eventos: Array.from(eventosMap.values()) }
    } catch (error: any) {
        return { ok: false, eventos: [], error: error.message }
    }
}