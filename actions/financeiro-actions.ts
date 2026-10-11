'use server'

//import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getSessionData, requireRole, requireAuth } from '@/lib/auth-utils'
import prismaGlobal, { getTenantClient } from '@/lib/prisma'
import { getLoyverseTokenForTenant } from '@/lib/loyverse-api'
import { headers } from 'next/headers'
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { put } from "@vercel/blob";
import { audit } from '@/lib/audit'
import { recarregarSaldo } from '@/actions/cantina-local-actions'

async function getDb() {
    const headersList = await headers()
    const tenantId = headersList.get('x-tenant-id')
    if (!tenantId) throw new Error('Igreja nao identificada.')
    return getTenantClient(Number(tenantId))
}

async function getTenantId(): Promise<number> {
    const headersList = await headers()
    return Number(headersList.get('x-tenant-id') || 0)
}

const euro = (val: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val)


export async function criarCampanhaEmLoteAction(formData: FormData, membrosIds: number[]) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        if (membrosIds.length === 0) {
            return { ok: false, error: 'Selecione pelo menos um membro.' };
        }

        const nome = formData.get('nome') as string;
        const valor_mensal = parseFloat(formData.get('valor_mensal') as string);
        const parcelas_total = parseInt(formData.get('parcelas_total') as string);
        const data_pagamento = parseInt(formData.get('data_pagamento') as string);

        const primeiroMembro = await prisma.membro.findUnique({
            where: { id: membrosIds[0] },
            select: { tenant_id: true }
        });

        if (!primeiroMembro) {
            return { ok: false, error: 'Membro inválido ou não encontrado.' };
        }

        // Cria o objetivo para CADA membro selecionado
        const dadosParaInserir = membrosIds.map(id => ({
            tenant_id: primeiroMembro.tenant_id,
            nome,
            valor_mensal,
            parcelas_total,
            data_pagamento,
            membro_id: id,
            status: "ATIVO"
        }));

        await prisma.objetivoFinanceiro.createMany({
            data: dadosParaInserir
        });

        revalidatePath('/departamentos/financeiro/dashboard');
        return { ok: true };
    } catch (error) {
        console.error("Erro ao criar campanha:", error);
        return { ok: false, error: 'Erro ao gerar os carnês.' };
    }
}

export async function atualizarCompradorRifaAction(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        const venda_id = parseInt(formData.get('venda_id') as string);
        const membro_id_str = formData.get('membro_id') as string;
        const nome_externo = formData.get('nome_externo') as string;

        const membro_id = membro_id_str ? parseInt(membro_id_str) : null;

        await prisma.rifaNumero.update({
            where: { id: venda_id },
            data: {
                membro_id,
                nome_externo: nome_externo || null,
            }
        });

        revalidatePath('/departamentos/financeiro/dashboard');
        return { ok: true };
    } catch (error) {
        console.error("Erro ao atualizar comprador:", error);
        return { ok: false, error: 'Erro ao corrigir o dono do número.' };
    }
}

export async function venderNumerosRifaLoteAction(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        const rifa_id = parseInt(formData.get('rifa_id') as string);
        const numerosStr = formData.get('numeros') as string;
        const numeros = JSON.parse(numerosStr) as number[]; // Transforma o texto de volta num Array

        const membro_id_str = formData.get('membro_id') as string;
        const nome_externo = formData.get('nome_externo') as string;

        const membro_id = membro_id_str ? parseInt(membro_id_str) : null;

        if (!numeros || numeros.length === 0) {
            return { ok: false, error: 'Nenhum número selecionado.' };
        }

        // 1. Verificação de segurança: Alguém já comprou algum destes?
        const jaVendidos = await prisma.rifaNumero.findMany({
            where: { rifa_id, numero: { in: numeros } }
        });

        if (jaVendidos.length > 0) {
            const numVendidos = jaVendidos.map(v => v.numero).join(', ');
            return { ok: false, error: `Os números ${numVendidos} já foram vendidos entretanto!` };
        }

        const rifa = await prisma.rifa.findUnique({
            where: { id: rifa_id },
            select: { tenant_id: true }
        });

        if (!rifa) {
            return { ok: false, error: 'Rifa não encontrada.' };
        }

        // 2. Prepara os dados para inserir todos de uma vez
        const dadosParaInserir = numeros.map(num => ({
            tenant_id: rifa.tenant_id,
            rifa_id,
            numero: num,
            membro_id,
            nome_externo: nome_externo || null,
            pago: true
        }));

        // 3. Regista a venda em lote
        await prisma.rifaNumero.createMany({
            data: dadosParaInserir
        });

        revalidatePath('/departamentos/financeiro/dashboard');
        return { ok: true };
    } catch (error) {
        console.error("Erro ao vender números em lote:", error);
        return { ok: false, error: 'Erro ao processar a venda múltipla.' };
    }
}

