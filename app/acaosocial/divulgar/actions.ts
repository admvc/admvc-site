'use server'

// "Publicar no culto" da arte da Assistência Social: desenha a arte do telão com o texto do ecrã e guarda-a no Blob público
// ligado ao culto (lib/encerramento-artes.ts). Só a equipa da Assistência Social e a administração.
import { getSessionData } from '@/lib/auth-utils'
import { podeFazerArteSocial } from '@/lib/acaosocial-acesso'
import { lerPedidoSocial } from '@/lib/acaosocial-arte-dados'
import { desenharArteSocial } from '@/lib/acaosocial-arte'
import { publicarNoCulto, retirarDoCulto } from '@/lib/encerramento-artes'

type Resultado = { ok: true; url: string | null } | { ok: false; erro: string }

export async function publicarArteSocialNoCulto(eventoId: number, params: string): Promise<Resultado> {
    const sessao = await getSessionData()
    if (!sessao) return { ok: false, erro: 'Sessão expirada. Entre de novo.' }
    if (!(await podeFazerArteSocial(sessao))) return { ok: false, erro: 'Só a equipa da Assistência Social e a administração.' }
    if (typeof params !== 'string' || params.length > 2000) return { ok: false, erro: 'Pedido inválido.' }
    try {
        const pedido = lerPedidoSocial(new URLSearchParams(params))
        if (!pedido.titulo && !pedido.texto) return { ok: false, erro: 'Escreva pelo menos o título ou o texto.' }
        const img = await desenharArteSocial(pedido)
        const r = await publicarNoCulto({
            tenantId: sessao.tenantId, membroId: sessao.membroId, eventoId: Number(eventoId), tipo: 'ASSISTENCIA',
            nome: pedido.titulo || 'Assistência Social', png: Buffer.from(await img.arrayBuffer()),
        })
        return r.ok ? { ok: true, url: r.url } : r
    } catch (err) {
        console.error('[acaosocial/publicar-no-culto]', err)
        return { ok: false, erro: 'Não foi possível publicar a arte.' }
    }
}

export async function retirarArteSocialDoCulto(eventoId: number): Promise<Resultado> {
    const sessao = await getSessionData()
    if (!sessao) return { ok: false, erro: 'Sessão expirada. Entre de novo.' }
    if (!(await podeFazerArteSocial(sessao))) return { ok: false, erro: 'Só a equipa da Assistência Social e a administração.' }
    try {
        await retirarDoCulto(sessao.tenantId, Number(eventoId), 'ASSISTENCIA')
        return { ok: true, url: null }
    } catch (err) {
        console.error('[acaosocial/retirar-do-culto]', err)
        return { ok: false, erro: 'Não foi possível retirar a arte.' }
    }
}
