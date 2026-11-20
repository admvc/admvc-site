// A escolha e a edição da capa do YouTube de um culto: ficam dentro da receita do kit (JSON, campo `capaYt`), sem coluna nova.
// Funções puras (servem ao servidor, ao ecrã e aos testes). Sem escolha guardada = "Igual às artes do culto".

export const PADROES_CAPA = [
    { id: 'igual', nome: 'Igual às artes do culto', nota: 'Usa o estilo, as cores, o fundo e a foto do kit' },
    { id: 'profundidade', nome: 'Profundidade com foto', nota: 'Título grande e o preletor à frente da luz' },
    { id: 'centrado', nome: 'Centrado', nota: 'Pomba com luz e título ao centro, sem foto' },
    { id: 'faixa', nome: 'Faixa', nota: 'Faixa com o título e o preletor a sair dela' },
    { id: 'moldura', nome: 'Moldura dourada', nota: 'Dupla moldura e o preletor num medalhão' },
    { id: 'editorial', nome: 'Editorial claro', nota: 'Papel claro, letra com serifa e cartão de foto' },
    { id: 'evento', nome: 'Evento', nota: 'Cores da categoria (jovens, mulheres, profética…)' },
] as const
export type PadraoCapa = (typeof PADROES_CAPA)[number]['id']
export const PADRAO_POR_OMISSAO: PadraoCapa = 'igual'
export const lerPadraoCapa = (v: unknown): PadraoCapa => (PADROES_CAPA.find((p) => p.id === v)?.id ?? PADRAO_POR_OMISSAO)

export type LadoFoto = 'esquerda' | 'direita' | 'sem'
export type FundoCapa = 'foto' | 'cores'      // 'foto' = o fundo do kit (se o kit tiver um); 'cores' = só as cores

export type CapaYt = {
    padrao: PadraoCapa
    titulo: string        // título grande; vazio = o tema; sem tema = o nome do culto (| muda de linha, *destaque*)
    subtitulo: string     // linha pequena; vazio = o nome do culto
    preletor: string      // vazio = o do culto
    quando: string        // data e hora escritas ("Sábado, 14 nov · 19h30"); vazio = automático
    paleta: string        // '' = a do padrão; senão o id de uma paleta (lib/divulgacao.ts)
    fundo: FundoCapa
    foto: LadoFoto        // onde fica a foto do preletor (nos padrões que a deixam mudar de lado) ou sem foto
}

export const LIMITES_CAPA_YT = { titulo: 60, subtitulo: 40, preletor: 60, quando: 40 } as const

export const capaYtVazia = (): CapaYt => ({ padrao: PADRAO_POR_OMISSAO, titulo: '', subtitulo: '', preletor: '', quando: '', paleta: '', fundo: 'foto', foto: 'direita' })

/** Lê o que veio do browser ou da base: só valores conhecidos, textos cortados. `paletas` = os ids de paleta que existem. */
export function lerCapaYt(x: unknown, paletas: readonly string[]): CapaYt {
    const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>
    const txt = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
    return {
        padrao: lerPadraoCapa(o.padrao),
        titulo: txt(o.titulo, LIMITES_CAPA_YT.titulo), subtitulo: txt(o.subtitulo, LIMITES_CAPA_YT.subtitulo),
        preletor: txt(o.preletor, LIMITES_CAPA_YT.preletor), quando: txt(o.quando, LIMITES_CAPA_YT.quando),
        paleta: typeof o.paleta === 'string' && paletas.includes(o.paleta) ? o.paleta : '',
        fundo: o.fundo === 'cores' ? 'cores' : 'foto',
        foto: o.foto === 'esquerda' || o.foto === 'sem' ? o.foto : 'direita',
    }
}

/** A edição ainda está como de origem (para o botão "Repor" e o resumo). */
export const capaYtIgualAoOriginal = (c: CapaYt) => JSON.stringify(c) === JSON.stringify(capaYtVazia())
