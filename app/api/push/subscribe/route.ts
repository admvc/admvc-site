import { NextRequest, NextResponse } from 'next/server'
import { getSessionData } from '@/lib/auth-utils'
import { saveSubscription } from '@/lib/web-push'

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionData()
    if (!session) {
      return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    }

    const subscription = await request.json()

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Subscription invalida.' }, { status: 400 })
    }

    await saveSubscription(session.membroId, subscription)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PUSH/SUBSCRIBE] Erro:', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
