/**
 * Google Calendar Sync — Preparação
 *
 * Requisitos:
 *   1. Criar um Service Account no Google Cloud Console
 *   2. Ativar a Google Calendar API
 *   3. Partilhar o calendário de destino com o email do Service Account
 *   4. Definir GOOGLE_CALENDAR_CREDENTIALS no .env com o JSON da chave do Service Account
 *   5. Definir GOOGLE_CALENDAR_ID no .env com o ID do calendário (ex: xxxx@group.calendar.google.com)
 *
 * NOTA: Este módulo é preparação apenas. Para funcionar em produção é necessário:
 *   - npm install googleapis
 *   - Configurar o Google Cloud Console com as permissões necessárias
 *   - O OAuth flow real requer configuração no Console do Google
 */

// ---------- Tipos ----------

interface Compromisso {
    id: number
    titulo: string
    categoria: string
    data_inicio: Date | string
    data_fim: Date | string
    observacoes?: string | null
    externos?: string | null
    status: string
    agenda?: {
        nome: string
        dono?: {
            first_name: string
            last_name: string
        }
    }
    membros?: Array<{ first_name: string; last_name: string; email: string }>
    visitantes?: Array<{ nome: string; email?: string | null }>
}

interface GoogleCalendarEvent {
    summary: string
    description?: string
    start: {
        dateTime: string
        timeZone: string
    }
    end: {
        dateTime: string
        timeZone: string
    }
    attendees?: Array<{ email: string; displayName?: string }>
    reminders?: {
        useDefault: boolean
        overrides?: Array<{ method: string; minutes: number }>
    }
}

interface GoogleCalendarResult {
    ok: boolean
    eventId?: string
    error?: string
}

// ---------- Configuração ----------

const TIMEZONE = 'Europe/Lisbon'

function getCredentials(): { clientEmail: string; privateKey: string } | null {
    const raw = process.env.GOOGLE_CALENDAR_CREDENTIALS
    if (!raw) return null

    try {
        const parsed = JSON.parse(raw)
        return {
            clientEmail: parsed.client_email,
            privateKey: parsed.private_key,
        }
    } catch {
        console.error('[GoogleCalendar] Credenciais inválidas — verifique GOOGLE_CALENDAR_CREDENTIALS')
        return null
    }
}

function getCalendarId(): string {
    return process.env.GOOGLE_CALENDAR_ID || 'primary'
}

// ---------- Mapeamento de categorias ----------

const CATEGORIA_LABELS: Record<string, string> = {
    CAFE: 'Café com Pastor',
    PERMANECER: 'Plano Permanecer',
    DISCIPULADO: 'Discipulado',
    LIDERANCA: 'Liderança',
    MESA: 'A Mesa',
}

// ---------- Funções Públicas ----------

/**
 * Cria um evento no Google Calendar a partir de um Compromisso.
 *
 * Requer: googleapis instalado e GOOGLE_CALENDAR_CREDENTIALS configurado.
 */
export async function criarEventoGoogleCalendar(
    compromisso: Compromisso
): Promise<GoogleCalendarResult> {
    const credentials = getCredentials()
    if (!credentials) {
        return { ok: false, error: 'GOOGLE_CALENDAR_CREDENTIALS não configurado.' }
    }

    try {
        const calendarId = getCalendarId()
        const event = compromissoToEvent(compromisso)

        // PREPARAÇÃO: Para activar, instalar googleapis e descomentar:
        // npm install googleapis
        // const { google } = require('googleapis')
        // const auth = new google.auth.GoogleAuth({
        //     credentials: { client_email: credentials.clientEmail, private_key: credentials.privateKey },
        //     scopes: ['https://www.googleapis.com/auth/calendar'],
        // })
        // const calendar = google.calendar({ version: 'v3', auth })
        // const response = await calendar.events.insert({ calendarId, requestBody: event })
        // return { ok: true, eventId: response.data.id }

        console.log(`[GoogleCalendar] Evento preparado: ${event.summary} (${calendarId})`)
        return { ok: false, error: 'Google Calendar requer: npm install googleapis + configuracao no .env' }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido'
        console.error('[GoogleCalendar] Erro:', message)
        return { ok: false, error: message }
    }
}

/**
 * Sincroniza todos os compromissos futuros (status AGENDADO) para o Google Calendar.
 *
 * Requer: googleapis instalado e GOOGLE_CALENDAR_CREDENTIALS configurado.
 */
export async function sincronizarCompromissosGoogleCalendar(
    compromissos: Compromisso[]
): Promise<{ ok: boolean; total: number; criados: number; erros: number }> {
    const credentials = getCredentials()
    if (!credentials) {
        return { ok: false, total: 0, criados: 0, erros: 0 }
    }

    const agora = new Date()
    const futuros = compromissos.filter(c => {
        const dataInicio = typeof c.data_inicio === 'string' ? new Date(c.data_inicio) : c.data_inicio
        return dataInicio > agora && c.status === 'AGENDADO'
    })

    let criados = 0
    let erros = 0

    for (const comp of futuros) {
        const result = await criarEventoGoogleCalendar(comp)
        if (result.ok) {
            criados++
        } else {
            erros++
        }
    }

    return {
        ok: erros === 0,
        total: futuros.length,
        criados,
        erros,
    }
}

// ---------- Helpers Internos ----------

function compromissoToEvent(compromisso: Compromisso): GoogleCalendarEvent {
    const dataInicio = typeof compromisso.data_inicio === 'string'
        ? new Date(compromisso.data_inicio)
        : compromisso.data_inicio

    const dataFim = typeof compromisso.data_fim === 'string'
        ? new Date(compromisso.data_fim)
        : compromisso.data_fim

    // Construir descrição
    const categoriaLabel = CATEGORIA_LABELS[compromisso.categoria] || compromisso.categoria
    const descriptionParts: string[] = [
        `Categoria: ${categoriaLabel}`,
    ]

    if (compromisso.agenda?.nome) {
        descriptionParts.push(`Agenda: ${compromisso.agenda.nome}`)
    }

    if (compromisso.agenda?.dono) {
        descriptionParts.push(`Pastor: ${compromisso.agenda.dono.first_name} ${compromisso.agenda.dono.last_name}`)
    }

    if (compromisso.observacoes) {
        descriptionParts.push(`\nObservações: ${compromisso.observacoes}`)
    }

    if (compromisso.externos) {
        descriptionParts.push(`Externos: ${compromisso.externos}`)
    }

    // Construir lista de participantes (attendees)
    const attendees: Array<{ email: string; displayName?: string }> = []

    if (compromisso.membros) {
        for (const m of compromisso.membros) {
            if (m.email) {
                attendees.push({ email: m.email, displayName: `${m.first_name} ${m.last_name}` })
            }
        }
    }

    if (compromisso.visitantes) {
        for (const v of compromisso.visitantes) {
            if (v.email) {
                attendees.push({ email: v.email, displayName: v.nome })
            }
        }
    }

    const event: GoogleCalendarEvent = {
        summary: compromisso.titulo,
        description: descriptionParts.join('\n'),
        start: {
            dateTime: dataInicio.toISOString(),
            timeZone: TIMEZONE,
        },
        end: {
            dateTime: dataFim.toISOString(),
            timeZone: TIMEZONE,
        },
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'popup', minutes: 30 },
                { method: 'email', minutes: 60 },
            ],
        },
    }

    if (attendees.length > 0) {
        event.attendees = attendees
    }

    return event
}