export async function finalizarRifaAction(rifaId: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        await prisma.rifa.update({
            where: { id: rifaId },
            data: { status: 'FINALIZADA' }
        });

        revalidatePath('/departamentos/financeiro/dashboard');
        return { ok: true };
    } catch (error) {
        console.error("Erro ao finalizar rifa:", error);
        return { ok: false, error: 'Erro ao tentar encerrar a rifa.' };
    }
}

export async function solicitarSaldoCantinaAction(formData: FormData) {
    console.log(`\n======================================================`);
    console.log(`📝 [CANTINA] NOVO PEDIDO DE CARREGAMENTO RECEBIDO`);
    console.log(`⏰ Data/Hora: ${new Date().toISOString()}`);

    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        const membroId = Number(formData.get('membro_id'));
        const valorCru = String(formData.get('valor'));
        const formaPagamento = formData.get('forma_pagamento') as string;

        console.log(`👤 ID do Membro: ${membroId}`);
        console.log(`💳 Método de Pagamento: ${formaPagamento}`);
        console.log(`💶 Valor Original Digitado: "${valorCru}"`);

        // 1. TRUQUE DA VÍRGULA: Substitui vírgulas por pontos (Ex: 17,50 vira 17.50)
        const valorTratado = valorCru.replace(',', '.');
        const valor = Number(valorTratado);
        console.log(`💶 Valor Convertido P/ Sistema: €${valor}`);

        // Validação de segurança
        if (!membroId || !valor || isNaN(valor) || valor <= 0) {
            console.error(`❌ [ERRO] Valor inválido ou ID do membro em falta.`);
            console.log(`======================================================\n`);
            return { ok: false, error: "Valor inválido. Por favor, verifique o montante." };
        }

        const membroObj = await prisma.membro.findUnique({
            where: { id: membroId },
            select: { tenant_id: true }
        });

        if (!membroObj) {
            console.error(`❌ [ERRO] Membro não encontrado no sistema.`);
            console.log(`======================================================\n`);
            return { ok: false, error: "Membro não encontrado." };
        }

        // 2. GRAVAR COMO PENDENTE
        console.log(`💾 [PRISMA] A gravar o pedido na base de dados (Status: PENDENTE)...`);
        const novoPedido = await prisma.pedidoSaldoCantina.create({
            data: {
                tenant_id: membroObj.tenant_id,
                membro_id: membroId,
                valor: valor,
                forma_pagamento: formaPagamento,
                status: 'PENDENTE' // Garante que vai para o alerta laranja do tesoureiro
            }
        });

        console.log(`✅ [SUCESSO] Pedido #${novoPedido.id} registado no sistema!`);

        // 3. O SEGREDO DO CACHE: Mandar o Next.js atualizar as DUAS dashboards!
        console.log(`🔄 [CACHE] A limpar cache das dashboards do Membro e Tesoureiro...`);
        revalidatePath('/membros/dashboard');
        revalidatePath('/departamentos/financeiro/dashboard');

        console.log(`======================================================\n`);
        return { ok: true };
    } catch (error: any) {
        console.error(`🚨 [FALHA CRÍTICA AO SOLICITAR SALDO]`, error);
        console.log(`======================================================\n`);
        return { ok: false, error: "Erro interno ao processar o pedido." };
    }
}

export async function aprovarSaldoCantinaAction(pedidoId: number, _loyverseId: string | null, valor: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])

        // Buscar pedido para obter membro_id e forma_pagamento
        const pedido = await prisma.pedidoSaldoCantina.findUnique({ where: { id: pedidoId } })
        if (!pedido) return { ok: false, error: 'Pedido nao encontrado.' }
        if (pedido.status === 'APROVADO') return { ok: false, error: 'Este pedido ja foi aprovado.' }

        // Recarregar saldo usando o sistema local (sem Loyverse)
        const result = await recarregarSaldo(pedido.membro_id, pedido.valor, `Recarga aprovada via tesouraria (${pedido.forma_pagamento})`)
        if (result.error) return { ok: false, error: result.error }

        // Atualizar status do pedido
        await prisma.pedidoSaldoCantina.update({
            where: { id: pedidoId },
            data: { status: 'APROVADO' }
        })

        revalidatePath('/departamentos/financeiro/dashboard')
        revalidatePath('/membros/dashboard')

        return { ok: true }

    } catch (error: any) {
        console.error(`[ERRO] Aprovacao de saldo falhou:`, error)
        return { ok: false, error: error.message }
    }
}

