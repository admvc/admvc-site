// DV4: a capa do YouTube tem UM padrão e UMA edição, guardados no kit do culto; a Aplicar, o cron, o agendamento e o Holyrics usam-nos.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { contextoYoutube, esquecerToken, LIMITE_CAPA_BYTES, type Transporte } from '@/lib/youtube'
import { reporSimulado, transporteSimulado } from '@/lib/youtube-simulado'

type Ev = { id: number; tenant_id: number; nome: string; data: Date; tipo: string; transmitir_youtube: boolean | null; youtube_live_id: string | null; youtube_live_criada_em: Date | null }
const bd = vi.hoisted(() => ({ receita: null as Record<string, unknown> | null, eventos: [] as Ev[], registos: [] as Record<string, unknown>[] }))

vi.mock('@/lib/prisma', () => ({
    default: {
        evento: {
            findFirst: async () => ({ id: 7, nome: 'Culto Dominical da Família', data: new Date('2026-11-22T10:00:00Z'), tipo: 'CULTO_REGULAR', youtube_live_id: null, kitDivulgacao: bd.receita ? { receita: bd.receita } : null, sermoes: [] }),
            findMany: async ({ where }: { where: Record<string, any> }) => bd.eventos.filter((e) => (!where.data || ((!where.data.gte || e.data >= where.data.gte) && (!where.data.lt || e.data < where.data.lt))) && (!where.id || e.id === where.id)),
            updateMany: async ({ where, data }: { where: Record<string, any>; data: Partial<Ev> }) => { const a = bd.eventos.filter((e) => e.id === where.id); a.forEach((e) => Object.assign(e, data)); return { count: a.length } },
        },
        tenant: { findUnique: async () => ({ nome: 'Igreja ADMVC', instagram_handle: 'admvc', youtube_stream_id: 'STREAM1' }), update: async () => ({}) },
        youtubeLiveRegisto: {
            create: async ({ data }: { data: Record<string, unknown> }) => { bd.registos.push({ ...data, criado_em: new Date() }); return {} },
            findMany: async () => [], findFirst: async () => null,
        },
    },
}))

import { normalizarReceita, receitaVazia } from '@/lib/divulgacao-kit'
import { PALETAS } from '@/lib/divulgacao'
import { ESTADOS_CAPA, capaEmBytes, enderecoDaCapa, semFoto, type DadosCapa, type EstadoCapa } from '@/lib/youtube-capa-dados'
import { PADROES_CAPA, capaYtVazia, lerCapaYt } from '@/lib/youtube-capa-receita'
import { aplicarLive, dadosDaCapa, dadosDoCulto, passoAutomatico, tituloDoEstado } from '@/lib/youtube-live'
import { sincronizarLives } from '@/lib/youtube-agendar'
import { capaLive, desenharCapaLive } from '@/lib/youtube-capa'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1])
const ENV = { YOUTUBE_CLIENT_ID: 'id', YOUTUBE_CLIENT_SECRET: 's', YOUTUBE_REFRESH_TOKEN: 'refresh-123456789' }
const HOJE = Date.parse('2026-11-19T00:00:00Z')
const json = (c: unknown, status = 200) => new Response(JSON.stringify(c), { status, headers: { 'Content-Type': 'application/json' } })

/** YouTube falso: uma live à hora do culto, no ciclo pedido. */
function youtubeFalso(ciclo = 'ready') {
    const transporte: Transporte = async (url, init) => {
        const u = new URL(url)
        if (u.hostname === 'oauth2.googleapis.com') return json({ access_token: 'a', expires_in: 3600 })
        if (u.pathname.endsWith('/liveBroadcasts')) return json({ items: [{ id: 'LIVE1', snippet: { title: 'Transmissão', scheduledStartTime: '2026-11-22T10:00:00Z' }, status: { lifeCycleStatus: ciclo } }] })
        if (u.pathname.endsWith('/thumbnails/set')) return json({ items: [{}] })
        if (u.pathname.endsWith('/videos')) return init?.method === 'PUT' ? json({}) : json({ items: [{ id: 'LIVE1', snippet: { title: 'x', description: '', categoryId: '29' } }] })
        return json({}, 404)
    }
    return contextoYoutube({ env: ENV, transporte })!
}

beforeEach(() => { esquecerToken(); reporSimulado(); bd.receita = { tema: 'Tesouro em vasos de barro', preletor: 'Pr. João Bosco', estilo: 'moldura', estilosSeparados: false, paleta: 'bordo-ambar' }; bd.registos = []; bd.eventos = [] })

