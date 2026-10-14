/**
 * Copia completa da base: todas as tabelas, de todas as igrejas, num JSON.
 * Igual a do Atelie; descarrega-se no Super Admin → Cópia de segurança.
 *
 * As tabelas saem do proprio schema (`generated/modelo.ts`, escrito em cada
 * `prisma generate` por tools/gerador-modelo.mjs): uma tabela nova entra na
 * copia no dia em que entra no schema, sem ninguem se lembrar dela. Vao
 * tambem as tabelas escondidas dos muitos-para-muitos (`_LideresGrupo`...).
 *
 * Fora de `actions/` de proposito: le a base inteira sem perguntar quem pede.
 */

import prisma, { ligacaoDoEndereco } from '@/lib/prisma'
import { LIGACOES, MODELOS } from '@/generated/modelo'
import pkg from '@/package.json'

export const APP_DA_COPIA = 'admvc'

export interface CopiaCompleta {
    app: typeof APP_DA_COPIA
    versao: string
    gravadoEm: string
    contagem: Record<string, number>
    tabelas: Record<string, unknown[]>
    /** Muitos-para-muitos: `_LideresGrupo` → [{ A, B }] */
    ligacoes: Record<string, { A: unknown; B: unknown }[]>
}

export function acessor(modelo: string): string {
    return modelo.charAt(0).toLowerCase() + modelo.slice(1)
}

/** Nome da tabela na base, com o schema (a base de teste nao usa o public). */
export function tabelaNaBase(nome: string): string {
    const schema = ligacaoDoEndereco(process.env.DATABASE_URL).schema ?? 'public'
    return `"${schema.replace(/"/g, '""')}"."${nome.replace(/"/g, '""')}"`
}

/**
 * Campos que nunca saem na copia: palavras-passe, tokens, a subscricao dos
 * avisos no telemovel. O ficheiro vai para o computador de alguem; repor uma
 * copia nunca precisa deles (o restauro mantem os de agora).
 *
 * Alem da lista, qualquer campo com nome de segredo fica de fora: um campo
 * novo `api_token` nao entra so porque alguem se esqueceu desta lista.
 */
const CAMPOS_FORA: Record<string, string[]> = { Membro: ['push_subscription'] }
const PARECE_SEGREDO = /password|senha|hash|token|secret/i

export function camposFora(modelo: string): string[] {
    const doModelo = MODELOS.find((m) => m.name === modelo)
    const porNome = (doModelo?.fields ?? [])
        .filter((f) => f.kind === 'scalar' && PARECE_SEGREDO.test(f.name))
        .map((f) => f.name)
    return [...new Set([...(CAMPOS_FORA[modelo] ?? []), ...porNome])]
}

export async function copiaCompleta(): Promise<CopiaCompleta> {
    const cliente = prisma as unknown as Record<string, { findMany: () => Promise<unknown[]> }>
    const tabelas: Record<string, unknown[]> = {}
    // Uma de cada vez: poucas ligacoes na base, e isto nao tem pressa.
    for (const m of MODELOS) {
        const fora = camposFora(m.name)
        let linhas: unknown[]
        try {
            linhas = await cliente[acessor(m.name)].findMany()
        } catch (err) {
            // O codigo ja tem a tabela e a base ainda nao (entre o deploy e a
            // migracao): sem tabela nao ha dados a perder.
            if ((err as { code?: string }).code === 'P2021') {
                console.warn(`[copia] a tabela ${m.name} ainda nao existe na base; fica de fora.`)
                continue
            }
            throw err
        }
        tabelas[m.name] = fora.length === 0
            ? linhas
            : linhas.map((l) => Object.fromEntries(Object.entries(l as Record<string, unknown>).filter(([k]) => !fora.includes(k))))
    }

    const ligacoes: CopiaCompleta['ligacoes'] = {}
    for (const l of LIGACOES) {
        ligacoes[l.name] = await prisma.$queryRawUnsafe<{ A: unknown; B: unknown }[]>(
            `SELECT "A", "B" FROM ${tabelaNaBase(l.name)} ORDER BY "A", "B"`,
        )
    }

    return {
        app: APP_DA_COPIA,
        versao: pkg.version,
        gravadoEm: new Date().toISOString(),
        contagem: {
            ...Object.fromEntries(Object.entries(tabelas).map(([k, v]) => [k, v.length])),
            ...Object.fromEntries(Object.entries(ligacoes).map(([k, v]) => [k, v.length])),
        },
        tabelas,
        ligacoes,
    }
}

/** `Date` sai como ISO; Json como esta. */
export function copiaEmJson(copia: CopiaCompleta): string {
    return JSON.stringify(copia)
}
