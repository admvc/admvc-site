'use server'

import prisma, { getTenantClient } from '@/lib/prisma'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { put } from '@vercel/blob'
import { getSessionData, requireAuth, requireRole } from '@/lib/auth-utils'
import { invalidateMembros } from '@/lib/cache'
import { audit } from '@/lib/audit'


// ============================================================================
// 🛠️ FUNÇÕES AUXILIARES PARA MULTITENANT
// ============================================================================
async function getDb() {
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id');
    if (!tenantId) throw new Error("Sessão inválida. Igreja não identificada.");
    return getTenantClient(Number(tenantId));
}

async function getContext() {
    const headersList = await headers()
    const tenantId = Number(headersList.get('x-tenant-id'))
    if (!tenantId) throw new Error('Igreja nao identificada.')
    const db = getTenantClient(tenantId)
    return { db, tenantId }
}

// Formata data para CSV (YYYY-MM-DD ou vazio)
const fmtData = (d: Date | null | undefined) =>
    d ? new Date(d).toISOString().split('T')[0] : ''

// Converte string CSV para Date ou null
const parseData = (s: string): Date | null => {
    if (!s || s.trim() === '') return null
    const d = new Date(s.trim())
    return isNaN(d.getTime()) ? null : d
}




/*
export async function atualizarDadosMembroAction(id: number, formData: FormData) {
    try {
        const membroId = Number(id);

        // 1. Criamos um objeto vazio para a atualização
        const dadosParaAtualizar: any = {};

        // 2. Só adicionamos ao objeto se o campo existir no formData
        // Isso evita sobrescrever com 'null' campos que não estavam na aba atual
        const campos = [
            'first_name', 'last_name', 'email', 'phone_1', 'phone_2',
            'birthdate', 'gender', 'marital_status', 'spouse_name',
            'children_number', 'notes'
        ];

        campos.forEach(campo => {
            const valor = formData.get(campo);
            if (valor !== null) { // Se o campo existe no envio do formulário
                if (campo === 'children_number') {
                    dadosParaAtualizar[campo] = parseInt(valor as string) || 0;
                } else if (campo === 'birthdate' && valor !== "") {
                    dadosParaAtualizar[campo] = new Date(valor as string);
                } else {
                    dadosParaAtualizar[campo] = valor as string;
                }
            }
        });

        // 3. Executamos o update apenas com os campos capturados
        await prisma.membro.update({
            where: { id: membroId },
            data: dadosParaAtualizar
        });

        // 4. Lógica de Ministérios (opcional, só se os checkboxes estiverem no form)
        const deptosEnviados = formData.getAll('deptos');
        if (deptosEnviados.length > 0) {
            const deptoIds = deptosEnviados.map(id => Number(id));
            await prisma.integranteDepartamento.deleteMany({ where: { membro_id: membroId } });
            await prisma.integranteDepartamento.createMany({
                data: deptoIds.map(dId => ({
                    membro_id: membroId,
                    departamento_id: dId,
                    funcao: "Membro"
                }))
            });
        }

        revalidatePath('/admin/membros');
        return { ok: true };

    } catch (error: any) {
        console.error("Erro na atualização parcial:", error);
        return { ok: false, error: error.message };
    }
}
*/

export async function confirmarPresenca(escalaId: number, status: boolean) {
    try {
        await requireAuth()
        const db = await getDb()
        await db.escala.update({
            where: { id: escalaId },
            data: { confirmado: status }
        });
        revalidatePath("/membros/dashboard");
        return { sucesso: true };
    } catch (error) {
        return { sucesso: false };
    }
}

