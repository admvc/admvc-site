// Artes de divulgação dos cultos (telão): estilos × paletas × peças, com os textos e versículos de cada peça.
// Estilos baseados nos modelos que a Mídia usa no Holyrics (Preto-Laranja, Ceia Leão, Profético Azul, Pêssego).

export type Paleta = {
    id: string; nome: string
    fundo: string; c1: string; c2: string     // escuros: fundo + as duas cores das luzes/cápsula
    texto: string; acento: string
    claro: [string, string, string]; claroTexto: string // estilo claro: 3 manchas suaves + cor do texto
}

export const PALETAS: Paleta[] = [
    { id: 'preto-laranja', nome: 'Preto e laranja', fundo: '#000000', c1: '#e0402a', c2: '#ff8a1f', texto: '#ffffff', acento: '#ffb36b', claro: ['#ffbfa0', '#fff3ea', '#ffd9c2'], claroTexto: '#5a1d07' },
    { id: 'azul-branco', nome: 'Azul e branco', fundo: '#07101f', c1: '#1e4fd8', c2: '#5fa8ff', texto: '#ffffff', acento: '#8cc4ff', claro: ['#b9d3ff', '#f4f8ff', '#dbe8ff'], claroTexto: '#12306b' },
    { id: 'vermelho-branco', nome: 'Vermelho e branco', fundo: '#120404', c1: '#c81e1e', c2: '#ff5a3d', texto: '#ffffff', acento: '#ff8a6a', claro: ['#ffc3b5', '#fff6f3', '#ffe1db'], claroTexto: '#7a1010' },
    { id: 'preto-branco', nome: 'Preto e branco', fundo: '#050505', c1: '#4a4a4a', c2: '#9a9a9a', texto: '#ffffff', acento: '#d4d4d4', claro: ['#cfcfcf', '#ffffff', '#e9e9e9'], claroTexto: '#111111' },
    { id: 'petroleo', nome: 'Azul-petróleo', fundo: '#0e161d', c1: '#0f6b78', c2: '#2aa3b0', texto: '#ffffff', acento: '#7fd6e0', claro: ['#a9dfe6', '#f3fbfc', '#d4eef1'], claroTexto: '#0b4b55' },
    { id: 'verde-dourado', nome: 'Verde e dourado', fundo: '#0b1a16', c1: '#1f5a4a', c2: '#D4AF37', texto: '#F9F6F0', acento: '#D4AF37', claro: ['#e3d3a3', '#f9f6f0', '#efe6cf'], claroTexto: '#1A3C34' },
    { id: 'bordo-ambar', nome: 'Bordô e âmbar', fundo: '#16080d', c1: '#8C405C', c2: '#D49A5A', texto: '#ffffff', acento: '#e8b878', claro: ['#e8bfa5', '#fbf3ee', '#f3dccf'], claroTexto: '#5C2030' },
    { id: 'pessego', nome: 'Pêssego e turquesa', fundo: '#1b1320', c1: '#f08a5d', c2: '#5fc3d6', texto: '#ffffff', acento: '#ffc29b', claro: ['#f3a68a', '#f9d6c4', '#bfe6ee'], claroTexto: '#0f5c5a' },
    { id: 'colorido', nome: 'Colorido', fundo: '#110a28', c1: '#ff3d7f', c2: '#2ec4ff', texto: '#ffffff', acento: '#ffd23f', claro: ['#ffc2d9', '#fff1c2', '#c7efff'], claroTexto: '#3a1670' },
    // Cores da identidade ADMVC (Identidade ADMVC.docx), para as artes das redes
    { id: 'jovens', nome: 'Jovens (azul e violeta)', fundo: '#0f1a33', c1: '#5A4580', c2: '#EBB035', texto: '#F9F6F0', acento: '#EBB035', claro: ['#c9bfe3', '#f6f3fb', '#f4e2b0'], claroTexto: '#1D2D50' },
    { id: 'mulheres', nome: 'Mulheres (terracota)', fundo: '#2a1510', c1: '#C06C54', c2: '#DDA380', texto: '#F9F6F0', acento: '#E8C8B8', claro: ['#E8C8B8', '#fbf3ee', '#DDA380'], claroTexto: '#6E3626' },
    { id: 'formacao', nome: 'Formação (carvão e petróleo)', fundo: '#14181f', c1: '#2C4A5E', c2: '#8EAEBD', texto: '#ffffff', acento: '#8EAEBD', claro: ['#bcd0da', '#f3f7f9', '#dfe9ee'], claroTexto: '#222831' },
]

// Fundos prontos (em public/images/divulgacao/fundos): para o estilo "Foto de fundo" do telão e para as redes
export const FUNDOS_PRONTOS = [
    { id: 'palco', nome: 'Palco com luzes', ficheiro: 'palco.jpg' },
] as const

