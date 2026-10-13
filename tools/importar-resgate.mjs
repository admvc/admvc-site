// tools/importar-resgate.mjs
// Importa da pasta resgate/ (copia manual do Studio da base antiga + export do
// LouveApp): ministerios (departamentos, funcoes, integrantes e as funcoes de
// cada um), grupos (com lideres e participantes) e o repertorio do LouveApp.
//
//   node tools/importar-resgate.mjs            -> so simula e mostra o que faria
//   node tools/importar-resgate.mjs --aplicar  -> grava (tudo numa transacao)
//   ... --teste                                -> base de teste (admvc_teste)
//
// Ficheiros do Studio: separador ";", sem cabecalho, colunas por ordem
// alfabetica (id primeiro); cp1252, ou UTF-8 quando trazem BOM.

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import process from 'node:process'

const APLICAR = process.argv.includes('--aplicar')
const USAR_TESTE = process.argv.includes('--teste')
const PASTA = 'resgate'
const IGREJA = 1 // ADMVC Sede: dona do repertorio do LouveApp

try { process.loadEnvFile('.env') } catch { /* so o ambiente */ }

// ── Leitura ──────────────────────────────────────────────────────────────
function texto(nome) {
    const buf = readFileSync(`${PASTA}/${nome}`)
    if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.subarray(3).toString('utf8')
    return new TextDecoder('windows-1252').decode(buf)
}

/** CSV com ";" e aspas (que podem ter ";" e quebras de linha la dentro). */
function linhas(conteudo) {
    const out = []
    let campo = '', linha = [], aspas = false
    for (let i = 0; i < conteudo.length; i++) {
        const c = conteudo[i]
        if (aspas) {
            if (c === '"' && conteudo[i + 1] === '"') { campo += '"'; i++ }
            else if (c === '"') aspas = false
            else campo += c
        } else if (c === '"') aspas = true
        else if (c === ';') { linha.push(campo); campo = '' }
        else if (c === '\n' || c === '\r') {
            if (c === '\r' && conteudo[i + 1] === '\n') i++
            linha.push(campo); campo = ''
            if (linha.some((v) => v !== '')) out.push(linha)
            linha = []
        } else campo += c
    }
    linha.push(campo)
    if (linha.some((v) => v !== '')) out.push(linha)
    return out
}

const ler = (nome) => (existsSync(`${PASTA}/${nome}`) ? linhas(texto(nome)) : null)
const int = (v) => (v === '' || v == null ? null : Number.parseInt(v, 10))
const txt = (v) => (v == null || v.trim() === '' ? null : v.trim())
const bool = (v) => String(v).toUpperCase() === 'TRUE'

/**
 * O export estragou as coordenadas ("401.485.808" em vez de 40.1485808).
 * Tiram-se os pontos e volta-se a pôr a virgula no sitio: latitude com 2
 * digitos inteiros, longitude com 1 (a igreja fica em Portugal).
 */
function coordenada(v, digitosInteiros) {
    if (!txt(v)) return null
    if (/^-?\d+(\.\d+)?$/.test(v) && v.split('.').length === 2) return Number(v)
    const sinal = v.trim().startsWith('-') ? -1 : 1
    const digitos = v.replace(/\D/g, '')
    if (!digitos) return null
    return sinal * Number(`${digitos.slice(0, digitosInteiros)}.${digitos.slice(digitosInteiros)}`)
}

const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

// ── Ministerios e grupos (Studio) ────────────────────────────────────────
const problemas = []

const departamentos = (ler('Departamentos.csv') || []).map((r) => {
    // id, compromissoId, congregacaoId, descricao, foto_url, is_global, lider_id, nome, tenant_id
    const nome = r[7].trim()
    return {
        id: int(r[0]), congregacaoId: int(r[2]), descricao: txt(r[3]), foto_url: txt(r[4]),
        is_global: bool(r[5]), lider_id: int(r[6]), nome, tenant_id: int(r[8]),
        e_louvor: /louvor|music|música/i.test(nome),
    }
})

const funcoes = (ler('FuncaoDepartamento.csv') || []).map((r) => (
    // id, departamento_id, nome, tenant_id
    { id: int(r[0]), departamento_id: int(r[1]), nome: r[2].trim(), tenant_id: int(r[3]) }
))

