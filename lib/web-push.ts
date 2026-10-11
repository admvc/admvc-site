import webpush from 'web-push'
import prisma from '@/lib/prisma'

// ── VAPID Configuration ──────────────────────────────────────────────────────

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admvcff@gmail.com'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

// ── Helper: gerar par de chaves VAPID ────────────────────────────────────────
// Executar uma unica vez para obter as chaves e guardar no .env
export function generateVAPIDKeys() {
  return webpush.generateVAPIDKeys()
}

// ── Guardar subscription do membro ───────────────────────────────────────────
export async function saveSubscription(membroId: number, subscription: webpush.PushSubscription) {
  await prisma.membro.update({
    where: { id: membroId },
    data: { push_subscription: subscription as object },
  })
}

// ── Enviar notificacao push para um membro ───────────────────────────────────
export async function sendPushToMembro(
  membroId: number,
  payload: { title: string; body: string; url?: string }
) {
  const membro = await prisma.membro.findUnique({
    where: { id: membroId },
    select: { push_subscription: true },
  })

  if (!membro?.push_subscription) {
    return { sent: false, reason: 'Sem subscription registada' }
  }

  try {
    await webpush.sendNotification(
      membro.push_subscription as unknown as webpush.PushSubscription,
      JSON.stringify(payload)
    )
    return { sent: true }
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode
    // Se a subscription expirou ou foi revogada, limpar
    if (statusCode === 410 || statusCode === 404) {
      await prisma.membro.update({
        where: { id: membroId },
        data: { push_subscription: null },
      })
    }
    console.error('[WEB-PUSH] Erro ao enviar:', err)
    return { sent: false, reason: 'Falha no envio' }
  }
}

// ── Enviar push para membros de departamentos por nome ──────────────────────
export async function sendPushToDepartamento(
  deptoTermos: string[],
  payload: { title: string; body: string; url?: string; tag?: string }
) {
  const membros = await prisma.membro.findMany({
    where: {
      push_subscription: { not: null },
      OR: [
        { ministerios: { some: { departamento: { nome: { in: deptoTermos } } } } },
        { departamentos_liderados: { some: { nome: { in: deptoTermos } } } },
      ]
    },
    select: { id: true, push_subscription: true }
  })

  let enviados = 0
  for (const m of membros) {
    if (!m.push_subscription) continue
    try {
      await webpush.sendNotification(
        m.push_subscription as unknown as webpush.PushSubscription,
        JSON.stringify(payload)
      )
      enviados++
    } catch (err: unknown) {
      const sc = (err as { statusCode?: number }).statusCode
      if (sc === 410 || sc === 404) {
        await prisma.membro.update({ where: { id: m.id }, data: { push_subscription: null } })
      }
    }
  }
  return { enviados, total: membros.length }
}

// ── Enviar push para multiplos membros por ID ───────────────────────────────
export async function sendPushToMembros(
  membroIds: number[],
  payload: { title: string; body: string; url?: string; tag?: string }
) {
  const membros = await prisma.membro.findMany({
    where: { id: { in: membroIds }, push_subscription: { not: null } },
    select: { id: true, push_subscription: true }
  })

  let enviados = 0
  for (const m of membros) {
    if (!m.push_subscription) continue
    try {
      await webpush.sendNotification(
        m.push_subscription as unknown as webpush.PushSubscription,
        JSON.stringify(payload)
      )
      enviados++
    } catch (err: unknown) {
      const sc = (err as { statusCode?: number }).statusCode
      if (sc === 410 || sc === 404) {
        await prisma.membro.update({ where: { id: m.id }, data: { push_subscription: null } })
      }
    }
  }
  return { enviados, total: membros.length }
}

export { VAPID_PUBLIC_KEY }
