// "Enviar no WhatsApp a imagem + a mensagem": o endereço wa.me não leva imagens; o que leva é a partilha do telemóvel
// (Web Share com ficheiro), que abre a lista de apps (WhatsApp, Instagram…) com a imagem e o texto. A mensagem fica também
// copiada, porque alguns telemóveis (iPhone) largam o texto quando há imagem.
export type ResultadoPartilha = 'partilhada' | 'cancelada' | 'sem-suporte'

export async function partilharArte(url: string, nomeFicheiro: string, texto: string): Promise<ResultadoPartilha> {
    try { if (texto) await navigator.clipboard?.writeText(texto) } catch { /* sem área de transferência */ }
    try {
        const resp = await fetch(url)
        if (!resp.ok) return 'sem-suporte'
        const ficheiro = new File([await resp.blob()], nomeFicheiro, { type: 'image/png' })
        if (!navigator.canShare?.({ files: [ficheiro] })) return 'sem-suporte'
        await navigator.share({ files: [ficheiro], text: texto || undefined })
        return 'partilhada'
    } catch (e) {
        return e instanceof DOMException && e.name === 'AbortError' ? 'cancelada' : 'sem-suporte'
    }
}

export const AVISO_PARTILHA = {
    partilhada: 'A mensagem também ficou copiada: se o WhatsApp não a mostrar, cola-a.',
    'sem-suporte': 'Este aparelho não deixa partilhar a imagem daqui: descarrega a arte e cola a mensagem (já copiada).',
    cancelada: '',
} as const
