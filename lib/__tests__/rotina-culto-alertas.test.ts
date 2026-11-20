import { describe, expect, it } from 'vitest'
import {
    BENCAOS, bencaoDoCulto, cartaoVisivel, destinatarios, estadoDoKit, funcaoDoTelao, lerConfig, lerPedidoInicio, momentoDoAlerta, quandoDoCulto, textoAlerta,
} from '../rotina-config'

describe('config', () => {
    it('valores por omissão e limpeza', () => {
        expect(lerConfig(null)).toMatchObject({ funcoes: ['Projeção'], horaAlerta: 18, horaManha: 8, lumikitTipo: 'api' })
        const c = lerConfig({ funcoes: [' Som ', 'Som', ''], horaAlerta: 25, horaManha: '7', lumikitTipo: 'script', musica: 'a.mp3' })
        expect(c).toMatchObject({ funcoes: ['Som'], horaAlerta: 18, horaManha: 7, lumikitTipo: 'script', musica: 'a.mp3' })
    })
})

describe('destinatários', () => {
    it('compara a função sem acentos nem maiúsculas', () => {
        expect(funcaoDoTelao('PROJECAO', ['Projeção'])).toBe(true)
        expect(funcaoDoTelao('Som', ['Projeção'])).toBe(false)
        expect(funcaoDoTelao(null, ['Projeção'])).toBe(false)
    })
    it('escalados + líder, sem repetir', () => {
        const r = destinatarios([
            { membroId: 1, funcao: 'projecao', liderId: 9 },
            { membroId: 2, funcao: 'Projeção', liderId: 9 },     // o mesmo líder duas vezes
            { membroId: 3, funcao: 'Som', liderId: 8 },          // outra função: ninguém
        ], ['Projeção'])
        expect(r).toEqual([{ membroId: 1, papel: 'escalado' }, { membroId: 2, papel: 'escalado' }, { membroId: 9, papel: 'lider' }])
    })
    it('o líder que também está escalado conta uma só vez, como escalado', () => {
        const r = destinatarios([{ membroId: 9, funcao: 'Projeção', liderId: 9 }], ['Projeção'])
        expect(r).toEqual([{ membroId: 9, papel: 'escalado' }])
    })
})

describe('que alerta corre a esta hora (Lisboa)', () => {
    const cfg = { horaAlerta: 18, horaManha: 8 }
    it('18h de Lisboa no verão (17:00Z) → amanhã', () => {
        const m = momentoDoAlerta(new Date('2026-07-10T17:05:00Z'), cfg)
        expect(m).toMatchObject({ tipo: 'alerta_d1', quando: 'amanha' })
        expect(m!.de.toISOString()).toBe('2026-07-11T00:00:00.000Z')
        expect(m!.ate.toISOString()).toBe('2026-07-12T00:00:00.000Z')
    })
    it('18h no inverno (18:00Z)', () => {
        expect(momentoDoAlerta(new Date('2026-11-20T18:00:00Z'), cfg)?.tipo).toBe('alerta_d1')
        expect(momentoDoAlerta(new Date('2026-11-20T17:00:00Z'), cfg)).toBeNull()
    })
    it('8h → hoje', () => {
        const m = momentoDoAlerta(new Date('2026-11-21T08:10:00Z'), cfg)
        expect(m).toMatchObject({ tipo: 'alerta_dia', quando: 'hoje' })
        expect(m!.de.toISOString()).toBe('2026-11-21T00:00:00.000Z')
    })
    it('outras horas: nada', () => {
        expect(momentoDoAlerta(new Date('2026-11-21T13:00:00Z'), cfg)).toBeNull()
    })
    it('virada do dia: 23h30 de Lisboa no verão ainda é o dia de Lisboa', () => {
        const q = quandoDoCulto(new Date('2026-07-11T20:00:00Z'), new Date('2026-07-10T22:30:00Z'))   // 23h30 de dia 10 em Lisboa
        expect(q).toBe('amanha')
        expect(quandoDoCulto(new Date('2026-07-10T20:00:00Z'), new Date('2026-07-10T22:30:00Z'))).toBe('hoje')
        expect(quandoDoCulto(new Date('2026-07-13T20:00:00Z'), new Date('2026-07-10T22:30:00Z'))).toBeNull()
    })
})