describe('a receita guarda o padrão e a edição da capa', () => {
    it('sem escolha: "Igual às artes do culto"; valores desconhecidos voltam à omissão', () => {
        expect(receitaVazia().capaYt).toEqual(capaYtVazia())
        expect(normalizarReceita({}).capaYt.padrao).toBe('igual')
        expect(normalizarReceita({ capaYt: { padrao: 'inventado', fundo: 'x', foto: 'y', paleta: 'nao-existe' } }).capaYt).toEqual(capaYtVazia())
    })
    it('guarda e lê de volta (ida e volta), cortando os textos', () => {
        const c = { padrao: 'faixa', titulo: 'A fé | e *as obras*', subtitulo: 'Série Fé', preletor: 'Ev. Ana', quando: 'Sábado, 14 nov · 19h30', paleta: 'jovens', fundo: 'cores', foto: 'esquerda' }
        expect(normalizarReceita(JSON.parse(JSON.stringify(normalizarReceita({ capaYt: c })))).capaYt).toEqual(c)
        expect(lerCapaYt({ titulo: 'x'.repeat(200) }, PALETAS.map((p) => p.id)).titulo).toHaveLength(60)
    })
    it('os 7 padrões existem e o primeiro é o por omissão', () => {
        expect(PADROES_CAPA.map((p) => p.id)).toEqual(['igual', 'profundidade', 'centrado', 'faixa', 'moldura', 'editorial', 'evento'])
    })
    it('o endereço da capa leva a receita do ecrã (para ver antes de guardar)', () => {
        const u = enderecoDaCapa(7, normalizarReceita({ capaYt: { padrao: 'faixa' } }), 'direto', { w: 400 })
        expect(u).toContain('estado=direto')
        expect(u).toContain('previa=1&w=400')
        expect(decodeURIComponent(u)).toContain('"padrao":"faixa"')
    })
})

describe('dados da capa: omissão = igual às artes; edição manda', () => {
    it('sem escolha, usa a arte 16:9 do kit (estilo, cores) com o selo do estado', async () => {
        const c = (await dadosDoCulto(1, 7))!
        const d = dadosDaCapa(c, 'direto', HOJE)
        expect(d.padrao).toBe('igual')
        const q = new URLSearchParams(d.igual!)
        expect(q.get('formato')).toBe('youtube')
        expect(q.get('modelo')).toBe('moldura')            // o estilo do kit
        expect(q.get('paleta')).toBe('bordo-ambar')        // as cores do kit
        expect(q.get('estadoCapa')).toBe('direto')
        expect(q.get('selo')).toBe('EM DIRETO · AGORA')
        expect(q.get('tema') ?? q.get('titulo')).toContain('Tesouro')
    })
    it('os 4 estados existem em todos os padrões (rodapé/selo por estado; reserva = Culto em direto)', async () => {
        for (const padrao of PADROES_CAPA.map((p) => p.id)) {
            bd.receita = { ...bd.receita, capaYt: { padrao } }
            const c = (await dadosDoCulto(1, 7))!
            for (const e of ESTADOS_CAPA) {
                const d = dadosDaCapa(c, e, HOJE)
                expect(d.padrao).toBe(padrao)
                expect(d.estado).toBe(e)
                if (e === 'agendada') expect(d.rodape).toBe('DOMINGO · 10H00')
                if (e === 'arquivo') expect(d.rodape).toBe('22 NOV 2026')
                if (e === 'reserva') { expect(d.titulo).toContain('em direto'); expect(d.foto).toBeNull(); expect(d.preletor).toBe('') }
                if (padrao === 'igual' && e === 'reserva') expect(new URLSearchParams(d.igual!).get('titulo')).toBe('Culto *em direto*')
            }
        }
    })
    it('edição: título vazio = tema; | e *destaque* seguem; subtítulo e preletor mudam; texto de data/hora', async () => {
        bd.receita = { ...bd.receita, capaYt: { padrao: 'profundidade' } }
        expect(dadosDaCapa((await dadosDoCulto(1, 7))!, 'agendada', HOJE)).toMatchObject({ titulo: 'Tesouro em vasos de barro', culto: 'Culto Dominical da Família', preletor: 'Pr. João Bosco' })
        bd.receita = { ...bd.receita, capaYt: { padrao: 'profundidade', titulo: 'O *fruto* | do Espírito', subtitulo: 'Série Fé', preletor: 'Ev. Ana Reis', quando: 'Sábado, 5 dez · 19h30' } }
        const d = dadosDaCapa((await dadosDoCulto(1, 7))!, 'agendada', HOJE)
        expect(d).toMatchObject({ titulo: 'O *fruto* | do Espírito', culto: 'Série Fé', preletor: 'Ev. Ana Reis', rodape: 'SÁBADO, 5 DEZ · 19H30' })
    })
    it('"sem foto" e "só cores" tiram a foto e o fundo; a paleta escolhida troca as cores', async () => {
        const foto = { url: 'https://x.public.blob.vercel-storage.com/a.png', foco: '50% 30%', w: 800, h: 900, recorte: true }
        bd.receita = { ...bd.receita, fotoH: foto, fundo: 'palco', capaYt: { padrao: 'faixa' } }
        let d = dadosDaCapa((await dadosDoCulto(1, 7))!, 'agendada', HOJE)
        expect(d.foto).toMatchObject({ w: 800 }); expect(d.fundo).toBe('palco')
        bd.receita = { ...bd.receita, capaYt: { padrao: 'faixa', foto: 'sem', fundo: 'cores', paleta: 'jovens', } }
        d = dadosDaCapa((await dadosDoCulto(1, 7))!, 'agendada', HOJE)
        expect(d.foto).toBeNull(); expect(d.fundo).toBeNull(); expect(d.cores?.acento).toBe(PALETAS.find((p) => p.id === 'jovens')!.acento)
        bd.receita = { ...bd.receita, capaYt: { padrao: 'igual', foto: 'sem', fundo: 'cores' } }
        const q = new URLSearchParams(dadosDaCapa((await dadosDoCulto(1, 7))!, 'agendada', HOJE).igual!)
        expect(q.get('foto')).toBeNull(); expect(q.get('fundo')).toBeNull()
    })
    it('a receita do ecrã (por guardar) vale no lugar da guardada', async () => {
        const nova = normalizarReceita({ tema: 'Outro tema', capaYt: { padrao: 'editorial' } })
        const c = (await dadosDoCulto(1, 7, nova))!
        expect(dadosDaCapa(c, 'agendada', HOJE)).toMatchObject({ padrao: 'editorial', titulo: 'Outro tema' })
    })
    it('o título final da live segue a edição (título vazio, |, destaque, preletor)', async () => {
        bd.receita = { ...bd.receita, capaYt: { titulo: '' } }
        expect(tituloDoEstado((await dadosDoCulto(1, 7))!, 'agendada')).toBe('Tesouro em vasos de barro | Culto Dominical da Família | Pr. João Bosco')
        bd.receita = { ...bd.receita, capaYt: { titulo: 'A fé | e *as obras*', preletor: 'Ev. Ana Reis', subtitulo: 'Série Fé' } }
        const c = (await dadosDoCulto(1, 7))!
        expect(tituloDoEstado(c, 'agendada')).toBe('A fé e as obras | Série Fé | Ev. Ana Reis')
        expect(tituloDoEstado(c, 'arquivo')).toBe('A fé e as obras | Série Fé | Ev. Ana Reis | 22/11/2026')
    })
})

