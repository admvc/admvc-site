import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// A base e o cookies() do Next sao simulados: so se testa a logica da sessao.
const membros = new Map<number, any>()
vi.mock('@/lib/prisma', () => ({
    default: {
        membro: { findUnique: vi.fn(async ({ where }: any) => membros.get(where.id) ?? null) },
    },
}))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))

import { assinarSessao, impressaoDaSenha, lerSessao, type PayloadMembro } from '@/lib/sessao-core'
import { sessaoDoCookie } from '@/lib/auth-utils'

const SEGREDO = 'x'.repeat(40)
const agora = () => Math.floor(Date.now() / 1000)

async function payload(extra: Partial<PayloadMembro> = {}): Promise<PayloadMembro> {
    return { t: 'm', id: 7, tid: 1, role: 'USER', plano: 'FREE', pw: await impressaoDaSenha('hash-1'), exp: agora() + 60, ...extra }
}

beforeEach(() => {
    vi.stubEnv('SESSION_SECRET', SEGREDO)
    membros.clear()
    membros.set(7, {
        id: 7, email: 'a@b.pt', role: 'USER', tenant_id: 1, congregacao_id: 3,
        is_active: true, password: 'hash-1', tenant: { plano: 'PRO' },
    })
})
afterEach(() => vi.unstubAllEnvs())

describe('assinatura', () => {
    it('le de volta o que assinou', async () => {
        const p = await payload()
        expect(await lerSessao(await assinarSessao(p))).toEqual(p)
    })

    it('recusa conteudo alterado', async () => {
        const [corpo, assinatura] = (await assinarSessao(await payload())).split('.')
        const alterado = JSON.parse(atob(corpo.replace(/-/g, '+').replace(/_/g, '/')))
        alterado.role = 'ADMIN'
        const corpoNovo = btoa(JSON.stringify(alterado)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        expect(await lerSessao(`${corpoNovo}.${assinatura}`)).toBeNull()
    })

    it('recusa outro segredo, sessao expirada e o formato antigo', async () => {
        expect(await lerSessao(await assinarSessao(await payload(), 'y'.repeat(40)))).toBeNull()
        expect(await lerSessao(await assinarSessao(await payload({ exp: agora() - 1 })))).toBeNull()
        expect(await lerSessao('id:1|role:ADMIN|tenant_id:1')).toBeNull()
        expect(await lerSessao('membro_1')).toBeNull()
    })

    it('sem segredo: nao assina e nenhuma sessao vale', async () => {
        const valor = await assinarSessao(await payload())
        vi.stubEnv('SESSION_SECRET', '')
        await expect(assinarSessao(await payload())).rejects.toThrow(/SESSION_SECRET/)
        expect(await lerSessao(valor)).toBeNull()
    })
})

describe('sessaoDoCookie (confirma na base)', () => {
    it('papel, igreja e plano vem da base, nao do cookie', async () => {
        const s = await sessaoDoCookie(await assinarSessao(await payload({ role: 'ADMIN', plano: 'FREE' })))
        expect(s).toEqual({ membroId: 7, tenantId: 1, role: 'USER', email: 'a@b.pt', plano: 'PRO', congregacaoId: 3 })
    })

    it('recusa depois de mudar a senha', async () => {
        const valor = await assinarSessao(await payload())
        membros.get(7).password = 'hash-2'
        expect(await sessaoDoCookie(valor)).toBeNull()
    })

    it('recusa membro inativo, apagado ou de outra igreja', async () => {
        const valor = await assinarSessao(await payload())
        membros.get(7).is_active = false
        expect(await sessaoDoCookie(valor)).toBeNull()

        membros.get(7).is_active = true
        membros.get(7).tenant_id = 2
        expect(await sessaoDoCookie(valor)).toBeNull()

        membros.delete(7)
        expect(await sessaoDoCookie(valor)).toBeNull()
    })

    it('recusa sessao de Super Admin no lugar da de membro', async () => {
        const sa = await assinarSessao({ t: 'sa', sa: 7, pw: await impressaoDaSenha('hash-1'), exp: agora() + 60 })
        expect(await sessaoDoCookie(sa)).toBeNull()
    })
})
