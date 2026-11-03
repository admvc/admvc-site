'use server'

// Acrescentar à lista de músicas da igreja uma faixa do CSDB (página Descobrir).
// Só quem pode gerir músicas. Usa a criação que já existe (criarMusica), com o csdb_track_id.

import { getTenantClient } from '@/lib/prisma'
import { requireLouvorPermission } from '@/lib/louvor-permissoes'
import { obterFaixa, CsdbErro } from '@/lib/csdb'
import { dadosDaFaixa, normalizarTitulo } from '@/lib/csdb-dados'
import { criarMusica } from '@/actions/repertorio-app-actions'

export type ResultadoAcrescentar =
    | { ok: true; id: string; ja: boolean }
    | { ok: false; error: string }

export async function acrescentarDoCsdbAction(trackId: number): Promise<ResultadoAcrescentar> {
    try {
        const sessao = await requireLouvorPermission()
        if (!Number.isInteger(trackId) || trackId <= 0) return { ok: false, error: 'Faixa inválida.' }
        const db = getTenantClient(sessao.tenantId)
        const f = dadosDaFaixa(await obterFaixa(trackId, sessao.tenantId))

        // Já existe? (mesma faixa ou mesmo título sem acentos/maiúsculas) → não duplica
        const procurar = { OR: [{ csdb_track_id: trackId }, { titulo_norm: normalizarTitulo(f.titulo) }] }
        const igual = await db.musica.findFirst({ where: procurar, select: { id: true } })
        if (igual) return { ok: true, id: igual.id, ja: true }

        const r = await criarMusica({
            titulo: f.titulo, artista: f.artista, tom: f.tom, bpm: f.bpm,
            link_letra: f.link_letra, link_cifra: f.link_cifra, link_audio: f.link_audio, link_video: f.link_video,
            csdb_track_id: f.csdb_track_id,
        })
        if (r.ok === false) {
            // Corrida: outra pessoa acrescentou entretanto
            if (/já está no repertório/i.test(r.error)) {
                const outra = await db.musica.findFirst({ where: procurar, select: { id: true } })
                if (outra) return { ok: true, id: outra.id, ja: true }
            }
            return { ok: false, error: r.error }
        }
        return { ok: true, id: r.id, ja: false }
    } catch (e) {
        if (e instanceof CsdbErro) return { ok: false, error: e.message }
        return { ok: false, error: e instanceof Error && e.message ? e.message : 'Erro ao acrescentar a música.' }
    }
}