export async function assinarTermosAction(membroId: number) {
    try {
        await requireAuth()
        const db = await getDb()
        await db.membro.update({
            where: { id: membroId },
            data: {
                termo_aceite: true,
                data_aceite: new Date(),
            }
        });
        revalidatePath('/membros/dashboard');
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}

export async function definirResponsavelFamilia(membroId: number, familiaId: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const db = await getDb()
        // 1. Retirar o poder de todos daquela família primeiro
        await db.membro.updateMany({
            where: { familia_id: familiaId },
            data: { is_family_admin: false }
        });

        // 2. Dar o poder apenas ao membro selecionado
        await db.membro.update({
            where: { id: membroId },
            data: { is_family_admin: true }
        });

        revalidatePath('/membros');
        return { sucesso: true };
    } catch (e) {
        return { erro: "Erro ao trocar responsável." };
    }
}

export async function cadastrarMembroCompleto(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        // 1. Instanciamos o banco de dados blindado (Multitenant)
        const { db, tenantId } = await getContext();

        const passwordRaw = (formData.get('password') as string) || "membro123";
        const hashedPassword = await bcrypt.hash(passwordRaw, 10);

        // Captura de IDs estrangeiros
        const escolaridade_id = formData.get('escolaridade_id') ? Number(formData.get('escolaridade_id')) : null;
        const congregacao_id = formData.get('congregacao_id') ? Number(formData.get('congregacao_id')) : null;

        const conversion_date = formData.get('conversion_date') ? new Date(formData.get('conversion_date') as string) : null;

        // VERIFICAÇÃO DE CHECKBOXES (HTML envia "on" quando marcado)
        const isFamilyAdmin = formData.get('is_family_admin') === 'on' || formData.get('is_family_admin') === 'true' || formData.get('is_family_admin') === 'Sim';
        const hasChildren = formData.get('has_children') === 'on' || formData.get('has_children') === 'true' || formData.get('has_children') === 'Sim';
        const spouseChristian = formData.get('spouse_christian') === 'on' || formData.get('spouse_christian') === 'true' || formData.get('spouse_christian') === 'Sim';
        const isActive = formData.get('is_active') === 'on' || formData.get('is_active') === 'true' || formData.get('is_active') === 'Sim';

        // 2. Gravação no banco de dados
        const novo = await db.membro.create({
            data: {
                first_name: formData.get('first_name') as string,
                last_name: formData.get('last_name') as string,
                email: (formData.get('email') as string).toLowerCase().trim(),
                password: hashedPassword,
                gender: formData.get('gender') as string,
                birthdate: formData.get('birthdate') ? new Date(formData.get('birthdate') as string) : null,
                phone_1: formData.get('phone_1') as string,
                address_1: formData.get('address_1') as string,
                country: (formData.get('country') as string) || "Portugal",
                spouse_name: (formData.get('spouse_name') as string) || null,
                spouse_christian: spouseChristian,
                has_children: hasChildren,
                children_number: parseInt(formData.get('children_number') as string || "0"),
                is_family_admin: isFamilyAdmin,
                lang: "pt",
                status: (formData.get('status') as string) || "ATIVO",
                role: (formData.get('role') as any) || "USER",
                is_active: isActive !== undefined ? isActive : true,
                conversion_date: conversion_date,

                // --- A CORREÇÃO DO TYPESCRIPT ESTÁ AQUI ---
                // Usamos o ID diretamente em vez de 'connect' para satisfazer o UncheckedCreateInput
                escolaridade_id: escolaridade_id,

                // Já deixei preparado para gravar a congregação (Filial) se ela vier no form
                congregacao_id: congregacao_id,

                // MULTITENANT: Obrigatório para o TypeScript, a extensão substitui pelo ID real!
                tenant_id: tenantId
            }
        });

        audit({ tenant_id: tenantId, categoria: 'MEMBROS', acao: 'CRIAR', alvo_id: novo.id, alvo_tipo: 'MEMBRO', alvo_nome: `${formData.get('first_name')} ${formData.get('last_name')}`, descricao: `Membro "${formData.get('first_name')} ${formData.get('last_name')}" cadastrado` }).catch(() => {})

        revalidatePath('/admin/membros');
        invalidateMembros(tenantId).catch(() => {})
        return { sucesso: true, id: novo.id };
    } catch (error: any) {
        console.error("Erro ao cadastrar:", error);

        // Tratamento de erro amigável se o email já existir
        if (error.code === 'P2002') {
            return { erro: "Este e-mail já está a ser utilizado por outro membro." };
        }

        return { erro: error.message || "Erro interno ao guardar o membro." };
    }
}