export async function setVencedorRifaAction(rifaId: number, numero: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        await prisma.rifa.update({
            where: { id: rifaId },
            data: {
                numero_sorteado: numero,
                status: "FINALIZADA"
            }
        });
        revalidatePath('/membros/dashboard');
        return { ok: true };
    } catch (error: any) {
        return { ok: false, error: error.message };
    }
}

export async function getHistoricoComprasLoyverse(loyverseId: string) {
    await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
    if (!loyverseId) {
        throw new Error("O membro não tem um ID do Loyverse associado.");
    }
    const tenantId = await getTenantId();
    const token = await getLoyverseTokenForTenant(tenantId);
    if (!token) return { error: "Loyverse nao configurado para este tenant." };

    try {
        const res = await fetch(`https://api.loyverse.com/v1.0/receipts?limit=250`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            cache: 'no-store'
        });

        if (!res.ok) return { error: "Erro na API do Loyverse" };
        const data = await res.json();

        const todosOsRecibos = data.receipts || [];

        const recibosExclusivosDoMembro = todosOsRecibos.filter(
            (recibo: any) => recibo.customer_id === loyverseId
        );

        return { receipts: recibosExclusivosDoMembro };
    } catch (e) {
        console.error("Erro no fetch do Loyverse:", e);
        return { error: "Erro de conexão" };
    }
}

export async function lancarPagamentoCarne(carneId: number, qtdParcelas: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        const carne = await prisma.objetivoFinanceiro.findUnique({
            where: { id: carneId }
        });

        if (!carne) throw new Error("Carnê não encontrado.");

        const session = await getSessionData();
        if (!session) return { ok: false, error: 'Sessão expirada.' };

        const valorTotal = carne.valor_mensal * qtdParcelas;

        // 1. Atualiza o Carnê (Soma as parcelas pagas e o status)
        await prisma.objetivoFinanceiro.update({
            where: { id: carneId },
            data: {
                parcelas_pagas: { increment: qtdParcelas },
                status: (carne.parcelas_pagas + qtdParcelas) >= carne.parcelas_total ? 'CONCLUIDO' : 'ATIVO'
            }
        });

        // 2. Lança a Transação
        await prisma.lancamentoFinanceiro.create({
            data: {
                tenant_id: carne.tenant_id,
                objetivo_id: carneId,
                valor_pago: valorTotal,
                data_recebimento: new Date(),
                forma_pagamento: 'DINHEIRO',
                registrado_por_id: session.membroId
            }
        });

        revalidatePath('/departamentos/financeiro/dashboard');
        return { ok: true };
    } catch (error: any) {
        return { ok: false, error: error.message };
    }
}

export async function registrarPagamentoCampanhaAction(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        const session = await getSessionData();
        if (!session) return { ok: false, error: 'Sessão expirada.' };

        const objetivo_id = parseInt(formData.get('objetivo_id') as string);
        const valor_pago = parseFloat(formData.get('valor_pago') as string);
        const forma_pagamento = formData.get('forma_pagamento') as string;

        const objetivo = await prisma.objetivoFinanceiro.findUnique({
            where: { id: objetivo_id },
            select: { tenant_id: true }
        });

        if (!objetivo) {
            return { ok: false, error: 'Campanha não encontrada.' };
        }

        // 1. Regista a entrada do dinheiro
        await prisma.lancamentoFinanceiro.create({
            data: {
                tenant_id: objetivo.tenant_id,
                objetivo_id,
                valor_pago,
                forma_pagamento,
                registrado_por_id: session.membroId // Quem recebeu o dinheiro (o Tesoureiro)
            }
        });

        // 2. Incrementa o número de parcelas pagas na campanha
        await prisma.objetivoFinanceiro.update({
            where: { id: objetivo_id },
            data: {
                parcelas_pagas: { increment: 1 }
            }
        });

        revalidatePath('/departamentos/financeiro/dashboard');
        return { ok: true };
    } catch (error) {
        console.error("Erro ao registar pagamento:", error);
        return { ok: false, error: 'Erro ao processar o pagamento.' };
    }
}

