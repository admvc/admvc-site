// Guardar e ler as fotos do album: Cloudflare R2 (S3) em producao.
// Em desenvolvimento, se o R2 ainda nao tiver chaves, os ficheiros ficam em public/fotos-dev
// (fora do git) para se poder ver a galeria antes de ligar o cartao da Cloudflare.
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chaveSegura } from '@/lib/fotos-limites'

const conta = process.env.R2_ACCOUNT_ID
const chaveId = process.env.R2_ACCESS_KEY_ID
const segredo = process.env.R2_SECRET_ACCESS_KEY
const balde = process.env.R2_BUCKET || 'admvc-fotos'

/** Ha chaves do R2 configuradas? (Nao quer dizer que o servico esteja ligado na Cloudflare.) */
export const r2Configurado = () => Boolean(conta && chaveId && segredo)

let cliente: S3Client | null = null
function r2() {
    if (!cliente) {
        cliente = new S3Client({
            region: 'auto',
            endpoint: `https://${conta}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId: chaveId!, secretAccessKey: segredo! },
        })
    }
    return cliente
}

/** Endereco publico de uma foto. Aceita tambem um endereco ou caminho ja feito (dados de teste). */
export function urlDaFoto(chaveOuEndereco: string | null | undefined) {
    if (!chaveOuEndereco) return ''
    if (/^https?:\/\//.test(chaveOuEndereco) || chaveOuEndereco.startsWith('/')) return chaveOuEndereco
    const base = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '')
    if (base) return `${base}/${chaveOuEndereco}`
    // Sem dominio publico ligado: o portal serve a foto (mais lento, mas privado e a funcionar ja).
    return `/api/fotos/ver/${chaveOuEndereco.split('/').map(encodeURIComponent).join('/')}`
}

/** Grava um ficheiro (foto ou miniatura) e devolve a chave guardada. */
export async function guardarFicheiro(chave: string, dados: Buffer, tipo = 'image/jpeg'): Promise<string> {
    if (!chaveSegura(chave)) throw new Error('Chave de ficheiro inválida.')
    if (r2Configurado()) {
        await r2().send(new PutObjectCommand({
            Bucket: balde,
            Key: chave,
            Body: dados,
            ContentType: tipo,
            CacheControl: 'public, max-age=31536000, immutable',
        }))
        return chave
    }
    if (process.env.NODE_ENV === 'production') {
        throw new Error('O R2 nao esta configurado (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY).')
    }
    const destino = path.join(process.cwd(), 'public', 'fotos-dev', ...chave.split('/'))
    await mkdir(path.dirname(destino), { recursive: true })
    await writeFile(destino, dados)
    return chave
}

/** Le um ficheiro do R2 (usado quando ainda nao ha dominio publico configurado). */
export async function lerFicheiro(chave: string) {
    if (!chaveSegura(chave)) return null
    const r = await r2().send(new GetObjectCommand({ Bucket: balde, Key: chave }))
    const bytes = await r.Body?.transformToByteArray()
    return bytes ? Buffer.from(bytes) : null
}

/** Apaga do R2 (ao substituir uma foto ou apagar um album). Nunca apaga originais do PC. Devolve false se falhou. */
export async function apagarFicheiro(chave: string | null | undefined): Promise<boolean> {
    if (!chave || !chaveSegura(chave)) return true   // endereços feitos à mão e caminhos estranhos nunca se apagam
    if (!r2Configurado()) {
        // desenvolvimento: ficheiros em public/fotos-dev
        if (process.env.NODE_ENV === 'production') return true
        await rm(path.join(process.cwd(), 'public', 'fotos-dev', ...chave.split('/')), { force: true }).catch(() => {})
        return true
    }
    try {
        await r2().send(new DeleteObjectCommand({ Bucket: balde, Key: chave }))
        return true
    } catch (e) {
        console.error('[FOTOS] Nao consegui apagar do R2:', chave, e)
        return false
    }
}

/** So para testes locais: le o ficheiro gravado em public/fotos-dev. */
export const lerFicheiroDeDesenvolvimento = (chave: string) =>
    chaveSegura(chave)
        ? readFile(path.join(process.cwd(), 'public', 'fotos-dev', ...chave.split('/')))
        : Promise.resolve(null)
