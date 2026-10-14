'use server'

/**
 * Restaurar uma copia completa, em dois passos: analisar (le o ficheiro e diz
 * o que muda, sem tocar na base) e restaurar (com "RESTAURAR" escrito a mao).
 * So um Super Admin ADMIN. Igual ao do Atelie.
 */

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { saAdmin, SEM_PERMISSAO_COPIA } from '@/lib/copia/acesso'
import { copiaCompleta, copiaEmJson } from '@/lib/copia/gerar'
import { guardarCopia } from '@/lib/copia/guardadas'
import { analisarCopia, lerCopia, MAX_COPIA, restaurar, type LinhaDaAnalise } from '@/lib/copia/restaurar'

export interface EstadoDaCopia {
    ok: boolean
    message?: string
}

export interface AnaliseDaCopia extends EstadoDaCopia {
    gravadoEm?: string
    versao?: string
    tabelas?: LinhaDaAnalise[]
    avisos?: string[]
}

const mensagem = (err: unknown) => (err instanceof Error ? err.message : 'Erro inesperado.')

async function exigirAdmin() {
    const s = await saAdmin()
    if (!s) throw new Error(SEM_PERMISSAO_COPIA)
    return s
}

async function lerFicheiro(form: FormData) {
    const ficheiro = form.get('ficheiro')
    if (!(ficheiro instanceof File) || ficheiro.size === 0) throw new Error('Escolha o ficheiro da cópia (.json).')
    if (ficheiro.size > MAX_COPIA) {
        throw new Error(`O ficheiro tem ${(ficheiro.size / 1_000_000).toFixed(1)} MB, acima do que a app aceita por aqui. Para uma base deste tamanho, restaure a cópia do GitHub (docs/COPIAS.md).`)
    }
    return lerCopia(await ficheiro.text())
}

export async function analisarCopiaAction(form: FormData): Promise<AnaliseDaCopia> {
    try {
        await exigirAdmin()
        const c = await lerFicheiro(form)
        const a = await analisarCopia(c)
        return { ok: true, gravadoEm: c.gravadoEm, versao: c.versao, tabelas: a.tabelas, avisos: [...c.avisos, ...a.avisos] }
    } catch (err) {
        return { ok: false, message: mensagem(err) }
    }
}

export async function restaurarCopiaAction(form: FormData): Promise<EstadoDaCopia> {
    try {
        const eu = await exigirAdmin()
        if (String(form.get('confirmacao') ?? '').trim().toUpperCase() !== 'RESTAURAR') {
            throw new Error('Para confirmar, escreva RESTAURAR.')
        }
        const c = await lerFicheiro(form)

        // Primeiro a copia do que esta agora. Se falhar, nao se restaura.
        const antes = await guardarCopia(copiaEmJson(await copiaCompleta()), 'antes-de-restaurar')
        const contagem = await restaurar(c)

        const total = Object.values(contagem).reduce((a, b) => a + b, 0)
        await prisma.superAdminLog.create({
            data: {
                sa_id: eu.saId,
                acao: 'RESTAURAR_COPIA',
                detalhes: `Cópia de ${c.gravadoEm.slice(0, 16).replace('T', ' ')}: ${total} linhas repostas; a de antes ficou em ${antes}`,
            },
        })
        revalidatePath('/', 'layout')
        const dia = new Date(c.gravadoEm).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon', dateStyle: 'short', timeStyle: 'short' })
        return { ok: true, message: `Restaurada a cópia de ${dia}. O que havia antes ficou guardado em "Cópias guardadas pela app".` }
    } catch (err) {
        return { ok: false, message: mensagem(err) }
    }
}