export async function buscarRelatorioTesouraria(ano: number, mes: number, membroIdFiltro: string, tipoFiltro: string) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        let dataInicio, dataFim;

        if (mes > 0) {
            dataInicio = new Date(ano, mes - 1, 1);
            dataFim = new Date(ano, mes, 0, 23, 59, 59);
        } else {
            dataInicio = new Date(ano, 0, 1);
            dataFim = new Date(ano, 11, 31, 23, 59, 59);
        }

        const membroId = membroIdFiltro && membroIdFiltro !== 'todos' ? Number(membroIdFiltro) : undefined;

        // 1. Busca Dízimos, Ofertas e Missões
        let whereContribuicoes: any = { data: { gte: dataInicio, lte: dataFim } };
        if (membroId) whereContribuicoes.membro_id = membroId;

        // Se escolheu um tipo específico que não é CAMPANHA
        if (tipoFiltro !== 'TODOS' && tipoFiltro !== 'CAMPANHA') {
            whereContribuicoes.tipo = tipoFiltro;
        } else if (tipoFiltro === 'CAMPANHA') {
            whereContribuicoes.id = -1; // Truque para não trazer contribuições se ele só quer ver Campanhas
        }

        const contribuicoes = await prisma.contribuicao.findMany({
            where: whereContribuicoes,
            include: { membro: true },
            orderBy: { data: 'asc' }
        });

        // 2. Busca Pagamentos de Carnês/Campanhas
        let whereLancamentos: any = { data_recebimento: { gte: dataInicio, lte: dataFim } };
        if (membroId) whereLancamentos.objetivo = { membro_id: membroId };

        // Se escolheu um tipo específico que não é CAMPANHA, não trazemos os carnês
        if (tipoFiltro !== 'TODOS' && tipoFiltro !== 'CAMPANHA') {
            whereLancamentos.id = -1;
        }

        const lancamentos = await prisma.lancamentoFinanceiro.findMany({
            where: whereLancamentos,
            include: { objetivo: { include: { membro: true } } },
            orderBy: { data_recebimento: 'asc' }
        });

        // 3. Unifica e formata tudo
        const transacoes = [
            ...contribuicoes.map((c: any) => ({
                id: `contrib-${c.id}`,
                data: c.data || c.createdAt,
                nome: c.membro ? `${c.membro.first_name} ${c.membro.last_name}` : 'Oferta Anónima',
                tipo: c.tipo,
                descricao: c.observacao || c.tipo,
                valor: c.valor
            })),
            ...lancamentos.map((l: any) => ({
                id: `carne-${l.id}`,
                data: l.data_recebimento,
                nome: `${l.objetivo.membro.first_name} ${l.objetivo.membro.last_name}`,
                tipo: 'CAMPANHA',
                descricao: `Campanha: ${l.objetivo.nome}`,
                valor: l.valor_pago
            }))
        ].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

        return { sucesso: true, transacoes };
    } catch (error) {
        console.error("Erro ao buscar relatório tesouraria:", error);
        return { sucesso: false, erro: "Falha ao carregar o relatório." };
    }
}

