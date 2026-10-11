// lib/cifra.ts — Transposição de acordes e parsing de cifras

const NOTAS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const NOTAS_BEMOL = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

// Mapa de equivalências (bemol → sustenido)
const NORMALIZAR: Record<string, string> = {
    'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#', 'Cb': 'B',
}

/**
 * Extrai a nota raiz de um acorde. Ex: "Am7" → "A", "F#m" → "F#", "Bb" → "Bb"
 */
function extrairRaiz(acorde: string): { raiz: string; resto: string } {
    let raiz = acorde[0]
    let resto = acorde.slice(1)

    if (resto.startsWith('#') || resto.startsWith('b')) {
        raiz += resto[0]
        resto = resto.slice(1)
    }

    return { raiz, resto }
}

/**
 * Transpõe um único acorde por N semitons.
 */
function transporAcorde(acorde: string, semitons: number): string {
    if (!acorde || acorde.trim() === '') return acorde

    // Lidar com acordes compostos (ex: C/G)
    if (acorde.includes('/')) {
        const [principal, baixo] = acorde.split('/')
        return `${transporAcorde(principal, semitons)}/${transporAcorde(baixo, semitons)}`
    }

    const { raiz, resto } = extrairRaiz(acorde)
    const raizNormal = NORMALIZAR[raiz] || raiz
    const idx = NOTAS.indexOf(raizNormal)

    if (idx === -1) return acorde // Não é um acorde reconhecido

    const novoIdx = ((idx + semitons) % 12 + 12) % 12
    return NOTAS[novoIdx] + resto
}

/**
 * Extrai apenas a nota raiz de um tom/acorde. Ex: "Am" → "A", "F#m7" → "F#", "Bb" → "Bb"
 */
export function notaRaiz(tom: string): string {
    let raiz = tom[0]
    if (tom[1] === '#' || tom[1] === 'b') raiz += tom[1]
    return raiz
}

/**
 * Calcula quantos semitons entre duas notas/acordes.
 * Aceita notas puras ("A", "Bb") ou acordes ("Am", "F#m7").
 */
export function calcularSemitons(de: string, para: string): number {
    const raizDe = notaRaiz(de)
    const raizPara = notaRaiz(para)
    const deNormal = NORMALIZAR[raizDe] || raizDe
    const paraNormal = NORMALIZAR[raizPara] || raizPara
    const idxDe = NOTAS.indexOf(deNormal)
    const idxPara = NOTAS.indexOf(paraNormal)
    if (idxDe === -1 || idxPara === -1) return 0
    return ((idxPara - idxDe) % 12 + 12) % 12
}

/**
 * Transpõe todos os acordes [entre brackets] numa cifra por N semitons.
 * Se a cifra não tiver brackets, tenta transpor acordes soltos no início de palavras.
 */
export function transporCifra(cifra: string, semitons: number): string {
    if (semitons === 0) return cifra

    // Se tem brackets — formato normal
    if (cifra.includes('[')) {
        return cifra.replace(/\[([^\]]+)\]/g, (_, acorde) => {
            return `[${transporAcorde(acorde, semitons)}]`
        })
    }

    // Fallback: transpor acordes soltos (texto plano do CifraClub não convertido)
    return cifra.replace(/\b([A-G][#b]?(?:m|M|dim|aug|sus[24]?|add|maj|min)?[0-9]*(?:\/[A-G][#b]?)?)\b/g, (match) => {
        return transporAcorde(match, semitons)
    })
}

/**
 * Parse da cifra em linhas com segmentos {tipo: 'texto'|'acorde', valor}.
 */
export function parseCifra(cifra: string): { linhas: { tipo: 'texto' | 'acorde'; valor: string }[][] } {
    const linhas = cifra.split('\n').map(linha => {
        const segmentos: { tipo: 'texto' | 'acorde'; valor: string }[] = []
        let restante = linha

        while (restante.length > 0) {
            const idx = restante.indexOf('[')
            if (idx === -1) {
                segmentos.push({ tipo: 'texto', valor: restante })
                break
            }
            if (idx > 0) {
                segmentos.push({ tipo: 'texto', valor: restante.slice(0, idx) })
            }
            const fim = restante.indexOf(']', idx)
            if (fim === -1) {
                segmentos.push({ tipo: 'texto', valor: restante.slice(idx) })
                break
            }
            segmentos.push({ tipo: 'acorde', valor: restante.slice(idx + 1, fim) })
            restante = restante.slice(fim + 1)
        }

        return segmentos
    })

    return { linhas }
}

