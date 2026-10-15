// Rotina (ordem) de um culto: os momentos por ordem, quem fica com cada um,
// a duração e uma nota. As horas contam-se a partir da hora do culto, gravada
// como "hora de parede" (por isso tudo aqui usa UTC).

export type ItemRotina = {
    momento: string
    membro_id?: number | null // membro da igreja: o título vem do cargo
    nome?: string | null // pessoa de fora, escrita à mão (já com o título, se tiver)
    duracao?: number | null // minutos
    nota?: string | null // na Palavra: o tema
    texto?: string | null // na Palavra: o texto bíblico (ex.: Mateus 25:14-30)
}

/** Momentos mais comuns (sugestões ao escrever). */
export const MOMENTOS = [
    'Louvor', 'Boas-vindas', 'Oração', 'Oração pela Família', 'Leitura bíblica',
    'Avisos', 'Dízimos e ofertas', 'Testemunho', 'Louvor especial', 'Momento das crianças',
    'Santa Ceia', 'Palavra', 'Apelo', 'Encerramento', 'Bênção apostólica',
]

const MAX_ITENS = 40

function texto(v: unknown, max: number): string {
    return typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : ''
}

/** Limpa o que vem do formulário (ou da base): só momentos com nome, campos válidos. */
export function normalizarItens(entrada: unknown): ItemRotina[] {
    if (!Array.isArray(entrada)) return []
    const itens: ItemRotina[] = []
    for (const bruto of entrada.slice(0, MAX_ITENS)) {
        if (!bruto || typeof bruto !== 'object') continue
        const b = bruto as Record<string, unknown>
        const momento = texto(b.momento, 80)
        if (!momento) continue
        const membro = Number(b.membro_id)
        const membro_id = Number.isInteger(membro) && membro > 0 ? membro : null
        const nome = membro_id ? null : texto(b.nome, 80) || null
        const dur = Math.round(Number(b.duracao))
        const duracao = Number.isFinite(dur) && dur > 0 && dur <= 600 ? dur : null
        const nota = texto(b.nota, 200) || null
        const tb = ePalavra(momento) ? texto(b.texto, 80) || null : null
        itens.push({ momento, membro_id, nome, duracao, nota, ...(tb ? { texto: tb } : {}) })
    }
    return itens
}

/** O momento da pregação ("Palavra", "Pregação", "Mensagem", "Ministração da Palavra"). */
export function ePalavra(momento: string | null | undefined): boolean {
    return /palavra|prega[cç][aã]o|mensagem|ministra[cç][aã]o/i.test(momento ?? '')
}

/** O primeiro momento de pregação da rotina (com a posição). */
export function palavraDe(itens: ItemRotina[]): ItemRotina | null {
    return itens.find((i) => ePalavra(i.momento)) ?? null
}

/** Para comparar temas e textos: sem acentos, maiúsculas, pontuação nem espaços a mais. */
export function chaveDeComparacao(s: string | null | undefined): string {
    return (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9:]+/g, ' ').trim()
}

export type PregacaoFeita = { data: string; culto: string; quem: string; tema: string | null; texto: string | null }

/**
 * Pregações anteriores com o mesmo tema ou o mesmo texto bíblico (para avisar
 * antes de repetir). Compara sem acentos nem pontuação.
 */
export function repeticoes(item: { nota?: string | null; texto?: string | null }, feitas: PregacaoFeita[]): PregacaoFeita[] {
    const tema = chaveDeComparacao(item.nota)
    const tb = chaveDeComparacao(item.texto)
    if (!tema && !tb) return []
    return feitas.filter((f) => (tema && chaveDeComparacao(f.tema) === tema) || (tb && chaveDeComparacao(f.texto) === tb))
}

/** Título a partir do cargo do cadastro (ex.: "Pastor(a)" + Feminino → "Pastora"). */
export function tituloDoCargo(cargo: string | null | undefined, sexo?: string | null): string {
    const c = (cargo ?? '').toLowerCase()
    const f = (sexo ?? '').toLowerCase().startsWith('f')
    if (/pastor/.test(c)) return f ? 'Pastora' : 'Pastor'
    if (/evangelista/.test(c)) return 'Evangelista'
    if (/mission/.test(c)) return f ? 'Missionária' : 'Missionário'
    if (/presb/.test(c)) return f ? 'Presbítera' : 'Presbítero'
    if (/di[aá]con/.test(c)) return f ? 'Diaconisa' : 'Diácono'
    if (/obreir/.test(c)) return f ? 'Obreira' : 'Obreiro'
    return ''
}

export type MembroRotina = { id: number; first_name: string; last_name: string | null; church_role?: string | null; gender?: string | null }

/** "Pastor Rafael Castro" (membro) ou o nome escrito à mão. */
export function responsavel(item: ItemRotina, membros: Map<number, MembroRotina>): string {
    if (item.membro_id) {
        const m = membros.get(item.membro_id)
        if (!m) return ''
        const nome = [m.first_name, m.last_name].filter(Boolean).join(' ')
        const titulo = tituloDoCargo(m.church_role, m.gender)
        return titulo ? `${titulo} ${nome}` : nome
    }
    return item.nome ?? ''
}

function hhmm(min: number): string {
    const m = ((min % 1440) + 1440) % 1440
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/**
 * Hora prevista de cada momento ("19:00", "19:35"…). Só se sabe enquanto os
 * momentos anteriores tiverem duração; a partir daí fica null.
 */
export function horasPrevistas(inicioIso: string, itens: ItemRotina[]): (string | null)[] {
    const d = new Date(inicioIso)
    let atual: number | null = d.getUTCHours() * 60 + d.getUTCMinutes()
    return itens.map((it) => {
        const h = atual === null ? null : hhmm(atual)
        atual = atual !== null && it.duracao ? atual + it.duracao : null
        return h
    })
}

/** Duração total, se todos os momentos tiverem duração. */
export function duracaoTotal(itens: ItemRotina[]): number | null {
    if (!itens.length || itens.some((i) => !i.duracao)) return null
    return itens.reduce((s, i) => s + (i.duracao ?? 0), 0)
}

export function minutosPorExtenso(min: number): string {
    if (min < 60) return `${min} min`
    const h = Math.floor(min / 60), r = min % 60
    return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`
}

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** "Domingo, 19 de outubro, às 18:00" (hora de parede). */
export function quandoPorExtenso(iso: string): string {
    const d = new Date(iso)
    const dia = DIAS[d.getUTCDay()]
    return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}, às ${hhmm(d.getUTCHours() * 60 + d.getUTCMinutes())}`
}

/** O texto para partilhar (WhatsApp), igual a uma lista escrita à mão. */
export function textoDaRotina(evento: { nome: string; data: string }, itens: ItemRotina[], membros: Map<number, MembroRotina>): string {
    const horas = horasPrevistas(evento.data, itens)
    const linhas = [`*${evento.nome}*`, quandoPorExtenso(evento.data), '']
    itens.forEach((it, i) => {
        const quem = responsavel(it, membros)
        let l = `• ${horas[i] ? `${horas[i]} ` : ''}${it.momento}`
        if (it.duracao) l += ` (${minutosPorExtenso(it.duracao)})`
        if (quem) l += ` — ${quem}`
        if (it.nota) l += ` — _${it.nota}_`
        if (it.texto) l += ` (${it.texto})`
        linhas.push(l)
    })
    return linhas.join('\n')
}

/** Para começar uma rotina a partir de outra (modelo ou culto anterior): tira as notas, que são de cada culto. */
export function semNotas(itens: ItemRotina[]): ItemRotina[] {
    return itens.map((i) => ({ ...i, nota: null }))
}
