// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getModuloDaRota, moduloIncluidoNoPlano } from '@/lib/planos'
import { COOKIE_MEMBRO, COOKIE_SA, lerSessao } from '@/lib/sessao-core'

// Cabecalhos de identidade: so o middleware os pode pôr. Os que chegam do
// pedido sao apagados sempre. O servidor nao confia neles (usa a sessao
// verificada em lib/auth-utils.ts); ficam por compatibilidade.
const CABECALHOS_IDENTIDADE = ['x-user-id', 'x-user-role', 'x-tenant-id', 'x-tenant-plano', 'x-congregation-id']

function semIdentidade(request: NextRequest) {
    const h = new Headers(request.headers)
    for (const nome of CABECALHOS_IDENTIDADE) h.delete(nome)
    return h
}

/** Segue o pedido sem cabecalhos de identidade; apaga o cookie invalido, se houver. */
function seguir(request: NextRequest, h: Headers, apagarCookie?: string) {
    const res = NextResponse.next({ request: { headers: h } })
    if (apagarCookie) res.cookies.delete(apagarCookie)
    return res
}

function irPara(destino: string, request: NextRequest, apagarCookie?: string) {
    const res = NextResponse.redirect(new URL(destino, request.url))
    if (apagarCookie) res.cookies.delete(apagarCookie)
    return res
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const requestHeaders = semIdentidade(request)

    // As rotas da API decidem sozinhas (com a sessao verificada); aqui so se
    // limpam os cabecalhos.
    if (pathname.startsWith('/api/')) {
        return seguir(request, requestHeaders)
    }

    // ═══════════════════════════════════════════════════════════════════
    // SUPER-ADMIN: auth completamente separada (cookie próprio)
    // ═══════════════════════════════════════════════════════════════════
    if (pathname.startsWith('/super-admin')) {
        const cookieSA = request.cookies.get(COOKIE_SA)?.value
        const saSession = await lerSessao(cookieSA)
        const valida = saSession?.t === 'sa'
        const apagar = cookieSA && !valida ? COOKIE_SA : undefined
        const isSALogin = pathname === '/super-admin/login'

        // Login page: se já autenticado, vai para dashboard
        if (isSALogin) {
            if (valida) return irPara('/super-admin/dashboard', request)
            return seguir(request, requestHeaders, apagar)
        }

        // Todas as outras rotas SA exigem sessão SA válida
        if (!valida) return irPara('/super-admin/login', request, apagar)

        // SA autenticado — permitir (sem headers de tenant)
        return seguir(request, requestHeaders)
    }

    // ═══════════════════════════════════════════════════════════════════
    // PORTAL DA IGREJA: auth de membros (cookie admvc_session)
    // ═══════════════════════════════════════════════════════════════════
    const cookieMembro = request.cookies.get(COOKIE_MEMBRO)?.value
    const lida = await lerSessao(cookieMembro)
    const session = lida?.t === 'm' ? lida : null
    const apagar = cookieMembro && !session ? COOKIE_MEMBRO : undefined

    // 1. Classificação de rotas
    const isMembrosProtected = pathname.startsWith('/membros/dashboard') || pathname.startsWith('/membros/termos')
    const isAdminProtected = pathname.startsWith('/admin')
    const isModuleProtected = pathname.startsWith('/louvor')
        || pathname.startsWith('/escalas')
        || pathname.startsWith('/grupos')
        || pathname.startsWith('/departamentos')
        || pathname.startsWith('/gabinete')
        || pathname.startsWith('/inventario')
        || pathname.startsWith('/midia')
        || pathname.startsWith('/cantina')
        || pathname.startsWith('/acaosocial')
        || pathname.startsWith('/tesouraria')
        || pathname.startsWith('/pregacao')
        || pathname.startsWith('/ensino')
        || pathname.startsWith('/boleia')
        || pathname.startsWith('/assistencia')
        || pathname.startsWith('/financeiro')

    // 2. Sem sessão em rota protegida → login
    if ((isMembrosProtected || isAdminProtected || isModuleProtected) && !session) {
        return irPara('/membros/login', request, apagar)
    }

    // 3. Com sessão → extrair dados e verificar permissões
    if (session) {
        const userId = String(session.id)
        const userRole = session.role
        const tenantId = String(session.tid)
        const plano = session.plano
        const congId = session.cong ? String(session.cong) : ''

        // 3a. Proteção de role: apenas ADMIN e CONGREGATION_ADMIN acedem a /admin
        if (isAdminProtected && !['ADMIN', 'CONGREGATION_ADMIN'].includes(userRole)) {
            return NextResponse.redirect(new URL('/membros/dashboard', request.url))
        }

        // 3b. Verificação de módulo: se a rota pertence a um módulo, verifica se o plano o inclui
        // Se o cookie não tem plano (sessão antiga), permite acesso (será verificado no server-side)
        const modulo = getModuloDaRota(pathname)
        if (modulo && plano && !moduloIncluidoNoPlano(plano, modulo)) {
            const url = new URL('/membros/dashboard', request.url)
            url.searchParams.set('modulo_bloqueado', modulo)
            return NextResponse.redirect(url)
        }

        // 4. Injectar headers multitenant
        requestHeaders.set('x-user-id', userId)
        requestHeaders.set('x-user-role', userRole)
        requestHeaders.set('x-tenant-id', tenantId)
        requestHeaders.set('x-tenant-plano', plano)
        if (congId) requestHeaders.set('x-congregation-id', congId)

        return seguir(request, requestHeaders)
    }

    return seguir(request, requestHeaders, apagar)
}

export const config = {
    matcher: [
        '/super-admin/:path*',
        '/admin/:path*',
        '/membros/:path*',
        '/louvor/:path*',
        '/escalas/:path*',
        '/grupos/:path*',
        '/departamentos/:path*',
        '/gabinete/:path*',
        '/inventario/:path*',
        '/midia/:path*',
        '/cantina/:path*',
        '/acaosocial/:path*',
        '/tesouraria/:path*',
        '/api/:path*',
        '/pregacao/:path*',
        '/ensino/:path*',
        '/boleia/:path*',
        '/assistencia/:path*',
        '/financeiro/:path*',
    ],
}
