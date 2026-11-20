// A decisão das lives agendadas (funções puras, sem base de dados nem YouTube): que cultos têm live (LA2), o que fazer a cada
// passagem do cron (criar, adotar, atualizar, apagar — LA3/LA5), qual live fica ligada à chave fixa (LA4) e o estado que o ecrã mostra (LA6).
// As horas dos cultos são a hora de Lisboa "escrita" em UTC (como o portal as guarda); `instanteDeLisboa` converte para o instante real.
import { quandoDoEvento } from '@/lib/divulgacao-kit'
import { instanteDeLisboa, limparDescricao, limparTitulo, ligarLiveAoCulto, type LiveYoutube } from '@/lib/youtube'

/** Só cultos (nunca Culto de Rua, convívios, reuniões…) têm live por regra. */
export const TIPOS_COM_LIVE = ['CULTO_REGULAR', 'CULTO_ESPECIAL']
/** Os tipos que o ecrã "Lives da semana" mostra (o culto de rua aparece para a Mídia o poder ligar à mão). */
export const TIPOS_NO_PAINEL = ['CULTO_REGULAR', 'CULTO_ESPECIAL', 'CULTO_RUA']
export const DIAS_COM_LIVE = [0, 3]   // domingo e quarta
export const DIAS_DE_ANTECEDENCIA = 7
export const MARCA_A_CRIAR = 'a-criar'

const MIN = 60000, HORA = 3600000, DIA = 86400000

export type CultoRegra = { tipo: string; data: Date; transmitir_youtube: boolean | null }

/** LA2: a escolha da Mídia manda (true/false); sem escolha (null), vale a regra: cultos de domingo e de quarta. */
export function cultoTransmite(c: CultoRegra): boolean {
    if (c.transmitir_youtube === true) return true
    if (c.transmitir_youtube === false) return false
    return TIPOS_COM_LIVE.includes(c.tipo) && DIAS_COM_LIVE.includes(c.data.getUTCDay())
}

/** O valor a gravar quando a Mídia carrega em "Transmitir" / "Não transmitir": só grava o que difere da regra (senão fica null = regra). */
export function valorDaEscolha(c: Omit<CultoRegra, 'transmitir_youtube'>, quer: boolean): boolean | null {
    const pelaRegra = cultoTransmite({ ...c, transmitir_youtube: null })
    return quer === pelaRegra ? null : quer
}

// ---- descrição (LD5) --------------------------------------------------------------------------------------------------------

export type DadosDescricao = { nome: string; data: Date; tema: string; preletor: string; igreja: string; site: string; instagram: string | null }

/** O modelo fixo: tema, preletor, quando e os links da igreja. */
export function descricaoDaLive(d: DadosDescricao): string {
    const q = quandoDoEvento(d.data)
    const linhas = [
        (d.tema || d.nome).trim(),
        d.preletor ? `Preletor: ${d.preletor.trim()}` : '',
        '',
        `${d.nome} · ${q.quando} às ${q.hora}`,
        '',
        d.igreja,
        `Site: ${d.site}`,
        d.instagram ? `Instagram: https://www.instagram.com/${d.instagram.replace(/^@/, '')}` : '',
    ]
    return limparDescricao(linhas.filter((l, i) => l !== '' || (i > 0 && linhas[i - 1] !== '')).join('\n').trim())
}

// ---- o plano de cada passagem -------------------------------------------------------------------------------------------------

export type CultoPlano = {
    id: number; nome: string; data: Date; tipo: string
    transmitir_youtube: boolean | null
    liveId: string | null              // Evento.youtube_live_id (pode ser a marca "a-criar")
    liveCriadaEm: Date | null
    titulo: string                     // o título "agendada" que a live deve ter (só preenchido se for para transmitir)
}

export type AcaoLive =
    | { acao: 'criar'; eventoId: number }
    | { acao: 'adotar'; eventoId: number; liveId: string }               // já há uma live à hora do culto (feita à mão): guarda-se o id, não se cria outra
    | { acao: 'atualizar'; eventoId: number; liveId: string; motivo: 'hora' | 'titulo' }
    | { acao: 'capa'; eventoId: number; liveId: string }                  // a live existe mas a capa/título "agendada" nunca ficaram registados
    | { acao: 'apagar'; eventoId: number; liveId: string }
    | { acao: 'limpar'; eventoId: number }                                // a live já não existe no YouTube e o culto já não a quer

const AINDA_NAO_COMECOU = ['created', 'ready']

export type OpcoesPlano = {
    agora: number
    dias?: number
    /** Ids de lives que já têm o registo "agendada" ok (para saber se falta a capa). */
    comCapa: Set<string>
    /** Só este culto, sem regra de janela de dias (o botão "Criar agora"). */
    soEvento?: number
}

/**
 * O que fazer a cada culto. Idempotente: corre-se tantas vezes quantas se quiser e só devolve o que ainda falta.
 * - nunca duas lives para o mesmo culto (usa o id guardado; senão adota uma live já marcada à hora do culto);
 * - só apaga lives que ainda não começaram (created/ready); em direto ou terminadas nunca se tocam;
 * - o marcador "a-criar" (de outra passagem a criar agora) vale 10 minutos.
 */
