// Modelos (cores) das imagens da agenda: telão e redes sociais usam o mesmo modelo.
// "classico" é o primeiro modelo (escuro com laranja no telão, castanho com cartões nas redes).

export type TemaAgenda = {
    id: string; nome: string
    // telão
    fundo: string; painel: string; painelTexto: string; painelSuave: string
    acento: string; texto: string; suave: string; linha: string
    // redes
    fundoRedes: string; tituloRedes: string; celula: string; celulaVazia: string; celulaTexto: string
    celulaSuave: string; numero: string | null; cabecalho: string
    logoFundo?: string // fundo atrás do logótipo (branco) quando o fundo das redes é claro
    // amostra na página
    amostra: [string, string]
}

export const TEMAS_AGENDA: TemaAgenda[] = [
    {
        id: 'classico', nome: 'Clássico',
        fundo: 'linear-gradient(135deg, #1c1c1c 0%, #2b2b2b 100%)', painel: '#111111', painelTexto: '#ffffff', painelSuave: '#a3a3a3',
        acento: '#f5a524', texto: '#e5e5e5', suave: '#a3a3a3', linha: '#d4d4d4',
        fundoRedes: 'linear-gradient(180deg, #8a7a6c 0%, #5d5047 100%)', tituloRedes: '#ffffff', celula: 'rgba(246,240,232,0.94)',
        celulaVazia: 'rgba(246,240,232,0.30)', celulaTexto: '#3b3029', celulaSuave: '#8a7a6c', numero: null, cabecalho: '#f6f0e8',
        amostra: ['#1c1c1c', '#f5a524'],
    },
    {
        id: 'noite', nome: 'Noite azul e dourado',
        fundo: 'linear-gradient(135deg, #0a1630 0%, #14305c 100%)', painel: '#060e20', painelTexto: '#ffffff', painelSuave: '#8ea3c7',
        acento: '#e8c468', texto: '#e6ecf7', suave: '#8ea3c7', linha: '#2f4f82',
        fundoRedes: 'linear-gradient(160deg, #0a1630 0%, #1b3b6e 100%)', tituloRedes: '#ffffff', celula: 'rgba(255,255,255,0.10)',
        celulaVazia: 'rgba(255,255,255,0.03)', celulaTexto: '#e6ecf7', celulaSuave: '#8ea3c7', numero: '#e8c468', cabecalho: '#e8c468',
        amostra: ['#0a1630', '#e8c468'],
    },
    {
        id: 'areia', nome: 'Areia e terracota',
        fundo: 'linear-gradient(135deg, #f6efe3 0%, #ebdfcb 100%)', painel: '#2f3a24', painelTexto: '#ffffff', painelSuave: '#c9d1b4',
        acento: '#b5562f', texto: '#3a3127', suave: '#8a7b68', linha: '#c9b89c',
        fundoRedes: 'linear-gradient(180deg, #f6efe3 0%, #e7d8c0 100%)', tituloRedes: '#2f3a24', celula: '#fffaf2',
        celulaVazia: 'rgba(255,255,255,0.35)', celulaTexto: '#3a3127', celulaSuave: '#8a7b68', numero: '#b5562f', cabecalho: '#2f3a24', logoFundo: '#2f3a24',
        amostra: ['#f6efe3', '#b5562f'],
    },
    {
        id: 'aurora', nome: 'Pôr do sol',
        fundo: 'linear-gradient(135deg, #2a1450 0%, #7a2a6b 55%, #d0584f 100%)', painel: 'rgba(0,0,0,0.28)', painelTexto: '#ffffff', painelSuave: '#f0c9c0',
        acento: '#ffc778', texto: '#fff3ea', suave: '#f0c9c0', linha: 'rgba(255,255,255,0.40)',
        fundoRedes: 'linear-gradient(165deg, #2a1450 0%, #7a2a6b 50%, #d0584f 100%)', tituloRedes: '#ffffff', celula: 'rgba(255,255,255,0.16)',
        celulaVazia: 'rgba(255,255,255,0.04)', celulaTexto: '#ffffff', celulaSuave: '#f0c9c0', numero: '#ffc778', cabecalho: '#ffc778',
        amostra: ['#7a2a6b', '#ffc778'],
    },
    {
        // Dos cultos regulares da marca: verde profundo e dourado
        id: 'floresta', nome: 'Verde e dourado',
        fundo: 'radial-gradient(circle at 85% 10%, #2e4f40 0%, #1a3c34 55%, #12291f 100%)', painel: '#0f241d', painelTexto: '#f5ecd0', painelSuave: '#a9bfae',
        acento: '#d4af37', texto: '#eef2e8', suave: '#a9bfae', linha: '#b8962e',
        fundoRedes: 'linear-gradient(170deg, #2e4f40 0%, #1a3c34 55%, #12291f 100%)', tituloRedes: '#f5ecd0', celula: 'rgba(245,236,208,0.12)',
        celulaVazia: 'rgba(245,236,208,0.04)', celulaTexto: '#f5ecd0', celulaSuave: '#a9bfae', numero: '#d4af37', cabecalho: '#d4af37',
        amostra: ['#1a3c34', '#d4af37'],
    },
    {
        // Das Mulheres da marca, em claro: nude e terracota
        id: 'nude', nome: 'Nude e terracota',
        fundo: 'linear-gradient(135deg, #faf0e8 0%, #ecd0bf 100%)', painel: '#6e3626', painelTexto: '#fff6ee', painelSuave: '#e8c8b8',
        acento: '#a8472f', texto: '#4a2a1f', suave: '#8f6a58', linha: '#c06c54',
        fundoRedes: 'linear-gradient(180deg, #faf0e8 0%, #e9cbb9 100%)', tituloRedes: '#6e3626', celula: '#fffaf5',
        celulaVazia: 'rgba(255,255,255,0.40)', celulaTexto: '#4a2a1f', celulaSuave: '#8f6a58', numero: '#a8472f', cabecalho: '#6e3626', logoFundo: '#6e3626',
        amostra: ['#ecd0bf', '#a8472f'],
    },
]

export function lerTema(q: unknown): TemaAgenda {
    return TEMAS_AGENDA.find((t) => t.id === q) ?? TEMAS_AGENDA[0]
}

/** As semanas do mês de domingo a sábado (como os calendários de parede); dias de fora do mês = null. */
export function semanasDomingo(mes: string): (string | null)[][] {
    const [a, m] = mes.split('-').map(Number)
    const vazios = new Date(Date.UTC(a, m - 1, 1)).getUTCDay()
    const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate()
    const dias: (string | null)[] = Array(vazios).fill(null)
    for (let d = 1; d <= ultimo; d++) dias.push(`${mes}-${String(d).padStart(2, '0')}`)
    while (dias.length % 7) dias.push(null)
    const semanas: (string | null)[][] = []
    for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7))
    return semanas
}