export async function atualizarDadosMembro(membroId: number, formData: FormData) {
    try {
        await requireAuth()
        console.log(`\n=============================================`);
        console.log(`👤 [DEBUG EDIÇÃO PERFIL] O membro ID ${membroId} está a atualizar os próprios dados`);

        const escolaridade_id = formData.get('escolaridade_id') ? Number(formData.get('escolaridade_id')) : null;
        const conversion_date = formData.get('conversion_date') ? new Date(formData.get('conversion_date') as string) : null;
        const entry_date = formData.get('entry_date') ? new Date(formData.get('entry_date') as string) : null;
        const baptism_date = formData.get('baptism_date') ? new Date(formData.get('baptism_date') as string) : null;
        const wedding_date = formData.get('wedding_date') ? new Date(formData.get('wedding_date') as string) : null;
        const spouse_christian = formData.get('spouse_christian') === 'true';
        const has_children = formData.get('has_children') === 'true';
        // 1. DADOS BASE (Note que is_active, role e status NÃO estão aqui por segurança)
        const dataToUpdate: any = {
            first_name: formData.get('first_name') as string,
            last_name: formData.get('last_name') as string,
            email: (formData.get('email') as string).toLowerCase().trim(),
            phone_1: formData.get('phone_1') as string,
            address_1: formData.get('address_1') as string,
            id_city: formData.get('id_city') as string,
            neighborhood: formData.get('neighborhood') as string,
            address_number: formData.get('address_number') as string,
            postal_code: formData.get('postal_code') as string,
            country: formData.get('country') as string || 'Portugal',
            birthdate: formData.get('birthdate') ? new Date(formData.get('birthdate') as string) : null,
            gender: formData.get('gender') as string,
            profession: formData.get('profession') as string,
            father_name: formData.get('father_name') as string,
            mother_name: formData.get('mother_name') as string,
            spouse_name: formData.get('spouse_name') as string,
            children_number: parseInt(formData.get('children_number') as string || "0"),
            escolaridade_id: escolaridade_id,
            conversion_date: conversion_date,
            entry_date: entry_date,
            baptism_date: baptism_date,
            notes: formData.get('notes') as string || null,
            previous_church: formData.get('previous_church') as string || null,
            church_role: formData.get('church_role') as string || null,
            ministry: formData.get('ministry') as string || null,
            nationality: formData.get('nationality') as string || null,
            tax_id: formData.get('tax_id') as string || null,
            id_card_number: formData.get('id_card_number') as string || null,
            marital_status: formData.get('marital_status') as string || null,
            lang: formData.get('lang') as string || 'pt',
            spouse_christian: spouse_christian,
            wedding_date: wedding_date,
            has_children: has_children,
        };

        // 2. LÓGICA DA NOVA SENHA (Exatamente igual à do Admin)
        const novaSenha = formData.get('nova_senha') as string;
        const avatarFile = formData.get('avatar') as File | null;
        if (avatarFile && avatarFile.size > 0 && avatarFile.name !== 'undefined') {
            console.log(`📸 A fazer upload da nova foto (${avatarFile.name}) para o Blob Storage...`);

            const blob = await put(`avatars/membro-${membroId}-${Date.now()}-${avatarFile.name}`, avatarFile, {
                access: 'public',
            });

            dataToUpdate.avatar_file = blob.url; // Guarda o link público na base de dados
            console.log(`✅ Upload concluído! URL: ${blob.url}`);
        }
        if (novaSenha && novaSenha.trim() !== '') {
            console.log(`🔑 O Membro decidiu alterar a sua própria senha: "${novaSenha.trim()}"`);
            dataToUpdate.password = await bcrypt.hash(novaSenha.trim(), 10);
            console.log(`🔐 Senha encriptada e pronta a gravar!`);
        } else {
            console.log(`⏭️ O campo 'nova_senha' veio vazio. A senha atual mantém-se.`);
        }

        // 3. GRAVAÇÃO
        const db = await getDb()
        await db.membro.update({
            where: { id: Number(membroId) },
            data: dataToUpdate
        });

        console.log(`💾 Perfil do membro atualizado com sucesso!`);
        console.log(`=============================================\n`);

        revalidatePath('/membros/dashboard');
        revalidatePath('/admin/membros');
        const hdr = await headers()
        invalidateMembros(Number(hdr.get('x-tenant-id'))).catch(() => {})
        return { sucesso: "Dados atualizados com sucesso!" };
    } catch (error: any) {
        console.error("❌ ERRO NO PRISMA:", error);
        return { erro: "Erro ao salvar no banco de dados." };
    }
}

