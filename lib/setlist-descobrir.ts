// lib/setlist-descobrir.ts
// Lógica PURA da página "Descobrir": ranking das mais tocadas e marcação das que a igreja já tem.
// Sem rede nem base de dados (tests/setlist-descobrir.test.ts).

import { normalizarTitulo } from '@/lib/csdb-dados'

export interface ExecucaoMusica {
    musicaId: string
    titulo: string
    artista: string | null
    tom: string | null
    ano: number | null
    data: Date
}

export interface MaisTocada {
    musicaId: string
    titulo: string
    artista: string | null
    tom: string | null
    ano: number | null
    vezes: number
    ultimaVez: Date
}

/** Mais tocadas: ordena por nº de cultos, depois pela mais recente, depois pelo título. */
export function maisTocadas(execucoes: ExecucaoMusica[], limite = 20): MaisTocada[] {
    const por = new Map<string, MaisTocada>()
    for (const e of execucoes) {
        const atual = por.get(e.musicaId)
        if (atual) {
            atual.vezes++
            if (e.data > atual.ultimaVez) atual.ultimaVez = e.data
        } else {
            por.set(e.musicaId, { musicaId: e.musicaId, titulo: e.titulo, artista: e.artista, tom: e.tom, ano: e.ano, vezes: 1, ultimaVez: e.data })
        }
    }
    return [...por.values()]
        .sort((a, b) => b.vezes - a.vezes || b.ultimaVez.getTime() - a.ultimaVez.getTime() || a.titulo.localeCompare(b.titulo, 'pt'))
        .slice(0, limite)
}

/** Início da janela de "últimos N meses". */
export function desdeMeses(agora: Date, meses: number): Date {
    const d = new Date(agora)
    d.setMonth(d.getMonth() - meses)
    return d
}

export interface MusicaExistente {
    id: string
    titulo_norm: string | null
    titulo: string
    csdb_track_id: number | null
}

/** A faixa do CSDB já está na lista da igreja (mesma faixa ou mesmo título normalizado)? Devolve a música. */
export function jaNaLista<T extends MusicaExistente>(existentes: T[], faixa: { id: number; titulo: string }): T | null {
    const alvo = normalizarTitulo(faixa.titulo)
    return existentes.find((m) => m.csdb_track_id === faixa.id)
        ?? existentes.find((m) => (m.titulo_norm || normalizarTitulo(m.titulo)) === alvo)
        ?? null
}
