// A "receita" de um kit de divulgação (o que fica guardado na base por evento) e como vira o pedido de cada peça.
import { ALVOS, FUNDOS_PRONTOS, PECAS, REDES, lerEstilo, lerModeloRedes, lerPaleta, type EstiloId, type ModeloRedesId, type PecaId, type RedeId } from '@/lib/divulgacao'
import { ajusteEmTexto, lerAjustesKit, type AjustesKit } from '@/lib/divulgacao-enquadrar'

export const QR_BOAS_VINDAS = 'https://www.igrejaadmvc.org/boasvindas?c=sede'

/** Foto do preletor (já no Blob público) e o ponto que fica em foco quando se corta para cada formato. */
export type FotoKit = { url: string; foco: string; w?: number; h?: number; recorte?: boolean } // recorte = PNG com fundo transparente

export type Receita = {
    estilo: EstiloId; paleta: string; pecas: PecaId[]
    alvo: string; alvoTexto: string                  // oração por… (alvo da lista ou texto livre)
    tema: string; ref: string; preletor: string      // Palavra (sem tema = "Momento da Palavra"); o preletor também vai nas redes
    iban: string; qr: string
    verso: string; versoRef: string; semVersiculo: boolean // verso vazio = roda pela lista
    // Redes sociais (post, story, capa da live): título do evento, fotos e véu de cor
    redes: RedeId[]; titulo: string; subtitulo: string
    fotoH: FotoKit | null; fotoV: FotoKit | null; tinta: number
    fundo: string                                    // '' = só cores; id de FUNDOS_PRONTOS ou imagem do Blob público
    palavraComFoto: boolean                          // Palavra no telão com o recorte do preletor ao lado
    ajustes: AjustesKit                              // "Ajustar foto" por formato (mover/aproximar); só vale para a foto com que foi feito
    modeloRedes: ModeloRedesId                       // estilo das artes das redes (clássico, arcos, claro com arco, elegante)
}

export const PECAS_POR_OMISSAO: PecaId[] = ['oracao', 'oracao-dirigida', 'neutro', 'boas-vindas', 'oferta', 'palavra']
export const REDES_POR_OMISSAO: RedeId[] = ['post', 'story', 'youtube']

export function receitaVazia(): Receita {
    return {
        estilo: 'manchas', paleta: 'preto-laranja', pecas: [...PECAS_POR_OMISSAO],
        alvo: 'familia', alvoTexto: '', tema: '', ref: '', preletor: '', iban: '', qr: QR_BOAS_VINDAS,
        verso: '', versoRef: '', semVersiculo: false,
        redes: [...REDES_POR_OMISSAO], titulo: '', subtitulo: '', fotoH: null, fotoV: null, tinta: 0.25,
        fundo: '', palavraComFoto: true, ajustes: {}, modeloRedes: 'classico',
    }
}

// Só fotos do nosso Blob público (o servidor vai buscá-las); o foco é "x% y%"
const URL_FOTO = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i
function lerFoto(x: unknown): FotoKit | null {
    const o = (x && typeof x === 'object' ? x : null) as Record<string, unknown> | null
    if (!o || typeof o.url !== 'string' || !URL_FOTO.test(o.url) || o.url.length > 400) return null
    const foco = typeof o.foco === 'string' && /^\d{1,3}% \d{1,3}%$/.test(o.foco) ? o.foco : '50% 30%'
    const dim = (v: unknown) => (typeof v === 'number' && v > 0 && v < 20000 ? Math.round(v) : undefined)
    return { url: o.url, foco, w: dim(o.w), h: dim(o.h), recorte: o.recorte === true }
}

/** Lê uma receita vinda do browser ou da base: só aceita valores conhecidos e corta os textos. */
export function normalizarReceita(x: unknown): Receita {
    const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>
    const base = receitaVazia()
    const txt = (v: unknown, max: number, omissao: string) => (typeof v === 'string' ? v.trim().slice(0, max) : omissao)
    const pecas = Array.isArray(o.pecas)
        ? PECAS.map((p) => p.id).filter((id) => (o.pecas as unknown[]).includes(id))
        : base.pecas
    const redes = Array.isArray(o.redes)
        ? REDES.map((p) => p.id).filter((id) => (o.redes as unknown[]).includes(id))
        : base.redes
    const alvo = typeof o.alvo === 'string' && o.alvo in ALVOS ? o.alvo : base.alvo
    const qr = txt(o.qr, 300, base.qr)
    const tinta = typeof o.tinta === 'number' && o.tinta >= 0 && o.tinta <= 0.6 ? Math.round(o.tinta * 100) / 100 : base.tinta
    return {
        estilo: lerEstilo(o.estilo), paleta: lerPaleta(o.paleta).id, pecas,
        alvo, alvoTexto: txt(o.alvoTexto, 40, ''),
        tema: txt(o.tema, 80, ''), ref: txt(o.ref, 80, ''), preletor: txt(o.preletor, 60, ''),
        iban: txt(o.iban, 40, ''), qr: /^https?:\/\//.test(qr) ? qr : base.qr,
        verso: txt(o.verso, 220, ''), versoRef: txt(o.versoRef, 60, ''), semVersiculo: o.semVersiculo === true,
        redes, titulo: txt(o.titulo, 60, ''), subtitulo: txt(o.subtitulo, 40, ''),
        fotoH: lerFoto(o.fotoH), fotoV: lerFoto(o.fotoV), tinta,
        fundo: typeof o.fundo === 'string' && (FUNDOS_PRONTOS.some((f) => f.id === o.fundo) || (URL_FOTO.test(o.fundo) && o.fundo.length <= 400)) ? o.fundo : '',
        palavraComFoto: o.palavraComFoto !== false,
        ajustes: lerAjustesKit(o.ajustes),
        modeloRedes: lerModeloRedes(o.modeloRedes),
    }
}