export async function alternarConfirmacaoEscala(escalaIds: number[], statusConfirmacao: boolean) {
    try {
        await requireAuth()
        const db = await getDb()
        await db.escala.updateMany({
            where: {
                id: { in: escalaIds } // Atualiza todas as escalas deste array
            },
            data: { confirmado: statusConfirmacao }
        });

        revalidatePath('/membros/dashboard');
        return { ok: true };
    } catch (error) {
        console.error("Erro ao confirmar escala:", error);
        return { ok: false, error: 'Erro ao atualizar a confirmação.' };
    }
}

export async function assinarDocumentoAction(membroId: number, tipo: 'GDPR' | 'PERMANECER') {
    try {
        await requireAuth()
        const hdr = await headers()
        const tenantId = Number(hdr.get('x-tenant-id') || 0)
        const hoje = new Date();

        // Define a validade (Ex: 12 meses a partir de hoje)
        const validade = new Date();
        validade.setMonth(validade.getMonth() + 12);

        const db = await getDb()
        if (tipo === 'GDPR') {
            await db.membro.update({
                where: { id: membroId },
                data: {
                    gdpr_aceite: true,
                    gdpr_data_assinatura: hoje,
                    gdpr_validade: validade
                }
            });
        } else {
            await db.membro.update({
                where: { id: membroId },
                data: {
                    permanecer_aceite: true,
                    permanecer_data_assinatura: hoje,
                    permanecer_validade: validade
                }
            });
        }

        audit({ tenant_id: tenantId, categoria: 'DOCUMENTOS', acao: 'ASSINAR', alvo_id: membroId, alvo_tipo: 'MEMBRO', descricao: `Documento ${tipo} assinado pelo membro #${membroId}` }).catch(() => {})

        revalidatePath('/membros/dashboard');
        return { ok: true };
    } catch (error: any) {
        return { ok: false, error: "Erro ao registar assinatura." };
    }
}

export async function renovarDocumentoAction(membroId: number, tipo: 'GDPR' | 'PERMANECER') {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const hoje = new Date()
        const validade = new Date()
        validade.setMonth(validade.getMonth() + 12)

        const data = tipo === 'GDPR'
            ? { gdpr_aceite: true, gdpr_data_assinatura: hoje, gdpr_validade: validade }
            : { permanecer_aceite: true, permanecer_data_assinatura: hoje, permanecer_validade: validade }

        const db = await getDb()
        await db.membro.update({ where: { id: membroId }, data })
        revalidatePath('/admin/dashboard')
        revalidatePath('/admin/membros')
        return { ok: true }
    } catch (error: any) {
        return { ok: false, error: 'Erro ao renovar documento.' }
    }
}

export async function buscarRelatorioEscalasAction(membroId: number, mes: number, ano: number) {
    try {
        await requireAuth()
        const dataInicio = new Date(ano, mes - 1, 1);
        const dataFim = new Date(ano, mes, 0, 23, 59, 59);

        const db = await getDb()
        const escalas = await db.escala.findMany({
            where: {
                membro_id: membroId,
                evento: {
                    data: { gte: dataInicio, lte: dataFim }
                }
            },
            include: {
                evento: { select: { id: true, nome: true, data: true } },
                departamento: { select: { id: true, nome: true } }
            },
            orderBy: { evento: { data: 'asc' } }
        });

        return { sucesso: true, escalas };
    } catch (error) {
        console.error("Erro ao buscar relatório:", error);
        return { sucesso: false, erro: "Falha ao carregar o relatório." };
    }
}

