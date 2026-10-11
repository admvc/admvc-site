import sharp from 'sharp'

export async function comprimirImagem(buffer: Buffer, options?: {
    maxWidth?: number
    maxHeight?: number
    quality?: number
}): Promise<Buffer> {
    const { maxWidth = 1200, maxHeight = 1200, quality = 80 } = options || {}

    return sharp(buffer)
        .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality })
        .toBuffer()
}

export async function comprimirImagemParaAvatar(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
        .resize(200, 200, { fit: 'cover' })
        .webp({ quality: 75 })
        .toBuffer()
}
