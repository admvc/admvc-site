// No browser, antes de enviar: reduz as fotos (máx. 1600 px, JPEG). As fotos do telemóvel têm 3–8 MB
// e a Vercel recusa pedidos acima de 4,5 MB ("não consigo fazer upload"); o iPhone pode mandar HEIC,
// que o servidor não aceita. Desenhar num canvas resolve as duas coisas. Se falhar, envia o original.

export async function reduzirImagem(file: File, max = 1600, qualidade = 0.85): Promise<File> {
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') return file
    try {
        const bitmap = await createImageBitmap(file)
        const escala = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
        // Já é pequena e num formato aceite: não mexe
        if (escala === 1 && file.size < 1_500_000 && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { bitmap.close(); return file }
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(bitmap.width * escala)
        canvas.height = Math.round(bitmap.height * escala)
        const ctx = canvas.getContext('2d')
        if (!ctx) return file
        // PNG com transparência (logótipos) fica PNG; o resto passa a JPEG
        const png = file.type === 'image/png' && file.size < 4_000_000
        if (!png) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height) }
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
        bitmap.close()
        const tipo = png ? 'image/png' : 'image/jpeg'
        const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, tipo, qualidade))
        if (!blob) return file
        const nome = file.name.replace(/\.[^.]+$/, '') + (png ? '.png' : '.jpg')
        return new File([blob], nome, { type: tipo, lastModified: Date.now() })
    } catch {
        return file
    }
}

/** Reduz todas as imagens de um FormData (devolve o mesmo FormData, já trocado). */
export async function reduzirImagensDoForm(fd: FormData): Promise<FormData> {
    for (const [chave, valor] of [...fd.entries()]) {
        if (valor instanceof File && valor.size > 0 && valor.type.startsWith('image/')) {
            fd.set(chave, await reduzirImagem(valor))
        }
    }
    return fd
}
