// app/api/admin/criar-membro/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prismaGlobal from '@/lib/prisma'
import { put } from '@vercel/blob'
import bcrypt from 'bcryptjs'
import { audit } from '@/lib/audit'

const parseDate = (val: any): Date | null => {
    if (!val || String(val).trim() === '') return null
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d
}

export async function POST(request: NextRequest) {
    console.log('\n========================================')
    console.log('[API CRIAR MEMBRO] INICIO')
    console.log('========================================')

    try {
        const cookieStore = await cookies()
        const session = cookieStore.get('admvc_session')

        if (!session) {
            console.error('[API CRIAR MEMBRO] Sem sessao')
            return NextResponse.json({ error: 'Sem sessao.' }, { status: 401 })
        }

        const parts = decodeURIComponent(session.value).split('|')
        let tenantId = ''
        parts.forEach(part => {
            const [key, val] = part.split(':')
            if (key === 'tenant_id') tenantId = val
        })

        if (!tenantId) {
            console.error('[API CRIAR MEMBRO] tenant_id nao encontrado no cookie')
            return NextResponse.json({ error: 'Igreja nao identificada.' }, { status: 401 })
        }

        console.log('[API CRIAR MEMBRO] tenant_id: ' + tenantId)
        const db = prismaGlobal
        const formData = await request.formData()

        console.log('[API CRIAR MEMBRO] Campos recebidos:')
        for (const [key, value] of formData.entries()) {
            if (key === 'password') {
                console.log('  ' + key + ': [OCULTO]')
            } else if (value instanceof File) {
                console.log('  ' + key + ': File(name=' + value.name + ', size=' + value.size + ', type=' + value.type + ')')
            } else {
                console.log('  ' + key + ': "' + value + '"')
            }
        }

        const email = (formData.get('email') as string)?.toLowerCase().trim()
        const password = formData.get('password') as string

        if (!email || !password) {
            return NextResponse.json({ error: 'Email e password sao obrigatorios.' }, { status: 400 })
        }

        const existe = await prismaGlobal.membro.findUnique({ where: { email } })
        if (existe) {
            console.warn('[API CRIAR MEMBRO] Email ja existe: ' + email)
            return NextResponse.json({ error: 'Este e-mail ja esta registado.' }, { status: 409 })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        let avatarUrl: string | null = null
        const avatarFile = formData.get('avatar') as File | null

        console.log('[API CRIAR MEMBRO] avatarFile: ' + (avatarFile?.name ?? 'nenhum') + ' (' + (avatarFile?.size ?? 0) + ' bytes)')

        if (avatarFile && avatarFile.size > 0) {
            try {
                const { comprimirImagemParaAvatar } = await import('@/lib/image-utils')
                const buffer = Buffer.from(await avatarFile.arrayBuffer())
                const compressed = await comprimirImagemParaAvatar(buffer)

                const nomeSeguro = 'avatares/' + Date.now() + '.webp'
                console.log(`[API CRIAR MEMBRO] A comprimir e fazer upload: ${(avatarFile.size / 1024).toFixed(0)}KB → ${(compressed.length / 1024).toFixed(0)}KB`)
                const blob = await put(nomeSeguro, compressed, { access: 'public', contentType: 'image/webp' })
                avatarUrl = blob.url
                console.log('[API CRIAR MEMBRO] Upload OK: ' + avatarUrl)
            } catch (err: any) {
                console.error('[API CRIAR MEMBRO] Erro no upload:', err.message)
            }
        }

        const escolaridadeId = formData.get('escolaridade_id') ? Number(formData.get('escolaridade_id')) : null
        const congregacaoId = formData.get('congregacao_id') ? Number(formData.get('congregacao_id')) : null

        const novoMembro = await db.membro.create({
            data: {
                first_name: formData.get('first_name') as string,
                last_name: formData.get('last_name') as string,
                email,
                password: hashedPassword,
                phone_1: (formData.get('phone_1') as string) || null,
                gender: (formData.get('gender') as string) || null,
                marital_status: (formData.get('marital_status') as string) || null,
                birthdate: parseDate(formData.get('birthdate')),
                profession: (formData.get('profession') as string) || null,
                father_name: (formData.get('father_name') as string) || null,
                mother_name: (formData.get('mother_name') as string) || null,
                tax_id: (formData.get('tax_id') as string) || null,
                nationality: (formData.get('nationality') as string) || 'Portuguesa',
                gdpr_aceite: formData.get('gdpr_aceite') === 'true',
                permanecer_aceite: formData.get('permanecer_aceite') === 'true',
                conversion_date: parseDate(formData.get('conversion_date')),
                address_1: (formData.get('address_1') as string) || null,
                address_2: (formData.get('address_2') as string) || null,
                address_number: (formData.get('address_number') as string) || null,
                postal_code: (formData.get('postal_code') as string) || null,
                neighborhood: (formData.get('neighborhood') as string) || null,
                id_city: (formData.get('city') as string) || null,
                state: (formData.get('state') as string) || null,
                country: (formData.get('country') as string) || 'Portugal',
                role: (formData.get('role') as any) || 'USER',
                status: (formData.get('status') as string) || 'ATIVO',
                loyverse_id: (formData.get('loyverse_id') as string) || null,
                church_role: (formData.get('church_role') as string) || 'Membro',
                baptism_date: parseDate(formData.get('baptism_date')),
                data_admissao: parseDate(formData.get('admission_date')),
                notes: (formData.get('notes') as string) || null,
                spouse_name: (formData.get('spouse_name') as string) || null,
                spouse_christian: formData.get('spouse_christian') === 'true' ? true : formData.get('spouse_christian') === 'false' ? false : null,
                has_children: formData.get('has_children') === 'true',
                children_number: Number(formData.get('children_count')) || 0,
                phone_2: (formData.get('phone_2') as string) || null,
                id_card_number: (formData.get('id_card_number') as string) || null,
                baptism_status: (formData.get('baptism_status') as string) || 'Não Batizado',
                previous_church: (formData.get('previous_church') as string) || null,
                lang: (formData.get('lang') as string) || 'Português',
                wedding_date: parseDate(formData.get('wedding_date')),
                avatar_file: avatarUrl,
                is_active: true,
                tenant_id: Number(tenantId),
                escolaridade_id: escolaridadeId,
                congregacao_id: congregacaoId,
            }
        })

        // Gerar QR Code unico
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        let rnd = ''; for (let i = 0; i < 4; i++) rnd += chars.charAt(Math.floor(Math.random() * chars.length))
        await db.membro.update({ where: { id: novoMembro.id }, data: { qr_code: `ADMVC-${tenantId}-${novoMembro.id}-${rnd}` } })

        console.log('[API CRIAR MEMBRO] SUCESSO id=' + novoMembro.id + ' avatar=' + (novoMembro.avatar_file ?? 'sem foto'))
        console.log('========================================\n')
        await audit({
            tenant_id: Number(tenantId),
            categoria: 'MEMBROS',
            acao: 'CRIAR',
            alvo_id: novoMembro.id,
            alvo_nome: `${novoMembro.first_name} ${novoMembro.last_name}`,
            alvo_tipo: 'MEMBRO',
            descricao: `Novo membro registado: ${novoMembro.first_name} ${novoMembro.last_name} (${novoMembro.email}) — Role: ${novoMembro.role}`,
        })
        return NextResponse.json({ sucesso: true, id: novoMembro.id })

    } catch (error: any) {
        console.error('[API CRIAR MEMBRO] ERRO:', error.message, error.code)
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'E-mail ou ID Loyverse ja existem.' }, { status: 409 })
        }
        if (error.code === 'P2011' || error.code === 'P2012') {
            const campo = error.meta?.column || error.meta?.argument || 'desconhecido'
            return NextResponse.json({ error: `Campo obrigatorio em falta: ${campo}` }, { status: 400 })
        }
        return NextResponse.json({ error: `Erro ao criar membro: ${error.message || 'erro desconhecido'}` }, { status: 500 })
    }
}