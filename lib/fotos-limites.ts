// Travões de custo do álbum de fotos. TODOS os valores estão aqui: para mudar um limite, muda-se só esta constante.
// Funções puras (sem base de dados) para se poderem testar: tests/fotos-limites.test.ts.

const MB = 1024 * 1024
const GB = 1024 * MB

export type LimitesFotos = {
    totalBytes: number
    avisoBytes: number
    fotosPorAlbum: number
    bytesPorAlbum: number
    ficheiro: number
    pedido: number
    ladoMaximo: number
}

export const LIMITES_FOTOS: LimitesFotos = {
    /** Teto total de espaço por igreja (versões web + miniaturas). */
    totalBytes: 8 * GB,
    /** A partir daqui o ecrã da Mídia e o envio avisam que o espaço está a acabar. */
    avisoBytes: 6 * GB,
    /** Máximo de fotos num álbum (um culto). */
    fotosPorAlbum: 40,
    /** Máximo de espaço num álbum (versões web + miniaturas). */
    bytesPorAlbum: 25 * MB,
    /** Máximo de cada ficheiro enviado (versão web ou miniatura). */
    ficheiro: 4 * MB,
    /** Máximo do pedido inteiro (a Vercel recusa corpos acima de ~4,5 MB). */
    pedido: Math.floor(4.4 * MB),
    /** Lado máximo aceite (px). A versão web leva 2560 px. */
    ladoMaximo: 4000,
}

export type CodigoLimite = 'total' | 'fotos_por_album' | 'espaco_do_album' | 'ficheiro'

export type RecusaTravao = { error: string; limite: CodigoLimite; maximo: number }

export function formatarBytes(bytes: number): string {
    if (bytes >= GB) return `${(bytes / GB).toLocaleString('pt-PT', { maximumFractionDigits: 1 })} GB`
    if (bytes >= MB) return `${(bytes / MB).toLocaleString('pt-PT', { maximumFractionDigits: 1 })} MB`
    if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
    return `${bytes} B`
}

export type EstadoDosTravoes = {
    /** Fotos que o álbum já tem (sem contar a que vai ser substituída, se for o caso). */
    fotosNoAlbum: number
    /** Bytes que o álbum já ocupa. */
    bytesAlbum: number
    /** Bytes que a igreja já ocupa em todos os álbuns. */
    bytesTotal: number
    /** Bytes da foto nova (web + miniatura). */
    novos: number
    /** Se esta foto já existe e vai ser substituída: o que ela ocupa agora. */
    substitui?: number
}

/**
 * Decide se mais uma foto cabe. Devolve `null` se cabe; senão a recusa (HTTP 413) com texto claro em pt-PT.
 * É contado ANTES de aceitar cada foto. Substituir uma foto (retomar um envio) não conta a mais.
 */
export function verificarTravoes(e: EstadoDosTravoes, limites: LimitesFotos = LIMITES_FOTOS): RecusaTravao | null {
    const substitui = e.substitui ?? 0
    const eNova = e.substitui === undefined

    if (eNova && e.fotosNoAlbum >= limites.fotosPorAlbum) {
        return {
            error: `Este álbum já tem ${limites.fotosPorAlbum} fotos, que é o máximo por culto. Escolha menos fotos ou apague algumas no portal (Mídia → Fotos).`,
            limite: 'fotos_por_album',
            maximo: limites.fotosPorAlbum,
        }
    }
    if (e.bytesAlbum - substitui + e.novos > limites.bytesPorAlbum) {
        return {
            error: `Este álbum ultrapassa os ${formatarBytes(limites.bytesPorAlbum)} permitidos por culto. Envie fotos mais leves ou menos fotos.`,
            limite: 'espaco_do_album',
            maximo: limites.bytesPorAlbum,
        }
    }
    if (e.bytesTotal - substitui + e.novos > limites.totalBytes) {
        return {
            error: `O espaço das fotos da igreja está cheio (${formatarBytes(limites.totalBytes)}). Apague álbuns antigos no portal (Mídia → Fotos) e tente outra vez.`,
            limite: 'total',
            maximo: limites.totalBytes,
        }
    }
    return null
}

/** Aviso (texto) quando o espaço passa do limite de aviso; `null` se ainda há folga. */
export function avisoDeEspaco(bytesTotal: number, limites: LimitesFotos = LIMITES_FOTOS): string | null {
    if (bytesTotal < limites.avisoBytes) return null
    return `Atenção: as fotos já ocupam ${formatarBytes(bytesTotal)} de ${formatarBytes(limites.totalBytes)}. Apague álbuns antigos antes de chegar ao limite.`
}

export type NivelEspaco = 'ok' | 'aviso' | 'cheio'

export function nivelDeEspaco(bytesTotal: number, limites: LimitesFotos = LIMITES_FOTOS): NivelEspaco {
    if (bytesTotal >= limites.totalBytes) return 'cheio'
    if (bytesTotal >= limites.avisoBytes) return 'aviso'
    return 'ok'
}

/** Percentagem usada (0–100) para a barra do ecrã da Mídia. */
export function percentagemUsada(bytesTotal: number, limites: LimitesFotos = LIMITES_FOTOS): number {
    return Math.max(0, Math.min(100, (bytesTotal / limites.totalBytes) * 100))
}

/** Os nomes de ficheiro de origem que o .exe manda: sem caminhos nem caracteres estranhos. */
export function origemLimpa(valor: unknown): string {
    return String(valor ?? '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\.{2,}/g, '.').trim().slice(0, 180)
}

/** Chave de armazenamento segura: `<slug>/<aleatório>-web.jpg`. Sem `..`, sem barras a mais. */
export function chaveSegura(chave: string): boolean {
    const partes = chave.split('/')
    if (partes.length < 1 || partes.length > 3) return false
    return partes.every((p) => /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(p) && !p.includes('..'))
}
