// Padrões prontos das artes (estilo + cores) por grupo, e a escolha automática pelo nome do culto.
// Um padrão só mexe em `estilo` e `paleta` (o resto da receita fica); as paletas e estilos são os que já existem.
import { ESTILOS, PALETAS, type EstiloId } from '@/lib/divulgacao'

export type GrupoPadrao = 'cultos' | 'eventos' | 'especiais'
export const GRUPOS_PADRAO: { id: GrupoPadrao; nome: string }[] = [
    { id: 'cultos', nome: 'Cultos' },
    { id: 'eventos', nome: 'Eventos' },
    { id: 'especiais', nome: 'Especiais' },
]

export type Padrao = { id: string; nome: string; grupo: GrupoPadrao; estilo: EstiloId; paleta: string }

export const PADROES: Padrao[] = [
    // Cultos
    { id: 'dominical', nome: 'Culto dominical', grupo: 'cultos', estilo: 'manchas', paleta: 'verde-dourado' },
    { id: 'rua', nome: 'Culto de Rua', grupo: 'cultos', estilo: 'faixas', paleta: 'preto-laranja' },
    { id: 'familia', nome: 'Culto da Família', grupo: 'cultos', estilo: 'capsula', paleta: 'verde-dourado' },
    // Eventos
    { id: 'jovens', nome: 'Jovens', grupo: 'eventos', estilo: 'manchas', paleta: 'jovens' },
    { id: 'mulheres', nome: 'Mulheres', grupo: 'eventos', estilo: 'capsula', paleta: 'mulheres' },
    { id: 'homens', nome: 'Homens', grupo: 'eventos', estilo: 'faixas', paleta: 'azul-branco' },
    { id: 'formacao', nome: 'Formação', grupo: 'eventos', estilo: 'moldura', paleta: 'formacao' },
    { id: 'profetica', nome: 'Profética', grupo: 'eventos', estilo: 'manchas', paleta: 'azul-branco' },
    // Especiais
    { id: 'santa-ceia', nome: 'Santa Ceia', grupo: 'especiais', estilo: 'capsula', paleta: 'bordo-ambar' },
    { id: 'batismo', nome: 'Batismo', grupo: 'especiais', estilo: 'horizonte', paleta: 'petroleo' },
    { id: 'congresso', nome: 'Congresso', grupo: 'especiais', estilo: 'faixas', paleta: 'colorido' },
    { id: 'final-de-ano', nome: 'Final de ano', grupo: 'especiais', estilo: 'horizonte', paleta: 'pessego' },
]

export const padraoPorId = (id: string | null | undefined): Padrao | null => PADROES.find((p) => p.id === id) ?? null

const sem = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Da mais específica para a mais geral (a primeira que bate ganha). O culto "normal" não está aqui: fica com o padrão da igreja.
const REGRAS: [RegExp, string][] = [
    [/ceia/, 'santa-ceia'],
    [/batism/, 'batismo'],
    [/congresso|conferencia/, 'congresso'],
    [/final de ano|passagem de ano|reveillon|natal/, 'final-de-ano'],
    [/profetic/, 'profetica'],
    [/jove|adolesc/, 'jovens'],
    [/mulher|senhora|cha de/, 'mulheres'],
    [/homen|varo/, 'homens'],
    [/formac|discipul|ebd/, 'formacao'],
    [/\brua\b/, 'rua'],
]

/** O padrão que combina com o nome do culto, ou null se for um culto comum (o padrão da igreja serve). */
export function padraoDoCulto(nome: string): Padrao | null {
    const n = sem(nome)
    const r = REGRAS.find(([re]) => re.test(n))
    return r ? padraoPorId(r[1]) : null
}

/** O padrão a que uma receita corresponde (estilo + cores), se corresponder a algum. */
export const padraoDaReceita = (r: { estilo: string; paleta: string }): Padrao | null => PADROES.find((p) => p.estilo === r.estilo && p.paleta === r.paleta) ?? null

/** As duas cores de uma paleta (para as bolinhas). */
export function coresDaPaleta(id: string): [string, string] {
    const p = PALETAS.find((x) => x.id === id) ?? PALETAS[0]
    return [p.c1, p.c2]
}

export const nomeDoEstilo = (id: string) => ESTILOS.find((e) => e.id === id)?.nome ?? id