export const TONS_DISPONIVEIS = NOTAS

// ============================================================================
// IMPORTAÇÃO — Converter formato CifraClub para formato bracket
// ============================================================================

// Regex para validar se um token é um acorde musical
// Aceita: C, Am, F#m7, Bb7, Cmaj7, G7M, Dsus4, Em/B, Cm7(9), Ab7M, Eb/G, Cm7M, etc.
const ACORDE_REGEX = /^[A-G][#b]?(?:m|M|dim|aug|sus[24]?|add[0-9]*|maj|min|°|ø)?[0-9]*(?:M)?(?:\([0-9b#/]+\))?(?:\/[A-G][#b]?)?$/

/**
 * Limpa um token removendo parênteses de agrupamento à volta.
 * Preserva parênteses que fazem parte do acorde: Cm7(9) fica Cm7(9)
 * Mas "(Cm)" fica "Cm" e "(" fica ""
 */
function limparToken(token: string): string {
    let limpo = token
    // Remover ( do início
    while (limpo.startsWith('(')) limpo = limpo.slice(1)
    // Remover ) do final MAS só se não faz parte de um acorde tipo X(9)
    // Se o ) fecha um ( que está no meio do token, manter
    while (limpo.endsWith(')')) {
        // Verificar se há ( correspondente no meio do token (parte do acorde)
        const semUltimo = limpo.slice(0, -1)
        const abertos = (semUltimo.match(/\(/g) || []).length
        const fechados = (semUltimo.match(/\)/g) || []).length
        if (abertos > fechados) {
            // O ) fecha um ( que faz parte do acorde — manter
            break
        }
        limpo = semUltimo
    }
    return limpo
}

/**
 * Verifica se uma linha é exclusivamente de acordes.
 */
function isLinhaDeAcordes(linha: string): boolean {
    const trimmed = linha.trim()
    if (!trimmed) return false

    // Ignorar linhas que começam com tags de secção
    const lower = trimmed.toLowerCase()
    if (lower.startsWith('tom:') || lower.startsWith('capo') ||
        lower.startsWith('[')) return false

    // Remover parênteses e separar por espaço
    const partes = trimmed.split(/\s+/).map(limparToken).filter(p => p.length > 0)
    if (partes.length === 0) return false

    // Contar acordes válidos
    const acordes = partes.filter(p => ACORDE_REGEX.test(p))

    // Todos devem ser acordes (ou strings vazias de parênteses)
    return acordes.length === partes.length && acordes.length > 0
}

/**
 * Extrai acordes com posições de coluna de uma linha.
 * Lida com parênteses: "( Cm  Cm7(9) )" → extrai Cm na posição correcta
 */
function extrairAcordesComPosicao(linha: string): { acorde: string; posicao: number }[] {
    const resultado: { acorde: string; posicao: number }[] = []
    let i = 0
    while (i < linha.length) {
        // Saltar espaços, parênteses, tabs
        if (' \t()'.includes(linha[i])) { i++; continue }
        // Ler token
        let j = i
        while (j < linha.length && !' \t()'.includes(linha[j])) j++
        const token = limparToken(linha.slice(i, j))
        if (token && ACORDE_REGEX.test(token)) {
            resultado.push({ acorde: token, posicao: i })
        }
        i = j
    }
    return resultado
}

/**
 * Mescla uma linha de acordes com a letra abaixo, inserindo [brackets].
 * Encontra o ponto de inserção mais próximo do início de uma palavra.
 */
function mesclarAcordesComLetra(linhaAcordes: string, linhaLetra: string): string {
    const acordes = extrairAcordesComPosicao(linhaAcordes)
    if (acordes.length === 0) return linhaLetra

    // Construir resultado inserindo acordes nas posições correctas
    let resultado = ''
    let letraIdx = 0

    for (let a = 0; a < acordes.length; a++) {
        const { acorde, posicao } = acordes[a]

        // Posição na letra onde inserir (limitada ao comprimento da letra)
        let inserirEm = Math.min(posicao, linhaLetra.length)

        // Ajustar para não cortar no meio de uma palavra — recuar ao espaço anterior
        if (inserirEm < linhaLetra.length && inserirEm > 0 &&
            linhaLetra[inserirEm] !== ' ' && linhaLetra[inserirEm - 1] !== ' ') {
            // Procurar o início da palavra actual
            let k = inserirEm
            while (k > letraIdx && linhaLetra[k - 1] !== ' ') k--
            if (k > letraIdx) inserirEm = k
        }

        // Adicionar letra desde a última posição até aqui
        resultado += linhaLetra.slice(letraIdx, inserirEm)
        resultado += `[${acorde}]`
        letraIdx = inserirEm
    }

    // Resto da letra
    resultado += linhaLetra.slice(letraIdx)
    return resultado
}

/**
 * Verifica se o texto já está no nosso formato bracket (acordes entre []).
 * Distingue entre [Am] (acorde) e [Intro] (tag de secção do CifraClub).
 */
function jaTemAcordesEmBrackets(texto: string): boolean {
    const matches = texto.match(/\[([^\]]+)\]/g)
    if (!matches) return false
    return matches.some(m => {
        const conteudo = m.slice(1, -1).trim()
        return ACORDE_REGEX.test(conteudo)
    })
}