export async function buscarExtratoFinanceiroMembro(
    membroId: number,
    ano: number,
    mes: number   // 0 = ano inteiro, 1-12 = mes especifico
) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        const inicio = mes === 0
            ? new Date(ano, 0, 1)
            : new Date(ano, mes - 1, 1)

        const fim = mes === 0
            ? new Date(ano, 11, 31, 23, 59, 59)
            : new Date(ano, mes, 0, 23, 59, 59)

        // CORRECAO: filtrar por createdAt (sempre preenchido) em vez de data (pode ser null)
        // e remover o OR que causava conflito
        const contribuicoes = await prisma.contribuicao.findMany({
            where: {
                membro_id: membroId,
                createdAt: { gte: inicio, lte: fim }
            },
            orderBy: { createdAt: 'desc' }
        })

        const lancamentos = await prisma.lancamentoFinanceiro.findMany({
            where: {
                NOT: { forma_pagamento: 'MBWAY' },
                objetivo: { membro_id: membroId },
                data_recebimento: { gte: inicio, lte: fim }
            },
            include: {
                objetivo: { select: { nome: true } }
            },
            orderBy: { data_recebimento: 'desc' }
        })

        const numerosRifa = await prisma.rifaNumero.findMany({
            where: {
                membro_id: membroId,
                createdAt: { gte: inicio, lte: fim }
            },
            include: {
                rifa: { select: { nome: true, valor_numero: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        const transacoes = [
            ...contribuicoes.map(c => ({
                id: `contrib-${c.id}`,
                tipo: c.tipo,
                valor: c.valor,
                // usa data se existir, senao createdAt
                data: (c.data ?? c.createdAt).toISOString(),
                descricao: null
            })),
            ...lancamentos.map(l => ({
                id: `carne-${l.id}`,
                tipo: 'CARNE',
                valor: l.valor_pago,
                data: l.data_recebimento.toISOString(),
                descricao: l.objetivo?.nome ?? null
            })),
            ...numerosRifa.map(n => ({
                id: `rifa-${n.id}`,
                tipo: 'RIFA',
                valor: n.rifa.valor_numero,
                data: n.createdAt.toISOString(),
                descricao: n.rifa.nome
            }))
        ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
        console.log('ACTION recebeu:', { membroId, tipo: typeof membroId, ano, mes })

        return { sucesso: true, transacoes }
    } catch (error: any) {
        console.error('Erro ao buscar extrato:', error)
        return { sucesso: false, transacoes: [] }
    }
}


// ── ATRIBUIR NUMERO DE RIFA ───────────────────────────────────────────────────
export async function atribuirNumeroRifaAction(
    rifaId: number,
    membroId: number,
    numero: number
) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        const db = await getDb()
        const tenant_id = await getTenantId()

        const [rifa, membro] = await Promise.all([
            db.rifa.findUnique({ where: { id: rifaId }, select: { nome: true } }),
            db.membro.findUnique({ where: { id: membroId }, select: { first_name: true, last_name: true } })
        ])

        const rifaNumero = await db.rifaNumero.create({
            data: {
                tenant_id,
                rifa_id: rifaId,
                membro_id: membroId,
                numero,
                pago: false,
            }
        })

        await audit({
            tenant_id,
            categoria: 'FINANCEIRO',
            acao: 'CRIAR',
            alvo_id: rifaNumero.id,
            alvo_tipo: 'RIFA',
            descricao: `Numero ${numero} da rifa "${rifa?.nome}" atribuido a ${membro?.first_name} ${membro?.last_name}`,
            dados_apos: {
                rifa_id: rifaId,
                numero,
                membro_id: membroId,
            },
        })

        revalidatePath('/departamentos/financeiro/dashboard')
        return { ok: true }

    } catch (error: any) {
        console.error('[ATRIBUIR NUMERO RIFA] Erro:', error.message)
        return { ok: false, error: 'Erro ao atribuir numero.' }
    }
}

// ── CONFIRMAR PAGAMENTO DE NUMERO RIFA ───────────────────────────────────────
export async function confirmarPagamentoRifaAction(rifaNumeroId: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        const db = await getDb()
        const tenant_id = await getTenantId()

        const rifaNumero = await db.rifaNumero.findUnique({
            where: { id: rifaNumeroId },
            include: {
                rifa: { select: { nome: true, valor_numero: true } },
                membro: { select: { first_name: true, last_name: true } }
            }
        })

        if (!rifaNumero) return { ok: false, error: 'Numero nao encontrado.' }

        await db.rifaNumero.update({
            where: { id: rifaNumeroId },
            data: { pago: true }
        })

        await audit({
            tenant_id,
            categoria: 'FINANCEIRO',
            acao: 'APROVAR',
            alvo_id: rifaNumeroId,
            alvo_tipo: 'RIFA',
            descricao: `Pagamento confirmado: numero ${rifaNumero.numero} da rifa "${rifaNumero.rifa.nome}" — ${rifaNumero.membro.first_name} ${rifaNumero.membro.last_name} — ${euro(rifaNumero.rifa.valor_numero)}`,
        })

        revalidatePath('/departamentos/financeiro/dashboard')
        return { ok: true }

    } catch (error: any) {
        console.error('[CONFIRMAR PAGAMENTO RIFA] Erro:', error.message)
        return { ok: false, error: 'Erro ao confirmar pagamento.' }
    }
}

// ── EXPORTAR RELATORIO ────────────────────────────────────────────────────────
export async function registarExportacaoRelatorio(tipo: string, parametros?: Record<string, any>) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        const tenant_id = await getTenantId()

        await audit({
            tenant_id,
            categoria: 'FINANCEIRO',
            acao: 'EXPORT',
            alvo_tipo: 'LANCAMENTO',
            descricao: `Relatorio exportado: ${tipo}${parametros ? ` — ${JSON.stringify(parametros)}` : ''}`,
        })
    } catch {
        // Nao bloqueia a exportacao
    }
}




// MAIS NOVO





