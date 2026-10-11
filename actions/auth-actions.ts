'use server'

import prisma from '@/lib/prisma'
import { cookies, headers } from 'next/headers' // ✅ Importação do headers corrigida
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from '@/lib/redis'
import { audit } from '@/lib/audit'
import { enviarEmailBoasVindas } from '@/lib/mail'


// ============================================================================
// 🛡️ CONFIGURAÇÃO DO RATE LIMITER (Proteção contra Força Bruta)
// ============================================================================

// Rate limit por email: 5 tentativas em 15 minutos
const ratelimitPorEmail = redis ? new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    prefix: "rl:login:email",
    analytics: true,
}) : null;

// Rate limit por IP: 15 tentativas em 15 minutos (mais permissivo, cobre múltiplos users)
const ratelimitPorIp = redis ? new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(15, "15 m"),
    prefix: "rl:login:ip",
    analytics: true,
}) : null;

export async function validarLoginGeral(email: string, pass: string, redirectPath: string = '/membros/dashboard') {
    console.log(`\n=============================================`);
    console.log(`[LOGIN GERAL] Tentativa: ${email}`);

    // 🛡️ VERIFICAR RATE LIMIT ANTES DA BASE DE DADOS
    const rateLimit = await verificarRateLimit(email);
    if (!rateLimit.permitido) return { autorizado: false, erro: rateLimit.erro };

    let logado = false;
    let userRole = 'USER';

    try {
        const membro = await prisma.membro.findUnique({
            where: { email: email.toLowerCase().trim() },
            include: { tenant: { select: { plano: true } } }
        });

        if (!membro || !membro.password) {
            return { autorizado: false, erro: "Credenciais inválidas." };
        }

        if (membro.is_active === false) {
            return { autorizado: false, erro: "A sua conta encontra-se inativa." };
        }

        const senhaValida = await bcrypt.compare(pass, membro.password);
        if (!senhaValida) {
            return { autorizado: false, erro: "Credenciais inválidas." };
        }

        if (redirectPath.includes('/admin') && membro.role !== 'ADMIN') {
            return { autorizado: false, erro: "Não tem permissão de administrador." };
        }

        const planoGeral = membro.tenant?.plano || 'FREE';
        const cookieStore = await cookies();
        cookieStore.set('admvc_session', `id:${membro.id}|role:${membro.role}|tenant_id:${membro.tenant_id}|plano:${planoGeral}`, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 2, // 2 horas
            path: '/',
            sameSite: 'lax',
        });

        logado = true;
        userRole = membro.role;
        revalidatePath('/', 'layout');

    } catch (error) {
        console.error("❌ ERRO GRAVE NO LOGIN:", error);
        return { autorizado: false, erro: "Erro de conexão com o servidor." };
    }

    if (logado) {
        const target = userRole === 'ADMIN' && redirectPath.includes('/admin')
            ? '/admin/dashboard'
            : '/membros/dashboard';
        redirect(target);
    }
}

export async function validarLoginMembro(email: string, pass: string) {
    // 🛡️ VERIFICAR RATE LIMIT ANTES DA BASE DE DADOS
    const rateLimit = await verificarRateLimit(email);
    if (!rateLimit.permitido) return { autorizado: false, erro: rateLimit.erro };

    try {
        const membro = await prisma.membro.findUnique({
            where: { email: email.toLowerCase().trim() },
            include: { familia: true }
        });

        if (!membro || !membro.password || membro.is_active === false) {
            return { autorizado: false };
        }

        const senhaValida = await bcrypt.compare(pass, membro.password);
        if (!senhaValida) return { autorizado: false };

        return { autorizado: true, membro };
    } catch (error) {
        return { autorizado: false, erro: "Falha na conexão." };
    }
}

export async function logoutGeral(tipo: 'admin' | 'membro') {
    const cookieStore = await cookies();
    cookieStore.delete('admvc_session');
    revalidatePath('/', 'layout');

    if (tipo === 'admin') {
        redirect('/membros/login');
    } else {
        redirect('/membros/login');
    }
}

export async function logoutMembro() { return logoutGeral('membro'); }

