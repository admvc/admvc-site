// QR code como imagem SVG (data URL), para as imagens geradas no servidor (next/og não corre o react-qr-code).
// Usa o qr.js que já vem com o react-qr-code.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const QRCode = require('qr.js/lib/QRCode')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const NivelErro = require('qr.js/lib/ErrorCorrectLevel')

export function qrSvg(texto: string, cor = '#000000', fundo = '#ffffff'): string {
    const qr = new QRCode(-1, NivelErro.M)
    qr.addData(texto)
    qr.make()
    const n: number = qr.getModuleCount()
    let d = ''
    for (let l = 0; l < n; l++) for (let c = 0; c < n; c++) if (qr.isDark(l, c)) d += `M${c + 2} ${l + 2}h1v1h-1z`
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 4} ${n + 4}" shape-rendering="crispEdges"><rect width="${n + 4}" height="${n + 4}" fill="${fundo}"/><path d="${d}" fill="${cor}"/></svg>`
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}