export const REDES = [
    { id: 'post', nome: 'Post Instagram/Facebook (4:5)', largura: 1080, altura: 1350 },
    { id: 'story', nome: 'Story / WhatsApp (9:16)', largura: 1080, altura: 1920 },
    { id: 'youtube', nome: 'Capa da live YouTube (16:9)', largura: 1280, altura: 720 },
] as const
export type RedeId = (typeof REDES)[number]['id']

/** Estilos das artes das redes (post, story, capa da live). "classico" = lib/divulgacao-redes.tsx; os outros em lib/divulgacao-redes-modelos.tsx. */
export const MODELOS_REDES = [
    { id: 'classico', nome: 'Clássico' },
    { id: 'arcos', nome: 'Escuro com arcos' },
    { id: 'arco-claro', nome: 'Claro com arco' },
    { id: 'elegante', nome: 'Escuro elegante' },
] as const
export type ModeloRedesId = (typeof MODELOS_REDES)[number]['id']
export const lerModeloRedes = (v: unknown): ModeloRedesId => (MODELOS_REDES.find((m) => m.id === v)?.id ?? 'classico')

export const ESTILOS = [
    { id: 'manchas', nome: 'Escuro com luzes' },
    { id: 'foto', nome: 'Foto de fundo' },
    { id: 'capsula', nome: 'Cápsula' },
    { id: 'pastel', nome: 'Claro suave' },
] as const
export type EstiloId = (typeof ESTILOS)[number]['id']

export const PECAS = [
    { id: 'capa', nome: 'Capa do culto' },
    { id: 'oracao', nome: 'Oração (antes do culto)' },
    { id: 'oracao-dirigida', nome: 'Oração por…' },
    { id: 'neutro', nome: 'Fundo sem texto' },
    { id: 'boas-vindas', nome: 'Boas-vindas + QR' },
    { id: 'oferta', nome: 'Oferta (IBAN)' },
    { id: 'cantina', nome: 'Cantina' },
    { id: 'palavra', nome: 'Palavra (preletor)' },
] as const
export type PecaId = (typeof PECAS)[number]['id']

// Oração dirigida: a quem se ora e a preposição certa ("Oração pela Família", "pelos Jovens"…)
export const ALVOS: Record<string, [string, string]> = {
    familia: ['Oração pela', 'Família'],
    jovens: ['Oração pelos', 'Jovens'],
    homens: ['Oração pelos', 'Homens'],
    mulheres: ['Oração pelas', 'Mulheres'],
    criancas: ['Oração pelas', 'Crianças'],
    portugal: ['Oração por', 'Portugal'],
    brasil: ['Oração pelo', 'Brasil'],
    igreja: ['Oração pela', 'Igreja'],
    lideres: ['Oração pelos', 'Líderes'],
}

export type Versiculo = { texto: string; ref: string }
const v = (texto: string, ref: string): Versiculo => ({ texto, ref })

// Versão Almeida Revista e Corrigida. Rodam sozinhos (um por dia do culto); na página pode escrever-se outro.
export const VERSICULOS: Record<string, Versiculo[]> = {
    oracao: [
        v('Orai sem cessar.', '1 Tessalonicenses 5:17'),
        v('Chegai-vos a Deus, e ele se chegará a vós.', 'Tiago 4:8'),
        v('Clama a mim, e responder-te-ei.', 'Jeremias 33:3'),
        v('A oração feita por um justo pode muito em seus efeitos.', 'Tiago 5:16'),
    ],
    oferta: [
        v('Deus ama ao que dá com alegria.', '2 Coríntios 9:7'),
        v('Honra ao Senhor com a tua fazenda e com as primícias de toda a tua renda.', 'Provérbios 3:9'),
        v('Mais bem-aventurada coisa é dar do que receber.', 'Atos 20:35'),
        v('Dai, e ser-vos-á dado.', 'Lucas 6:38'),
    ],
    'boas-vindas': [
        v('Oh! Quão bom e quão suave é que os irmãos vivam em união!', 'Salmos 133:1'),
        v('Alegrei-me quando me disseram: Vamos à Casa do Senhor.', 'Salmos 122:1'),
        v('Recebei-vos uns aos outros, como também Cristo nos recebeu.', 'Romanos 15:7'),
    ],
    palavra: [
        v('Lâmpada para os meus pés é tua palavra e luz, para o meu caminho.', 'Salmos 119:105'),
        v('A palavra de Deus é viva, e eficaz.', 'Hebreus 4:12'),
        v('A palavra de nosso Deus subsiste eternamente.', 'Isaías 40:8'),
    ],
    familia: [v('Eu e a minha casa serviremos ao Senhor.', 'Josué 24:15')],
    jovens: [v('Ninguém despreze a tua mocidade.', '1 Timóteo 4:12')],
    homens: [v('Vigiai, estai firmes na fé; portai-vos varonilmente e fortalecei-vos.', '1 Coríntios 16:13')],
    mulheres: [v('A mulher que teme ao Senhor, essa será louvada.', 'Provérbios 31:30')],
    criancas: [v('Deixai vir os meninos a mim.', 'Marcos 10:14')],
    portugal: [v('Bem-aventurada é a nação cujo Deus é o Senhor.', 'Salmos 33:12')],
    brasil: [v('Bem-aventurada é a nação cujo Deus é o Senhor.', 'Salmos 33:12')],
    igreja: [v('Edificarei a minha igreja, e as portas do inferno não prevalecerão contra ela.', 'Mateus 16:18')],
    lideres: [v('Obedecei a vossos pastores e sujeitai-vos a eles; porque velam por vossa alma.', 'Hebreus 13:17')],
}