// Auxiliar para formatar datas para o CSV
const formatDate = (date: Date | null) => date ? date.toISOString().split('T')[0] : '';

export async function buscarMembrosPorFuncao(departamentoId: number, funcaoId: number) {
    await requireAuth()
    const db = await getDb();

    // Procura integrantes que tenham a função selecionada vinculada
    const qualificados = await db.integranteDepartamento.findMany({
        where: {
            departamento_id: departamentoId,
            funcoes: {
                some: { funcao_id: funcaoId }
            }
        },
        include: {
            membro: {
                select: { id: true, first_name: true, last_name: true, avatar_file: true }
            }
        }
    });

    return qualificados.map(q => q.membro);
}



// PATCH: actions/membro-actions.ts (ou admin-actions.ts dependendo do teu projecto)
// Substitui as funcoes: exportarMembrosCSV, analisarCSV, confirmarImportacao


// ── EXPORTAR ──────────────────────────────────────────────────────────────────
export async function exportarMembrosCSV() {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])

        const db = await getDb()
        const membros = await db.membro.findMany({
            orderBy: { first_name: 'asc' },
        })

        // Cabeçalho — exactamente os mesmos campos do CABECALHOS_CSV da página
        const cabecalho = [
            'first_name', 'last_name', 'email', 'phone_1',
            'gender', 'birthdate', 'marital_status', 'nationality',
            'profession', 'tax_id', 'id_card_number',
            'address_1', 'address_number', 'address_2', 'postal_code',
            'neighborhood', 'id_city', 'state', 'country',
            'baptism_status', 'baptism_date', 'conversion_date', 'entry_date',
            'church_role', 'ministry', 'previous_church',
            'status', 'role',
            'spouse_name', 'wedding_date',
            'father_name', 'mother_name',
            'notes', 'avatar_file',
        ].join(';')

        const linhas = membros.map(m => [
            m.first_name,
            m.last_name,
            m.email,
            m.phone_1 || '',
            m.gender || '',
            fmtData(m.birthdate),
            m.marital_status || '',
            m.nationality || '',
            m.profession || '',
            m.tax_id || '',
            m.id_card_number || '',
            m.address_1 || '',
            m.address_number || '',
            m.address_2 || '',
            m.postal_code || '',
            m.neighborhood || '',
            m.id_city || '',
            m.state || '',
            m.country || 'Portugal',
            m.baptism_status || 'Nao Batizado',
            fmtData(m.baptism_date),
            fmtData(m.conversion_date),
            fmtData(m.entry_date),
            m.church_role || 'Membro',
            m.ministry || '',
            m.previous_church || '',
            m.status || 'ATIVO',
            m.role || 'USER',
            m.spouse_name || '',
            fmtData(m.wedding_date),
            m.father_name || '',
            m.mother_name || '',
            // Sanitizar notas (remover ; e newlines para nao partir o CSV)
            (m.notes || '').replace(/;/g, ',').replace(/\n/g, ' '),
            m.avatar_file || '',
        ].join(';'))

        const hdrExport = await headers()
        const tenantIdExport = Number(hdrExport.get('x-tenant-id') || 0)
        audit({ tenant_id: tenantIdExport, categoria: 'MEMBROS', acao: 'EXPORT', alvo_tipo: 'MEMBRO', descricao: `Exportação CSV de ${membros.length} membros` }).catch(() => {})

        return { csv: cabecalho + '\n' + linhas.join('\n') }
    } catch (err: any) {
        console.error('[EXPORTAR CSV] Erro:', err.message)
        return { error: 'Erro ao exportar membros.' }
    }
}

