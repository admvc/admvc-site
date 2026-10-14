// Mapa das famílias (só administradores): um ponto por casa. As coordenadas de
// cada membro guardam a "impressão" da morada com que foram calculadas; se a
// morada mudar, o membro volta a "por localizar" (sem mexer em quem grava moradas).

export interface MoradaMembro {
    address_1: string | null
    address_number: string | null
    postal_code: string | null
    neighborhood: string | null
    id_city: string | null
}

const limpo = (t: string | null | undefined) => (t ?? '').trim().replace(/\s+/g, ' ')

/** A impressão da morada (o que, se mudar, obriga a localizar de novo). */
export function chaveMorada(m: MoradaMembro): string {
    return [m.address_1, m.address_number, m.postal_code, m.neighborhood, m.id_city]
        .map(t => limpo(t).toLowerCase()).join('|')
}

export function temMorada(m: MoradaMembro): boolean {
    return !!(limpo(m.address_1) || limpo(m.postal_code) || limpo(m.neighborhood))
}

/**
 * O que perguntar ao OpenStreetMap, do mais exato ao menos (como o Censo):
 * rua e número; só o código postal; só o bairro.
 */
export function consultasDeMorada(m: MoradaMembro, cidadePadrao = 'Figueira da Foz'): Array<{ q: string; fonte: 'morada' | 'codigo-postal' | 'bairro' }> {
    const cidade = limpo(m.id_city) || cidadePadrao
    // O número só faz sentido junto da rua
    const rua = limpo(m.address_1) ? [limpo(m.address_1), limpo(m.address_number)].filter(Boolean).join(' ') : ''
    const cpBruto = limpo(m.postal_code)
    const cp = /^\d{4}-?\d{3}$/.test(cpBruto) ? cpBruto.replace(/^(\d{4})-?(\d{3})$/, '$1-$2') : cpBruto
    const bairro = limpo(m.neighborhood)
    const out: Array<{ q: string; fonte: 'morada' | 'codigo-postal' | 'bairro' }> = []
    if (rua) out.push({ q: [rua, cp, cidade].filter(Boolean).join(', '), fonte: 'morada' })
    if (/^\d{4}-\d{3}$/.test(cp)) out.push({ q: `${cp}, ${cidade}`, fonte: 'codigo-postal' })
    if (bairro) out.push({ q: `${bairro}, ${cidade}`, fonte: 'bairro' })
    return out
}

export interface MembroMapa extends MoradaMembro {
    id: number
    first_name: string
    last_name: string
    familia_id: number | null
    familia_nome: string | null
    congregacao_id: number | null
    latitude: number | null
    longitude: number | null
    geo_fonte: string | null
    geo_chave: string | null
    geo_falhou: boolean
    em_grupo: boolean
}

/** Precisa de ser localizado? (tem morada e o ponto falta ou é de outra morada) */
export function porLocalizar(m: MembroMapa): boolean {
    if (!temMorada(m)) return false
    const chave = chaveMorada(m)
    if (m.geo_chave === chave) return !m.geo_falhou && (m.latitude == null || m.longitude == null)
    return true
}

export interface PontoFamilia {
    chave: string               // "f12" (família) ou "m7" (membro sem família)
    nome: string
    familia_id: number | null
    pessoas: number
    nomes: string[]
    bairro: string | null
    congregacao_id: number | null
    lat: number
    lng: number
    fonte: string | null
    sem_grupo: boolean           // ninguém da casa está num grupo
}

/**
 * Um ponto por casa: membros da mesma família juntos; quem não tem família é
 * uma casa sozinho. A posição é a do primeiro membro com coordenadas válidas
 * (a do Censo primeiro, que foi confirmada pela própria família).
 */
export function pontosDasFamilias(membros: MembroMapa[]): { pontos: PontoFamilia[]; semLocalizacao: MembroMapa[][] } {
    const casas = new Map<string, MembroMapa[]>()
    for (const m of membros) {
        const k = m.familia_id ? `f${m.familia_id}` : `m${m.id}`
        casas.set(k, [...(casas.get(k) ?? []), m])
    }
    const valido = (m: MembroMapa) => m.latitude != null && m.longitude != null && m.geo_chave === chaveMorada(m)
    const pontos: PontoFamilia[] = []
    const semLocalizacao: MembroMapa[][] = []
    for (const [chave, gente] of casas) {
        const comPos = gente.filter(valido).sort((a, b) => Number(b.geo_fonte === 'censo') - Number(a.geo_fonte === 'censo') || a.id - b.id)
        const ref = comPos[0]
        if (!ref) { semLocalizacao.push(gente); continue }
        const primeiro = gente[0]
        pontos.push({
            chave,
            nome: primeiro.familia_id ? `Família ${primeiro.familia_nome ?? ''}`.trim() : `${primeiro.first_name} ${primeiro.last_name}`.trim(),
            familia_id: primeiro.familia_id,
            pessoas: gente.length,
            nomes: gente.map(m => `${m.first_name} ${m.last_name}`.trim()),
            bairro: limpo(ref.neighborhood) || gente.map(m => limpo(m.neighborhood)).find(Boolean) || null,
            congregacao_id: ref.congregacao_id ?? gente.find(m => m.congregacao_id)?.congregacao_id ?? null,
            lat: ref.latitude!, lng: ref.longitude!, fonte: ref.geo_fonte,
            sem_grupo: !gente.some(m => m.em_grupo),
        })
    }
    return { pontos, semLocalizacao }
}

/** Tabela por bairro: casas, pessoas e casas sem grupo. */
export function resumoPorBairro(pontos: PontoFamilia[]) {
    const m = new Map<string, { casas: number; pessoas: number; semGrupo: number }>()
    for (const p of pontos) {
        const b = p.bairro || 'Sem bairro'
        const r = m.get(b) ?? { casas: 0, pessoas: 0, semGrupo: 0 }
        r.casas++; r.pessoas += p.pessoas; if (p.sem_grupo) r.semGrupo++
        m.set(b, r)
    }
    return [...m].map(([bairro, r]) => ({ bairro, ...r })).sort((a, b) => b.pessoas - a.pessoas || a.bairro.localeCompare(b.bairro, 'pt'))
}
