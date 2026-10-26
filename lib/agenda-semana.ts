// "Programação da semana" com cartões e fotos (como o exemplo Agenda3): um cartão por dia com eventos, o nome do dia
// em grande, o evento e a hora numa cápsula e, se houver, quem tem a Palavra com a foto.
// De onde vem cada coisa: eventos = Agenda da igreja; preletor e foto = o kit de Divulgação do culto (receita) ou,
// sem kit, a pregação marcada para o culto (nome e foto do perfil do pregador). Tudo se pode mudar à mão (editarSemana).
import { getTenantClient } from '@/lib/prisma'
import { horaCurta } from '@/lib/agenda-midia'

export type FotoCartao = { url: string; recorte: boolean; w?: number; h?: number; foco?: string }
export type Cartao = {
    dia: string            // AAAA-MM-DD
    nomeDia: string        // "Terça"
    linhas: string[]       // "Culto da Família | 10h e 18h"
    preletor: string | null
    foto: FotoCartao | null
}

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const MAX_CARTOES = 6

// Só fotos do nosso Blob público (o servidor vai buscá-las para desenhar)
export const URL_BLOB_PUBLICO = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/[^\s"'<>]+$/i

/** "10h e 18h", "10h, 15h e 18h" */
export function juntarHoras(horas: string[]): string {
    const u = [...new Set(horas)]
    return u.length <= 1 ? (u[0] ?? '') : `${u.slice(0, -1).join(', ')} e ${u[u.length - 1]}`
}

type EventoSemana = { id: number; nome: string; data: Date }
type ExtraEvento = { preletor: string | null; foto: FotoCartao | null }

/** Junta os eventos por dia; no mesmo dia, os do mesmo nome numa só linha com as horas ("Culto | 10h e 18h"). */
export function montarCartoes(eventos: EventoSemana[], extras: Map<number, ExtraEvento>): Cartao[] {
    const dias = new Map<string, EventoSemana[]>()
    for (const e of [...eventos].sort((a, b) => a.data.getTime() - b.data.getTime())) {
        const dia = e.data.toISOString().slice(0, 10)
        dias.set(dia, [...(dias.get(dia) ?? []), e])
    }
    return [...dias.entries()].map(([dia, lista]) => {
        const porNome = new Map<string, string[]>()
        for (const e of lista) porNome.set(e.nome.trim(), [...(porNome.get(e.nome.trim()) ?? []), horaCurta(e.data)])
        const comExtra = lista.map((e) => extras.get(e.id)).find((x) => x?.preletor || x?.foto)
        return {
            dia,
            nomeDia: DIAS[new Date(`${dia}T12:00:00Z`).getUTCDay()],
            linhas: [...porNome.entries()].map(([nome, horas]) => `${nome} | ${juntarHoras(horas)}`),
            preletor: comExtra?.preletor ?? null,
            foto: comExtra?.foto ?? null,
        }
    })
}

function fotoDaReceita(x: unknown): FotoCartao | null {
    const o = (x && typeof x === 'object' ? x : null) as Record<string, unknown> | null
    if (!o || typeof o.url !== 'string' || !URL_BLOB_PUBLICO.test(o.url)) return null
    const n = (v: unknown) => (typeof v === 'number' && v > 0 && v < 20000 ? v : undefined)
    return { url: o.url, recorte: o.recorte === true, w: n(o.w), h: n(o.h), foco: typeof o.foco === 'string' ? o.foco : undefined }
}

/** Os cartões da semana que começa em `segunda` (AAAA-MM-DD), da casa `cong` (ou todas). */
export async function cartoesDaSemana(tenantId: number, segunda: string, cong: number | null): Promise<Cartao[]> {
    const db = getTenantClient(tenantId)
    const de = new Date(`${segunda}T00:00:00Z`)
    const eventos = await db.evento.findMany({
        where: { data: { gte: de, lt: new Date(de.getTime() + 7 * 86400000) }, ...(cong ? { OR: [{ congregacao_id: cong }, { congregacao_id: null }] } : {}) },
        orderBy: { data: 'asc' },
        select: {
            id: true, nome: true, data: true,
            kitDivulgacao: { select: { receita: true } },
            sermoes: { take: 1, orderBy: { created_at: 'desc' }, select: { pregador: { select: { first_name: true, last_name: true, avatar_file: true } } } },
        },
    })
    const extras = new Map<number, ExtraEvento>()
    for (const e of eventos) {
        const r = (e.kitDivulgacao?.receita ?? {}) as Record<string, unknown>
        const p = e.sermoes[0]?.pregador
        const preletorKit = typeof r.preletor === 'string' && r.preletor.trim() ? r.preletor.trim() : null
        // A foto vertical serve melhor um cartão; o recorte (fundo transparente) ainda melhor
        const fotoKit = [fotoDaReceita(r.fotoV), fotoDaReceita(r.fotoH)].filter(Boolean).sort((a, b) => Number(b!.recorte) - Number(a!.recorte))[0] ?? null
        const avatar = p?.avatar_file && URL_BLOB_PUBLICO.test(p.avatar_file) ? { url: p.avatar_file, recorte: false } : null
        extras.set(e.id, {
            preletor: preletorKit ?? (p ? `${p.first_name} ${p.last_name}`.replace(/\s+/g, ' ').trim() : null),
            foto: fotoKit ?? avatar,
        })
    }
    return montarCartoes(eventos, extras)
}

export type EdicaoSemana = {
    titulo: string
    rodape: string
    dias: Record<string, { linha?: string; preletor?: string; foto?: string; dim?: { w: number; h: number }; recorte?: boolean; esconder?: boolean }>
}

/**
 * As mudanças à mão (vindas do endereço da imagem): título, rodapé e, por dia (d=AAAA-MM-DD):
 * l_<d> = linha da cápsula · p_<d> = preletor ("-" tira) · f_<d> = foto do Blob público ("-" tira) · fd_<d> = LxA da foto
 * (para a enquadrar) · fr_<d>=1 = é recorte (fundo transparente) · x_<d>=1 esconde o dia.
 */
export function lerEdicao(q: URLSearchParams): EdicaoSemana {
    const corta = (v: string | null, max: number) => (v ?? '').trim().slice(0, max)
    const dias: EdicaoSemana['dias'] = {}
    for (const [k, v] of q.entries()) {
        const m = /^(l|p|f|fd|fr|x)_(\d{4}-\d{2}-\d{2})$/.exec(k)
        if (!m) continue
        const d = (dias[m[2]] ??= {})
        if (m[1] === 'l') d.linha = corta(v, 70)
        if (m[1] === 'p') d.preletor = corta(v, 50)
        if (m[1] === 'f') d.foto = v === '-' ? '-' : URL_BLOB_PUBLICO.test(v) && v.length <= 400 ? v : undefined
        if (m[1] === 'x') d.esconder = v === '1'
        if (m[1] === 'fr') d.recorte = v === '1'
        if (m[1] === 'fd') {
            const t = /^(\d{2,5})x(\d{2,5})$/.exec(v)
            if (t) d.dim = { w: Number(t[1]), h: Number(t[2]) }
        }
    }
    return { titulo: corta(q.get('t'), 40) || 'Programação da semana', rodape: corta(q.get('r'), 90), dias }
}

/** Aplica as mudanças: dias escondidos saem, linhas/preletor/foto trocados; no fim, no máximo 6 cartões. */
export function editarCartoes(cartoes: Cartao[], e: EdicaoSemana): Cartao[] {
    return cartoes
        .filter((c) => !e.dias[c.dia]?.esconder)
        .map((c) => {
            const d = e.dias[c.dia]
            if (!d) return c
            return {
                ...c,
                linhas: d.linha ? [d.linha] : c.linhas,
                preletor: d.preletor === '-' ? null : d.preletor || c.preletor,
                foto: d.foto === '-' ? null : d.foto ? { url: d.foto, recorte: d.recorte === true, ...(d.dim ?? {}) } : c.foto,
            }
        })
        .slice(0, MAX_CARTOES)
}

/** Como se arrumam os cartões, por linhas (quantos em cada). Vertical: alterna largo / dois lado a lado, como o exemplo. */
export function linhasDaGrelha(n: number, horizontal: boolean): number[] {
    if (n <= 0) return []
    if (horizontal) return ({ 1: [1], 2: [2], 3: [3], 4: [2, 2], 5: [3, 2], 6: [3, 3] } as Record<number, number[]>)[Math.min(n, 6)]
    return ({ 1: [1], 2: [1, 1], 3: [1, 2], 4: [1, 2, 1], 5: [1, 2, 2], 6: [2, 2, 2] } as Record<number, number[]>)[Math.min(n, 6)]
}
