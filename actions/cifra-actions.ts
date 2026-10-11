'use server'

import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'
import { importarCifraClub } from '@/lib/cifra'

/**
 * Busca a cifra de uma URL do CifraClub, converte para formato bracket,
 * e guarda na BD como cifra_interna da música.
 */
export async function importarCifraDeUrlAction(musicaId: string, url: string) {
    try {
        await requireAuth()

        if (!url || !url.includes('cifraclub') && !url.includes('cifras.com')) {
            return { ok: false, error: 'URL inválida. Use um link do CifraClub.' }
        }

        // 1. Buscar a página HTML
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ADMVC/1.0)',
                'Accept': 'text/html',
            },
            next: { revalidate: 0 }
        })

        if (!res.ok) {
            return { ok: false, error: `Erro ao aceder ao CifraClub (${res.status})` }
        }

        const html = await res.text()

        // 2. Extrair o texto da cifra do HTML
        const cifraTexto = extrairCifraDoHTML(html)

        if (!cifraTexto || cifraTexto.trim().length < 10) {
            return { ok: false, error: 'Não foi possível extrair a cifra desta página.' }
        }

        // 3. Converter para formato bracket
        const cifraConvertida = importarCifraClub(cifraTexto)

        // 4. Guardar na BD
        await prisma.musica.update({
            where: { id: musicaId },
            data: { cifra_interna: cifraConvertida }
        })

        revalidatePath('/louvor')
        revalidatePath('/membros/dashboard')

        return { ok: true, cifra: cifraConvertida }
    } catch (error: any) {
        console.error('[importarCifraDeUrl] Erro:', error.message)
        return { ok: false, error: 'Erro ao importar cifra.' }
    }
}

/**
 * Extrai o texto da cifra de uma página HTML do CifraClub.
 * O CifraClub usa <pre> dentro de .cifra_cnt ou .cifra-mono.
 */
function extrairCifraDoHTML(html: string): string {
    // Tentar vários selectores conhecidos do CifraClub

    // Método 1: Conteúdo dentro de <pre> tags (formato mais comum)
    const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/gi)
    if (preMatch && preMatch.length > 0) {
        // Usar o maior <pre> (normalmente é a cifra)
        const maior = preMatch.sort((a, b) => b.length - a.length)[0]
        return limparHTML(maior)
    }

    // Método 2: Div com classe cifra_cnt
    const cifraCntMatch = html.match(/<div[^>]*class="[^"]*cifra_cnt[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
    if (cifraCntMatch) {
        return limparHTML(cifraCntMatch[1])
    }

    // Método 3: Div com classe cifra-mono
    const cifraMonoMatch = html.match(/<div[^>]*class="[^"]*cifra-mono[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
    if (cifraMonoMatch) {
        return limparHTML(cifraMonoMatch[1])
    }

    // Método 4: Qualquer conteúdo entre tags que pareça cifra (acordes + letra)
    const bodyMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
    if (bodyMatch) {
        return limparHTML(bodyMatch[1])
    }

    return ''
}

/**
 * Limpa tags HTML e converte entidades, preservando quebras de linha.
 */
function limparHTML(html: string): string {
    return html
        // Converter <br> em newlines
        .replace(/<br\s*\/?>/gi, '\n')
        // Converter </p> e </div> em newlines
        .replace(/<\/(?:p|div|span)>/gi, '\n')
        // Extrair texto de <b> e <span> (acordes no CifraClub)
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '$1')
        .replace(/<span[^>]*>(.*?)<\/span>/gi, '$1')
        .replace(/<a[^>]*>(.*?)<\/a>/gi, '$1')
        // Remover todas as tags restantes
        .replace(/<[^>]+>/g, '')
        // Converter entidades HTML
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        // Limpar linhas vazias excessivas
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}