/**
 * Converte texto copiado do CifraClub para formato bracket.
 * Aceita texto já com brackets de acordes (devolve como está).
 * Tags de secção como [Intro], [Refrão] são tratadas como texto normal.
 */
export function importarCifraClub(texto: string): string {
    // Só retorna como está se já tem ACORDES entre brackets (não tags)
    if (jaTemAcordesEmBrackets(texto)) return texto.trim()

    // Pré-processamento: remover tags de secção [Intro], [Refrão], etc.
    // e linhas Tom:, Capo:
    const linhas = texto.split('\n')
    const resultado: string[] = []
    let i = 0

    while (i < linhas.length) {
        const linhaAtual = linhas[i]
        const trimmed = linhaAtual.trim()
        const lower = trimmed.toLowerCase()

        // Ignorar Tom: e Capo:
        if (lower.startsWith('tom:') || lower.startsWith('capo')) {
            i++
            continue
        }

        // Tags de secção [Intro], [Refrão], etc.
        if (trimmed.match(/^\[.+\]/)) {
            const tag = trimmed.match(/^\[[^\]]+\]/)?.[0] || ''
            const semTag = trimmed.replace(/^\[[^\]]+\]\s*/, '')
            if (semTag) {
                const partes = semTag.split(/\s+/).map(limparToken).filter(p => p.length > 0)
                const todosAcordes = partes.length > 0 && partes.every(p => ACORDE_REGEX.test(p))
                if (todosAcordes) {
                    resultado.push(tag + ' ' + partes.map(a => `[${a}]`).join(' '))
                } else {
                    resultado.push(linhaAtual)
                }
            } else {
                resultado.push(tag)
            }
            i++
            continue
        }

        if (isLinhaDeAcordes(linhaAtual)) {
            const proximaLinha = i + 1 < linhas.length ? linhas[i + 1] : ''
            const proximaTrimmed = proximaLinha.trim()

            // A próxima linha é letra? (não vazia, não acordes, não tag de secção)
            const proximaELetra = proximaTrimmed &&
                !isLinhaDeAcordes(proximaLinha) &&
                !proximaTrimmed.match(/^\[.+\]/)

            if (proximaELetra) {
                resultado.push(mesclarAcordesComLetra(linhaAtual, proximaLinha))
                i += 2
            } else {
                // Linha de acordes sem letra (intro, solo, etc.)
                const acordes = extrairAcordesComPosicao(linhaAtual)
                resultado.push(acordes.map(a => `[${a.acorde}]`).join(' '))
                i++
            }
        } else {
            resultado.push(linhaAtual)
            i++
        }
    }

    return resultado.join('\n').trim()
}
