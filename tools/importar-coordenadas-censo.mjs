// tools/importar-coordenadas-censo.mjs
// Uma vez (15/10): as coordenadas das famílias do Censo (repos/censo-admvc, Upstash,
// token SÓ DE LEITURA) passam para os membros do portal com o mesmo telemóvel.
// Só preenche quem ainda não tem ponto (ou tem um de outra morada). Uma transação.
//
//   node tools/importar-coordenadas-censo.mjs --seco    → só mostra o que faria
//   node tools/importar-coordenadas-censo.mjs           → grava (base do .env = PRODUÇÃO)
//
// A "impressão da morada" (geo_chave) é a mesma de lib/mapa-familias.ts → chaveMorada.

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const dotenv = require('dotenv')
const { Client } = require('pg')

const seco = process.argv.includes('--seco')
const censo = dotenv.parse(readFileSync(new URL('../../censo-admvc/.env.local', import.meta.url)))
const portal = dotenv.parse(readFileSync(new URL('../.env', import.meta.url)))
if (!censo.KV_REST_API_URL || !censo.KV_REST_API_READ_ONLY_TOKEN) throw new Error('Faltam as variáveis do Upstash do Censo (.env.local)')

const digitos = t => (t ?? '').replace(/\D/g, '').replace(/^00/, '')
const mesmoTelefone = (a, b) => { const x = digitos(a), y = digitos(b); return x.length >= 9 && y.length >= 9 && x.slice(-9) === y.slice(-9) }
const limpo = t => (t ?? '').trim().replace(/\s+/g, ' ')
const chaveMorada = m => [m.address_1, m.address_number, m.postal_code, m.neighborhood, m.id_city].map(t => limpo(t).toLowerCase()).join('|')

async function kv(cmd) {
    const r = await fetch(censo.KV_REST_API_URL, {
        method: 'POST', headers: { Authorization: `Bearer ${censo.KV_REST_API_READ_ONLY_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(cmd),
    })
    const j = await r.json()
    if (j.error) throw new Error(j.error)
    return j.result
}
const hash = arr => { const o = {}; for (let i = 0; i < arr.length; i += 2) o[arr[i]] = JSON.parse(arr[i + 1]); return o }

const familias = hash(await kv(['HGETALL', 'censo:familias']))
const pessoas = Object.values(hash(await kv(['HGETALL', 'censo:pessoas'])))

const u = new URL(portal.DATABASE_URL); u.searchParams.delete('sslmode')
const c = new Client({ connectionString: u.toString(), ssl: { rejectUnauthorized: false } })
await c.connect()
const membros = (await c.query(`select id, first_name, phone_1, phone_2, address_1, address_number, postal_code, neighborhood, id_city, latitude, geo_chave
    from membros where tenant_id = (select id from "Tenant" where status='ATIVO' order by id limit 1) and is_active`)).rows

const atualizar = []
for (const m of membros) {
    if (m.latitude != null && m.geo_chave === chaveMorada(m)) continue // já tem ponto desta morada
    const p = pessoas.find(p => (p.phone_1 || p.telefone_chave) && (mesmoTelefone(m.phone_1, p.phone_1 || p.telefone_chave) || mesmoTelefone(m.phone_2, p.phone_1 || p.telefone_chave)))
    const f = p && familias[p.familia_id]
    if (f && f.lat != null && f.lon != null) atualizar.push({ id: m.id, lat: Number(f.lat), lon: Number(f.lon), chave: chaveMorada(m) })
}
console.log(`${membros.length} membros ativos; ${atualizar.length} recebem a posição do Censo${seco ? ' (modo seco: nada gravado)' : ''}`)

if (!seco && atualizar.length) {
    await c.query('BEGIN')
    for (const a of atualizar) {
        await c.query(`update membros set latitude=$2, longitude=$3, geo_fonte='censo', geo_chave=$4, geo_falhou=false where id=$1`, [a.id, a.lat, a.lon, a.chave])
    }
    await c.query('COMMIT')
    console.log('Gravado.')
}
await c.end()
