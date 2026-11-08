'use server'

// "Publicar no culto" do banner da cantina: desenha o banner do telão (1920×1080) com o que está no ecrã e guarda-o no Blob
// público ligado ao culto (lib/encerramento-artes.ts). Só a equipa da Cantina e a administração.
import { getSessionData } from '@/lib/auth-utils'
import { podeFazerBannersCantina } from '@/lib/cantina-acesso'
import { lerPedido } from '@/lib/cantina-banners'
import { desenharBanner, ErroFoto } from '@/lib/cantina-banners-imagem'
import { publicarNoCulto, retirarDoCulto } from '@/lib/encerramento-artes'

type Resultado = { ok: true; url: string | null } | { ok: false; erro: string }

export async function publicarBannerNoCulto(eventoId: number, params: string): Promise<Resultado> {
    const sessao = await getSessionData()
    if (!sessao) return { ok: false, erro: 'Sessão expirada. Entre de novo.' }
    if (!(await podeFazerBannersCantina(sessao))) return { ok: false, erro: 'Só a equipa da Cantina e a administração.' }
    if (typeof params !== 'string' || params.length > 4000) return { ok: false, erro: 'Pedido inválido.' }
    try {
        const q = new URLSearchParams(params)
        q.set('formato', 'telao')
        const pedido = lerPedido(q, process.env.NODE_ENV !== 'production')
        const img = await desenharBanner(pedido)
        const r = await publicarNoCulto({
            tenantId: sessao.tenantId, membroId: sessao.membroId, eventoId: Number(eventoId), tipo: 'CANTINA',
            nome: pedido.titulo || 'Cantina', png: Buffer.from(await img.arrayBuffer()),
        })
        return r.ok ? { ok: true, url: r.url } : r
    } catch (err) {
        if (err instanceof ErroFoto) return { ok: false, erro: err.message }
        console.error('[cantina/publicar-no-culto]', err)
        return { ok: false, erro: 'Não foi possível publicar o banner.' }
    }
}

export async function retirarBannerDoCulto(eventoId: number): Promise<Resultado> {
    const sessao = await getSessionData()
    if (!sessao) return { ok: false, erro: 'Sessão expirada. Entre de novo.' }
    if (!(await podeFazerBannersCantina(sessao))) return { ok: false, erro: 'Só a equipa da Cantina e a administração.' }
    try {
        await retirarDoCulto(sessao.tenantId, Number(eventoId), 'CANTINA')
        return { ok: true, url: null }
    } catch (err) {
        console.error('[cantina/retirar-do-culto]', err)
        return { ok: false, erro: 'Não foi possível retirar o banner.' }
    }
}
