// lib/rotina-config.ts
// Rotinas do culto: parte pura (sem base de dados) — configuração, quem recebe o alerta, que alerta é a esta hora
// (hora de Lisboa), os textos e a bênção do relatório do Holyrics.

export const FUNCOES_POR_OMISSAO = ['Projeção']

export type RotinaConfig = {
    funcoes: string[]           // funções da escala que cuidam do telão/redes (comparam-se sem acentos nem maiúsculas)
    horaAlerta: number          // hora (Lisboa) do alerta da véspera
    horaManha: number           // hora (Lisboa) do alerta repetido no dia
    musica: string              // música de fundo: nome do ficheiro/pasta na aba Áudio do Holyrics
    video: string               // vídeo de pré-início: nome na aba Vídeos
    lumikitAcaoId: string       // id da ação/botão do Lumikit do pré-culto
    lumikitTipo: 'api' | 'script'
}

export const CONFIG_POR_OMISSAO: RotinaConfig = { funcoes: FUNCOES_POR_OMISSAO, horaAlerta: 18, horaManha: 8, musica: '', video: '', lumikitAcaoId: '', lumikitTipo: 'api' }

export const sem = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

const hora = (v: unknown, def: number) => {
    const n = Number(v)
    return Number.isInteger(n) && n >= 0 && n <= 23 ? n : def
}
const txt = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Lê a configuração guardada (Tenant.rotina_culto), com valores por omissão para o que faltar ou vier estragado. */
export function lerConfig(json: unknown): RotinaConfig {
    const o = json && typeof json === 'object' && !Array.isArray(json) ? (json as Record<string, unknown>) : {}
    const funcoes = Array.isArray(o.funcoes) ? [...new Set(o.funcoes.map((f) => txt(f, 60)).filter(Boolean))].slice(0, 10) : []
    return {
        funcoes: funcoes.length ? funcoes : FUNCOES_POR_OMISSAO,
        horaAlerta: hora(o.horaAlerta, CONFIG_POR_OMISSAO.horaAlerta),
        horaManha: hora(o.horaManha, CONFIG_POR_OMISSAO.horaManha),
        musica: txt(o.musica),
        video: txt(o.video),
        lumikitAcaoId: txt(o.lumikitAcaoId, 80),
        lumikitTipo: o.lumikitTipo === 'script' ? 'script' : 'api',
    }
}

/** O nome da função da escala é uma das do telão? (sem acentos nem maiúsculas) */
export function funcaoDoTelao(nome: string | null | undefined, funcoes: string[]): boolean {
    if (!nome) return false
    const n = sem(nome)
    return funcoes.some((f) => sem(f) === n)
}

export type LinhaEscala = { membroId: number; funcao: string | null; liderId: number | null }

/** Quem recebe: os escalados numa função do telão + o líder do departamento dessas escalas, sem repetir ninguém. */
export function destinatarios(linhas: LinhaEscala[], funcoes: string[]): { membroId: number; papel: 'escalado' | 'lider' }[] {
    const saida = new Map<number, 'escalado' | 'lider'>()
    for (const l of linhas) {
        if (!funcaoDoTelao(l.funcao, funcoes)) continue
        saida.set(l.membroId, 'escalado')   // quem está escalado e também lidera conta como escalado
    }
    for (const l of linhas) {
        if (!funcaoDoTelao(l.funcao, funcoes) || !l.liderId) continue
        if (!saida.has(l.liderId)) saida.set(l.liderId, 'lider')
    }
    return [...saida].map(([membroId, papel]) => ({ membroId, papel }))
}

// ---- hora de Lisboa ----------------------------------------------------------------------------------------------------------

/** "Hora de parede" de Lisboa num instante, escrita em UTC (como o resto do portal grava as horas). */
export function lisboaEscrita(instante: Date): Date {
    return new Date(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Lisbon', dateStyle: 'short', timeStyle: 'medium' }).format(instante).replace(' ', 'T') + 'Z')
}

export type Momento = { tipo: 'alerta_d1' | 'alerta_dia'; quando: 'amanha' | 'hoje'; de: Date; ate: Date }

/**
 * Que alerta corre a esta hora? Às `horaAlerta` (18h): cultos de AMANHÃ. Às `horaManha` (8h): cultos de HOJE.
 * O cron corre de hora a hora; fora destas horas não faz nada. `de`/`ate` = o dia pedido em "hora de parede" (UTC).
 */
export function momentoDoAlerta(agora: Date, cfg: Pick<RotinaConfig, 'horaAlerta' | 'horaManha'>): Momento | null {
    const l = lisboaEscrita(agora)
    const h = l.getUTCHours()
    const dia = Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate())
    if (h === cfg.horaAlerta) return { tipo: 'alerta_d1', quando: 'amanha', de: new Date(dia + 86400000), ate: new Date(dia + 2 * 86400000) }
    if (h === cfg.horaManha) return { tipo: 'alerta_dia', quando: 'hoje', de: new Date(dia), ate: new Date(dia + 86400000) }
    return null
}

/** "amanhã" ou "hoje" de um culto, em relação a agora (hora de Lisboa); null se for noutro dia. */
export function quandoDoCulto(dataCulto: Date, agora: Date): 'hoje' | 'amanha' | null {
    const l = lisboaEscrita(agora)
    const hoje = Date.UTC(l.getUTCFullYear(), l.getUTCMonth(), l.getUTCDate())
    const d = Date.UTC(dataCulto.getUTCFullYear(), dataCulto.getUTCMonth(), dataCulto.getUTCDate())
    return d === hoje ? 'hoje' : d === hoje + 86400000 ? 'amanha' : null
}