describe('tudo usa a mesma capa guardada', () => {
    const guardada = { padrao: 'moldura', titulo: 'Tema *escrito*', preletor: 'Ev. Ana Reis', paleta: 'jovens' }
    const esperado = expect.objectContaining({ padrao: 'moldura', titulo: 'Tema *escrito*', preletor: 'Ev. Ana Reis' })

    it('Aplicar (portal) e Holyrics: o padrão e a edição guardados, e o título da live', async () => {
        bd.receita = { ...bd.receita, capaYt: guardada }
        for (const origem of ['portal', 'holyrics'] as const) {
            esquecerToken()
            const capa = vi.fn().mockResolvedValue(PNG)
            const r = await aplicarLive(1, 7, 'direto', { origem, por: 'x' }, { ctx: youtubeFalso(), capa })
            expect(capa).toHaveBeenCalledWith(esperado)
            expect(r.titulo).toBe('Tema escrito | Culto Dominical da Família | Ev. Ana Reis')
        }
    })
    it('cron (Em direto / Arquivo): o mesmo padrão e a mesma edição', async () => {
        bd.receita = { ...bd.receita, capaYt: guardada }
        bd.eventos = [{ id: 7, tenant_id: 1, nome: 'Culto Dominical da Família', data: new Date('2026-11-22T10:00:00Z'), tipo: 'CULTO_REGULAR', transmitir_youtube: null, youtube_live_id: null, youtube_live_criada_em: null }]
        vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-22T10:30:00Z'))
        try {
            for (const [ciclo, estado] of [['live', 'direto'], ['complete', 'arquivo']] as const) {
                esquecerToken()
                const capa = vi.fn().mockResolvedValue(PNG)
                const r = await passoAutomatico(1, { ctx: youtubeFalso(ciclo), capa })
                expect(r.passos).toMatchObject([{ estado, resultado: 'aplicada' }])
                expect(capa).toHaveBeenCalledWith(expect.objectContaining({ padrao: 'moldura', estado, titulo: 'Tema *escrito*' }))
            }
        } finally { vi.useRealTimers() }
    })
    it('agendamento automático: a capa "agendada" criada com a live usa o padrão guardado e o título editado', async () => {
        bd.receita = { ...bd.receita, capaYt: guardada }
        bd.eventos = [{ id: 7, tenant_id: 1, nome: 'Culto Dominical da Família', data: new Date('2026-11-22T10:00:00Z'), tipo: 'CULTO_REGULAR', transmitir_youtube: null, youtube_live_id: null, youtube_live_criada_em: null }]
        const pedidos: { url: string; corpo?: string }[] = []
        const sim = transporteSimulado({ YOUTUBE_SIMULADO_LIVES: 'nenhuma' })
        const transporte: Transporte = async (url, init) => { pedidos.push({ url, corpo: typeof init?.body === 'string' ? init.body : undefined }); return sim(url, init) }
        const capa = vi.fn().mockResolvedValue(PNG)
        const r = await sincronizarLives(1, { origem: 'cron' }, { ctx: contextoYoutube({ env: ENV, transporte })!, agora: () => Date.parse('2026-11-19T12:00:00Z'), capa })
        expect(r.acoes.some((a) => a.acao === 'criar' && a.ok)).toBe(true)
        expect(capa).toHaveBeenCalledWith(expect.objectContaining({ padrao: 'moldura', estado: 'agendada', titulo: 'Tema *escrito*' }))
        const insert = pedidos.find((p) => p.url.includes('/liveBroadcasts?part=snippet,status,contentDetails'))!
        expect(JSON.parse(insert.corpo!).snippet.title).toBe('Tema escrito | Culto Dominical da Família | Ev. Ana Reis')
    })
})

