import { describe, expect, it } from 'vitest'
import { instanteDeLisboa, type LiveYoutube } from '@/lib/youtube'
import {
    MARCA_A_CRIAR, cultoTransmite, descricaoDaLive, estadoDoCulto, planearLigacao, planearLives, valorDaEscolha, type CultoPlano,
} from '@/lib/youtube-regra'

const D = (s: string) => new Date(`${s}:00Z`)   // hora de Lisboa "escrita" em UTC
const AGORA = Date.parse('2026-11-19T12:00:00Z')  // quinta-feira, inverno (Lisboa = UTC)

describe('LA2: que cultos têm live', () => {
    it('domingo e quarta, só cultos', () => {
        expect(cultoTransmite({ tipo: 'CULTO_REGULAR', data: D('2026-11-22T10:00'), transmitir_youtube: null })).toBe(true)   // domingo
        expect(cultoTransmite({ tipo: 'CULTO_ESPECIAL', data: D('2026-11-25T20:00'), transmitir_youtube: null })).toBe(true)  // quarta
        expect(cultoTransmite({ tipo: 'CULTO_REGULAR', data: D('2026-11-21T19:00'), transmitir_youtube: null })).toBe(false)  // sábado
        expect(cultoTransmite({ tipo: 'CULTO_RUA', data: D('2026-11-22T15:00'), transmitir_youtube: null })).toBe(false)
        for (const tipo of ['CONVIVIO', 'REUNIAO', 'FORMACAO', 'MISSAO', 'OUTRO']) expect(cultoTransmite({ tipo, data: D('2026-11-22T10:00'), transmitir_youtube: null })).toBe(false)
    })
    it('a escolha da Mídia manda sobre a regra', () => {
        expect(cultoTransmite({ tipo: 'CULTO_REGULAR', data: D('2026-11-22T10:00'), transmitir_youtube: false })).toBe(false)
        expect(cultoTransmite({ tipo: 'CULTO_RUA', data: D('2026-11-22T15:00'), transmitir_youtube: true })).toBe(true)
        expect(cultoTransmite({ tipo: 'REUNIAO', data: D('2026-11-24T20:00'), transmitir_youtube: true })).toBe(true)
    })
    it('só grava o que difere da regra (senão fica null = regra)', () => {
        const dom = { tipo: 'CULTO_REGULAR', data: D('2026-11-22T10:00') }
        expect(valorDaEscolha(dom, true)).toBeNull()
        expect(valorDaEscolha(dom, false)).toBe(false)
        const rua = { tipo: 'CULTO_RUA', data: D('2026-11-22T15:00') }
        expect(valorDaEscolha(rua, true)).toBe(true)
        expect(valorDaEscolha(rua, false)).toBeNull()
    })
})

describe('descrição (LD5)', () => {
    it('tema, preletor, quando e links da igreja', () => {
        const d = descricaoDaLive({ nome: 'Culto Dominical da Família', data: D('2026-11-22T10:00'), tema: 'Tesouro em vasos de barro', preletor: 'Pr. João Bosco', igreja: 'Igreja ADMVC', site: 'https://www.igrejaadmvc.org', instagram: '@admvc' })
        expect(d).toContain('Tesouro em vasos de barro')
        expect(d).toContain('Preletor: Pr. João Bosco')
        expect(d).toContain('Domingo, 22 nov às 10h00')
        expect(d).toContain('https://www.igrejaadmvc.org')
        expect(d).toContain('https://www.instagram.com/admvc')
        expect(d).not.toMatch(/[<>]/)
    })
    it('sem tema nem preletor: usa o nome do culto e não deixa linhas vazias a mais', () => {
        const d = descricaoDaLive({ nome: 'Quarta Profética', data: D('2026-11-25T20:00'), tema: '', preletor: '', igreja: 'Igreja ADMVC', site: 'https://www.igrejaadmvc.org', instagram: null })
        expect(d.startsWith('Quarta Profética')).toBe(true)
        expect(d).not.toContain('Preletor')
        expect(d).not.toContain('Instagram')
        expect(d).not.toMatch(/\n\n\n/)
    })
})

const culto = (id: number, data: string, extra: Partial<CultoPlano> = {}): CultoPlano => ({ id, nome: 'Culto', data: D(data), tipo: 'CULTO_REGULAR', transmitir_youtube: null, liveId: null, liveCriadaEm: null, titulo: 'Culto', ...extra })
const live = (id: string, inicio: string, extra: Partial<LiveYoutube> = {}): LiveYoutube => ({
    id, titulo: 'Culto', estado: 'agendada', inicioAgendado: Date.parse(inicio), inicioReal: null, fim: null, privacidade: 'public', ciclo: 'ready', streamId: null, ...extra,
})
const sem = new Set<string>()

