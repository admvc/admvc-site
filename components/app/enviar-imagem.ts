// Envia uma imagem (foto do preletor, fundo, foto de um dia da agenda) para o Blob público da igreja.
// Os PNG com fundo transparente ficam PNG (recortes). Usado pelo kit de Divulgação e pela Agenda para divulgar.
import { reduzirImagem } from '@/lib/reduzir-imagem'

export type Enviada = { url: string; largura: number; altura: number; recorte: boolean; fundoClaro?: boolean }

export async function enviarImagem(file: File, tipo: 'foto' | 'fundo', tirarBranco = false): Promise<Enviada> {
    const fd = new FormData()
    fd.set('file', await reduzirImagem(file, tipo === 'fundo' ? 2600 : 2000))
    fd.set('tipo', tipo)
    if (tirarBranco) fd.set('tirarBranco', '1')
    const res = await fetch('/api/upload/divulgacao-foto', { method: 'POST', body: fd })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j.url) throw new Error(j.error ?? 'Não foi possível enviar a imagem.')
    return j
}