export function planearLives(cultos: CultoPlano[], lives: LiveYoutube[], o: OpcoesPlano): AcaoLive[] {
    const dias = o.dias ?? DIAS_DE_ANTECEDENCIA
    const porId = new Map(lives.map((l) => [l.id, l]))
    const usadas = new Set(cultos.map((c) => c.liveId).filter((x): x is string => !!x && x !== MARCA_A_CRIAR))
    const acoes: AcaoLive[] = []
    const ordenados = [...cultos].sort((a, b) => a.data.getTime() - b.data.getTime())
    for (const c of ordenados) {
        if (o.soEvento && c.id !== o.soEvento) continue
        const inicio = instanteDeLisboa(c.data)
        const naJanela = o.soEvento ? inicio > o.agora : inicio > o.agora && inicio <= o.agora + dias * DIA
        const quer = cultoTransmite(c)
        const aCriar = c.liveId === MARCA_A_CRIAR
        const claimRecente = aCriar && c.liveCriadaEm !== null && o.agora - c.liveCriadaEm.getTime() < 10 * MIN
        if (claimRecente) continue
        const liveId = c.liveId && !aCriar ? c.liveId : null
        const live = liveId ? porId.get(liveId) : undefined

        if (live) {
            const porComecar = !!live.ciclo && AINDA_NAO_COMECOU.includes(live.ciclo)
            if (!quer) { if (porComecar) acoes.push({ acao: 'apagar', eventoId: c.id, liveId: live.id }); continue }
            if (!porComecar || inicio <= o.agora) continue
            const titulo = limparTitulo(c.titulo)
            if (live.inicioAgendado === null || Math.abs(live.inicioAgendado - inicio) > MIN) acoes.push({ acao: 'atualizar', eventoId: c.id, liveId: live.id, motivo: 'hora' })
            else if (live.titulo !== titulo) acoes.push({ acao: 'atualizar', eventoId: c.id, liveId: live.id, motivo: 'titulo' })
            else if (!o.comCapa.has(live.id)) acoes.push({ acao: 'capa', eventoId: c.id, liveId: live.id })
            continue
        }

        // sem live no YouTube (nunca criada, ou apagada à mão)
        if (!quer) { if (c.liveId) acoes.push({ acao: 'limpar', eventoId: c.id }); continue }
        if (!naJanela) continue
        const livres = lives.filter((l) => !usadas.has(l.id))
        const ligada = ligarLiveAoCulto(livres, c.data, { estados: ['agendada'] })
        if (ligada) { usadas.add(ligada.live.id); acoes.push({ acao: 'adotar', eventoId: c.id, liveId: ligada.live.id }); continue }
        acoes.push({ acao: 'criar', eventoId: c.id })
    }
    return acoes
}

// ---- LA4: qual live fica ligada à chave --------------------------------------------------------------------------------------

export type AcaoChave = { acao: 'ligar'; liveId: string; streamId: string } | { acao: 'desligar'; liveId: string }

const LIGAVEL = ['created', 'ready', 'testing']
const NO_AR = ['live', 'liveStarting']

/**
 * Só a PRÓXIMA live fica ligada à chave fixa (duas ligadas com Auto Start podiam arrancar a errada):
 * a que está no ar, senão a mais próxima que ainda não acabou (uma que devia ter começado há mais de 4 h e nunca arrancou já não conta).
 * Quando a anterior termina, a seguinte passa a ser a próxima. `lives` = só as lives dos cultos do portal.
 */
export function planearLigacao(lives: LiveYoutube[], streamId: string, agora: number): AcaoChave[] {
    const vivas = lives.filter((l) => l.ciclo && (NO_AR.includes(l.ciclo) || (LIGAVEL.includes(l.ciclo) && (l.inicioAgendado ?? 0) >= agora - 4 * HORA)))
    vivas.sort((a, b) => Number(NO_AR.includes(b.ciclo ?? '')) - Number(NO_AR.includes(a.ciclo ?? '')) || (a.inicioAgendado ?? 0) - (b.inicioAgendado ?? 0))
    const alvo = vivas[0]
    const acoes: AcaoChave[] = []
    for (const l of lives) {
        if (!l.ciclo || !LIGAVEL.includes(l.ciclo)) continue
        if (l.id === alvo?.id) { if (l.streamId !== streamId) acoes.push({ acao: 'ligar', liveId: l.id, streamId }) }
        else if (l.streamId === streamId) acoes.push({ acao: 'desligar', liveId: l.id })
    }
    return acoes
}

// ---- LA6: o estado que o ecrã mostra -----------------------------------------------------------------------------------------

export type EstadoLiveCulto = 'por-criar' | 'agendada' | 'ligada' | 'no-ar' | 'terminada' | 'nao-transmitir'

export function estadoDoCulto(quer: boolean, live: LiveYoutube | undefined, streamId: string | null): EstadoLiveCulto {
    if (live?.ciclo && NO_AR.includes(live.ciclo)) return 'no-ar'
    if (live?.estado === 'terminada') return 'terminada'
    if (!quer) return 'nao-transmitir'
    if (!live) return 'por-criar'
    return streamId && live.streamId === streamId ? 'ligada' : 'agendada'
}

export const NOME_ESTADO_LIVE: Record<EstadoLiveCulto, string> = {
    'por-criar': 'Por criar', agendada: 'Agendada', ligada: 'Ligada à chave', 'no-ar': 'No ar', terminada: 'Terminada', 'nao-transmitir': 'Não transmitir',
}