describe('LA5: o plano de cada passagem', () => {
    it('cria as lives dos próximos 7 dias que faltam; o que está mais longe fica para depois', () => {
        const a = planearLives([culto(1, '2026-11-22T10:00'), culto(2, '2026-11-25T20:00'), culto(3, '2026-11-29T10:00')], [], { agora: AGORA, comCapa: sem })
        expect(a).toEqual([{ acao: 'criar', eventoId: 1 }, { acao: 'criar', eventoId: 2 }])
    })
    it('culto que já passou ou que não é para transmitir: nada', () => {
        expect(planearLives([culto(1, '2026-11-19T10:00'), culto(2, '2026-11-21T19:00'), culto(3, '2026-11-22T15:00', { tipo: 'CULTO_RUA' })], [], { agora: AGORA, comCapa: sem })).toEqual([])
    })
    it('idempotente: com a live já criada, igual e com capa, não faz nada', () => {
        const c = culto(1, '2026-11-22T10:00', { liveId: 'L1' })
        expect(planearLives([c], [live('L1', '2026-11-22T10:00:00Z')], { agora: AGORA, comCapa: new Set(['L1']) })).toEqual([])
    })
    it('mudou a hora → atualiza (hora de verão incluída); mudou o tema → atualiza o título', () => {
        const verao = culto(1, '2026-07-12T10:00', { liveId: 'L1' })   // 10h de Lisboa = 09h UTC
        const antes = Date.parse('2026-07-08T12:00:00Z')
        expect(planearLives([verao], [live('L1', '2026-07-12T09:00:00Z')], { agora: antes, comCapa: new Set(['L1']) })).toEqual([])
        expect(planearLives([verao], [live('L1', '2026-07-12T10:00:00Z')], { agora: antes, comCapa: new Set(['L1']) })).toEqual([{ acao: 'atualizar', eventoId: 1, liveId: 'L1', motivo: 'hora' }])
        const c = culto(1, '2026-11-22T10:00', { liveId: 'L1', titulo: 'Tema novo | Culto' })
        expect(planearLives([c], [live('L1', '2026-11-22T10:00:00Z', { titulo: 'Culto' })], { agora: AGORA, comCapa: new Set(['L1']) })).toEqual([{ acao: 'atualizar', eventoId: 1, liveId: 'L1', motivo: 'titulo' }])
    })
    it('capa que nunca ficou registada → repete a capa', () => {
        const c = culto(1, '2026-11-22T10:00', { liveId: 'L1' })
        expect(planearLives([c], [live('L1', '2026-11-22T10:00:00Z')], { agora: AGORA, comCapa: sem })).toEqual([{ acao: 'capa', eventoId: 1, liveId: 'L1' }])
    })
    it('deixou de transmitir: apaga só se ainda não começou', () => {
        const nao = (liveId: string) => culto(1, '2026-11-22T10:00', { liveId, transmitir_youtube: false })
        expect(planearLives([nao('L1')], [live('L1', '2026-11-22T10:00:00Z', { ciclo: 'ready' })], { agora: AGORA, comCapa: sem })).toEqual([{ acao: 'apagar', eventoId: 1, liveId: 'L1' }])
        expect(planearLives([nao('L1')], [live('L1', '2026-11-22T10:00:00Z', { ciclo: 'created' })], { agora: AGORA, comCapa: sem })).toHaveLength(1)
        for (const ciclo of ['live', 'liveStarting', 'testing', 'complete']) {
            expect(planearLives([nao('L1')], [live('L1', '2026-11-22T10:00:00Z', { ciclo })], { agora: AGORA, comCapa: sem })).toEqual([])
        }
    })
    it('nunca mexe numa live que já começou ou terminou, mesmo que a hora ou o título mudem', () => {
        const c = culto(1, '2026-11-22T10:00', { liveId: 'L1', titulo: 'Outro' })
        for (const ciclo of ['live', 'complete']) expect(planearLives([c], [live('L1', '2026-11-22T08:00:00Z', { ciclo })], { agora: Date.parse('2026-11-22T10:30:00Z'), comCapa: sem })).toEqual([])
    })
    it('adota uma live já marcada à hora do culto (feita à mão) em vez de criar outra; duas lives não vão para o mesmo culto', () => {
        const a = planearLives([culto(1, '2026-11-22T10:00')], [live('MAO', '2026-11-22T09:45:00Z')], { agora: AGORA, comCapa: sem })
        expect(a).toEqual([{ acao: 'adotar', eventoId: 1, liveId: 'MAO' }])
        const b = planearLives([culto(1, '2026-11-22T10:00'), culto(2, '2026-11-22T10:30', { nome: 'Outro' })], [live('MAO', '2026-11-22T10:10:00Z')], { agora: AGORA, comCapa: sem })
        expect(b.filter((x) => x.acao === 'adotar')).toHaveLength(1)
        expect(b.filter((x) => x.acao === 'criar')).toHaveLength(1)
    })
    it('o marcador "a-criar" recente (outra passagem a trabalhar) não duplica; o antigo (passagem que morreu) deixa criar', () => {
        const recente = culto(1, '2026-11-22T10:00', { liveId: MARCA_A_CRIAR, liveCriadaEm: new Date(AGORA - 2 * 60000) })
        const antigo = culto(1, '2026-11-22T10:00', { liveId: MARCA_A_CRIAR, liveCriadaEm: new Date(AGORA - 30 * 60000) })
        expect(planearLives([recente], [], { agora: AGORA, comCapa: sem })).toEqual([])
        expect(planearLives([antigo], [], { agora: AGORA, comCapa: sem })).toEqual([{ acao: 'criar', eventoId: 1 }])
    })
    it('live apagada à mão no YouTube: volta a criar; se já não é para transmitir, limpa o id', () => {
        expect(planearLives([culto(1, '2026-11-22T10:00', { liveId: 'APAGADA' })], [], { agora: AGORA, comCapa: sem })).toEqual([{ acao: 'criar', eventoId: 1 }])
        expect(planearLives([culto(1, '2026-11-22T10:00', { liveId: 'APAGADA', transmitir_youtube: false })], [], { agora: AGORA, comCapa: sem })).toEqual([{ acao: 'limpar', eventoId: 1 }])
    })
    it('só um culto (Criar agora): ignora o limite dos 7 dias mas não cria no passado', () => {
        const a = planearLives([culto(1, '2026-12-06T10:00'), culto(2, '2026-11-22T10:00')], [], { agora: AGORA, comCapa: sem, soEvento: 1 })
        expect(a).toEqual([{ acao: 'criar', eventoId: 1 }])
    })
})