describe('cartão do Início', () => {
    const culto = new Date('2026-11-22T10:00:00Z')   // domingo 10h (hora de parede)
    it('no dia, até o culto passar', () => {
        expect(cartaoVisivel(culto, new Date('2026-11-22T08:00:00Z'), 18)).toBe(true)
        expect(cartaoVisivel(culto, new Date('2026-11-22T11:00:00Z'), 18)).toBe(false)
    })
    it('na véspera só depois da hora do alerta', () => {
        expect(cartaoVisivel(culto, new Date('2026-11-21T17:00:00Z'), 18)).toBe(false)
        expect(cartaoVisivel(culto, new Date('2026-11-21T18:30:00Z'), 18)).toBe(true)
    })
})

describe('textos e estado', () => {
    const base = { nome: 'Culto da Família', data: new Date('2026-11-22T10:00:00Z'), eventoId: 7 }
    it('estado do kit', () => {
        expect(estadoDoKit(null)).toBe('sem-kit')
        expect(estadoDoKit({ publicado_em: null })).toBe('guardado')
        expect(estadoDoKit({ publicado_em: new Date() })).toBe('publicado')
    })
    it('não publicado: link para a Divulgação do culto', () => {
        const a = textoAlerta({ ...base, estado: 'guardado', quando: 'amanha' })
        expect(a.url).toBe('/midia/divulgacao?evento=7')
        expect(a.texto).toContain('amanhã às 10h')
        expect(a.texto).toContain('por publicar')
        expect(textoAlerta({ ...base, estado: 'sem-kit', quando: 'hoje' }).texto).toContain('ainda não foram feitas')
    })
    it('publicado: vira "Postar nas redes amanhã/hoje" com link para /divulgar', () => {
        const a = textoAlerta({ ...base, estado: 'publicado', quando: 'hoje' })
        expect(a.titulo).toBe('Postar nas redes hoje')
        expect(a.url).toContain('/divulgar')
        expect(textoAlerta({ ...base, estado: 'publicado', quando: 'amanha' }).assunto).toContain('amanhã')
    })
})

describe('bênção', () => {
    it('versículo da lista, estável por culto', () => {
        expect(bencaoDoCulto(1)).toEqual(bencaoDoCulto(1))
        expect(BENCAOS).toContainEqual(bencaoDoCulto(123))
        expect(BENCAOS[0].ref).toBe('Números 6:24-26')
    })
})

describe('contrato do POST do Holyrics', () => {
    it('aceita o corpo certo', () => {
        const p = lerPedidoInicio({ eventoId: 5, operador: ' Ana ', passos: [{ id: 'musica', nome: 'Música', ok: true, mensagem: 'a tocar' }, { id: 'luz', nome: 'Luz', ok: false, mensagem: 'sem ação' }] })
        expect(p).toEqual({ eventoId: 5, operador: 'Ana', passos: [{ id: 'musica', nome: 'Música', ok: true, mensagem: 'a tocar' }, { id: 'luz', nome: 'Luz', ok: false, mensagem: 'sem ação' }] })
    })
    it('recusa o que está mal', () => {
        expect(lerPedidoInicio(null)).toBeNull()
        expect(lerPedidoInicio({ eventoId: 'x', passos: [{ ok: true }] })).toBeNull()
        expect(lerPedidoInicio({ eventoId: 1, passos: [] })).toBeNull()
        expect(lerPedidoInicio({ eventoId: 1, passos: [{ id: 'a', nome: 'A', ok: 'sim' }] })).toBeNull()
    })
    it('operador em falta fica "Holyrics"', () => {
        expect(lerPedidoInicio({ eventoId: 1, passos: [{ id: 'a', nome: 'A', ok: true }] })?.operador).toBe('Holyrics')
    })
})
