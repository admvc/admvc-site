// A "receita" de um kit de divulgação (o que fica guardado na base por evento) e como vira o pedido de cada peça.
import { ALVOS, FUNDOS_PRONTOS, PECAS, REDES, lerEstilo, lerModeloRedes, lerPaleta, redesDoEstilo, type EstiloId, type ModeloRedesId, type PecaId, type RedeId } from '@/lib/divulgacao'
import { ajusteEmTexto, lerAjustesKit, type AjustesKit } from '@/lib/divulgacao-enquadrar'

export const QR_BOAS_VINDAS = 'https://www.igrejaadmvc.org/boasvindas?c=sede'

/** Foto do preletor (já no Blob público) e o ponto que fica em foco quando se corta para cada formato. */
export type FotoKit = { url: string; foco: string; w?: number; h?: number; recorte?: boolean } // recorte = PNG com fundo transparente

/** Onde um texto pode ser afinado: o telão ou cada formato das redes. */
export type FormatoTexto = 'telao' | RedeId
export const FORMATOS_TEXTO: { id: FormatoTexto; nome: string }[] = [
    { id: 'telao', nome: 'Telão' }, { id: 'post', nome: 'Post' }, { id: 'story', nome: 'Story' }, { id: 'youtube', nome: 'Live' },
]
/** Os textos que a equipa das redes escreve; os do telão e das redes são os mesmos, a não ser que se afinem por formato. */
export type CamposTexto = 'titulo' | 'subtitulo' | 'tema' | 'quando' | 'livre'
export type TextosAfinados = Partial<Record<CamposTexto, string>>
export const LIMITES_TEXTO: Record<CamposTexto, number> = { titulo: 60, subtitulo: 40, tema: 80, quando: 40, livre: 120 }
export type TamanhoLivre = 'p' | 'm' | 'g'

export type Receita = {
    estilo: EstiloId; paleta: string; pecas: PecaId[]
    alvo: string; alvoTexto: string                  // oração por… (alvo da lista ou texto livre)
    tema: string; ref: string; preletor: string      // Palavra (sem tema = "Momento da Palavra"); o preletor também vai nas redes
    iban: string; qr: string
    qrOferta: 'nenhum' | 'banco' | 'pagina'           // oferta: QR de transferência, página com o IBAN para copiar, ou sem QR
    titular: string; mbway: string                   // titular da conta (vai no QR de transferência) e número do MB WAY (só texto)
    cantina: { titulo: string; subtitulo: string; textos: string[]; foto: FotoKit | null } // capa da Cantina (fica no padrão da igreja)
    verso: string; versoRef: string; semVersiculo: boolean // verso vazio = roda pela lista
    // Redes sociais (post, story, capa da live): título do evento, fotos e véu de cor
    redes: RedeId[]; titulo: string; subtitulo: string
    fotoH: FotoKit | null; fotoV: FotoKit | null; tinta: number
    fundo: string                                    // '' = só cores; id de FUNDOS_PRONTOS ou imagem do Blob público
    palavraComFoto: boolean                          // Palavra no telão com o recorte do preletor ao lado
    ajustes: AjustesKit                              // "Ajustar foto" por formato (mover/aproximar); só vale para a foto com que foi feito
    modeloRedes: ModeloRedesId                       // estilo das artes das redes (só conta se estilosSeparados; senão segue o estilo do telão)
    estilosSeparados: boolean                        // false = o mesmo estilo no telão e nas redes (cada estilo tem as duas versões)
    quandoTexto: string                              // data e hora escritas à mão ("Sábado, 14 nov · 19h30"); vazio = a do culto
    textoLivre: string                               // texto livre a mais nas artes; vazio = sem
    textoLivreTam: TamanhoLivre                      // pequeno / normal / grande
    afinar: Partial<Record<FormatoTexto, TextosAfinados>> // textos diferentes só num formato (vazio = segue o geral)
}

/** O estilo das artes das redes que vale para esta receita (o do estilo do telão, a não ser que estejam separados). */
export const modeloDasRedes = (r: Pick<Receita, 'estilo' | 'estilosSeparados' | 'modeloRedes'>): ModeloRedesId => (r.estilosSeparados ? r.modeloRedes : redesDoEstilo(r.estilo))

/** O que se escreve numa arte de um formato: o geral, ou o afinado para esse formato. */
export function textosPara(r: Receita, formato: FormatoTexto): Record<CamposTexto, string> {
    const a = r.afinar[formato] ?? {}
    return {
        titulo: a.titulo || r.titulo, subtitulo: a.subtitulo || r.subtitulo, tema: a.tema || r.tema,
        quando: a.quando || r.quandoTexto, livre: a.livre || r.textoLivre,
    }
}