describe('LA4: só a próxima live fica ligada à chave', () => {
    const S = 'STREAM1'
    it('duas por ligar: liga só a mais próxima', () => {
        const a = planearLigacao([live('B', '2026-11-25T20:00:00Z'), live('A', '2026-11-22T10:00:00Z')], S, AGORA)
        expect(a).toEqual([{ acao: 'ligar', liveId: 'A', streamId: S }])
    })
    it('desliga a que já não é a próxima e liga a certa; idempotente quando já está certo', () => {
        expect(planearLigacao([live('A', '2026-11-22T10:00:00Z'), live('B', '2026-11-25T20:00:00Z', { streamId: S })], S, AGORA))
            .toEqual([{ acao: 'ligar', liveId: 'A', streamId: S }, { acao: 'desligar', liveId: 'B' }])
        expect(planearLigacao([live('A', '2026-11-22T10:00:00Z', { streamId: S }), live('B', '2026-11-25T20:00:00Z')], S, AGORA)).toEqual([])
    })
    it('com uma live no ar, a seguinte espera (e se estava ligada, desliga-se)', () => {
        const agora = Date.parse('2026-11-22T10:30:00Z')
        const noAr = live('A', '2026-11-22T10:00:00Z', { ciclo: 'live', streamId: S })
        expect(planearLigacao([noAr, live('B', '2026-11-25T20:00:00Z')], S, agora)).toEqual([])
        expect(planearLigacao([noAr, live('B', '2026-11-25T20:00:00Z', { streamId: S })], S, agora)).toEqual([{ acao: 'desligar', liveId: 'B' }])
    })
    it('a anterior acabou: liga a seguinte', () => {
        const agora = Date.parse('2026-11-22T13:00:00Z')
        expect(planearLigacao([live('A', '2026-11-22T10:00:00Z', { ciclo: 'complete', estado: 'terminada' }), live('B', '2026-11-25T20:00:00Z')], S, agora)).toEqual([{ acao: 'ligar', liveId: 'B', streamId: S }])
    })
    it('uma live que devia ter começado há mais de 4 h e nunca arrancou deixa de bloquear a seguinte', () => {
        const agora = Date.parse('2026-11-22T15:00:00Z')
        expect(planearLigacao([live('A', '2026-11-22T10:00:00Z', { streamId: S }), live('B', '2026-11-25T20:00:00Z')], S, agora))
            .toEqual([{ acao: 'desligar', liveId: 'A' }, { acao: 'ligar', liveId: 'B', streamId: S }])
    })
})

describe('LA6: o estado que o ecrã mostra', () => {
    const l = (ciclo: string, streamId: string | null = null) => live('L', '2026-11-22T10:00:00Z', { ciclo, streamId, estado: ciclo === 'complete' ? 'terminada' : ciclo === 'live' ? 'direto' : 'agendada' })
    it('cada estado', () => {
        expect(estadoDoCulto(true, undefined, 'S')).toBe('por-criar')
        expect(estadoDoCulto(true, l('ready'), 'S')).toBe('agendada')
        expect(estadoDoCulto(true, l('ready', 'S'), 'S')).toBe('ligada')
        expect(estadoDoCulto(true, l('live', 'S'), 'S')).toBe('no-ar')
        expect(estadoDoCulto(true, l('complete'), 'S')).toBe('terminada')
        expect(estadoDoCulto(false, undefined, 'S')).toBe('nao-transmitir')
        expect(instanteDeLisboa(D('2026-11-22T10:00'))).toBe(Date.parse('2026-11-22T10:00:00Z'))
    })
})
