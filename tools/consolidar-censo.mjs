// tools/consolidar-censo.mjs
// Consolida os dados do censo-admvc (Upstash Redis) para o admvc (Supabase/Prisma).
//
// Uso:
//   node tools/consolidar-censo.mjs                 → dry-run (só relatório)
//   node tools/consolidar-censo.mjs --aplicar       → escreve no Supabase
//   node tools/consolidar-censo.mjs --aplicar --teste  → escreve na base de TESTE
//
// O censo e o admvc usam bases Redis DIFERENTES. O script lê as credenciais do
// censo a partir de CENSO_REDIS_URL / CENSO_REDIS_TOKEN no .env, ou, se não
// existirem, do .env.local do projecto censo-admvc (../censo-admvc/.env.local).
//
// O que faz:
//   1. Lê todas as famílias e pessoas do censo (Redis, chaves `censo:*`)
//   2. Lê todos os membros do admvc (Prisma)
//   3. Cruza por telefone (normalizado, só dígitos com indicativo)
//   4. Para cada pessoa do censo:
//      - Se já existe no admvc → enriquece campos vazios (endereço, bairro, etc.)
//      - Se não existe → cria membro novo
//   5. Cria/vincula famílias no admvc
//   6. Gera relatório CSV em tools/consolidar-censo-resultado.csv
//
// Regras de segurança:
//   - NUNCA sobrescreve dados existentes no admvc (só preenche vazios)
//   - Sem --aplicar, só imprime o que faria (dry-run)
//   - Sem --teste, usa a DATABASE_URL de produção

import process from 'node:process'

// ── Args ─────────────────────────────────────────────────────────────────
const APLICAR = process.argv.includes('--aplicar')
const USAR_TESTE = process.argv.includes('--teste')

// ── Env ──────────────────────────────────────────────────────────────────
try { process.loadEnvFile('.env') } catch { /* sem .env */ }

// ── Redis (censo) ────────────────────────────────────────────────────────
// O censo e o admvc usam bases Redis DIFERENTES. Lê as credenciais do censo
// a partir de CENSO_REDIS_URL/TOKEN no .env do admvc, ou, se não existirem,
// parseia o .env.local do projecto censo-admvc vizinho (sem loadEnvFile, que
// não sobrescreve variáveis já definidas).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function parseEnvFile(caminho) {
    try {
        const texto = readFileSync(resolve(caminho), 'utf8')
        const vars = {}
        for (const linha of texto.split('\n')) {
            const m = linha.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)/)
            if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
        }
        return vars
    } catch { return null }
}

let REDIS_URL = (process.env.CENSO_REDIS_URL || '').replace(/\/+$/, '')
let REDIS_TOKEN = process.env.CENSO_REDIS_TOKEN || ''

if (!REDIS_URL || !REDIS_TOKEN) {
    for (const p of ['../censo-admvc/.env.local', '../censo-admvc/.env']) {
        const vars = parseEnvFile(p)
        if (!vars) continue
        REDIS_URL = (vars.KV_REST_API_URL || vars.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '')
        REDIS_TOKEN = vars.KV_REST_API_TOKEN || vars.UPSTASH_REDIS_REST_TOKEN || ''
        if (REDIS_URL && REDIS_TOKEN) { console.log(`Credenciais do censo lidas de ${p}`); break }
    }
}
if (!REDIS_URL || !REDIS_TOKEN) {
    console.error('Falta CENSO_REDIS_URL/TOKEN no .env ou KV_REST_API_URL no ../censo-admvc/.env.local')
    process.exit(1)
}

async function redis(cmd) {
    const r = await fetch(REDIS_URL, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + REDIS_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify(cmd),
    })
    const j = await r.json()
    if (!r.ok || j.error) throw new Error(j.error || `Redis ${r.status}`)
    return j.result
}

function parseHash(plano) {
    const lista = []
    if (Array.isArray(plano)) {
        for (let i = 1; i < plano.length; i += 2) {
            try { lista.push(JSON.parse(plano[i])) } catch { /* skip */ }
        }
    }
    return lista
}

// ── Prisma (admvc) ───────────────────────────────────────────────────────
async function conectarPrisma() {
    if (USAR_TESTE) {
        const { prismaDeTeste } = await import('./url-de-teste.mjs')
        return prismaDeTeste()
    }
    const url = process.env.DATABASE_URL
    if (!url) { console.error('Falta DATABASE_URL no .env'); process.exit(1) }
    const { PrismaClient } = await import('@prisma/client')
    const { PrismaPg } = await import('@prisma/adapter-pg')
    const { default: pg } = await import('pg')
    const u = new URL(url)
    const schema = u.searchParams.get('schema')
    for (const p of ['schema', 'connection_limit', 'pgbouncer', 'sslmode']) u.searchParams.delete(p)
    const pool = new pg.Pool({ connectionString: u.toString(), max: 3, ssl: { rejectUnauthorized: false } })
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) })
    return { prisma, fechar: async () => { await prisma.$disconnect(); await pool.end() } }
}

