/**
 * Copias guardadas pela propria app no Blob privado: a que se grava sozinha
 * antes de cada restauro, para um restauro errado se poder desfazer.
 * Igual ao do Atelie.
 *
 * So se leem atraves da app (`/super-admin/copia/guardada`), com sessao de
 * Super Admin.
 *
 * Ficam num store PRIVADO proprio (`BLOB_COPIAS_TOKEN`): o das imagens
 * (`BLOB_READ_WRITE_TOKEN`) e publico, e no Vercel Blob cada store e todo
 * publico ou todo privado. Sem `BLOB_COPIAS_TOKEN`, usa o outro (como antes).
 *
 * Em testes (`COPIAS_PASTA_LOCAL=pasta`) ficam numa pasta do computador: os
 * tokens do .env sao os da producao, e uma base de teste nao deve escrever la.
 *
 * Fora de `actions/` de proposito: grava sem validar quem pede.
 */

import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { get, list, put } from '@vercel/blob'

export const PREFIXO_COPIAS = 'copias/'

export interface CopiaGuardada {
    caminho: string
    gravadaEm: Date
    tamanho: number
}

const pastaLocal = () => process.env.COPIAS_PASTA_LOCAL || null
const tokenCopias = () => process.env.BLOB_COPIAS_TOKEN || process.env.BLOB_READ_WRITE_TOKEN || ''
const blobConfigurado = () => Boolean(tokenCopias())

/** Grava a copia e devolve o caminho. Sem onde a guardar: rebenta. */
export async function guardarCopia(json: string, motivo: string): Promise<string> {
    const quando = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
    const nome = `${motivo}-${quando}`
    const local = pastaLocal()
    if (local) {
        await mkdir(local, { recursive: true })
        const ficheiro = `${nome}-${randomBytes(4).toString('hex')}.json`
        await writeFile(join(local, ficheiro), json, 'utf8')
        return PREFIXO_COPIAS + ficheiro
    }
    if (!blobConfigurado()) {
        throw new Error('Falta o armazenamento de ficheiros (Blob): sem ele não há onde guardar a cópia de antes, e não se restaura sem ela.')
    }
    const r = await put(`${PREFIXO_COPIAS}${nome}.json`, json, {
        access: 'private',
        addRandomSuffix: true,
        contentType: 'application/json',
        token: tokenCopias(),
    })
    return r.pathname
}

/** As guardadas, mais recentes primeiro. */
export async function listarCopias(): Promise<CopiaGuardada[]> {
    const local = pastaLocal()
    if (local) {
        const nomes = await readdir(local).catch(() => [] as string[])
        const out = await Promise.all(nomes.filter((n) => n.endsWith('.json')).map(async (n) => {
            const s = await stat(join(local, n))
            return { caminho: PREFIXO_COPIAS + n, gravadaEm: s.mtime, tamanho: s.size }
        }))
        return out.sort((a, b) => b.gravadaEm.getTime() - a.gravadaEm.getTime())
    }
    if (!blobConfigurado()) return []
    const out: CopiaGuardada[] = []
    let cursor: string | undefined
    do {
        const r = await list({ prefix: PREFIXO_COPIAS, cursor, limit: 1000, token: tokenCopias() })
        out.push(...r.blobs.map((b) => ({ caminho: b.pathname, gravadaEm: new Date(b.uploadedAt), tamanho: b.size })))
        cursor = r.hasMore ? r.cursor : undefined
    } while (cursor)
    return out.sort((a, b) => b.gravadaEm.getTime() - a.gravadaEm.getTime())
}

/** So caminhos desta pasta, sem voltas: o pedido nao escolhe outro ficheiro do Blob. */
export function eCaminhoDeCopia(caminho: string): boolean {
    return /^copias\/[a-z0-9-]+\.json$/i.test(caminho)
}

/** O conteudo da copia, para descarregar; null se nao existe. */
export async function lerCopiaGuardada(caminho: string): Promise<ReadableStream | Buffer | null> {
    if (!eCaminhoDeCopia(caminho)) return null
    const local = pastaLocal()
    if (local) {
        return readFile(join(local, caminho.slice(PREFIXO_COPIAS.length))).catch(() => null)
    }
    if (!blobConfigurado()) return null
    const r = await get(caminho, { access: 'private', token: tokenCopias() })
    return r && r.statusCode === 200 ? r.stream : null
}