/** O cartão do Início: o culto de hoje (ainda não passou) ou o de amanhã depois da hora do alerta. */
export function cartaoVisivel(dataCulto: Date, agora: Date, horaAlerta: number): boolean {
    const l = lisboaEscrita(agora)
    if (dataCulto.getTime() <= l.getTime()) return false     // já passou
    const q = quandoDoCulto(dataCulto, agora)
    return q === 'hoje' || (q === 'amanha' && l.getUTCHours() >= horaAlerta)
}

// ---- estado do kit e textos --------------------------------------------------------------------------------------------------

export type EstadoKit = 'sem-kit' | 'guardado' | 'publicado'

export function estadoDoKit(kit: { publicado_em: Date | null } | null | undefined): EstadoKit {
    return !kit ? 'sem-kit' : kit.publicado_em ? 'publicado' : 'guardado'
}

export type Alerta = { assunto: string; titulo: string; texto: string; url: string; acao: 'divulgacao' | 'postar' }

const horaDe = (d: Date) => `${d.getUTCHours()}h${d.getUTCMinutes() ? String(d.getUTCMinutes()).padStart(2, '0') : ''}`

/** O texto do alerta (pt-PT, curto). Publicado → "Postar nas redes"; senão o estado das artes e o link para a Divulgação. */
export function textoAlerta(o: { estado: EstadoKit; quando: 'amanha' | 'hoje'; nome: string; data: Date; eventoId: number }): Alerta {
    const dia = o.quando === 'amanha' ? 'amanhã' : 'hoje'
    const culto = `${o.nome}, ${dia} às ${horaDe(o.data)}`
    if (o.estado === 'publicado') {
        return {
            assunto: `Postar nas redes ${dia}: ${o.nome}`, titulo: `Postar nas redes ${dia}`, acao: 'postar', url: `/divulgar?evento=${o.eventoId}`,
            texto: `As artes de ${culto} estão publicadas. Falta postá-las nas redes: abre a página, descarrega as artes e carrega em "Já postei".`,
        }
    }
    const estado = o.estado === 'sem-kit' ? 'ainda não foram feitas' : 'estão guardadas mas por publicar'
    return {
        assunto: `Artes por publicar ${dia}: ${o.nome}`, titulo: `Artes ${o.estado === 'sem-kit' ? 'por fazer' : 'por publicar'}`, acao: 'divulgacao', url: `/midia/divulgacao?evento=${o.eventoId}`,
        texto: `As artes de ${culto} ${estado}. Abre a Divulgação para as acabar e publicar.`,
    }
}

// ---- bênção do relatório do Holyrics -----------------------------------------------------------------------------------------

export const BENCAOS: { texto: string; ref: string }[] = [
    { texto: 'O Senhor te abençoe e te guarde; o Senhor faça resplandecer o seu rosto sobre ti e tenha misericórdia de ti; o Senhor sobre ti levante o seu rosto e te dê a paz.', ref: 'Números 6:24-26' },
    { texto: 'Alegrei-me quando me disseram: Vamos à casa do Senhor.', ref: 'Salmos 122:1' },
    { texto: 'Porque onde estiverem dois ou três reunidos em meu nome, aí estou eu no meio deles.', ref: 'Mateus 18:20' },
    { texto: 'O Senhor é o meu pastor; nada me faltará.', ref: 'Salmos 23:1' },
    { texto: 'Oh! Quão bom e quão suave é que os irmãos vivam em união!', ref: 'Salmos 133:1' },
    { texto: 'Servi ao Senhor com alegria; apresentai-vos diante dele com cântico.', ref: 'Salmos 100:2' },
]

/** Uma bênção por culto (a mesma para o mesmo culto, muda de semana para semana). */
export function bencaoDoCulto(eventoId: number | null | undefined): { texto: string; ref: string } {
    return BENCAOS[Math.abs(Number(eventoId) || 0) % BENCAOS.length]
}

// ---- o que o Holyrics envia --------------------------------------------------------------------------------------------------

export type PassoRotina = { id: string; nome: string; ok: boolean; mensagem: string }

/** Valida o corpo do POST do Holyrics; null se for inválido. */
export function lerPedidoInicio(corpo: unknown): { eventoId: number; operador: string; passos: PassoRotina[] } | null {
    if (!corpo || typeof corpo !== 'object') return null
    const c = corpo as Record<string, unknown>
    const eventoId = Number(c.eventoId)
    if (!Number.isInteger(eventoId) || eventoId <= 0 || !Array.isArray(c.passos) || c.passos.length === 0 || c.passos.length > 30) return null
    const passos: PassoRotina[] = []
    for (const p of c.passos) {
        if (!p || typeof p !== 'object') return null
        const x = p as Record<string, unknown>
        if (typeof x.ok !== 'boolean') return null
        passos.push({ id: txt(x.id, 40), nome: txt(x.nome, 80), ok: x.ok, mensagem: txt(x.mensagem, 300) })
    }
    return { eventoId, operador: txt(c.operador, 80) || 'Holyrics', passos }
}