// ── ANALISAR CSV ──────────────────────────────────────────────────────────────
export async function analisarCSV(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])

        const file = formData.get('file') as File
        if (!file) return { error: 'Nenhum ficheiro enviado.' }

        const texto = await file.text()
        // Suporta \r\n (Windows) e \n (Unix)
        const linhas = texto.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)

        if (linhas.length < 2) return { error: 'Ficheiro vazio ou sem dados alem do cabecalho.' }

        // Lê o cabeçalho da primeira linha
        const cabecalho = linhas[0].split(';').map(c => c.trim())

        // Busca emails ja existentes para verificar duplicados
        const db = await getDb()
        const membrosActuais = await db.membro.findMany({ select: { email: true } })
        const emailsExistentes = new Set(membrosActuais.map(m => m.email.toLowerCase()))
        const emailsNoFicheiro = new Set<string>()

        const resultados = []

        for (let i = 1; i < linhas.length; i++) {
            const colunas = linhas[i].split(';')

            // Mapeia as colunas usando o cabeçalho da primeira linha
            const dados: Record<string, string> = {}
            cabecalho.forEach((campo, idx) => {
                dados[campo] = (colunas[idx] || '').trim()
            })

            const email = dados.email?.toLowerCase()
            const firstName = dados.first_name
            const lastName = dados.last_name
            const phone1 = dados.phone_1

            // Validação de campos obrigatórios
            if (!firstName || !email) {
                resultados.push({
                    linha: i + 1,
                    status: 'ERRO' as const,
                    motivo: 'first_name e email sao obrigatorios',
                    dados
                })
                continue
            }

            // Email inválido
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                resultados.push({
                    linha: i + 1,
                    status: 'ERRO' as const,
                    motivo: `Email invalido: "${email}"`,
                    dados
                })
                continue
            }

            // Email duplicado (na BD)
            if (emailsExistentes.has(email)) {
                resultados.push({
                    linha: i + 1,
                    status: 'DUPLICADO' as const,
                    motivo: 'Email ja registado na base de dados',
                    dados: { ...dados, email }
                })
                continue
            }

            // Email duplicado (no mesmo ficheiro)
            if (emailsNoFicheiro.has(email)) {
                resultados.push({
                    linha: i + 1,
                    status: 'DUPLICADO' as const,
                    motivo: 'Email repetido no ficheiro CSV',
                    dados: { ...dados, email }
                })
                continue
            }

            emailsNoFicheiro.add(email)

            resultados.push({
                linha: i + 1,
                status: 'PRONTO' as const,
                dados: { ...dados, email }
            })
        }

        return { resultados }
    } catch (err: any) {
        console.error('[ANALISAR CSV] Erro:', err.message)
        return { error: 'Erro ao processar o ficheiro.' }
    }
}

