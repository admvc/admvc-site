'use server'

// Mídia → Divulgação → "Lives da semana" e "Ligar o YoloBox". Só a Mídia e a administração (a regra da Divulgação).
// A chave do YoloBox só sai daqui para o ecrã de quem a pediu: não se grava nem se regista em lado nenhum.
import { getSessionData } from '@/lib/auth-utils'
import prisma, { getTenantClient } from '@/lib/prisma'
import { podeFazerAgenda } from '@/lib/agenda-midia'
import { ErroYoutube } from '@/lib/youtube'
import { estadoDaChave, gerarOutraChave, ligarYoloBox, type ChaveParaMostrar, type EstadoDaChave } from '@/lib/youtube-chave'
import { sincronizarLives, type ResultadoSync } from '@/lib/youtube-agendar'
import { livesDaSemana, type SemanaDeLives } from '@/lib/youtube-semana'
import { valorDaEscolha } from '@/lib/youtube-regra'

type Erro = { erro: string }

async function sessaoDaMidia() {
    const sessao = await getSessionData()
    return sessao && (await podeFazerAgenda(sessao)) ? sessao : null
}

const msg = (e: unknown, padrao: string) => (e instanceof ErroYoutube ? e.message : padrao)

async function nomeDe(tenantId: number, membroId: number): Promise<string | null> {
    const m = await getTenantClient(tenantId).membro.findFirst({ where: { id: membroId }, select: { first_name: true, last_name: true } })
    return m ? `${m.first_name} ${m.last_name ?? ''}`.trim() : null
}

/** O que o cron/botão fez, em português curto. */
function resumo(r: ResultadoSync): string {
    const feitos = r.acoes.filter((a) => a.ok && !a.mensagem?.startsWith('outra passagem'))
    const falhas = r.acoes.filter((a) => !a.ok)
    if (falhas.length) return falhas[0].mensagem ?? 'Algo falhou. Tente daqui a pouco.'
    if (!feitos.length) return 'Já estava tudo em ordem.'
    return 'Feito.'
}

export async function verSemanaDeLives(): Promise<SemanaDeLives | Erro> {
    const sessao = await sessaoDaMidia()
    if (!sessao) return { erro: 'Só a Mídia e a administração.' }
    try { return await livesDaSemana(sessao.tenantId) } catch (e) { return { erro: msg(e, 'Não foi possível ver as lives da semana agora.') } }
}

/** "Criar agora": marca o culto para transmitir (se a regra não o fizesse) e cria já a live, sem esperar pelo cron. */
export async function criarLiveAgora(eventoId: number): Promise<{ ok: string; semana: SemanaDeLives } | Erro> {
    const sessao = await sessaoDaMidia()
    if (!sessao) return { erro: 'Só a Mídia e a administração.' }
    if (!Number.isInteger(eventoId) || eventoId <= 0) return { erro: 'Culto inválido.' }
    try {
        const e = await prisma.evento.findFirst({ where: { id: eventoId, tenant_id: sessao.tenantId }, select: { id: true, tipo: true, data: true } })
        if (!e) return { erro: 'Culto não encontrado.' }
        await prisma.evento.updateMany({ where: { id: eventoId, tenant_id: sessao.tenantId }, data: { transmitir_youtube: valorDaEscolha(e, true) } })
        const r = await sincronizarLives(sessao.tenantId, { soEvento: eventoId, origem: 'portal', por: await nomeDe(sessao.tenantId, sessao.membroId) })
        if (!r.ligado) return { erro: r.avisos[0] ?? 'O YouTube ainda não está ligado.' }
        return { ok: resumo(r), semana: await livesDaSemana(sessao.tenantId) }
    } catch (err) { return { erro: msg(err, 'Não foi possível criar a live agora.') } }
}

/** "Transmitir" / "Não transmitir": grava a escolha. Ao desligar, apaga a live se ainda não começou; ao ligar, o cron cria-a (ou "Criar agora"). */
export async function escolherTransmitir(eventoId: number, quer: boolean): Promise<{ ok: string; semana: SemanaDeLives } | Erro> {
    const sessao = await sessaoDaMidia()
    if (!sessao) return { erro: 'Só a Mídia e a administração.' }
    if (!Number.isInteger(eventoId) || eventoId <= 0 || typeof quer !== 'boolean') return { erro: 'Pedido inválido.' }
    try {
        const e = await prisma.evento.findFirst({ where: { id: eventoId, tenant_id: sessao.tenantId }, select: { id: true, tipo: true, data: true } })
        if (!e) return { erro: 'Culto não encontrado.' }
        await prisma.evento.updateMany({ where: { id: eventoId, tenant_id: sessao.tenantId }, data: { transmitir_youtube: valorDaEscolha(e, quer) } })
        let ok = quer ? 'Guardado. A live cria-se sozinha nos 7 dias antes do culto (ou carregue em «Criar agora»).' : 'Guardado: este culto não vai ser transmitido.'
        if (!quer) {
            const r = await sincronizarLives(sessao.tenantId, { soEvento: eventoId, origem: 'portal', por: await nomeDe(sessao.tenantId, sessao.membroId) })
            if (r.ligado && r.acoes.some((a) => a.acao === 'apagar' && a.ok)) ok = 'Guardado: a live que estava agendada foi apagada.'
        }
        return { ok, semana: await livesDaSemana(sessao.tenantId) }
    } catch (err) { return { erro: msg(err, 'Não foi possível guardar agora.') } }
}

// ---- Ligar o YoloBox (LA1) ----------------------------------------------------------------------------------------------------

export async function estadoYoloBox(): Promise<EstadoDaChave | Erro> {
    const sessao = await sessaoDaMidia()
    if (!sessao) return { erro: 'Só a Mídia e a administração.' }
    try { return await estadoDaChave(sessao.tenantId) } catch (e) { return { erro: msg(e, 'Não foi possível ver a chave agora.') } }
}

/** Cria a chave se não existir e mostra o servidor e a chave (lidos agora do YouTube; não ficam guardados). */
export async function mostrarChaveYoloBox(): Promise<ChaveParaMostrar | Erro> {
    const sessao = await sessaoDaMidia()
    if (!sessao) return { erro: 'Só a Mídia e a administração.' }
    try { return await ligarYoloBox(sessao.tenantId) } catch (e) { return { erro: msg(e, 'Não foi possível obter a chave agora.') } }
}

export async function gerarOutraChaveYoloBox(): Promise<(ChaveParaMostrar & { antigaApagada: boolean }) | Erro> {
    const sessao = await sessaoDaMidia()
    if (!sessao) return { erro: 'Só a Mídia e a administração.' }
    try {
        const nova = await gerarOutraChave(sessao.tenantId)
        // volta a ligar à chave nova a próxima live (as outras ficam para a passagem do cron)
        await sincronizarLives(sessao.tenantId, { origem: 'portal', por: await nomeDe(sessao.tenantId, sessao.membroId) }).catch(() => null)
        return nova
    } catch (e) { return { erro: msg(e, 'Não foi possível gerar outra chave agora.') } }
}
