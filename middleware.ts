// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getModuloDaRota, moduloIncluidoNoPlano } from '@/lib/planos'

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // ═══════════════════════════════════════════════════════════════════
    // SUPER-ADMIN: auth completamente separada (cookie próprio)
    // ═══════════════════════════════════════════════════════════════════
    if (pathname.startsWith('/super-admin')) {
        const saSession = request.cookies.get('admvc_sa_session')
        const isSALogin = pathname === '/super-admin/login'

        // Login page: se já autenticado, vai para dashboard
        if (isSALogin) {
            if (saSession) {
                return NextResponse.redirect(new URL('/super-admin/dashboard', request.url))
            }
            return NextResponse.next()
        }

        // Todas as outras rotas SA exigem cookie SA
        if (!saSession) {
            return NextResponse.redirect(new URL('/super-admin/login', request.url))
        }

        // SA autenticado — permitir (sem headers de tenant)
        return NextResponse.next()
    }

    // ═══════════════════════════════════════════════════════════════════
    // PORTAL DA IGREJA: auth de membros (cookie admvc_session)
    // ═══════════════════════════════════════════════════════════════════
    const session = request.cookies.get('admvc_session')

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
        return NextResponse.redirect(new URL('/membros/login', request.url))
    }

    // 3. Com sessão → extrair dados e verificar permissões
    if (session) {
        const parts = session.value.split('|')
        let userId = ''
        let userRole = ''
        let tenantId = ''
        let plano = ''
        let congId = ''

        parts.forEach(part => {
            const [key, val] = part.split(':')
            if (key === 'id') userId = val
            if (key === 'role') userRole = val
            if (key === 'tenant_id') tenantId = val
            if (key === 'plano') plano = val
            if (key === 'cong') congId = val
        })

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
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-user-id', userId)
        requestHeaders.set('x-user-role', userRole)
        requestHeaders.set('x-tenant-id', tenantId)
        requestHeaders.set('x-tenant-plano', plano)
        if (congId) requestHeaders.set('x-congregation-id', congId)

        return NextResponse.next({
            request: { headers: requestHeaders },
        })
    }

    return NextResponse.next()
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
        '/api/admin/:path*',
        '/pregacao/:path*',
        '/ensino/:path*',
        '/boleia/:path*',
        '/assistencia/:path*',
        '/financeiro/:path*',
    ],
}