/** O pedido (para /api/divulgacao/imagem ou desenharArte) de uma peça deste kit. dia = AAAA-MM-DD do culto. */
export function paramsDaPeca(r: Receita, peca: PecaId, dia: string): URLSearchParams {
    const q = new URLSearchParams({ peca, estilo: r.estilo, paleta: r.paleta, dia })
    if (peca === 'oracao-dirigida') {
        q.set('alvo', r.alvo)
        if (r.alvoTexto) q.set('alvoTexto', r.alvoTexto)
    }
    if (r.estilo === 'foto' && r.fundo) q.set('fundo', r.fundo)
    if (peca === 'palavra') {
        const v = r.fotoV ?? r.fotoH
        if (r.palavraComFoto && v?.recorte && v.w && v.h) { q.set('retrato', v.url); q.set('rw', String(v.w)); q.set('rh', String(v.h)) }
        if (r.tema) q.set('tema', semDestaque(r.tema))   // os *asteriscos* do destaque são só para as redes
        if (r.ref) q.set('ref', r.ref)
        if (r.preletor) q.set('preletor', r.preletor)
    }
    if (peca === 'oferta' && r.iban) q.set('iban', r.iban)
    if (peca === 'boas-vindas' && r.qr) q.set('qr', r.qr)
    if (r.semVersiculo) q.set('verso', '-')
    else if (r.verso) { q.set('verso', r.verso); if (r.versoRef) q.set('verso_ref', r.versoRef) }
    return q
}

/** Quando é o evento, para as artes: { quando: "Quarta, 21 out", hora: "20h00" } (a hora está em Lisboa "escrita" em UTC). */
export function quandoDoEvento(data: Date): { quando: string; hora: string } {
    const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
    return {
        quando: `${dias[data.getUTCDay()]}, ${data.getUTCDate()} ${meses[data.getUTCMonth()]}`,
        hora: `${data.getUTCHours()}h${String(data.getUTCMinutes()).padStart(2, '0')}`,
    }
}

/** O pedido de uma arte das redes (post, story, youtube). titulo = o da receita ou, se vazio, o nome do evento. */
export function paramsDaRede(r: Receita, formato: RedeId, ev: { nome: string; data: Date }): URLSearchParams {
    const { quando, hora } = quandoDoEvento(ev.data)
    const q = new URLSearchParams({ formato, paleta: r.paleta, titulo: r.titulo || ev.nome, quando, hora, tinta: String(r.tinta) })
    if (r.modeloRedes !== 'classico') { q.set('modelo', r.modeloRedes); if (r.tema) q.set('tema', r.tema) }
    if (r.subtitulo) q.set('subtitulo', r.subtitulo)
    if (r.preletor) q.set('preletor', r.preletor)
    // Fotos: a horizontal serve a capa 16:9, a vertical o post e o story; se só há uma, serve a todos
    const foto = formato === 'youtube' ? r.fotoH ?? r.fotoV : r.fotoV ?? r.fotoH
    if (foto) {
        q.set('foto', foto.url); q.set('foco', foto.foco)
        if (foto.w && foto.h) { q.set('fw', String(foto.w)); q.set('fh', String(foto.h)) }
        if (foto.recorte) q.set('recorte', '1')
        const aj = r.ajustes[formato]
        if (aj && aj.url === foto.url) q.set('aj', ajusteEmTexto(aj))
    }
    if (r.fundo) q.set('fundo', r.fundo)
    return q
}

/** Nome do ficheiro de uma peça no ZIP / no descarregamento: "02-oracao-por-familia.png". */
export function nomeDaPeca(r: Receita, peca: PecaId, n: number): string {
    const extra = peca === 'oracao-dirigida' ? `-${r.alvoTexto ? 'outro' : r.alvo}` : ''
    return `${String(n).padStart(2, '0')}-${peca}${extra}.png`
}

export const nomeDaRede = (formato: RedeId) => `redes-${formato}.png`

/** O título sem os asteriscos do destaque ("*fruto do Espírito*" → "fruto do Espírito"), para textos e estilos sem destaque. */
export const semDestaque = (t: string) => t.replace(/\*/g, '')
