import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({ default: {} }))
vi.mock('@/lib/mail', () => ({ enviarEmailNovaSenha: vi.fn(async () => ({ ok: true })) }))
vi.mock('@/lib/redis', () => ({ redis: null }))

import { eSenhaConhecida, validarSenhaNova } from '@/lib/senhas'
import { assinarSessao, impressaoDaSenha, lerLinkRedefinir, lerSessao } from '@/lib/sessao-core'
import { criarLinkRedefinir, linkValidoPara, urlDoPortal } from '@/lib/redefinir-senha'
import {
    camposAnonimosMembro, CAMPOS_ANONIMOS_VISITANTE, filtroPedidosExpirados, filtroVisitantesExpirados,
    limitesDeRetencao, mesesAntes,
} from '@/lib/rgpd'
import { rateLimit } from '@/lib/rate-limit'
import { cronAutorizado } from '@/lib/cron'

beforeEach(() => vi.stubEnv('SESSION_SECRET', 's'.repeat(40)))
afterEach(() => vi.unstubAllEnvs())

describe('regras de senha', () => {
    it('recusa curtas, conhecidas, repetidas e com o email', () => {
        expect(validarSenhaNova('curta1')).toMatch(/10 caracteres/)
        expect(validarSenhaNova('admvc123')).toMatch(/10 caracteres/)
        expect(validarSenhaNova('1234567890')).toMatch(/fácil/)
        expect(validarSenhaNova('aaaaaaaaaaaa')).toMatch(/fácil/)
        expect(validarSenhaNova('joaosilva2026!', 'joaosilva@gmail.com')).toMatch(/email/)
    })

    it('aceita uma frase razoavel', () => {
        expect(validarSenhaNova('cafe com pao de manha', 'joao@x.pt')).toBeNull()
    })

    it('reconhece as senhas atribuidas pelo sistema antigo', () => {
        expect(eSenhaConhecida('admvc123')).toBe(true)
        expect(eSenhaConhecida('ADMVC123')).toBe(true)
        expect(eSenhaConhecida('admin123')).toBe(true)
        expect(eSenhaConhecida('joao2024!', 'João Silva')).toBe(true)
        expect(eSenhaConhecida('outra-senha-qualquer', 'João')).toBe(false)
    })
})

describe('link para definir a palavra-passe', () => {
    const membro = { id: 5, password: 'hash-antigo' }

    it('aponta para APP_URL e nunca para o Host do pedido', async () => {
        vi.stubEnv('APP_URL', 'https://portal.exemplo.pt/')
        expect(urlDoPortal()).toBe('https://portal.exemplo.pt')
        expect(await criarLinkRedefinir(membro)).toMatch(/^https:\/\/portal\.exemplo\.pt\/membros\/nova-senha\?t=/)
    })

    it('vale para o membro certo enquanto a senha nao muda (uso unico)', async () => {
        const token = decodeURIComponent((await criarLinkRedefinir(membro)).split('t=')[1])
        expect(await linkValidoPara(token, membro)).toBe(true)
        expect(await linkValidoPara(token, { id: 6, password: 'hash-antigo' })).toBe(false)
        expect(await linkValidoPara(token, { id: 5, password: 'hash-novo' })).toBe(false)
    })

    it('funciona para contas criadas sem senha', async () => {
        const semSenha = { id: 9, password: null }
        const token = decodeURIComponent((await criarLinkRedefinir(semSenha)).split('t=')[1])
        expect(await linkValidoPara(token, semSenha)).toBe(true)
    })

    it('expira e nunca serve como sessao (nem uma sessao como link)', async () => {
        const agora = Math.floor(Date.now() / 1000)
        const expirado = await assinarSessao({ t: 'r', id: 5, pw: await impressaoDaSenha('hash-antigo'), exp: agora - 1 })
        expect(await lerLinkRedefinir(expirado)).toBeNull()

        const link = await assinarSessao({ t: 'r', id: 5, pw: 'x', exp: agora + 60 })
        expect(await lerSessao(link)).toBeNull()

        const sessao = await assinarSessao({ t: 'm', id: 5, tid: 1, role: 'USER', plano: 'FREE', pw: 'x', exp: agora + 60 })
        expect(await lerLinkRedefinir(sessao)).toBeNull()
    })
})

describe('RGPD', () => {
    it('anonimizar um membro limpa o que o identifica e desativa a conta', () => {
        const c = camposAnonimosMembro(42) as Record<string, unknown>
        expect(c.first_name).toBe('Membro')
        expect(c.last_name).toBe('removido #42')
        expect(c.email).toBe('removido-42@anonimo.invalid')
        for (const campo of ['password', 'phone_1', 'phone_2', 'address_1', 'postal_code', 'birthdate', 'tax_id',
            'id_card_number', 'avatar_file', 'baptism_date', 'notes', 'spouse_name', 'father_name', 'mother_name']) {
            expect(c[campo], campo).toBeNull()
        }
        expect(c.is_active).toBe(false)
        // O historico (escalas, contribuicoes) nao e tocado
        expect(c).not.toHaveProperty('escalas')
        expect(c).not.toHaveProperty('contribuicoes')
    })

    it('anonimizar um visitante apaga contactos e o pedido de oracao', () => {
        expect(CAMPOS_ANONIMOS_VISITANTE).toMatchObject({ telefone: '', email: null, pedido_oracao: null, notas_lider: null })
    })

    it('prazos: 12 meses para visitantes, 3 para pedidos de oracao', () => {
        const agora = new Date('2026-10-11T12:00:00Z')
        const l = limitesDeRetencao(agora)
        expect(l.visitante.toISOString().slice(0, 10)).toBe('2025-10-11')
        expect(l.pedidoOracao.toISOString().slice(0, 10)).toBe('2026-07-11')
        expect(mesesAntes(new Date('2026-05-31T12:00:00Z'), 3).toISOString().slice(0, 7)).toBe('2026-03')
    })

    it('filtros: visitante so expira sem visita nem contacto desde o limite', () => {
        const limite = new Date('2025-10-11')
        expect(filtroVisitantesExpirados(limite)).toMatchObject({
            data_ultima_visita: { lt: limite },
            acompanhamentos: { none: { data_contacto: { gte: limite } } },
        })
        expect(filtroPedidosExpirados(limite)).toMatchObject({ pedido_oracao: { not: null }, data_primeira_visita: { lt: limite } })
    })
})

describe('limite de pedidos sem Redis (memoria)', () => {
    it('deixa passar ate ao limite e depois recusa', async () => {
        const id = `teste:${Math.random()}`
        expect((await rateLimit(id, 2, 60000)).success).toBe(true)
        expect((await rateLimit(id, 2, 60000)).success).toBe(true)
        expect((await rateLimit(id, 2, 60000)).success).toBe(false)
    })
})

describe('cron', () => {
    const pedido = (auth?: string) => new Request('http://x/api/cron/a', { headers: auth ? { authorization: auth } : {} })

    it('sem CRON_SECRET ninguem passa (nem "Bearer undefined")', () => {
        vi.stubEnv('CRON_SECRET', '')
        expect(cronAutorizado(pedido('Bearer undefined'))).toBe(false)
        expect(cronAutorizado(pedido())).toBe(false)
    })

    it('com CRON_SECRET so o valor certo passa', () => {
        vi.stubEnv('CRON_SECRET', 'segredo-do-cron')
        expect(cronAutorizado(pedido('Bearer segredo-do-cron'))).toBe(true)
        expect(cronAutorizado(pedido('Bearer outro'))).toBe(false)
    })
})
