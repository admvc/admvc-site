// Inscrições em eventos (Chá de Mulheres e seguintes): regras partilhadas pela
// página pública, pela app e pela gestão.

import { mesmoTelefone } from '@/lib/visitante-registo'

export const ESTADOS_INSCRICAO = ['PENDENTE', 'CONFIRMADA', 'CANCELADA'] as const
export type EstadoInscricao = (typeof ESTADOS_INSCRICAO)[number]

export interface CampoEvento {
    id: string
    rotulo: string
    tipo: 'aceite'
    obrigatorio?: boolean
}

/** Os campos próprios do evento (JSON da base), só os válidos. */
export function lerCampos(json: unknown): CampoEvento[] {
    if (!Array.isArray(json)) return []
    return json.filter((c): c is CampoEvento =>
        !!c && typeof c === 'object' && typeof (c as CampoEvento).id === 'string' &&
        typeof (c as CampoEvento).rotulo === 'string' && (c as CampoEvento).tipo === 'aceite')
}

export type BlocoTexto =
    | { tipo: 'titulo'; texto: string }
    | { tipo: 'paragrafo'; texto: string }
    | { tipo: 'lista'; itens: string[] }

/**
 * O texto da página em blocos (sem HTML): linhas com "## " são títulos, com "• "
 * ou "- " são listas; o resto são parágrafos (separados por linha em branco).
 */
export function lerDescricao(texto: string | null | undefined): BlocoTexto[] {
    const blocos: BlocoTexto[] = []
    let paragrafo: string[] = []
    const fecharParagrafo = () => {
        if (paragrafo.length) blocos.push({ tipo: 'paragrafo', texto: paragrafo.join(' ') })
        paragrafo = []
    }
    for (const linhaBruta of (texto ?? '').split(/\r?\n/)) {
        const linha = linhaBruta.trim()
        if (!linha) { fecharParagrafo(); continue }
        if (linha.startsWith('## ')) { fecharParagrafo(); blocos.push({ tipo: 'titulo', texto: linha.slice(3).trim() }); continue }
        const item = /^[•\-–]\s*(.+)$/.exec(linha)
        if (item) {
            fecharParagrafo()
            const ultimo = blocos[blocos.length - 1]
            if (ultimo?.tipo === 'lista') ultimo.itens.push(item[1])
            else blocos.push({ tipo: 'lista', itens: [item[1]] })
            continue
        }
        paragrafo.push(linha)
    }
    fecharParagrafo()
    return blocos
}

// Sem letras/números que se confundam (0/O, 1/I/L)
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** Código curto para a referência do pagamento (ex.: "K7QX2"). */
export function novoCodigo(aleatorio: () => number = Math.random, tamanho = 5): string {
    let s = ''
    for (let i = 0; i < tamanho; i++) s += ALFABETO[Math.floor(aleatorio() * ALFABETO.length)]
    return s
}

/**
 * O membro com este telemóvel (em silêncio: a página nunca o mostra).
 * Prefere contas ativas e com palavra-passe (há contas repetidas do censo).
 */
export function membroPeloTelefone<T extends { id: number; phone_1: string | null; phone_2: string | null; is_active: boolean; password?: string | null | boolean }>(
    telefone: string, membros: T[]
): T | null {
    const candidatos = membros.filter(m => mesmoTelefone(m.phone_1, telefone) || mesmoTelefone(m.phone_2, telefone))
    if (candidatos.length === 0) return null
    const pontos = (m: T) => (m.is_active ? 2 : 0) + (m.password ? 1 : 0)
    return [...candidatos].sort((a, b) => pontos(b) - pontos(a) || a.id - b.id)[0]
}

/** Inscrições abertas agora? (estado ABERTO e dentro do prazo) */
export function inscricoesAbertas(e: { estado: string; inscricoes_ate: Date | null }, agora = new Date()): boolean {
    return e.estado === 'ABERTO' && (!e.inscricoes_ate || agora.getTime() <= new Date(e.inscricoes_ate).getTime())
}

/** Data e hora do evento como estão gravadas (hora "de parede", como na agenda). */
export function dataDoEvento(d: Date | string): { dia: string; hora: string } {
    const data = new Date(d)
    return {
        dia: data.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }),
        hora: data.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
    }
}

/** Mensagem pronta para o WhatsApp da organização. */
export function mensagemWhatsApp(
    i: { nome: string; codigo: string; estado: string; pago: boolean },
    e: { titulo: string; inicio: Date | string; preco_eur: number | null; pagamento: string | null }
): string {
    const primeiro = i.nome.trim().split(/\s+/)[0]
    const { dia, hora } = dataDoEvento(e.inicio)
    const pagar = e.preco_eur && !i.pago
        ? `\n\nFalta o pagamento de ${e.preco_eur.toLocaleString('pt-PT')} €${e.pagamento ? ` (${e.pagamento})` : ''}, com a referência ${i.codigo}.`
        : ''
    if (i.estado === 'CONFIRMADA') {
        return `Olá ${primeiro}! A tua inscrição no ${e.titulo} (${dia}, às ${hora}) está confirmada ✅${pagar}\n\nAté lá!`
    }
    return `Olá ${primeiro}! Recebemos a tua inscrição no ${e.titulo} (${dia}, às ${hora}), com o código ${i.codigo}.${pagar}`
}

export function linkWhatsApp(telefone: string, texto: string): string {
    let digitos = telefone.replace(/\D/g, '').replace(/^00/, '')
    if (digitos.length === 9) digitos = `351${digitos}` // número português sem indicativo
    return `https://wa.me/${digitos}?text=${encodeURIComponent(texto)}`
}

/** CSV (separador ;, para o Excel em português) das inscrições. */
export function csvInscricoes(
    linhas: Array<{ codigo: string; nome: string; telefone: string; email: string | null; estado: string; pago: boolean; membro: boolean; quer_contacto: boolean; criado_em: Date }>
): string {
    const esc = (v: string) => /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    const cab = ['Código', 'Nome', 'Telefone', 'Email', 'Estado', 'Pago', 'Membro', 'Quer contacto', 'Inscrita em']
    const corpo = linhas.map(l => [
        l.codigo, l.nome, l.telefone, l.email ?? '', l.estado, l.pago ? 'sim' : 'não', l.membro ? 'sim' : 'não',
        l.quer_contacto ? 'sim' : 'não', l.criado_em.toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' }),
    ].map(v => esc(String(v))).join(';'))
    return '﻿' + [cab.join(';'), ...corpo].join('\r\n')
}