/** "Sábado, 14 nov · 19h30" → { quando, hora }; vazio = os do culto. */
export function quandoEscrito(texto: string, auto: { quando: string; hora: string }): { quando: string; hora: string } {
    const t = texto.trim()
    if (!t) return auto
    const [q, h] = t.split(/\s*[·|]\s*/)
    return { quando: q || auto.quando, hora: h || auto.hora }
}

export const PECAS_POR_OMISSAO: PecaId[] = ['capa', 'oracao', 'oracao-dirigida', 'neutro', 'boas-vindas', 'oferta', 'palavra']
export const REDES_POR_OMISSAO: RedeId[] = ['post', 'story', 'youtube']

export function receitaVazia(): Receita {
    return {
        estilo: 'manchas', paleta: 'preto-laranja', pecas: [...PECAS_POR_OMISSAO],
        alvo: 'familia', alvoTexto: '', tema: '', ref: '', preletor: '', iban: '', qr: QR_BOAS_VINDAS, qrOferta: 'nenhum', titular: '', mbway: '',
        cantina: { titulo: 'Cantina', subtitulo: 'Aberta depois do culto', textos: [], foto: null },
        verso: '', versoRef: '', semVersiculo: false,
        redes: [...REDES_POR_OMISSAO], titulo: '', subtitulo: '', fotoH: null, fotoV: null, tinta: 0.25,
        fundo: '', palavraComFoto: true, ajustes: {}, modeloRedes: 'classico',
        estilosSeparados: false, quandoTexto: '', textoLivre: '', textoLivreTam: 'm', afinar: {},
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
    const estilo = lerEstilo(o.estilo)
    const modeloRedes = lerModeloRedes(o.modeloRedes)
    // receitas de antes não têm o interruptor: estavam separadas se o estilo das redes não era o par do telão
    const estilosSeparados = typeof o.estilosSeparados === 'boolean' ? o.estilosSeparados : modeloRedes !== redesDoEstilo(estilo)
    return {
        estilo, paleta: lerPaleta(o.paleta).id, pecas,
        alvo, alvoTexto: txt(o.alvoTexto, 40, ''),
        tema: txt(o.tema, 80, ''), ref: txt(o.ref, 80, ''), preletor: txt(o.preletor, 60, ''),
        iban: txt(o.iban, 40, ''), qr: /^https?:\/\//.test(qr) ? qr : base.qr,
        qrOferta: o.qrOferta === 'banco' || o.qrOferta === 'pagina' ? o.qrOferta : 'nenhum', titular: txt(o.titular, 70, ''), mbway: txt(o.mbway, 20, ''),
        verso: txt(o.verso, 220, ''), versoRef: txt(o.versoRef, 60, ''), semVersiculo: o.semVersiculo === true,
        redes, titulo: txt(o.titulo, 60, ''), subtitulo: txt(o.subtitulo, 40, ''),
        fotoH: lerFoto(o.fotoH), fotoV: lerFoto(o.fotoV), tinta,
        fundo: typeof o.fundo === 'string' && (FUNDOS_PRONTOS.some((f) => f.id === o.fundo) || (URL_FOTO.test(o.fundo) && o.fundo.length <= 400)) ? o.fundo : '',
        palavraComFoto: o.palavraComFoto !== false,
        ajustes: lerAjustesKit(o.ajustes),
        modeloRedes: estilosSeparados ? modeloRedes : redesDoEstilo(estilo), estilosSeparados,
        quandoTexto: txt(o.quandoTexto, LIMITES_TEXTO.quando, ''), textoLivre: txt(o.textoLivre, LIMITES_TEXTO.livre, ''),
        textoLivreTam: o.textoLivreTam === 'p' || o.textoLivreTam === 'g' ? o.textoLivreTam : 'm',
        afinar: lerAfinar(o.afinar),
        cantina: lerCantina(o.cantina, base.cantina),
    }
}

function lerAfinar(x: unknown): Receita['afinar'] {
    const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>
    const saida: Receita['afinar'] = {}
    for (const f of FORMATOS_TEXTO) {
        const v = o[f.id]
        if (!v || typeof v !== 'object') continue
        const a: TextosAfinados = {}
        for (const k of Object.keys(LIMITES_TEXTO) as CamposTexto[]) {
            const t = (v as Record<string, unknown>)[k]
            if (typeof t === 'string' && t.trim()) a[k] = t.trim().slice(0, LIMITES_TEXTO[k])
        }
        if (Object.keys(a).length) saida[f.id] = a
    }
    return saida
}

function lerCantina(x: unknown, base: Receita['cantina']): Receita['cantina'] {
    const o = (x && typeof x === 'object' ? x : null) as Record<string, unknown> | null
    if (!o) return base
    const txt = (v: unknown, max: number, omissao: string) => (typeof v === 'string' ? v.trim().slice(0, max) : omissao)
    const textos = Array.isArray(o.textos) ? o.textos.filter((t): t is string => typeof t === 'string').map((t) => t.trim().slice(0, 90)).filter(Boolean).slice(0, 4) : []
    return { titulo: txt(o.titulo, 40, base.titulo), subtitulo: txt(o.subtitulo, 60, base.subtitulo), textos, foto: lerFoto(o.foto) }
}

/** O pedido (para /api/divulgacao/imagem ou desenharArte) de uma peça deste kit. dia = AAAA-MM-DD do culto. */
export function paramsDaPeca(r: Receita, peca: PecaId, dia: string, ev?: { nome: string; data: Date }): URLSearchParams {
    const q = new URLSearchParams({ peca, estilo: r.estilo, paleta: r.paleta, dia })
    const t = textosPara(r, 'telao')
    if (t.livre) { q.set('livre', t.livre); if (r.textoLivreTam !== 'm') q.set('livreTam', r.textoLivreTam) }
    if (peca === 'capa') {
        // O título é o das redes (ou o nome do culto); no telão o "|" e os *asteriscos* não se usam
        const titulo = semDestaque(t.titulo || ev?.nome || '').replace(/\s*\|\s*/g, ' ').trim()
        if (titulo) q.set('capa', titulo)
        if (t.subtitulo) q.set('sub', semDestaque(t.subtitulo).replace(/\s*\|\s*/g, ' ').trim())
        if (ev) { const w = quandoEscrito(t.quando, quandoDoEvento(ev.data)); q.set('quando', `${w.quando} · ${w.hora}`) }
        else if (t.quando) q.set('quando', t.quando)
        if (r.preletor) q.set('preletor', r.preletor)
    }
    if (peca === 'oracao-dirigida') {
        q.set('alvo', r.alvo)
        if (r.alvoTexto) q.set('alvoTexto', r.alvoTexto)
    }
    if (r.estilo === 'foto' && r.fundo) q.set('fundo', r.fundo)
    if (peca === 'palavra') {
        const v = r.fotoV ?? r.fotoH
        if (r.palavraComFoto && v?.recorte && v.w && v.h) { q.set('retrato', v.url); q.set('rw', String(v.w)); q.set('rh', String(v.h)) }
        if (t.tema) q.set('tema', semDestaque(t.tema))   // os *asteriscos* do destaque são só para as redes
        if (r.ref) q.set('ref', r.ref)
        if (r.preletor) q.set('preletor', r.preletor)
    }
    if (peca === 'cantina') {
        const c = r.cantina
        if (c.titulo) q.set('ct', c.titulo)
        if (c.subtitulo) q.set('cs', c.subtitulo)
        for (const t of c.textos) q.append('cx', t)
        if (c.foto) { q.set('cf', c.foto.url); if (c.foto.w && c.foto.h) { q.set('cfw', String(c.foto.w)); q.set('cfh', String(c.foto.h)) } q.set('cfoco', c.foto.foco) }
    }
    if (peca === 'oferta') {
        if (r.iban) q.set('iban', r.iban)
        if (r.mbway) q.set('mbway', r.mbway)
        if (r.qrOferta !== 'nenhum') { q.set('qrOferta', r.qrOferta); if (r.titular) q.set('titular', r.titular) }
    }
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
    const t = textosPara(r, formato)
    const { quando, hora } = quandoEscrito(t.quando, quandoDoEvento(ev.data))
    const q = new URLSearchParams({ formato, paleta: r.paleta, titulo: t.titulo || ev.nome, quando, hora, tinta: String(r.tinta) })
    const modelo = modeloDasRedes(r)
    if (modelo !== 'classico') { q.set('modelo', modelo); if (t.tema) q.set('tema', t.tema) }
    if (t.subtitulo) q.set('subtitulo', t.subtitulo)
    if (t.livre) { q.set('livre', t.livre); if (r.textoLivreTam !== 'm') q.set('livreTam', r.textoLivreTam) }
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
