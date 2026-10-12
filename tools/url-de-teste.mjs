// tools/url-de-teste.mjs
// O endereco da base de TESTE e a protecao: so o schema admvc_teste.

import process from 'node:process'

export const SCHEMA_DE_TESTE = 'admvc_teste'

export function urlDeTeste() {
    try { process.loadEnvFile('.env') } catch { /* sem .env: so o ambiente */ }
    const url = process.env.DATABASE_URL_TESTE
    if (!url) throw new Error('Falta DATABASE_URL_TESTE no .env (base de teste, schema admvc_teste).')
    const schema = new URL(url).searchParams.get('schema')
    if (schema !== SCHEMA_DE_TESTE) {
        throw new Error(`DATABASE_URL_TESTE tem de apontar para o schema ${SCHEMA_DE_TESTE} (tem "${schema}"). Recuso para nao tocar noutros dados.`)
    }
    if (url === process.env.DATABASE_URL) throw new Error('DATABASE_URL_TESTE e igual a DATABASE_URL. Recuso.')
    return url
}

/** Cliente Prisma ligado a base de teste (mesma logica do lib/prisma.ts). */
export async function prismaDeTeste(url = urlDeTeste()) {
    const { PrismaClient } = await import('@prisma/client')
    const { PrismaPg } = await import('@prisma/adapter-pg')
    const { Pool } = (await import('pg')).default
    const u = new URL(url)
    const schema = u.searchParams.get('schema')
    for (const p of ['schema', 'connection_limit', 'pgbouncer', 'sslmode']) u.searchParams.delete(p)
    const pool = new Pool({ connectionString: u.toString(), max: 3, ssl: { rejectUnauthorized: false } })
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) })
    return { prisma, fechar: async () => { await prisma.$disconnect(); await pool.end() } }
}