// ── CONFIRMAR MBWAY CARNE ─────────────────────────────────────────────────────
// LancamentoFinanceiro: id, objetivo_id, valor_pago, data_recebimento, forma_pagamento
// Confirmar = mudar forma_pagamento para 'MBWAY (Validado)'
export async function confirmarMBWayCarneAction(lancamentoId: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        const db = await getDb()
        const tenant_id = await getTenantId()

        // Busca dados antes de alterar
        const lancamento = await db.lancamentoFinanceiro.findUnique({
            where: { id: lancamentoId },
            include: {
                objetivo: {
                    include: {
                        membro: {
                            select: { id: true, first_name: true, last_name: true }
                        }
                    }
                }
            }
        })

        if (!lancamento) return { ok: false, error: 'Lancamento nao encontrado.' }

        await db.lancamentoFinanceiro.update({
            where: { id: lancamentoId },
            data: { forma_pagamento: 'MBWAY (Validado)' }
        })

        await audit({
            tenant_id,
            categoria: 'FINANCEIRO',
            acao: 'APROVAR',
            alvo_id: lancamentoId,
            alvo_tipo: 'LANCAMENTO',
            descricao: `MBWay validado: ${euro(lancamento.valor_pago)} — ${lancamento.objetivo.membro.first_name} ${lancamento.objetivo.membro.last_name} — Campanha: ${lancamento.objetivo.nome ?? ''}`,
            dados_apos: {
                lancamento_id: lancamentoId,
                valor_pago: lancamento.valor_pago,
                membro_id: lancamento.objetivo.membro.id,
                forma_pagamento: 'MBWAY (Validado)',
            },
        })

        revalidatePath('/departamentos/financeiro/dashboard')
        return { ok: true }

    } catch (error: any) {
        console.error('[CONFIRMAR MBWAY] Erro:', error.message)
        return { ok: false, error: 'Erro ao validar pagamento.' }
    }
}

// ── LANCAR PAGAMENTO CARNE ────────────────────────────────────────────────────
// Cria LancamentoFinanceiro + incrementa parcelas_pagas no ObjetivoFinanceiro
export async function lancarPagamentoCarneAction(carneId: number, qtd: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        const session = await getSessionData()
        if (!session) return { ok: false, error: 'Sessao expirada.' }

        const tenant_id = await getTenantId()

        const carne = await prisma.objetivoFinanceiro.findUnique({
            where: { id: carneId },
            include: {
                membro: { select: { id: true, first_name: true, last_name: true } }
            }
        })

        if (!carne) return { ok: false, error: 'Carne nao encontrado.' }

        const valorTotal = carne.valor_mensal * qtd

        const novoLancamento = await prisma.lancamentoFinanceiro.create({
            data: {
                tenant_id: carne.tenant_id,
                objetivo_id: carneId,
                valor_pago: valorTotal,
                data_recebimento: new Date(),
                forma_pagamento: 'DINHEIRO',
                registrado_por_id: session.membroId,
            }
        })

        const novasParcelas = carne.parcelas_pagas + qtd
        await prisma.objetivoFinanceiro.update({
            where: { id: carneId },
            data: {
                parcelas_pagas: { increment: qtd },
                status: novasParcelas >= carne.parcelas_total ? 'CONCLUIDO' : 'ATIVO'
            }
        })

        await audit({
            tenant_id,
            categoria: 'FINANCEIRO',
            acao: 'CRIAR',
            alvo_id: novoLancamento.id,
            alvo_tipo: 'CARNE',
            descricao: `Pagamento de carne registado: ${qtd} parcela(s) de ${euro(carne.valor_mensal)} = ${euro(valorTotal)} — ${carne.membro.first_name} ${carne.membro.last_name} — Campanha: ${carne.nome}`,
            dados_apos: {
                lancamento_id: novoLancamento.id,
                carne_id: carneId,
                parcelas: qtd,
                valor_total: valorTotal,
                membro_id: carne.membro.id,
                parcelas_pagas: novasParcelas,
                parcelas_total: carne.parcelas_total,
            },
        })

        revalidatePath('/departamentos/financeiro/dashboard')
        return { ok: true }

    } catch (error: any) {
        console.error('[LANCAR CARNE] Erro:', error.message)
        return { ok: false, error: error.message }
    }
}