// ── Utilidades ───────────────────────────────────────────────────────────
function normTel(tel) {
    const d = String(tel || '').replace(/\D/g, '')
    if (d.length >= 9 && !d.startsWith('351')) return '351' + d
    return d
}

function cortarNome(completo) {
    const partes = String(completo || '').trim().split(/\s+/)
    return { first: partes[0] || '', last: partes.slice(1).join(' ') || '' }
}

function dataOuNull(str) {
    if (!str) return null
    const d = new Date(str)
    return isNaN(d.getTime()) ? null : d
}

// Mapear parentesco do censo para o admvc
const PARENTESCO_MAP = {
    'Titular': 'PAI',
    'Cônjuge': 'CONJUGE',
    'Conjuge': 'CONJUGE',
    'Filho(a)': 'FILHO',
    'Outro': 'OUTRO',
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
    console.log(`\n═══ Consolidar Censo → ADMVC ═══`)
    console.log(`Modo: ${APLICAR ? '⚡ APLICAR' : '🔍 DRY-RUN (sem --aplicar)'}`)
    console.log(`Base: ${USAR_TESTE ? 'TESTE (admvc_teste)' : 'PRODUÇÃO'}\n`)

    // 1. Ler censo
    console.log('1/5 · Ler famílias e pessoas do censo…')
    const [familiasRaw, pessoasRaw] = await Promise.all([
        redis(['HGETALL', 'censo:familias']),
        redis(['HGETALL', 'censo:pessoas']),
    ])
    const censoFamilias = parseHash(familiasRaw)
    const censoPessoas = parseHash(pessoasRaw)
    console.log(`     ${censoFamilias.length} famílias, ${censoPessoas.length} pessoas`)

    // Indexar famílias do censo por id
    const censoFamPorId = new Map()
    for (const f of censoFamilias) censoFamPorId.set(f.id, f)

    // 2. Ler admvc
    console.log('2/5 · Ler membros do admvc…')
    const { prisma, fechar } = await conectarPrisma()

    // Precisamos do tenant_id da igreja. No censo é sempre a ADMVC (tenant 1 em prod).
    // Com --teste, procurar a primeira igreja.
    let tenantId
    if (USAR_TESTE) {
        const t = await prisma.tenant.findFirst({ orderBy: { id: 'asc' } })
        tenantId = t?.id
    } else {
        tenantId = 1
    }
    if (!tenantId) { console.error('Tenant não encontrado'); await fechar(); process.exit(1) }
    console.log(`     Tenant: ${tenantId}`)

    const membrosAdmvc = await prisma.membro.findMany({
        where: { tenant_id: tenantId },
        include: { familia: true },
    })
    console.log(`     ${membrosAdmvc.length} membros no admvc`)

    // Indexar membros do admvc por telefone normalizado
    const admvcPorTel = new Map()
    for (const m of membrosAdmvc) {
        const tel = normTel(m.phone_1)
        if (tel.length >= 9) admvcPorTel.set(tel, m)
    }
    // Também por nome+nascimento como fallback
    const admvcPorNomeNasc = new Map()
    for (const m of membrosAdmvc) {
        const chave = `${(m.first_name || '').toLowerCase().trim()}|${m.birthdate?.toISOString()?.slice(0, 10) || ''}`
        if (chave.length > 2) admvcPorNomeNasc.set(chave, m)
    }

    // 3. Cruzar
    console.log('3/5 · Cruzar dados…')
    const resultado = []
    const familiasParaCriar = new Map() // censoFamiliaId -> { surname, membros: [] }
    let nMatch = 0, nNovo = 0, nEnriquecido = 0, nSemTelNemMatch = 0

    for (const cp of censoPessoas) {
        const censoFam = censoFamPorId.get(cp.familia_id)
        const tel = normTel(cp.telefone_chave || cp.phone_1)

        // Tentar match por telefone
        let membroAdmvc = tel.length >= 9 ? admvcPorTel.get(tel) : null

        // Fallback: nome + data nascimento
        if (!membroAdmvc && cp.first_name && cp.birthdate) {
            const chave = `${cp.first_name.toLowerCase().trim()}|${cp.birthdate}`
            membroAdmvc = admvcPorNomeNasc.get(chave)
        }
        if (!membroAdmvc && cp.nome_completo) {
            const { first } = cortarNome(cp.nome_completo)
            if (first && cp.birthdate) {
                const chave = `${first.toLowerCase().trim()}|${cp.birthdate}`
                membroAdmvc = admvcPorNomeNasc.get(chave)
            }
        }

        const reg = {
            censoPessoaId: cp.id,
            censoFamiliaId: cp.familia_id,
            nome: cp.nome_completo || `${cp.first_name || ''} ${cp.last_name || ''}`.trim(),
            telefone: cp.phone_1 || '',
            parentesco: cp.parentesco || '',
            accao: '',
            admvcMembroId: null,
            campos_preenchidos: [],
            notas: [],
        }

        if (membroAdmvc) {
            // MATCH — enriquecer campos vazios
            nMatch++
            reg.accao = 'MATCH'
            reg.admvcMembroId = membroAdmvc.id

            const updates = {}

            // Endereço (da família do censo → membro do admvc)
            if (censoFam) {
                if (!membroAdmvc.address_1 && censoFam.address_1) {
                    updates.address_1 = censoFam.address_1; reg.campos_preenchidos.push('address_1')
                }
                if (!membroAdmvc.postal_code && censoFam.postal_code) {
                    updates.postal_code = censoFam.postal_code; reg.campos_preenchidos.push('postal_code')
                }
                if (!membroAdmvc.neighborhood && censoFam.neighborhood) {
                    updates.neighborhood = censoFam.neighborhood; reg.campos_preenchidos.push('neighborhood')
                }
                if (!membroAdmvc.id_city && censoFam.id_city) {
                    updates.id_city = censoFam.id_city; reg.campos_preenchidos.push('id_city')
                }
                if (!membroAdmvc.state && censoFam.freguesia) {
                    updates.state = censoFam.freguesia; reg.campos_preenchidos.push('state')
                }
            }

            // Dados pessoais
            if (!membroAdmvc.birthdate && cp.birthdate) {
                updates.birthdate = dataOuNull(cp.birthdate); reg.campos_preenchidos.push('birthdate')
            }
            if (!membroAdmvc.gender && cp.gender) {
                updates.gender = cp.gender; reg.campos_preenchidos.push('gender')
            }
            if (!membroAdmvc.nationality && cp.nationality) {
                updates.nationality = cp.nationality; reg.campos_preenchidos.push('nationality')
            }
            if (!membroAdmvc.marital_status && cp.marital_status) {
                updates.marital_status = cp.marital_status; reg.campos_preenchidos.push('marital_status')
            }
            if (!membroAdmvc.phone_1 && cp.phone_1) {
                updates.phone_1 = cp.phone_1; reg.campos_preenchidos.push('phone_1')
            }

            // Culto no lar → notas
            if (censoFam?.culto_no_lar && censoFam.culto_no_lar !== 'Nao') {
                const nota = `[Censo] Culto no lar: ${censoFam.culto_no_lar}`
                if (!membroAdmvc.notes?.includes('[Censo]')) {
                    const novoNotes = membroAdmvc.notes ? `${membroAdmvc.notes}\n${nota}` : nota
                    updates.notes = novoNotes; reg.campos_preenchidos.push('notes(culto_no_lar)')
                }
            }

            // Parentesco / família
            if (!membroAdmvc.parentesco && cp.parentesco) {
                const mapped = PARENTESCO_MAP[cp.parentesco]
                if (mapped) { updates.parentesco = mapped; reg.campos_preenchidos.push('parentesco') }
            }

            if (Object.keys(updates).length > 0) {
                nEnriquecido++
                if (APLICAR) {
                    await prisma.membro.update({ where: { id: membroAdmvc.id }, data: updates })
                }
                reg.notas.push(`${Object.keys(updates).length} campo(s) preenchido(s)`)
            } else {
                reg.notas.push('Nada a atualizar')
            }

            // Guardar para vinculação de família
            if (censoFam && !membroAdmvc.familia_id) {
                if (!familiasParaCriar.has(cp.familia_id)) {
                    const { last } = cortarNome(cp.nome_completo || `${cp.first_name} ${cp.last_name}`)
                    familiasParaCriar.set(cp.familia_id, { surname: last || 'Família', membros: [] })
                }
                familiasParaCriar.get(cp.familia_id).membros.push({
                    membroId: membroAdmvc.id,
                    parentesco: PARENTESCO_MAP[cp.parentesco] || null,
                    existente: true,
                })
            }

        } else {
            // SEM MATCH — criar membro novo
            const { first, last } = cortarNome(cp.nome_completo || `${cp.first_name || ''} ${cp.last_name || ''}`)
            if (!first) { reg.accao = 'IGNORADO'; reg.notas.push('Sem nome'); resultado.push(reg); continue }

            nNovo++
            reg.accao = 'CRIAR'

            // Gerar email placeholder (o admvc exige email unique)
            const slug = first.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '.')
            const rand = Math.random().toString(36).slice(2, 6)
            const emailPlaceholder = `${slug}.${rand}@censo.admvc.local`

            const dados = {
                first_name: first,
                last_name: last,
                email: emailPlaceholder,
                phone_1: cp.phone_1 || null,
                birthdate: dataOuNull(cp.birthdate),
                gender: cp.gender || null,
                nationality: cp.nationality || null,
                marital_status: cp.marital_status || null,
                church_role: cp.church_role || 'Membro',
                parentesco: PARENTESCO_MAP[cp.parentesco] || null,
                address_1: censoFam?.address_1 || null,
                postal_code: censoFam?.postal_code || null,
                neighborhood: censoFam?.neighborhood || null,
                id_city: censoFam?.id_city || null,
                state: censoFam?.freguesia || null,
                country: 'Portugal',
                status: 'APROVADO',
                tenant_id: tenantId,
            }

            // Culto no lar nas notas
            if (censoFam?.culto_no_lar && censoFam.culto_no_lar !== 'Nao') {
                dados.notes = `[Censo] Culto no lar: ${censoFam.culto_no_lar}`
            }

            if (APLICAR) {
                const novo = await prisma.membro.create({ data: dados })
                reg.admvcMembroId = novo.id

                if (censoFam && !familiasParaCriar.has(cp.familia_id)) {
                    familiasParaCriar.set(cp.familia_id, { surname: last || 'Família', membros: [] })
                }
                if (censoFam) {
                    familiasParaCriar.get(cp.familia_id).membros.push({
                        membroId: novo.id,
                        parentesco: PARENTESCO_MAP[cp.parentesco] || null,
                        existente: false,
                    })
                }
            }
            reg.notas.push(`Email placeholder: ${emailPlaceholder}`)
            if (!tel || tel.length < 9) { nSemTelNemMatch++; reg.notas.push('Sem telefone') }
        }

        resultado.push(reg)
    }

    // 4. Criar/vincular famílias
    console.log('4/5 · Famílias…')
    let nFamCriadas = 0
    for (const [, fam] of familiasParaCriar) {
        if (fam.membros.length === 0) continue
        // Só criar se pelo menos um membro não tem família no admvc
        const precisaCriar = fam.membros.some(m => m.existente) || fam.membros.length > 0

        if (precisaCriar && APLICAR) {
            const novaFam = await prisma.familia.create({
                data: { surname: fam.surname, tenant_id: tenantId },
            })
            for (const m of fam.membros) {
                await prisma.membro.update({
                    where: { id: m.membroId },
                    data: {
                        familia_id: novaFam.id,
                        ...(m.parentesco ? { parentesco: m.parentesco } : {}),
                        is_family_admin: m.parentesco === 'PAI' || m.parentesco === 'CONJUGE',
                    },
                })
            }
            nFamCriadas++
        } else if (precisaCriar) {
            nFamCriadas++
        }
    }

    // 5. Relatório
    console.log('5/5 · Gerar relatório…')
    const linhasCSV = ['Ação;Nome;Telefone;Parentesco;Membro admvc ID;Campos preenchidos;Notas']
    for (const r of resultado) {
        linhasCSV.push([
            r.accao,
            r.nome,
            r.telefone,
            r.parentesco,
            r.admvcMembroId || '',
            r.campos_preenchidos.join(', '),
            r.notas.join(' | '),
        ].join(';'))
    }
    const csvPath = new URL('./consolidar-censo-resultado.csv', import.meta.url).pathname
        .replace(/^\/([A-Z]:)/, '$1') // fix Windows drive letter
    const { writeFileSync } = await import('node:fs')
    writeFileSync(csvPath, '﻿' + linhasCSV.join('\n'), 'utf8')

    // Resumo
    console.log(`\n═══ Resultado ═══`)
    console.log(`Censo:     ${censoPessoas.length} pessoas em ${censoFamilias.length} famílias`)
    console.log(`admvc:     ${membrosAdmvc.length} membros`)
    console.log(`Match:     ${nMatch} (por telefone ou nome+nascimento)`)
    console.log(`  ↳ enriquecidos: ${nEnriquecido}`)
    console.log(`Novos:     ${nNovo}`)
    console.log(`  ↳ sem telefone: ${nSemTelNemMatch}`)
    console.log(`Famílias:  ${nFamCriadas} a criar/criadas`)
    console.log(`Relatório: ${csvPath}`)
    if (!APLICAR) console.log(`\n⚠️  Dry-run: nada foi escrito. Use --aplicar para gravar.`)
    console.log()

    await fechar()
}

main().catch((e) => { console.error(e); process.exit(1) })
