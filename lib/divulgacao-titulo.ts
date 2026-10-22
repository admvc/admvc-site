// O título das artes das redes com destaque: *assim* fica em destaque (cor ou itálico, conforme o estilo); | muda de linha.

export type Palavra = { t: string; destaque: boolean }

/** "As obras da carne X o *fruto do Espírito*" → linhas de palavras (| muda de linha; *…* fica em destaque). */
export function palavrasDoTitulo(texto: string): Palavra[][] {
    return texto.split('|').map((linha) => {
        const fora: Palavra[] = []
        linha.split('*').forEach((pedaco, i) => {
            for (const t of pedaco.split(/\s+/).filter(Boolean)) fora.push({ t, destaque: i % 2 === 1 })
        })
        return fora
    }).filter((l) => l.length)
}

