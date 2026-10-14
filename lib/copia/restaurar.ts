/**
 * Restaurar uma copia completa: a base volta a ficar como no dia da copia.
 * Igual ao do Atelie, com o que a app da igreja tem a mais.
 *
 * Substitui, nao junta. A rede de seguranca: antes de restaurar grava-se uma
 * copia do estado atual (ver `actions/copia-actions.ts`), e um restauro
 * errado desfaz-se com ela.
 *
 * Fica como esta o que uma copia nao deve mexer:
 *  - **Super Admin** (`SuperAdmin`, `SuperAdminLog`): quem restaura nao pode
 *    ficar fora da app;
 *  - **registo** (`AuditLog`): nada na app o apaga, e o restauro e
 *    precisamente o que la deve ficar escrito. Aponta para a igreja, por isso
 *    sai antes e volta a entrar no fim (o de uma igreja que nao existe na
 *    copia perde-se — a analise avisa);
 *  - **palavras-passe, tokens e avisos no telemovel**: a copia nao os leva
 *    (ver `camposFora`); quem existe hoje fica com os seus, quem so existe na
 *    copia entra pelo "Esqueci-me da palavra-passe".
 *
 * Tudo numa transacao: ou fica tudo como na copia, ou fica tudo como estava.
 * As tabelas e a ordem saem do proprio schema.
 *
 * Fora de `actions/` de proposito: apaga a base sem perguntar quem pede.
 */

import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { LIGACOES, MODELOS, type ModeloDaBase } from '@/generated/modelo'
import { acessor, APP_DA_COPIA, camposFora, tabelaNaBase } from '@/lib/copia/gerar'

/** Tabelas que o restauro nunca substitui. */
export const NAO_SE_RESTAURAM = ['SuperAdmin', 'SuperAdminLog', 'AuditLog']

/** Folga sobre o limite das server actions (10 MB em next.config). */
export const MAX_COPIA = 9_500_000

type Modelo = ModeloDaBase
type Linha = Record<string, unknown>

/** Campos que sao colunas (nao relacoes): os que a copia traz. */
function colunas(m: Modelo) {
    return m.fields.filter((f) => f.kind === 'scalar' || f.kind === 'enum')
}

/** Chaves estrangeiras deste modelo: a coluna e o modelo para onde aponta. */
function chaves(m: Modelo): Array<{ coluna: string; alvo: string }> {
    return m.fields
        .filter((f) => f.kind === 'object' && f.relationFromFields.length > 0)
        .flatMap((f) => f.relationFromFields.map((coluna) => ({ coluna, alvo: f.type })))
}

export function restauraveis(): Modelo[] {
    return MODELOS.filter((m) => !NAO_SE_RESTAURAM.includes(m.name))
}

/**
 * A ordem de insercao: cada tabela depois das tabelas para onde aponta.
 * Apagar faz-se ao contrario. Um ciclo entre tabelas rebenta, e o teste que
 * chama isto apanha-o no dia em que o schema o criar.
 */
export function ordemDeInsercao(): string[] {
    const lista = restauraveis()
    const nomes = new Set(lista.map((m) => m.name))
    const feitos: string[] = []
    const aVisitar = new Set<string>()

    function visitar(m: Modelo) {
        if (feitos.includes(m.name)) return
        if (aVisitar.has(m.name)) throw new Error(`Ciclo entre tabelas em ${m.name}: o restauro nao tem ordem.`)
        aVisitar.add(m.name)
        for (const k of chaves(m)) {
            if (k.alvo !== m.name && nomes.has(k.alvo)) visitar(lista.find((x) => x.name === k.alvo)!)
        }
        aVisitar.delete(m.name)
        feitos.push(m.name)
    }
    for (const m of lista) visitar(m)
    return feitos
}

/**
 * Uma tabela que fica nao pode apontar para uma que se restaura: apagar esta
 * levava-a em cascata (ou travava o restauro). So o registo aponta (para a
 * igreja), e esse trata-se a parte; isto garante que nao aparece outra.
 */
