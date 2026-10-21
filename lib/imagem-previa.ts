// Pré-visualização pequena de uma imagem gerada (telão, redes, agenda): o PNG completo (0,5 a 1,3 MB) é reduzido para um
// JPEG de ~640 px (~50 KB), muito mais depressa de carregar. O descarregamento e o ZIP continuam em resolução total.
import sharp from 'sharp'

export async function comoPrevia(img: Response, cache = 'private, max-age=300', largura = 640): Promise<Response> {
    const png = Buffer.from(await img.arrayBuffer())
    const jpg = await sharp(png).resize({ width: largura, withoutEnlargement: true }).jpeg({ quality: 72, mozjpeg: true }).toBuffer()
    return new Response(new Uint8Array(jpg), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': cache } })
}
