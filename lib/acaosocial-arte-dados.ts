// Arte simples da Assistência Social para o telão (16:9): estilos, limites e leitura do pedido. Tudo puro (sem servidor nem
// browser): o desenho (lib/acaosocial-arte.tsx), a rota /api/acaosocial/arte e o ecrã /acaosocial/divulgar usam o mesmo.

export type EstiloSocial = 'noite' | 'creme' | 'verde'
export const ESTILOS_SOCIAL: { id: EstiloSocial; nome: string; descricao: string; amostra: [string, string] }[] = [
    { id: 'noite', nome: 'Noite', descricao: 'Azul-noite com dourado', amostra: ['#14263a', '#d9a441'] },
    { id: 'creme', nome: 'Papel', descricao: 'Creme com terracota', amostra: ['#f1e8d8', '#b4532a'] },
    { id: 'verde', nome: 'Oliveira', descricao: 'Verde profundo com dourado', amostra: ['#1f3b2f', '#e3b95a'] },
]
export const lerEstiloSocial = (v: unknown): EstiloSocial => (ESTILOS_SOCIAL.some((e) => e.id === v) ? (v as EstiloSocial) : 'noite')

export const LIMITES_SOCIAL = { titulo: 40, texto: 160, apelo: 50 }
export const AMOSTRA_SOCIAL = {
    titulo: 'Campanha de alimentos',
    texto: 'Traga um bem não perecível e ajude as famílias da nossa comunidade que mais precisam.',
    apelo: 'Entregue na Assistência Social',
}

/** Texto de uma linha: sem caracteres de controlo, espaços normalizados, cortado no limite. */
export function limparSocial(v: unknown, max: number): string {
    if (typeof v !== 'string') return ''
    // eslint-disable-next-line no-control-regex
    return v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}

export type PedidoSocial = { estilo: EstiloSocial; titulo: string; texto: string; apelo: string }

export function lerPedidoSocial(q: URLSearchParams): PedidoSocial {
    return {
        estilo: lerEstiloSocial(q.get('estilo')),
        titulo: limparSocial(q.get('t'), LIMITES_SOCIAL.titulo),
        texto: limparSocial(q.get('x'), LIMITES_SOCIAL.texto),
        apelo: limparSocial(q.get('a'), LIMITES_SOCIAL.apelo),
    }
}

/** Tamanhos de letra que cabem (o título pode passar a 2 linhas, por isso o salto é por comprimento). */
export const letraDoTitulo = (n: number) => (n <= 16 ? 132 : n <= 24 ? 108 : n <= 32 ? 90 : 76)
export const letraDoTexto = (n: number) => (n <= 70 ? 46 : n <= 120 ? 40 : 35)
export const letraDoApelo = (n: number) => (n <= 28 ? 40 : 34)