export function confirmarSeparacao(): void {
    const restauradas = new Set(restauraveis().map((m) => m.name))
    for (const m of MODELOS.filter((x) => NAO_SE_RESTAURAM.includes(x.name))) {
        for (const k of chaves(m)) {
            if (m.name === 'AuditLog' && k.coluna === 'tenant_id') continue
            if (restauradas.has(k.alvo)) {
                throw new Error(`${m.name}.${k.coluna} aponta para ${k.alvo}: o restauro apagava-o.`)
            }
        }
    }
    // Uma tabela que se restaura com um self-relation precisava de ser
    // preenchida em dois tempos (como no Atelie). Hoje nao ha nenhuma.
    for (const m of restauraveis()) {
        if (chaves(m).some((k) => k.alvo === m.name)) {
            throw new Error(`${m.name} aponta para si propria: o restauro ainda nao sabe tratar disso.`)
        }
    }
}

// ---------------------------------------------------------------------------
// Ler a copia
// ---------------------------------------------------------------------------

export interface CopiaLida {
    gravadoEm: string
    versao: string
    /** So as tabelas que se restauram, com so as colunas que existem hoje. */
    tabelas: Record<string, Linha[]>
    ligacoes: Record<string, { A: unknown; B: unknown }[]>
    /** Coisas que nao impedem o restauro mas convem saber. */
    avisos: string[]
}

const NAO_E_COPIA = 'Este ficheiro não é uma cópia desta app (a que se descarrega em Cópia de segurança).'

/** Le e confere a copia, sem tocar na base. Recusa o que nao se restaura por inteiro. */
export function lerCopia(texto: string): CopiaLida {
    let bruto: unknown
    try {
        bruto = JSON.parse(texto)
    } catch {
        throw new Error(NAO_E_COPIA)
    }
    const c = bruto as { app?: unknown; versao?: unknown; gravadoEm?: unknown; tabelas?: unknown; ligacoes?: unknown }
    if (
        !c || typeof c !== 'object' || c.app !== APP_DA_COPIA ||
        typeof c.gravadoEm !== 'string' || Number.isNaN(Date.parse(c.gravadoEm)) ||
        !c.tabelas || typeof c.tabelas !== 'object' || Array.isArray(c.tabelas)
    ) {
        throw new Error(NAO_E_COPIA)
    }
    const naCopia = c.tabelas as Record<string, unknown>
    const avisos: string[] = []
    const conhecidas = new Set(MODELOS.map((m) => m.name))

    // Uma tabela que ja nao existe: vazia nao faz falta; com dados, perdiam-se.
    for (const [nome, linhas] of Object.entries(naCopia)) {
        if (conhecidas.has(nome)) continue
        if (Array.isArray(linhas) && linhas.length === 0) continue
        throw new Error(`A cópia tem dados em "${nome}", que já não existe nesta versão da app. Restaurar perdia-os.`)
    }

    const tabelas: Record<string, Linha[]> = {}
    for (const m of restauraveis()) {
        const linhas = naCopia[m.name]
        if (linhas === undefined) {
            // Copia de antes de esta tabela existir: fica vazia, como estava nesse dia.
            tabelas[m.name] = []
            continue
        }
        if (!Array.isArray(linhas) || linhas.some((l) => !l || typeof l !== 'object' || Array.isArray(l))) {
            throw new Error(NAO_E_COPIA)
        }
        const cols = colunas(m)
        const nomesCols = new Set(cols.map((f) => f.name))
        const obrigatorias = cols.filter((f) => f.isRequired && !f.hasDefaultValue && !f.isUpdatedAt)

        const ignoradas = new Set<string>()
        tabelas[m.name] = (linhas as Linha[]).map((l) => {
            for (const f of obrigatorias) {
                if (l[f.name] === undefined || l[f.name] === null) {
                    throw new Error(`A cópia é de uma versão antiga: falta "${f.name}" em ${m.name}, que hoje é obrigatório. Não dá para a restaurar inteira.`)
                }
            }
            const limpa: Linha = {}
            for (const [k, v] of Object.entries(l)) {
                if (nomesCols.has(k)) limpa[k] = v
                else ignoradas.add(k)
            }
            return limpa
        })
        if (ignoradas.size > 0) {
            avisos.push(`${m.name}: ${[...ignoradas].join(', ')} já não existe(m) e fica(m) de fora.`)
        }
    }

    const ligacoes: CopiaLida['ligacoes'] = {}
    const lig = (c.ligacoes && typeof c.ligacoes === 'object' ? c.ligacoes : {}) as Record<string, unknown>
    for (const l of LIGACOES) {
        const linhas = lig[l.name] ?? []
        if (!Array.isArray(linhas) || linhas.some((x) => !x || typeof x !== 'object' || !('A' in x) || !('B' in x))) {
            throw new Error(NAO_E_COPIA)
        }
        ligacoes[l.name] = linhas as { A: unknown; B: unknown }[]
    }
    for (const [nome, linhas] of Object.entries(lig)) {
        if (!LIGACOES.some((l) => l.name === nome) && Array.isArray(linhas) && linhas.length > 0) {
            throw new Error(`A cópia tem dados em "${nome}", que já não existe nesta versão da app. Restaurar perdia-os.`)
        }
    }

    return { gravadoEm: c.gravadoEm, versao: typeof c.versao === 'string' ? c.versao : '?', tabelas, ligacoes, avisos }
}

