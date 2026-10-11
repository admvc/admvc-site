import { NextRequest, NextResponse } from 'next/server'
import { getSessionData } from '@/lib/auth-utils'
import { sendPushToMembro } from '@/lib/web-push'

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionData()
    if (!session) {
      return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    }

    // Apenas admins podem enviar push notifications
    if (session.role !== 'ADMIN' && session.role !== 'CONGREGATION_ADMIN') {
      return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })
    }

    const { membroId, title, body, url } = await request.json()

    if (!membroId || !title || !body) {
      return NextResponse.json(
        { error: 'Campos obrigatorios: membroId, title, body.' },
        { status: 400 }
      )
    }

    const result = await sendPushToMembro(membroId, { title, body, url })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[PUSH/SEND] Erro:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