describe('o desenho de cada padrão × estado: PNG 1280×720 válido e ≤ 2 MB', () => {
    const lerPng = (b: Uint8Array) => ({ ok: Buffer.from(b.subarray(0, 8)).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), w: Buffer.from(b).readUInt32BE(16), h: Buffer.from(b).readUInt32BE(20) })
    const casos = PADROES_CAPA.flatMap((p) => ESTADOS_CAPA.map((e) => [p.id, e] as [string, EstadoCapa]))
    it.each(casos)('%s / %s', async (padrao, estado) => {
        bd.receita = { ...bd.receita, capaYt: { padrao, titulo: 'Tesouro em *vasos de barro*' } }
        const d = dadosDaCapa((await dadosDoCulto(1, 7))!, estado, HOJE)
        const png = await capaLive(d)
        const { ok, w, h } = lerPng(png)
        expect(ok).toBe(true)
        expect([w, h]).toEqual([1280, 720])
        expect(png.length).toBeLessThanOrEqual(LIMITE_CAPA_BYTES)
    }, 60000)
    it('a versão pequena (miniatura) mantém a proporção', async () => {
        bd.receita = { ...bd.receita, capaYt: { padrao: 'faixa' } }
        const img = await desenharCapaLive(dadosDaCapa((await dadosDoCulto(1, 7))!, 'agendada', HOJE), 0.3125)
        const { w, h } = lerPng(new Uint8Array(await img.arrayBuffer()))
        expect([w, h]).toEqual([400, 225])
    }, 60000)
})

describe('limite de 2 MB com foto ou fundo', () => {
    const base: DadosCapa = { estado: 'agendada', categoria: 'regular', titulo: 'T', culto: 'C', preletor: '', rodape: 'X', foto: null }
    it('passou de 2 MB → refaz sem a foto e sem o fundo (também no padrão "igual")', async () => {
        const vistos: DadosCapa[] = []
        const desenhar = async (d: DadosCapa) => { vistos.push(d); return new Response(new Uint8Array(d.foto || d.fundo || d.igual?.includes('foto=') ? LIMITE_CAPA_BYTES + 5 : 900)) }
        const png = await capaEmBytes({ ...base, padrao: 'igual', igual: 'formato=youtube&foto=https%3A%2F%2Fx&fw=1&fh=1&fundo=palco&aj=1,1,1', fundo: 'palco' }, desenhar)
        expect(png.length).toBe(900)
        expect(vistos).toHaveLength(2)
        expect(vistos[1].igual).toBe('formato=youtube')
        expect(semFoto({ ...base, foto: { url: 'u', w: 1, h: 1, recorte: true }, fundo: 'palco' })).toMatchObject({ foto: null, fundo: null })
    })
})