// ---------------------------------------------------------------------------
// O que muda
// ---------------------------------------------------------------------------

export interface LinhaDaAnalise {
    modelo: string
    agora: number
    naCopia: number
    /** Linhas de agora criadas depois da copia: as que se perdem de certeza. */
    depoisDaCopia: number
}

const CAMPOS_CRIADO = ['criado_em', 'created_at', 'createdAt', 'data_criacao']

function campoCriado(m: Modelo) {
    return m.fields.find((f) => f.type === 'DateTime' && CAMPOS_CRIADO.includes(f.name))
}

/** Agora → na copia, por tabela, e os avisos que dependem da base. Le, nao escreve. */
export async function analisarCopia(c: CopiaLida): Promise<{ tabelas: LinhaDaAnalise[]; avisos: string[] }> {
    // Uma so consulta com as contagens todas: a base esta longe, e sao ~80 tabelas.
    const lista = restauraveis()
    const partes = lista.flatMap((m, i) => {
        const t = tabelaNaBase(m.dbName)
        const criado = campoCriado(m)
        return [
            `(SELECT count(*) FROM ${t})::int AS "a${i}"`,
            criado ? `(SELECT count(*) FROM ${t} WHERE "${criado.dbName}" > $1)::int AS "d${i}"` : `0 AS "d${i}"`,
        ]
    })
    const [n] = await prisma.$queryRawUnsafe<Record<string, number>[]>(`SELECT ${partes.join(', ')}`, new Date(c.gravadoEm))
    const tabelas: LinhaDaAnalise[] = lista.map((m, i) => ({
        modelo: m.name,
        agora: Number(n[`a${i}`]),
        naCopia: c.tabelas[m.name].length,
        depoisDaCopia: Number(n[`d${i}`]),
    }))

    const avisos: string[] = []
    const comSenha = new Set((await prisma.membro.findMany({ where: { password: { not: null } }, select: { id: true } })).map((m) => m.id))
    const semSenha = c.tabelas.Membro.filter((m) => !comSenha.has(Number(m.id))).length
    if (semSenha > 0) {
        avisos.push(`${semSenha} ${semSenha === 1 ? 'pessoa da cópia não tem' : 'pessoas da cópia não têm'} palavra-passe hoje: ${semSenha === 1 ? 'entra' : 'entram'} com "Esqueci-me da palavra-passe".`)
    }
    const igrejas = c.tabelas.Tenant.map((t) => Number(t.id))
    const registoPerdido = await prisma.auditLog.count({ where: { tenant_id: { notIn: igrejas } } })
    if (registoPerdido > 0) {
        avisos.push(`${registoPerdido} linhas do registo de alterações são de igrejas que não existem na cópia e perdem-se.`)
    }
    return { tabelas, avisos }
}


// ---------------------------------------------------------------------------
// Restaurar
// ---------------------------------------------------------------------------

type Tx = Prisma.TransactionClient
type Acessor = {
    createMany: (a: { data: Linha[] }) => Promise<unknown>
    findMany: (a?: unknown) => Promise<Linha[]>
}

/** Tantas linhas por INSERT: longe do limite de parametros do Postgres. */
const LOTE = 500

/**
 * A linha como entra: com os segredos de agora (se a pessoa ou a igreja ainda
 * existe) e Json vazio como DbNull (o Prisma nao aceita `null` num campo Json).
 */
function prepararLinha(m: Modelo, l: Linha, segredos: Map<string, Linha> | undefined): Linha {
    const out = { ...l }
    const s = segredos?.get(String(l.id))
    if (s) {
        for (const [k, v] of Object.entries(s)) if (k !== 'id' && v !== null) out[k] = v
    }
    for (const f of m.fields) {
        if (f.kind === 'scalar' && f.type === 'Json' && out[f.name] === null) out[f.name] = Prisma.DbNull
    }
    return out
}

