// lib/erros-tipos.ts
// Classifica um erro para dizer ao membro o que aconteceu (e o que fazer).
// Sem dependências do servidor: usado no ecrã de erro (browser) e na API.

export type TipoErro = 'VERSAO' | 'REDE' | 'SERVIDOR' | 'APP'

export function classificarErro(e: { name?: string; message?: string; digest?: string }, online = true): TipoErro {
    const texto = `${e.name ?? ''} ${e.message ?? ''}`
    // Versão antiga em memória: depois de uma publicação, o telemóvel pede
    // partes da app que já não existem.
    if (/ChunkLoadError|Loading (CSS )?chunk|dynamically imported module|Importing a module script failed|Failed to find Server Action|older or newer deployment/i.test(texto)) return 'VERSAO'
    if (!online || /Failed to fetch|NetworkError|Load failed|network connection was lost|ERR_INTERNET|ERR_NETWORK/i.test(texto)) return 'REDE'
    // Erros do servidor chegam ao browser só com o digest (a mensagem é escondida).
    if (e.digest) return 'SERVIDOR'
    return 'APP'
}

export const TEXTO_ERRO: Record<TipoErro, { titulo: string; texto: string }> = {
    VERSAO: {
        titulo: 'Há uma versão nova da app',
        texto: 'O seu telemóvel ainda tinha a versão anterior. Toque em "Atualizar a app" para continuar.',
    },
    REDE: {
        titulo: 'Sem ligação à internet',
        texto: 'Não foi possível falar com o servidor. Confirme o Wi-Fi ou os dados móveis e tente novamente.',
    },
    SERVIDOR: {
        titulo: 'Erro no servidor',
        texto: 'Esta página não carregou por um problema do nosso lado. O erro ficou registado e vamos corrigi-lo.',
    },
    APP: {
        titulo: 'Algo correu mal nesta página',
        texto: 'A página encontrou um problema no seu aparelho. O erro ficou registado e vamos corrigi-lo.',
    },
}

/** Código curto e legível (sem 0/O, 1/I) para o membro dizer a quem o ajuda. */
export function codigoErro(): string {
    const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let c = ''
    for (let i = 0; i < 6; i++) c += letras[Math.floor(Math.random() * letras.length)]
    return c
}