async function verificarRateLimit(email: string): Promise<{ permitido: boolean; erro: string | null }> {
    try {
        // 1. Obter IP do request
        const headersList = await headers()
        const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
            || headersList.get('x-real-ip')
            || 'unknown'

        // 2. Verificar rate limit por IP (proteção global)
        if (!ratelimitPorIp || !ratelimitPorEmail) return { permitido: true, erro: null }
        const ipResult = await ratelimitPorIp.limit(ip)
        if (!ipResult.success) {
            await audit({
                tenant_id: 0,
                categoria: 'ACESSO',
                acao: 'LOGIN_FALHOU',
                descricao: `IP bloqueado por excesso de tentativas: ${ip}`,
            })
            return {
                permitido: false,
                erro: 'Demasiadas tentativas de login. Aguarde 15 minutos antes de tentar novamente.',
            }
        }

        // 3. Verificar rate limit por email (proteção por conta)
        const emailResult = await ratelimitPorEmail.limit(email.toLowerCase().trim())
        if (!emailResult.success) {
            await audit({
                tenant_id: 0,
                categoria: 'ACESSO',
                acao: 'LOGIN_FALHOU',
                descricao: `Email bloqueado por excesso de tentativas: ${email}`,
            })
            return {
                permitido: false,
                erro: 'Demasiadas tentativas para esta conta. Aguarde 15 minutos antes de tentar novamente.',
            }
        }

        return { permitido: true, erro: null }
    } catch (error) {
        // Se o Redis falhar, permitimos o login (fail-open) para não bloquear o sistema
        console.error('[RATE LIMIT] Erro ao verificar rate limit:', error)
        return { permitido: true, erro: null }
    }
}

// ── LOGIN UNIFICADO ───────────────────────────────────────────────────────────
export async function loginUnificado(formData: FormData) {
    const email = (formData.get('email') as string)?.toLowerCase().trim()
    const password = formData.get('password') as string

    console.log(`\n=============================================`)
    console.log(`[LOGIN UNIFICADO] Tentativa: ${email}`)

    const rateLimit = await verificarRateLimit(email)
    if (!rateLimit.permitido) return { error: rateLimit.erro }

    const usuario = await prisma.membro.findUnique({
        where: { email },
        include: { tenant: { select: { plano: true } } }
    })

    if (!usuario || !usuario.password) {
        console.log(`ERRO: Utilizador nao encontrado.`)

        // Audit: tentativa com email desconhecido
        await audit({
            tenant_id: 0,
            categoria: 'ACESSO',
            acao: 'LOGIN_FALHOU',
            descricao: `Tentativa de login com email nao registado: ${email}`,
        })

        return { error: 'Credenciais invalidas.' }
    }

    if (usuario.is_active === false) {
        console.log(`ERRO: Conta inativa.`)

        await audit({
            tenant_id: usuario.tenant_id,
            categoria: 'ACESSO',
            acao: 'LOGIN_FALHOU',
            actor_id: usuario.id,
            actor_nome: `${usuario.first_name} ${usuario.last_name}`,
            descricao: `Tentativa de login em conta suspensa: ${email}`,
        })

        return { error: 'Esta conta esta suspensa. Contacte a administracao.' }
    }

    const senhaValida = await bcrypt.compare(password, usuario.password)
    if (!senhaValida) {
        console.log(`ERRO: Senha incorreta.`)

        await audit({
            tenant_id: usuario.tenant_id,
            categoria: 'ACESSO',
            acao: 'LOGIN_FALHOU',
            actor_id: usuario.id,
            actor_nome: `${usuario.first_name} ${usuario.last_name}`,
            descricao: `Senha incorreta para: ${email}`,
        })

        return { error: 'Credenciais invalidas.' }
    }

    // Login bem sucedido
    await audit({
        tenant_id: usuario.tenant_id,
        categoria: 'ACESSO',
        acao: 'LOGIN',
        actor_id: usuario.id,
        actor_nome: `${usuario.first_name} ${usuario.last_name}`,
        descricao: `Login realizado — Role: ${usuario.role}`,
    })

    console.log(`LOGIN BEM SUCEDIDO! Role: ${usuario.role}`)

    const plano = usuario.tenant?.plano || 'FREE'
    const congId = usuario.congregacao_id || ''
    const sessionData = `id:${usuario.id}|role:${usuario.role}|tenant_id:${usuario.tenant_id}|plano:${plano}${congId ? `|cong:${congId}` : ''}`
    const cookieStore = await cookies()
    cookieStore.set('admvc_session', sessionData, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        sameSite: 'lax',
    })

    // Atualizar ultimo_login e enviar email de boas-vindas se for o primeiro acesso
    const primeiroLogin = usuario.ultimo_login === null
    await prisma.membro.update({
        where: { id: usuario.id },
        data: { ultimo_login: new Date() },
    })

    if (primeiroLogin && usuario.email) {
        enviarEmailBoasVindas(
            `${usuario.first_name} ${usuario.last_name}`,
            usuario.email,
        ).catch((err) => console.error('[LOGIN] Erro ao enviar email de boas-vindas:', err))
    }

    console.log(`=============================================\n`)

    if (usuario.role === 'ADMIN' || usuario.role === 'CONGREGATION_ADMIN') redirect('/admin/dashboard')
    if (usuario.role === 'FINANCE') redirect('/departamentos/financeiro/dashboard')
    redirect('/membros/dashboard')
}