const literal = (s: string) => `'${s.replace(/'/g, "''")}'`

/** Os numeros automaticos continuam a partir do maior que ficou em cada tabela. Numa so consulta. */
async function acertarSequencias(tx: Tx, modelos: Modelo[]) {
    const partes = modelos.flatMap((m) => m.fields
        .filter((f) => f.defaultFn === 'autoincrement')
        .map((f) => {
            const t = tabelaNaBase(m.dbName)
            return `setval(pg_get_serial_sequence(${literal(t)}, ${literal(f.dbName)}), COALESCE((SELECT MAX("${f.dbName}") FROM ${t}), 0) + 1, false)`
        }))
    if (partes.length > 0) await tx.$queryRawUnsafe(`SELECT ${partes.join(', ')}`)
}

/**
 * Substitui as tabelas pelas da copia. Devolve quantas linhas ficaram em cada.
 * Quem chama ja tem de ter gravado a copia de antes.
 *
 * Poucas idas a base (esta longe): os segredos vao ja nas linhas, apaga-se
 * tudo de uma vez e as sequencias acertam-se numa so consulta.
 */
export async function restaurar(c: CopiaLida): Promise<Record<string, number>> {
    confirmarSeparacao()
    const ordem = ordemDeInsercao()
    const porNome = new Map(restauraveis().map((m) => [m.name, m]))
    const registo = MODELOS.find((m) => m.name === 'AuditLog')!

    return prisma.$transaction(async (tx) => {
        const t = tx as unknown as Record<string, Acessor>

        // 1. O que fica como esta: segredos de agora (por id) e o registo.
        const segredos = new Map<string, Map<string, Linha>>()
        for (const nome of ordem) {
            const fora = camposFora(nome)
            if (fora.length === 0) continue
            const linhas = await t[acessor(nome)].findMany({
                select: { id: true, ...Object.fromEntries(fora.map((f) => [f, true])) },
            })
            segredos.set(nome, new Map(linhas.map((l) => [String(l.id), l])))
        }
        const registoAgora = await t.auditLog.findMany()

        // 2. Apagar tudo de uma vez: as tabelas, as ligacoes e o registo (que
        //    volta no fim). Sem CASCADE: se outra tabela apontar para estas, rebenta
        //    em vez de a apagar as escondidas.
        const todas = [...ordem.map((n) => porNome.get(n)!.dbName), ...LIGACOES.map((l) => l.name), registo.dbName]
        await tx.$executeRawUnsafe(`TRUNCATE ${todas.map(tabelaNaBase).join(', ')}`)

        // 3. Por as da copia, dos pais para os filhos.
        const contagem: Record<string, number> = {}
        for (const nome of ordem) {
            const m = porNome.get(nome)!
            const linhas = c.tabelas[nome].map((l) => prepararLinha(m, l, segredos.get(nome)))
            for (let i = 0; i < linhas.length; i += LOTE) {
                await t[acessor(nome)].createMany({ data: linhas.slice(i, i + LOTE) })
            }
            contagem[nome] = linhas.length
        }

        // 4. Muitos-para-muitos.
        for (const l of LIGACOES) {
            const linhas = c.ligacoes[l.name]
            for (let i = 0; i < linhas.length; i += LOTE) {
                const lote = linhas.slice(i, i + LOTE)
                const valores = lote.map((_, j) => `($${j * 2 + 1}, $${j * 2 + 2})`).join(', ')
                await tx.$executeRawUnsafe(
                    `INSERT INTO ${tabelaNaBase(l.name)} ("A", "B") VALUES ${valores}`,
                    ...lote.flatMap((x) => [x.A, x.B]),
                )
            }
            contagem[l.name] = linhas.length
        }

        // 5. O registo volta, menos o de igrejas que ja nao existem.
        const igrejas = new Set(c.tabelas.Tenant.map((x) => Number(x.id)))
        const registoFica = registoAgora
            .filter((r) => igrejas.has(Number(r.tenant_id)))
            .map((r) => prepararLinha(registo, r, undefined))
        for (let i = 0; i < registoFica.length; i += LOTE) {
            await t.auditLog.createMany({ data: registoFica.slice(i, i + LOTE) })
        }

        // 6. Os numeros automaticos.
        await acertarSequencias(tx, [...ordem.map((n) => porNome.get(n)!), registo])

        return contagem
    }, { maxWait: 15_000, timeout: 240_000 })
}