/** Um versículo da lista que muda de culto para culto (semente = dia do culto) mas é sempre o mesmo para esse dia. */
export function versiculoDoDia(lista: Versiculo[] | undefined, semente: string): Versiculo | null {
    if (!lista?.length) return null
    let h = 0
    for (const ch of semente) h = (h * 31 + ch.charCodeAt(0)) >>> 0
    return lista[h % lista.length]
}

export type OpcoesPeca = {
    alvo?: string; alvoTexto?: string          // oração dirigida (alvo da lista ou texto livre)
    tema?: string; ref?: string; preletor?: string // palavra
    capa?: string; quando?: string                // capa do culto: o título (ex.: "Culto da Família") e "Quarta, 21 out · 20h00"
    cantina?: { titulo?: string; subtitulo?: string; textos?: string[] } // capa da Cantina (a foto vai à parte)
    iban?: string; qr?: string                    // oferta / boas-vindas
    mbway?: string; qrOferta?: string             // oferta: o número do MB WAY e o que o QR leva (transferência ou página)
    versiculo?: Versiculo | null                  // escrito à mão (null = sem versículo); undefined = roda pela lista
    semente: string
}

/** O que vai escrito em cada peça. linhaPequena = a linha de cima (manuscrita ou pequena), titulo = a palavra grande. */
export type ConteudoArte = {
    linhaPequena?: string; titulo?: string; subtitulo?: string; destaque?: string
    preletor?: string; qr?: string; qrLegenda?: string; destaque2?: string; versiculo?: Versiculo | null
    moldura?: 'comida'; textosLegais?: string[]   // Cantina: moldura de ícones de comida e as linhas pequenas em baixo
}

export function conteudoDaPeca(peca: PecaId, o: OpcoesPeca): ConteudoArte {
    const rodar = (chave: string) => (o.versiculo !== undefined ? o.versiculo : versiculoDoDia(VERSICULOS[chave], o.semente))
    switch (peca) {
        case 'cantina':
            return {
                titulo: o.cantina?.titulo || 'Cantina', subtitulo: o.cantina?.subtitulo || undefined,
                moldura: 'comida', textosLegais: (o.cantina?.textos ?? []).filter(Boolean).slice(0, 4), versiculo: null,
            }
        case 'capa':
            return { titulo: o.capa || 'Culto', subtitulo: o.quando, preletor: o.preletor, versiculo: null }
        case 'oracao':
            return { linhaPequena: 'Momento de', titulo: 'Oração', versiculo: rodar('oracao') }
        case 'oracao-dirigida': {
            const [prep, nome] = o.alvo && ALVOS[o.alvo] ? ALVOS[o.alvo] : ['Oração por', 'Todos']
            return { linhaPequena: prep, titulo: o.alvoTexto || nome, versiculo: rodar(o.alvo && VERSICULOS[o.alvo] ? o.alvo : 'oracao') }
        }
        case 'neutro':
            return {}
        case 'boas-vindas':
            return { titulo: 'Bem-vindo!', subtitulo: 'Estamos muito felizes em ter você aqui!', qr: o.qr, versiculo: rodar('boas-vindas') }
        case 'oferta':
            return {
                titulo: 'Contribua', destaque: o.iban ? `IBAN: ${o.iban}` : undefined, destaque2: o.mbway ? `MB WAY: ${o.mbway}` : undefined,
                qr: o.qrOferta, qrLegenda: 'Aponte a câmara do banco', versiculo: rodar('oferta'),
            }
        case 'palavra':
            return o.tema
                ? { linhaPequena: 'Palavra', titulo: o.tema, subtitulo: o.ref, preletor: o.preletor, versiculo: null }
                : { linhaPequena: 'Momento da', titulo: 'Palavra', preletor: o.preletor, versiculo: rodar('palavra') }
    }
}

export const lerPaleta = (q: unknown) => PALETAS.find((p) => p.id === q) ?? PALETAS[0]
export const lerEstilo = (q: unknown): EstiloId => (ESTILOS.find((e) => e.id === q)?.id ?? 'manchas')
export const lerPeca = (q: unknown): PecaId => (PECAS.find((p) => p.id === q)?.id ?? 'oracao')
