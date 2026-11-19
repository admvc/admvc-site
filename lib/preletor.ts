// Preletor das artes: procura nos membros (sem acentos nem maiúsculas) e título pelo cargo.
// Lógica pura, sem base de dados (a ação em app/midia/divulgacao/actions.ts só vai buscar os membros).

export type MembroPreletor = { first_name: string; last_name: string | null; church_role?: string | null; cargos?: { nome: string }[] }
export type SugestaoPreletor = { nome: string; titulo?: string }

/** Minúsculas, sem acentos, só letras/números separados por um espaço. */
export function normalizar(s: string | null | undefined): string {
    return (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/** Título abreviado pelo cargo: Pastor/Pastora → Pr., Evangelista → Ev., Presbítero/a → Pb., Diácono/Diaconisa → Dc. */
export function tituloAbreviado(cargo: string | null | undefined): string {
    const c = normalizar(cargo)
    if (/\bpastor/.test(c)) return 'Pr.'
    if (/\bevangelista/.test(c)) return 'Ev.'
    if (/\bpresb/.test(c)) return 'Pb.'
    if (/\b(diacon|diaconisa)/.test(c)) return 'Dc.'
    return ''
}

/** Título do membro: o 1.º cargo da lista que tenha título, senão o cargo escrito na ficha. */
export function tituloDoMembro(m: Pick<MembroPreletor, 'church_role' | 'cargos'>): string {
    for (const c of m.cargos ?? []) {
        const t = tituloAbreviado(c.nome)
        if (t) return t
    }
    return tituloAbreviado(m.church_role)
}

/** Texto do campo ao escolher: "Pr. Nome Apelido". */
export function textoDoPreletor(s: SugestaoPreletor): string {
    return s.titulo ? `${s.titulo} ${s.nome}` : s.nome
}

/** Procura por nome/apelido: cada palavra escrita tem de ser o princípio de uma palavra do nome. Máx. `max`. */
export function procurarMembros(membros: MembroPreletor[], texto: string, max = 8): SugestaoPreletor[] {
    const termos = normalizar(texto).split(' ').filter(Boolean)
    if (!termos.length || termos.join('').length < 2) return []
    const achados: { s: SugestaoPreletor; nota: number }[] = []
    for (const m of membros) {
        const nome = [m.first_name, m.last_name].map((x) => (x ?? '').trim()).filter(Boolean).join(' ')
        if (!nome) continue
        const chave = normalizar(nome)
        const palavras = chave.split(' ')
        if (!termos.every((t) => palavras.some((p) => p.startsWith(t)))) continue
        const titulo = tituloDoMembro(m)
        achados.push({ s: titulo ? { nome, titulo } : { nome }, nota: chave.startsWith(termos[0]) ? 0 : 1 })
    }
    achados.sort((a, b) => a.nota - b.nota || a.s.nome.localeCompare(b.s.nome, 'pt'))
    return achados.slice(0, max).map((a) => a.s)
}
