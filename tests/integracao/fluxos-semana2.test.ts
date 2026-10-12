// Fluxos da semana 2 que so se testam a gravar (base de teste):
// senha antiga bloqueada, definir senha por link, anonimizar, retencao RGPD.

import { describe, it, expect, afterEach } from 'vitest'
import bcrypt from 'bcryptjs'
import { entrarComo, sair, tentar, foiRecusado, membroPorEmail, prisma } from './ajuda'

import { validarLoginGeral } from '@/actions/auth-actions'
import { definirNovaSenha, verificarLinkNovaSenha } from '@/actions/senha-actions'
import { anonimizarMembroAction } from '@/actions/rgpd-actions'
import { criarLinkRedefinir } from '@/lib/redefinir-senha'
import { GET as cronRetencao } from '@/app/api/cron/rgpd-retencao/route'

afterEach(() => sair())

describe('senhas', () => {
    it('a senha antiga atribuida pelo sistema nao entra', async () => {
        const r: any = await tentar(() => validarLoginGeral('senha-antiga@a.teste', 'admvc123'))
        expect(r?.autorizado).toBe(false)
        expect(r?.erro).toMatch(/definir uma nova palavra-passe/)
    })

    it('a senha certa de uma conta normal entra (redirect = sucesso)', async () => {
        const r: any = await tentar(() => validarLoginGeral('user@a.teste', 'senha-de-teste-123'))
        expect(r?.lancou).toMatch(/NEXT_REDIRECT/)
    })

    it('definir uma senha pelo link: funciona uma vez e o link morre', async () => {
        const m = await membroPorEmail('senha-antiga@b.teste')
        const token = decodeURIComponent((await criarLinkRedefinir(m)).split('t=')[1])
        expect(await verificarLinkNovaSenha(token)).toBe(true)

        const f = new FormData()
        f.set('t', token); f.set('senha', 'curta'); f.set('confirmacao', 'curta')
        expect(foiRecusado(await definirNovaSenha(f))).toBe(true)

        f.set('senha', 'uma frase longa e nova'); f.set('confirmacao', 'uma frase longa e nova')
        expect(foiRecusado(await definirNovaSenha(f))).toBe(false)
        const depois = await membroPorEmail('senha-antiga@b.teste')
        expect(await bcrypt.compare('uma frase longa e nova', depois.password!)).toBe(true)

        expect(await verificarLinkNovaSenha(token)).toBe(false)
        expect(foiRecusado(await definirNovaSenha(f))).toBe(true)
    })
})

describe('RGPD', () => {
    it('o ADMIN anonimiza um membro (com o nome certo) e o historico fica', async () => {
        const admin = await membroPorEmail('admin@b.teste')
        const alvo = await prisma.membro.create({
            data: {
                first_name: 'Para', last_name: 'Anonimizar', email: `anon-${Date.now()}@b.teste`, password: 'x',
                role: 'USER', status: 'ATIVO', is_active: true, tenant_id: admin.tenant_id, phone_1: '912000000',
            },
        })
        await entrarComo('admin@b.teste')
        expect(foiRecusado(await anonimizarMembroAction(alvo.id, 'Nome Errado'))).toBe(true)
        expect(foiRecusado(await anonimizarMembroAction(alvo.id, 'para anonimizar'))).toBe(false)
        const depois = await prisma.membro.findUnique({ where: { id: alvo.id } })
        expect(depois).toMatchObject({ first_name: 'Membro', phone_1: null, password: null, is_active: false })
        expect(depois?.email).toBe(`removido-${alvo.id}@anonimo.invalid`)
    })

    it('a retencao apaga pedidos de oracao antigos e anonimiza visitantes esquecidos', async () => {
        const pedir = (q = '') => cronRetencao(new Request(`http://x/api/cron/rgpd-retencao${q}`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }))
        process.env.CRON_SECRET = 'cron-dos-testes'

        const ensaio = await (await pedir('?ensaio=1')).json()
        expect(ensaio.ensaio).toBe(true)

        const r = await (await pedir()).json()
        expect(r.ok).toBe(true)

        const comPedido = await prisma.visitante.findMany({ where: { nome: { startsWith: 'Visitante com pedido' } } })
        expect(comPedido.every((v) => v.pedido_oracao === null)).toBe(true)
        expect(await prisma.visitante.count({ where: { nome: { startsWith: 'Visitante esquecido' } } })).toBe(0)
        expect(await prisma.visitante.count({ where: { nome: { startsWith: 'Visitante recente' } } })).toBe(2)

        // Sem segredo: recusado
        expect((await cronRetencao(new Request('http://x/api/cron/rgpd-retencao'))).status).toBe(401)
    })
})