const integrantes = (ler('IntegranteDepartamento.csv') || []).map((r) => ({
    // id, data_entrada, departamento_id, membro_id, pode_gerir_escalas, tenant_id
    id: int(r[0]), data_entrada: new Date(r[1]), departamento_id: int(r[2]),
    membro_id: int(r[3]), pode_gerir_escalas: bool(r[4]), tenant_id: int(r[5]),
}))

// FuncaoSelecionada: id, funcao_id, integrante_departamento_id (alfabetica).
// Confirma-se pelos dados: a funcao tem de ser do ministerio do integrante.
const funcaoPorId = new Map(funcoes.map((f) => [f.id, f]))
const integrantePorId = new Map(integrantes.map((i) => [i.id, i]))
const selecionadasBrutas = ler('FuncaoSelecionada.csv') || []
const bate = (fId, iId) => funcaoPorId.get(fId)?.departamento_id === integrantePorId.get(iId)?.departamento_id && funcaoPorId.has(fId)
const okAlfabetica = selecionadasBrutas.filter((r) => bate(int(r[1]), int(r[2]))).length
const okInvertida = selecionadasBrutas.filter((r) => bate(int(r[2]), int(r[1]))).length
const invertida = okInvertida > okAlfabetica
const selecionadas = []
for (const r of selecionadasBrutas) {
    const s = { id: int(r[0]), funcao_id: int(invertida ? r[2] : r[1]), integrante_departamento_id: int(invertida ? r[1] : r[2]) }
    if (bate(s.funcao_id, s.integrante_departamento_id)) selecionadas.push(s)
    else problemas.push(`FuncaoSelecionada ${s.id}: funcao ${s.funcao_id} nao e do ministerio do integrante ${s.integrante_departamento_id} — ignorada`)
}

const grupos = (ler('Grupo.csv') || []).map((r) => ({
    // id, bairro, categoria, cidade, compromissoId, congregacaoId, data_abertura,
    // departamento_id, descricao, dia_semana, endereco, estado, horario, latitude,
    // longitude, nome, numero, pais, perfil, publico, regiao, tenant_id
    id: int(r[0]), bairro: r[1].trim(), categoria: txt(r[2]), cidade: r[3].trim(),
    congregacaoId: int(r[5]), data_abertura: new Date(r[6]), departamento_id: int(r[7]),
    descricao: txt(r[8]), dia_semana: r[9].trim(), endereco: r[10].trim(), estado: r[11].trim(),
    horario: r[12].trim(), latitude: coordenada(r[13], 2), longitude: coordenada(r[14], 1),
    nome: r[15].trim(), numero: txt(r[16]), pais: txt(r[17]) || 'Portugal', perfil: txt(r[18]),
    publico: bool(r[19]), regiao: txt(r[20]), tenant_id: int(r[21]),
}))

// Tabelas de ligacao do Prisma: A = Grupo, B = Membro
const par = (r) => ({ grupo: int(r[0]), membro: int(r[1]) })
const unicos = (lista) => [...new Map(lista.map((p) => [`${p.grupo}-${p.membro}`, p])).values()]
const lideresGrupo = unicos((ler('_LideresGrupo.csv') || []).map(par))
const membrosGrupo = unicos((ler('_MembrosGrupo.csv') || []).map(par))

// ── Repertorio (LouveApp) ────────────────────────────────────────────────
// Nome da musica; Artista; Observacao; Album; Versao; Tom; BPM; Duracao;
// Observacao da versao; Classificacoes; Video; Letra; Cifra; Audio; Referencias
const ficheiroLouveApp = readdirSync(PASTA).filter((f) => /^Repertorio_.*\.csv$/i.test(f)).sort().pop()
const musicas = []
if (ficheiroLouveApp) {
    const vistas = new Set()
    for (const r of linhas(texto(ficheiroLouveApp)).slice(1)) {
        const titulo = txt(r[0])
        if (!titulo) continue
        const chave = `${normalizar(titulo)}|${normalizar(r[1])}`
        if (vistas.has(chave)) { problemas.push(`Musica repetida no LouveApp: "${titulo}" — fica so uma`); continue }
        vistas.add(chave)
        const bpm = int(r[6])
        musicas.push({
            titulo, artista: txt(r[1]), tom: txt(r[5]), bpm: Number.isFinite(bpm) ? bpm : null,
            link_video: txt(r[10]), link_letra: txt(r[11]), link_cifra: txt(r[12]), link_audio: txt(r[13]),
            chave,
        })
    }
}

