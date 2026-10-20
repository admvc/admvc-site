// Fotos de estúdio (preletor sobre fundo branco/cinza claro): torna o fundo transparente para a foto virar um recorte.
// Só apaga o claro que está LIGADO às bordas da foto (enchimento a partir das margens), por isso uma camisa branca no meio
// da pessoa fica. A borda da pessoa fica meio transparente para não ficar um contorno branco.
import sharp from 'sharp'

const claro = (r: number, g: number, b: number, min = 212) => Math.min(r, g, b) > min && Math.max(r, g, b) - Math.min(r, g, b) < 34

/** A margem da foto é quase toda clara? (então vale a pena oferecer "Tirar o fundo branco") */
export async function temFundoClaro(buf: Buffer): Promise<boolean> {
    const { data, info } = await sharp(buf).rotate().resize({ width: 400, height: 400, fit: 'inside' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const { width: w, height: h } = info
    let total = 0, claros = 0
    const ver = (x: number, y: number) => { const i = (y * w + x) * 3; total++; if (claro(data[i], data[i + 1], data[i + 2])) claros++ }
    for (let x = 0; x < w; x++) { ver(x, 0); ver(x, h - 1) }
    for (let y = 0; y < h; y++) { ver(0, y); ver(w - 1, y) }
    return claros / total > 0.6
}

export async function tirarFundoBranco(buf: Buffer, max = 2000): Promise<Buffer> {
    const { data, info } = await sharp(buf).rotate().resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
        .ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const { width: w, height: h } = info
    const n = w * h
    const fundo = new Uint8Array(n)
    const fila = new Int32Array(n)
    let ini = 0, fim = 0
    const tentar = (p: number) => {
        if (fundo[p]) return
        const i = p * 4
        if (!claro(data[i], data[i + 1], data[i + 2])) return
        fundo[p] = 1; fila[fim++] = p
    }
    for (let x = 0; x < w; x++) { tentar(x); tentar((h - 1) * w + x) }
    for (let y = 0; y < h; y++) { tentar(y * w); tentar(y * w + w - 1) }
    while (ini < fim) {
        const p = fila[ini++], x = p % w
        if (x > 0) tentar(p - 1)
        if (x < w - 1) tentar(p + 1)
        if (p >= w) tentar(p - w)
        if (p < n - w) tentar(p + w)
    }
    for (let p = 0; p < n; p++) {
        if (fundo[p]) { data[p * 4 + 3] = 0; continue }
        // borda: pixel da pessoa encostado ao fundo e ainda claro → meio transparente (sem auréola branca)
        const x = p % w
        const encostado = (x > 0 && fundo[p - 1]) || (x < w - 1 && fundo[p + 1]) || (p >= w && fundo[p - w]) || (p < n - w && fundo[p + w])
        if (encostado && claro(data[p * 4], data[p * 4 + 1], data[p * 4 + 2], 170)) data[p * 4 + 3] = 110
    }
    return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer()
}
