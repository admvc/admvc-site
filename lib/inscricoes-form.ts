// Criar/editar um evento com inscrição: ler e validar o formulário (sem base de dados).

import type { CampoEvento } from '@/lib/inscricoes'

export interface DadosEvento {
    titulo: string
    subtitulo: string | null
    descricao: string | null
    local: string | null
    inicio: Date
    inscricoes_ate: Date | null
    preco_eur: number | null
    pagamento: string | null
    precisa_confirmacao: boolean
    aberto_visitantes: boolean
    campos: CampoEvento[]
    cor_principal: string
    cor_fundo: string
    estado: 'RASCUNHO' | 'ABERTO' | 'FECHADO'
    organizador: { tipo: 'grupo' | 'departamento'; id: number }
}

/** "titulo do evento" → "titulo-do-evento" (sem acentos). */
export function slugDe(texto: string): string {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'evento'
}

/** Data + hora do formulário → hora "de parede" (gravada como UTC, como a agenda). */
export function horaDeParede(data: string, hora: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !/^\d{2}:\d{2}$/.test(hora)) return null
    const d = new Date(`${data}T${hora}:00.000Z`)
    return Number.isNaN(d.getTime()) ? null : d
}

/** Para preencher o formulário: Date → { data: "2026-11-27", hora: "19:30" } */
export function paraFormulario(d: Date | string | null | undefined): { data: string; hora: string } {
    if (!d) return { data: '', hora: '' }
    const iso = new Date(d).toISOString()
    return { data: iso.slice(0, 10), hora: iso.slice(11, 16) }
}

const COR = /^#[0-9a-fA-F]{6}$/
const texto = (f: FormData, k: string, max: number) => {
    const v = String(f.get(k) ?? '').trim()
    return v ? v.slice(0, max) : null
}

/** Campos próprios: uma linha por caixa; "*" no fim = obrigatória. */
export function lerLinhasCampos(linhas: string): CampoEvento[] {
    return linhas.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 6).map((l, i) => {
        const obrigatorio = l.endsWith('*')
        const rotulo = (obrigatorio ? l.slice(0, -1) : l).trim().slice(0, 160)
        return { id: `c${i + 1}`, rotulo, tipo: 'aceite' as const, obrigatorio }
    }).filter(c => c.rotulo)
}

export function camposParaLinhas(campos: CampoEvento[]): string {
    return campos.map(c => `${c.rotulo}${c.obrigatorio ? ' *' : ''}`).join('\n')
}

export function lerFormularioEvento(f: FormData): { ok: true; dados: DadosEvento } | { ok: false; error: string } {
    const titulo = texto(f, 'titulo', 120)
    if (!titulo || titulo.length < 3) return { ok: false, error: 'Escreva o título do evento.' }

    const inicio = horaDeParede(String(f.get('data') ?? ''), String(f.get('hora') ?? ''))
    if (!inicio) return { ok: false, error: 'Indique a data e a hora do evento.' }

    let inscricoes_ate: Date | null = null
    const ateData = String(f.get('ate_data') ?? '')
    if (ateData) {
        inscricoes_ate = horaDeParede(ateData, String(f.get('ate_hora') ?? '') || '23:59')
        if (!inscricoes_ate) return { ok: false, error: 'O prazo das inscrições não é uma data válida.' }
    }

    const precoTxt = String(f.get('preco') ?? '').trim().replace(',', '.')
    const preco = precoTxt ? Number(precoTxt) : null
    if (preco != null && (!Number.isFinite(preco) || preco < 0 || preco > 10000)) return { ok: false, error: 'Preço inválido.' }

    const estado = String(f.get('estado') ?? 'RASCUNHO')
    if (!['RASCUNHO', 'ABERTO', 'FECHADO'].includes(estado)) return { ok: false, error: 'Estado inválido.' }

    const org = /^(grupo|departamento):(\d+)$/.exec(String(f.get('organizador') ?? ''))
    if (!org) return { ok: false, error: 'Escolha quem organiza.' }

    const cor_principal = String(f.get('cor_principal') ?? '')
    const cor_fundo = String(f.get('cor_fundo') ?? '')

    return {
        ok: true,
        dados: {
            titulo,
            subtitulo: texto(f, 'subtitulo', 160),
            descricao: texto(f, 'descricao', 8000),
            local: texto(f, 'local', 160),
            inicio,
            inscricoes_ate,
            preco_eur: preco && preco > 0 ? Math.round(preco * 100) / 100 : null,
            pagamento: texto(f, 'pagamento', 300),
            precisa_confirmacao: f.get('precisa_confirmacao') === 'on',
            aberto_visitantes: f.get('aberto_visitantes') === 'on',
            campos: lerLinhasCampos(String(f.get('campos') ?? '')),
            cor_principal: COR.test(cor_principal) ? cor_principal : '#3F6B4F',
            cor_fundo: COR.test(cor_fundo) ? cor_fundo : '#F5F1EA',
            estado: estado as DadosEvento['estado'],
            organizador: { tipo: org[1] as 'grupo' | 'departamento', id: Number(org[2]) },
        },
    }
}