// ── Base ─────────────────────────────────────────────────────────────────
async function conectar() {
    const url = USAR_TESTE ? (await import('./url-de-teste.mjs')).urlDeTeste() : process.env.DATABASE_URL
    if (!url) { console.error('Falta DATABASE_URL no .env'); process.exit(1) }
    const { PrismaClient } = await import('@prisma/client')
    const { PrismaPg } = await import('@prisma/adapter-pg')
    const { default: pg } = await import('pg')
    const u = new URL(url)
    const schema = u.searchParams.get('schema') || 'public'
    for (const p of ['schema', 'connection_limit', 'pgbouncer', 'sslmode']) u.searchParams.delete(p)
    const pool = new pg.Pool({ connectionString: u.toString(), max: 3, ssl: { rejectUnauthorized: false } })
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool, schema === 'public' ? undefined : { schema }) })
    return { prisma, schema, fechar: async () => { await prisma.$disconnect(); await pool.end() } }
}

async function main() {
    const { prisma, schema, fechar } = await conectar()
    try {
        console.log(`Base: ${USAR_TESTE ? 'TESTE (admvc_teste)' : 'PRODUCAO'} — ${APLICAR ? 'A GRAVAR' : 'so simulacao'}\n`)

        // Validar ligacoes contra a base
        const [membros, tenants, congregacoes, jaDeptos, jaGrupos, jaMusicas] = await Promise.all([
            prisma.membro.findMany({ select: { id: true } }),
            prisma.tenant.findMany({ select: { id: true } }),
            prisma.congregacao.findMany({ select: { id: true } }),
            prisma.departamento.count(),
            prisma.grupo.count(),
            prisma.musica.findMany({ where: { tenant_id: IGREJA }, select: { titulo: true, artista: true } }),
        ])
        const existe = (lista) => new Set(lista.map((x) => x.id))
        const idsMembros = existe(membros), idsTenants = existe(tenants), idsCong = existe(congregacoes)
        const idsDeptos = new Set(departamentos.map((d) => d.id))

        for (const d of departamentos) {
            if (!idsTenants.has(d.tenant_id)) problemas.push(`Departamento ${d.nome}: igreja ${d.tenant_id} nao existe`)
            if (d.lider_id && !idsMembros.has(d.lider_id)) { problemas.push(`Departamento ${d.nome}: lider ${d.lider_id} nao existe — fica sem lider`); d.lider_id = null }
            if (d.congregacaoId && !idsCong.has(d.congregacaoId)) { problemas.push(`Departamento ${d.nome}: congregacao ${d.congregacaoId} nao existe — fica sem`); d.congregacaoId = null }
        }
        const integrantesOk = integrantes.filter((i) => {
            const ok = idsMembros.has(i.membro_id) && idsDeptos.has(i.departamento_id)
            if (!ok) problemas.push(`Integrante ${i.id}: membro ${i.membro_id} ou ministerio ${i.departamento_id} nao existe — ignorado`)
            return ok
        })
        const idsIntegrantesOk = new Set(integrantesOk.map((i) => i.id))
        const selecionadasOk = selecionadas.filter((s) => idsIntegrantesOk.has(s.integrante_departamento_id))
        for (const g of grupos) {
            if (g.departamento_id && !idsDeptos.has(g.departamento_id)) { problemas.push(`Grupo ${g.nome}: ministerio ${g.departamento_id} nao existe — fica sem`); g.departamento_id = null }
            if (g.congregacaoId && !idsCong.has(g.congregacaoId)) g.congregacaoId = null
        }
        const ligacaoOk = (p) => {
            const ok = idsMembros.has(p.membro) && grupos.some((g) => g.id === p.grupo)
            if (!ok) problemas.push(`Grupo ${p.grupo} / membro ${p.membro}: nao existe — ignorado`)
            return ok
        }
        const lideresOk = lideresGrupo.filter(ligacaoOk)
        const participantesOk = membrosGrupo.filter(ligacaoOk)

        const existentes = new Set(jaMusicas.map((m) => `${normalizar(m.titulo)}|${normalizar(m.artista)}`))
        const musicasNovas = musicas.filter((m) => !existentes.has(m.chave))

        const fazerMinisterios = jaDeptos === 0 && jaGrupos === 0
        console.log('Ministerios e grupos' + (fazerMinisterios ? '' : ' — SALTADO: a base ja tem departamentos ou grupos'))
        console.log(`  Departamentos ............ ${departamentos.length} (louvor: ${departamentos.filter((d) => d.e_louvor).map((d) => d.nome).join(', ') || 'nenhum'})`)
        console.log(`  Funcoes .................. ${funcoes.length}`)
        console.log(`  Integrantes .............. ${integrantesOk.length} de ${integrantes.length}`)
        console.log(`  Funcoes dos integrantes .. ${selecionadasOk.length} de ${selecionadasBrutas.length} (colunas ${invertida ? 'invertidas' : 'por ordem alfabetica'})`)
        console.log(`  Grupos ................... ${grupos.length} (${grupos.map((g) => `${g.nome} ${g.latitude ?? '-'},${g.longitude ?? '-'}`).join('; ')})`)
        console.log(`  Lideres de grupo ......... ${lideresOk.length}`)
        console.log(`  Participantes de grupo ... ${participantesOk.length}`)
        console.log(`\nRepertorio do LouveApp (${ficheiroLouveApp || 'ficheiro nao encontrado'})`)
        console.log(`  Musicas novas ............ ${musicasNovas.length} de ${musicas.length} (${musicas.length - musicasNovas.length} ja existiam)`)
        console.log(`  Com tom / BPM / video / letra / audio / cifra: ${['tom', 'bpm', 'link_video', 'link_letra', 'link_audio', 'link_cifra'].map((k) => musicasNovas.filter((m) => m[k]).length).join(' / ')}`)
        if (problemas.length) console.log(`\nAvisos (${problemas.length}):\n  - ${problemas.join('\n  - ')}`)

        if (!APLICAR) { console.log('\nNada gravado. Para gravar: node tools/importar-resgate.mjs --aplicar'); return }

        await prisma.$transaction(async (tx) => {
            if (fazerMinisterios) {
                if (departamentos.length) await tx.departamento.createMany({ data: departamentos })
                if (funcoes.length) await tx.funcaoDepartamento.createMany({ data: funcoes })
                if (integrantesOk.length) await tx.integranteDepartamento.createMany({ data: integrantesOk })
                if (selecionadasOk.length) await tx.funcaoSelecionada.createMany({ data: selecionadasOk })
                for (const g of grupos) {
                    await tx.grupo.create({
                        data: {
                            ...g,
                            lideres: { connect: lideresOk.filter((p) => p.grupo === g.id).map((p) => ({ id: p.membro })) },
                            membros: { connect: participantesOk.filter((p) => p.grupo === g.id).map((p) => ({ id: p.membro })) },
                        },
                    })
                }
                // Os ids vieram da base antiga: as sequencias passam a seguir o maior
                for (const t of ['Departamento', 'FuncaoDepartamento', 'IntegranteDepartamento', 'FuncaoSelecionada', 'Grupo']) {
                    const tabela = `"${schema}"."${t}"`
                    await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('${tabela}', 'id'), COALESCE((SELECT MAX(id) FROM ${tabela}), 1))`)
                }
            }
            if (musicasNovas.length) {
                await tx.musica.createMany({
                    data: musicasNovas.map(({ chave, ...m }) => ({ ...m, id: randomUUID(), tenant_id: IGREJA })),
                })
            }
        }, { timeout: 120000, maxWait: 20000 })
        console.log('\nGravado.')
    } finally {
        await fechar()
    }
}

main().catch((e) => { console.error('ERRO:', e.message); process.exit(1) })
