import { NextResponse } from 'next/server'

export function GET() {
    return NextResponse.json({
        name: 'ADMVC Cloud API',
        version: '2.5.0',
        endpoints: {
            public: {
                'GET /api/public/obra': 'Dados da campanha de construcao',
                'GET /api/public/grupos': 'Lista de grupos publicos',
                'POST /api/public/visitante': 'Registar visitante',
                'GET /api/docs': 'Esta documentacao',
            },
            authenticated: {
                'POST /api/escalas/criar': 'Criar escala',
                'POST /api/escalas/deletar': 'Deletar escala',
                'POST /api/loyverse/sync': 'Sincronizar membro com Loyverse',
                'POST /api/financeiro/lancar': 'Lancar pagamento financeiro',
                'POST /api/financeiro/aprovar-recarga': 'Aprovar recarga de saldo cantina',
                'POST /api/push/subscribe': 'Subscrever push notifications',
                'POST /api/push/send': 'Enviar push notification',
                'POST /api/upload/encontro-foto': 'Upload de foto de encontro',
                'POST /api/avatar/upload': 'Upload de avatar do membro',
            },
            public_donation: {
                'GET /doar/[slug]': 'Pagina publica de donativos (HTML)',
            },
        },
        authentication: 'Cookie-based session (admvc_session)',
        tenant_header: 'x-tenant-id (injected by middleware)',
    })
}