// ── LANCAR CONTRIBUICAO ───────────────────────────────────────────────────────
// Cria registo em Contribuicao (dizimo, oferta, missoes, etc.)
export async function lancarContribuicaoAction(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        const session = await getSessionData()
        if (!session) return { ok: false, error: 'Sessao expirada.' }

        const tenant_id = await getTenantId()

        const membroId = Number(formData.get('membroId'))
        const valor = Number(formData.get('valor'))
        const tipo = formData.get('tipo') as string
        const observacao = (formData.get('observacao') as string) || null
        const data = formData.get('data') ? new Date(formData.get('data') as string) : new Date()

        const membro = await prisma.membro.findUnique({
            where: { id: membroId },
            select: { first_name: true, last_name: true, tenant_id: true }
        })

        if (!membro) return { ok: false, error: 'Membro nao encontrado.' }

        const novaContribuicao = await prisma.contribuicao.create({
            data: {
                tenant_id: membro.tenant_id,
                membro_id: membroId,
                tipo,
                valor,
                data,
                observacao,
            }
        })

        await audit({
            tenant_id: tenant_id || membro.tenant_id,
            categoria: 'FINANCEIRO',
            acao: 'CRIAR',
            alvo_id: novaContribuicao.id,
            alvo_tipo: 'CONTRIBUICAO',
            descricao: `Contribuicao registada: ${tipo} de ${euro(valor)} — ${membro.first_name} ${membro.last_name}${observacao ? ` — Obs: ${observacao}` : ''}`,
            dados_apos: {
                contribuicao_id: novaContribuicao.id,
                tipo,
                valor,
                membro_id: membroId,
                data: data.toISOString(),
            },
        })

        revalidatePath('/membros/dashboard')
        revalidatePath('/departamentos/financeiro/dashboard')
        return { ok: true }

    } catch (error: any) {
        console.error('[LANCAR CONTRIBUICAO] Erro:', error.message)
        return { ok: false, error: error.message }
    }
}

// ── CRIAR RIFA ────────────────────────────────────────────────────────────────
// Rifa: nome, premio, valor_numero, total_numeros, status
export async function criarRifaAction(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        const session = await getSessionData()
        if (!session) return { ok: false, error: 'Sessao expirada.' }

        const tenant_id = await getTenantId()

        const membroLogado = await prisma.membro.findUnique({
            where: { id: session.membroId },
            select: { tenant_id: true }
        })
        if (!membroLogado) return { ok: false, error: 'Utilizador nao encontrado.' }

        const nome = formData.get('nome') as string
        const premio = formData.get('premio') as string
        const valor_numero = parseFloat(formData.get('valor_numero') as string)
        const total_numeros = parseInt(formData.get('total_numeros') as string)

        const novaRifa = await prisma.rifa.create({
            data: {
                tenant_id: membroLogado.tenant_id,
                nome,
                premio,
                valor_numero,
                total_numeros,
                status: 'ATIVA',
            }
        })

        await audit({
            tenant_id: tenant_id || membroLogado.tenant_id,
            categoria: 'FINANCEIRO',
            acao: 'CRIAR',
            alvo_id: novaRifa.id,
            alvo_tipo: 'RIFA',
            descricao: `Rifa criada: "${nome}" — Premio: ${premio} — ${total_numeros} numeros a ${euro(valor_numero)}`,
            dados_apos: {
                rifa_id: novaRifa.id,
                nome,
                premio,
                valor_numero,
                total_numeros,
            },
        })

        revalidatePath('/departamentos/financeiro/dashboard')
        return { ok: true }

    } catch (error: any) {
        console.error('[CRIAR RIFA] Erro:', error.message)
        return { ok: false, error: 'Erro ao criar rifa.' }
    }
}