// ── CONFIRMAR IMPORTACAO ──────────────────────────────────────────────────────
export async function confirmarImportacao(membrosValidos: any[]) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getContext()
        const passwordPadrao = await bcrypt.hash('admvc123', 10)

        const dados = membrosValidos.map(item => {
            const d = item.dados as Record<string, string>

            // Normaliza role para enum válido
            const roleValidos = ['USER', 'ADMIN', 'FINANCE', 'LEADER']
            const role = roleValidos.includes((d.role || '').toUpperCase())
                ? (d.role.toUpperCase() as any)
                : 'USER'

            // Normaliza status
            const statusValidos = ['ATIVO', 'INATIVO', 'PENDENTE', 'VISITANTE', 'ARQUIVADO']
            const status = statusValidos.includes((d.status || '').toUpperCase())
                ? d.status.toUpperCase()
                : 'PENDENTE'

            return {
                tenant_id: tenantId,
                first_name: d.first_name || '',
                last_name: d.last_name || '',
                email: d.email.toLowerCase(),
                password: passwordPadrao,
                phone_1: d.phone_1 || '',
                gender: d.gender || null,
                birthdate: parseData(d.birthdate),
                marital_status: d.marital_status || null,
                nationality: d.nationality || 'Portuguesa',
                profession: d.profession || null,
                tax_id: d.tax_id || null,
                id_card_number: d.id_card_number || null,
                address_1: d.address_1 || null,
                address_number: d.address_number || null,
                address_2: d.address_2 || null,
                postal_code: d.postal_code || null,
                neighborhood: d.neighborhood || null,
                id_city: d.id_city || null,
                state: d.state || null,
                country: d.country || 'Portugal',
                baptism_status: d.baptism_status || 'Nao Batizado',
                baptism_date: parseData(d.baptism_date),
                conversion_date: parseData(d.conversion_date),
                entry_date: parseData(d.entry_date) || new Date(),
                church_role: d.church_role || 'Membro',
                ministry: d.ministry || 'Geral',
                previous_church: d.previous_church || null,
                status,
                role,
                spouse_name: d.spouse_name || null,
                wedding_date: parseData(d.wedding_date),
                father_name: d.father_name || null,
                mother_name: d.mother_name || null,
                notes: d.notes || null,
                avatar_file: d.avatar_file || null,
                is_active: status === 'ATIVO',
            }
        })

        const result = await db.membro.createMany({
            data: dados as any,
            skipDuplicates: true,
        })

        audit({ tenant_id: tenantId, categoria: 'MEMBROS', acao: 'IMPORTAR', alvo_tipo: 'MEMBRO', descricao: `Importação CSV: ${result.count} membros importados` }).catch(() => {})

        revalidatePath('/admin/membros')
        const hdr2 = await headers()
        invalidateMembros(Number(hdr2.get('x-tenant-id'))).catch(() => {})
        return { ok: true, count: dados.length }

    } catch (err: any) {
        console.error('[CONFIRMAR IMPORTACAO] Erro:', err.message)
        return { ok: false, error: 'Erro ao gravar membros. Verifique se os dados estao correctos.' }
    }
}

// ============================================================================
// INTERESSE EM SERVIR — DEPARTAMENTOS
// ============================================================================

export async function submeterInteresseDepartamento(membroId: number, departamentoIds: number[], mensagem?: string) {
    try {
        const session = await getSessionData()
        if (!session) return { ok: false, error: 'Sessao expirada.' }

        // Segurança: só o próprio membro
        if (session.membroId !== membroId) return { ok: false, error: 'Sem permissao.' }

        const hdr = await headers()
        const tenantId = Number(hdr.get('x-tenant-id') || 0)
        if (!tenantId) return { ok: false, error: 'Tenant nao identificado.' }

        const db = getTenantClient(tenantId)

        // Criar interesses (ignorar duplicados)
        for (const deptoId of departamentoIds) {
            await db.interesseDepartamento.upsert({
                where: { membro_id_departamento_id: { membro_id: membroId, departamento_id: deptoId } },
                create: {
                    membro_id: membroId,
                    departamento_id: deptoId,
                    mensagem: mensagem || null,
                    status: 'PENDENTE',
                    tenant_id: tenantId,
                },
                update: {
                    mensagem: mensagem || null,
                    status: 'PENDENTE',
                    criado_em: new Date(),
                },
            })
        }

        const membro = await db.membro.findUnique({ where: { id: membroId }, select: { first_name: true, last_name: true } })
        audit({
            tenant_id: tenantId,
            categoria: 'MEMBROS',
            acao: 'EDITAR',
            actor_id: membroId,
            alvo_id: membroId,
            alvo_nome: membro ? `${membro.first_name} ${membro.last_name}` : '',
            alvo_tipo: 'MEMBRO',
            descricao: `Interesse em servir submetido para ${departamentoIds.length} departamento(s)`,
        }).catch(() => {})

        revalidatePath(`/membros/perfil/editar/${membroId}`)
        return { ok: true }
    } catch (err: any) {
        console.error('[INTERESSE DEPTO] Erro:', err.message)
        return { ok: false, error: 'Erro ao submeter interesse.' }
    }
}