// ── LOGIN ADMIN ───────────────────────────────────────────────────────────────
export async function loginAdmin(formData: FormData) {
    const email = (formData.get('email') as string)?.toLowerCase().trim()
    const password = formData.get('password') as string

    console.log(`\n=============================================`)
    console.log(`[LOGIN ADMIN] Tentativa: ${email}`)

    const rateLimit = await verificarRateLimit(email)
    if (!rateLimit.permitido) return { error: rateLimit.erro }

    const membro = await prisma.membro.findFirst({
        where: { email, role: 'ADMIN' },
        include: { tenant: { select: { plano: true } } }
    })

    if (!membro || !membro.password) {
        console.log(`ERRO: Admin nao encontrado.`)

        await audit({
            tenant_id: 0,
            categoria: 'ACESSO',
            acao: 'LOGIN_FALHOU',
            descricao: `Tentativa de acesso admin com email nao autorizado: ${email}`,
        })

        return { error: 'Acesso negado ou credenciais invalidas.' }
    }

    if (membro.is_active === false) {
        await audit({
            tenant_id: membro.tenant_id,
            categoria: 'ACESSO',
            acao: 'LOGIN_FALHOU',
            actor_id: membro.id,
            actor_nome: `${membro.first_name} ${membro.last_name}`,
            descricao: `Tentativa de login admin em conta suspensa: ${email}`,
        })

        return { error: 'Conta de administrador desativada.' }
    }

    const senhaValida = await bcrypt.compare(password, membro.password)
    if (!senhaValida) {
        console.log(`ERRO: Senha incorreta.`)

        await audit({
            tenant_id: membro.tenant_id,
            categoria: 'ACESSO',
            acao: 'LOGIN_FALHOU',
            actor_id: membro.id,
            actor_nome: `${membro.first_name} ${membro.last_name}`,
            descricao: `Senha incorreta no acesso admin: ${email}`,
        })

        return { error: 'Acesso negado ou credenciais invalidas.' }
    }

    await audit({
        tenant_id: membro.tenant_id,
        categoria: 'ACESSO',
        acao: 'LOGIN',
        actor_id: membro.id,
        actor_nome: `${membro.first_name} ${membro.last_name}`,
        descricao: `Login de administrador realizado com sucesso`,
    })

    const planoAdmin = membro.tenant?.plano || 'FREE'
    const sessionData = `id:${membro.id}|role:${membro.role}|tenant_id:${membro.tenant_id}|plano:${planoAdmin}`
    const cookieStore = await cookies()
    cookieStore.set('admvc_session', sessionData, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24,
        path: '/',
        sameSite: 'lax',
    })

    console.log(`LOGIN ADMIN BEM SUCEDIDO!`)
    console.log(`=============================================\n`)

    redirect('/admin/dashboard')
}

// ── LOGOUT ────────────────────────────────────────────────────────────────────
export async function logoutAdmin() {
    try {
        const cookieStore = await cookies()
        const session = cookieStore.get('admvc_session')

        if (session) {
            const parts = decodeURIComponent(session.value).split('|')
            let userId = '', tenantId = ''
            parts.forEach(p => {
                const [k, v] = p.split(':')
                if (k === 'id') userId = v
                if (k === 'tenant_id') tenantId = v
            })

            if (userId && tenantId) {
                await audit({
                    tenant_id: Number(tenantId),
                    categoria: 'ACESSO',
                    acao: 'LOGOUT',
                    actor_id: Number(userId),
                    descricao: 'Sessao terminada',
                })
            }
        }
    } catch {
        // Nao bloqueia o logout
    }

    const cookieStore = await cookies()
    cookieStore.delete('admvc_session')
    redirect('/membros/login')
}