// ── VENDER NUMERO RIFA ────────────────────────────────────────────────────────
// RifaNumero: numero, rifa_id, membro_id, nome_externo, pago, tenant_id
export async function venderNumeroRifaAction(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        const tenant_id = await getTenantId()

        const rifa_id = parseInt(formData.get('rifa_id') as string)
        const numero = parseInt(formData.get('numero') as string)
        const membro_id_str = formData.get('membro_id') as string
        const nome_externo = (formData.get('nome_externo') as string) || null
        const membro_id = membro_id_str ? parseInt(membro_id_str) : null

        const jaVendido = await prisma.rifaNumero.findUnique({
            where: { rifa_id_numero: { rifa_id, numero } }
        })

        if (jaVendido) return { ok: false, error: 'Este numero ja foi vendido.' }

        const rifa = await prisma.rifa.findUnique({
            where: { id: rifa_id },
            select: { tenant_id: true, nome: true, valor_numero: true }
        })

        if (!rifa) return { ok: false, error: 'Rifa nao encontrada.' }

        let membroNome = nome_externo || 'Externo'
        if (membro_id) {
            const membro = await prisma.membro.findUnique({
                where: { id: membro_id },
                select: { first_name: true, last_name: true }
            })
            if (membro) membroNome = `${membro.first_name} ${membro.last_name}`
        }

        const novoNumero = await prisma.rifaNumero.create({
            data: {
                tenant_id: rifa.tenant_id,
                rifa_id,
                numero,
                membro_id,
                nome_externo,
                pago: true,
            }
        })

        await audit({
            tenant_id: tenant_id || rifa.tenant_id,
            categoria: 'FINANCEIRO',
            acao: 'CRIAR',
            alvo_id: novoNumero.id,
            alvo_tipo: 'RIFA',
            descricao: `Numero ${numero} vendido na rifa "${rifa.nome}" — Comprador: ${membroNome} — ${euro(rifa.valor_numero)}`,
            dados_apos: {
                rifa_numero_id: novoNumero.id,
                rifa_id,
                numero,
                membro_id,
                nome_externo,
                valor: rifa.valor_numero,
            },
        })

        revalidatePath('/departamentos/financeiro/dashboard')
        return { ok: true }

    } catch (error: any) {
        console.error('[VENDER NUMERO RIFA] Erro:', error.message)
        return { ok: false, error: 'Erro ao processar venda.' }
    }
}

// ── DECLARAR VENCEDOR RIFA ────────────────────────────────────────────────────
export async function setVencedoresRifaAction(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        const tenant_id = await getTenantId()

        const rifa_id = parseInt(formData.get('rifa_id') as string)
        const num1 = parseInt(formData.get('num1') as string)
        const num2 = formData.get('num2') ? parseInt(formData.get('num2') as string) : null
        const num3 = formData.get('num3') ? parseInt(formData.get('num3') as string) : null

        const rifa = await prisma.rifa.findUnique({
            where: { id: rifa_id },
            select: { nome: true, tenant_id: true }
        })

        await prisma.rifa.update({
            where: { id: rifa_id },
            data: {
                numero_sorteado: num1,
                numero_sorteado_2: num2,
                numero_sorteado_3: num3,
                status: 'FINALIZADA',
            }
        })

        await audit({
            tenant_id: tenant_id || rifa?.tenant_id || 0,
            categoria: 'FINANCEIRO',
            acao: 'APROVAR',
            alvo_id: rifa_id,
            alvo_tipo: 'RIFA',
            descricao: `Rifa "${rifa?.nome}" finalizada — 1o: ${num1}${num2 ? ` | 2o: ${num2}` : ''}${num3 ? ` | 3o: ${num3}` : ''}`,
            dados_apos: {
                rifa_id,
                numero_sorteado: num1,
                numero_sorteado_2: num2,
                numero_sorteado_3: num3,
                status: 'FINALIZADA',
            },
        })

        revalidatePath('/departamentos/financeiro/dashboard')
        return { ok: true }

    } catch (error: any) {
        console.error('[DECLARAR VENCEDOR RIFA] Erro:', error.message)
        return { ok: false, error: 'Erro ao registar vencedores.' }
    }
}

// ── APROVAR SALDO CANTINA ─────────────────────────────────────────────────────
// Registar audit apos a aprovacao bem sucedida do saldo
export async function registarAuditAprovacaoCantina(
    pedidoId: number,
    membroId: number,
    membroNome: string,
    valor: number,
    tenantId: number
) {
    await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
    await audit({
        tenant_id: tenantId,
        categoria: 'CANTINA',
        acao: 'APROVAR',
        alvo_id: pedidoId,
        alvo_tipo: 'LANCAMENTO',
        descricao: `Saldo cantina aprovado: ${euro(valor)} carregado para ${membroNome}`,
        dados_apos: {
            pedido_id: pedidoId,
            membro_id: membroId,
            valor,
        },
    })
}

// ── EXPORTAR RELATORIO ────────────────────────────────────────────────────────
// Chamar manualmente nos botoes de exportar PDF/Excel/CSV
export async function registarExportacaoFinanceiro(tipo: string, parametros?: Record<string, any>) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        const tenant_id = await getTenantId()
        await audit({
            tenant_id,
            categoria: 'FINANCEIRO',
            acao: 'EXPORT',
            descricao: `Relatorio exportado: ${tipo}${parametros ? ` — Periodo: ${JSON.stringify(parametros)}` : ''}`,
        })
    } catch {
        // Nao bloqueia a exportacao
    }
}