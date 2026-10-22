// Enquadrar a foto do preletor em cada arte das redes (post 4:5, story 9:16, capa 16:9). Funções puras: o desenho no servidor
// (lib/divulgacao-redes.tsx) e o ecrã "Ajustar foto" (pré-visualização com CSS) usam as MESMAS contas, por isso o que se vê ao
// ajustar é o que sai no PNG.
//
// Ajuste { x, y, zoom } — o significado depende do tipo de foto:
//  · foto normal (retângulo): (x, y) = o ponto da foto (0..1) que fica no "ponto de interesse" da caixa (a meio na largura e a
//    30% da altura, onde fica o rosto); zoom ≥ 1 aproxima (1 = a foto cobre a caixa à justa). A foto nunca deixa ver fundo.
//  · recorte (PNG transparente, pessoa de pé): x = onde fica o meio da pessoa na largura da caixa (0..1); y = onde ficam os pés
//    na altura da caixa (1 = no fundo; mais = os pés saem por baixo, a pessoa sobe menos); zoom = tamanho (1 = 94% da altura).
import type { RedeId } from '@/lib/divulgacao'

export type Ajuste = { x: number; y: number; zoom: number }
export type Caixa = { left: number; top: number; width: number; height: number }
export type Posicao = { left: number; top: number; width: number; height: number }

/** Onde fica a foto em cada formato (o texto fica sobre a cor de fundo, nunca sobre o rosto). */
export const CAIXA_FOTO: Record<RedeId, Caixa> = {
    post: { left: 0, top: 0, width: 1080, height: 1000 },
    story: { left: 0, top: 200, width: 1080, height: 1440 },
    youtube: { left: 380, top: 0, width: 900, height: 720 },
}

/** A caixa da foto nos estilos novos das redes (lib/divulgacao-redes-modelos.tsx); "classico" usa CAIXA_FOTO. */
export const CAIXA_FOTO_MODELO: Record<string, Record<RedeId, Caixa>> = {
    arcos: {
        youtube: { left: 560, top: 30, width: 720, height: 690 },
        post: { left: 150, top: 90, width: 930, height: 820 },
        story: { left: 60, top: 230, width: 1020, height: 1050 },
    },
    'arco-claro': {
        youtube: { left: 760, top: 50, width: 460, height: 620 },
        post: { left: 300, top: 60, width: 480, height: 580 },
        story: { left: 180, top: 180, width: 720, height: 900 },
    },
    elegante: {
        youtube: { left: 420, top: 0, width: 860, height: 720 },
        post: { left: 0, top: 0, width: 1080, height: 1050 },
        story: { left: 0, top: 0, width: 1080, height: 1400 },
    },
}

/** A caixa da foto de um formato, no estilo das redes escolhido. */
export const caixaFoto = (formato: RedeId, modelo = 'classico'): Caixa => CAIXA_FOTO_MODELO[modelo]?.[formato] ?? CAIXA_FOTO[formato]

export const LIMITES = {
    foto: { zoom: [1, 3] as const },
    recorte: { x: [0.1, 0.9] as const, y: [0.7, 1.6] as const, zoom: [0.5, 1.8] as const },
}

const entre = (v: number, [min, max]: readonly [number, number]) => Math.min(max, Math.max(min, v))

/** O ajuste por omissão: o ponto clicado no rosto (foco "x% y%") e sem zoom; o recorte ao centro, assente no fundo. */
export function ajustePorOmissao(recorte: boolean, foco = '50% 30%'): Ajuste {
    if (recorte) return { x: 0.5, y: 1, zoom: 1 }
    const [fx, fy] = foco.split(' ').map((n) => parseInt(n, 10) / 100)
    return { x: Number.isFinite(fx) ? fx : 0.5, y: Number.isFinite(fy) ? fy : 0.3, zoom: 1 }
}

/** Mantém o ajuste dentro dos limites (vindo do browser, da base ou de um arrastar). */
export function limitarAjuste(a: Ajuste, recorte: boolean): Ajuste {
    if (recorte) return { x: entre(a.x, LIMITES.recorte.x), y: entre(a.y, LIMITES.recorte.y), zoom: entre(a.zoom, LIMITES.recorte.zoom) }
    return { x: entre(a.x, [0, 1]), y: entre(a.y, [0, 1]), zoom: entre(a.zoom, LIMITES.foto.zoom) }
}

/** Foto normal: tamanho e posição dentro da caixa (coordenadas da caixa), sem deixar aparecer fundo. */
export function enquadrarFoto(fw: number, fh: number, caixa: { width: number; height: number }, a: Ajuste): Posicao {
    const { x, y, zoom } = limitarAjuste(a, false)
    const escala = Math.max(caixa.width / fw, caixa.height / fh) * zoom
    const width = Math.round(fw * escala), height = Math.round(fh * escala)
    const prender = (v: number, min: number) => Math.round(Math.min(0, Math.max(min, v)))
    return {
        left: prender(caixa.width * 0.5 - x * width, caixa.width - width),
        top: prender(caixa.height * 0.3 - y * height, caixa.height - height),
        width, height,
    }
}

/** Recorte (PNG transparente): a pessoa de pé; nas artes ao alto, um recorte largo corta-se nos braços, não se encolhe. */
export function enquadrarRecorte(fw: number, fh: number, caixa: { width: number; height: number }, a: Ajuste): Posicao {
    const { x, y, zoom } = limitarAjuste(a, true)
    let height = caixa.height * 0.94, width = fw * height / fh
    const maxLarg = caixa.height > caixa.width ? caixa.width * 1.35 : caixa.width * 0.95
    if (width > maxLarg) { width = maxLarg; height = fh * width / fw }
    width *= zoom; height *= zoom
    return { left: Math.round(caixa.width * x - width / 2), top: Math.round(caixa.height * y - height), width: Math.round(width), height: Math.round(height) }
}

/** "x,y,zoom" (no pedido da imagem) ↔ Ajuste. */
export const ajusteEmTexto = (a: Ajuste) => [a.x, a.y, a.zoom].map((n) => Math.round(n * 1000) / 1000).join(',')
export function lerAjuste(s: string | null | undefined): Ajuste | null {
    const n = (s ?? '').split(',').map(Number)
    return n.length === 3 && n.every(Number.isFinite) ? { x: n[0], y: n[1], zoom: n[2] } : null
}

/** Ajustes guardados na receita, por formato; cada um só vale para a foto com que foi feito (trocar a foto = volta ao normal). */
export type AjustesKit = Partial<Record<RedeId, Ajuste & { url: string }>>
export function lerAjustesKit(x: unknown): AjustesKit {
    const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>
    const saida: AjustesKit = {}
    for (const id of Object.keys(CAIXA_FOTO) as RedeId[]) {
        const v = o[id] as Record<string, unknown> | undefined
        if (v && typeof v.url === 'string' && v.url.length <= 400 && [v.x, v.y, v.zoom].every((n) => typeof n === 'number' && Number.isFinite(n))) {
            saida[id] = { url: v.url, x: v.x as number, y: v.y as number, zoom: v.zoom as number }
        }
    }
    return saida
}
