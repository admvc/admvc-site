// lib/rgpd.ts
// Direitos dos titulares (acesso e apagamento) e prazos de retencao.
//
// Anonimizar em vez de apagar: as escalas, contribuicoes e recibos ficam
// (contabilidade e historico), mas deixam de identificar a pessoa. Os recibos
// fiscais guardam a sua propria copia dos dados no momento da emissao.
//
// Fora de actions/ de proposito: nao verifica quem pede. Quem chama decide.

import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'

// ── Prazos ────────────────────────────────────────────────────────────────────
/** Visitante sem visitas nem contactos ha este tempo → anonimizado. */
export const MESES_RETENCAO_VISITANTE = 12
/** Pedido de oracao de visitante → apagado ao fim deste tempo. */
export const MESES_RETENCAO_PEDIDO_ORACAO = 3

export const NOME_VISITANTE_ANONIMO = 'Visitante anonimizado'

export function mesesAntes(agora: Date, meses: number): Date {
    const d = new Date(agora)
    d.setMonth(d.getMonth() - meses)
    return d
}

/** Datas-limite da retencao: o que for anterior a elas sai. */
export function limitesDeRetencao(agora = new Date()) {
    return {
        visitante: mesesAntes(agora, MESES_RETENCAO_VISITANTE),
        pedidoOracao: mesesAntes(agora, MESES_RETENCAO_PEDIDO_ORACAO),
    }
}

/** Filtro: visitantes a anonimizar (sem visita nem contacto desde o limite). */
export function filtroVisitantesExpirados(limite: Date): Prisma.VisitanteWhereInput {
    return {
        nome: { not: NOME_VISITANTE_ANONIMO },
        data_ultima_visita: { lt: limite },
        acompanhamentos: { none: { data_contacto: { gte: limite } } },
    }
}

/** Filtro: pedidos de oracao a apagar (registados antes do limite). */
export function filtroPedidosExpirados(limite: Date): Prisma.VisitanteWhereInput {
    return {
        pedido_oracao: { not: null },
        data_primeira_visita: { lt: limite },
    }
}

// ── Membros ───────────────────────────────────────────────────────────────────
/** Campos que identificam a pessoa, e o valor que ficam a ter. */
export function camposAnonimosMembro(id: number): Prisma.MembroUpdateInput {
    return {
        first_name: 'Membro',
        last_name: `removido #${id}`,
        email: `removido-${id}@anonimo.invalid`,
        password: null,
        avatar_file: null,
        birthdate: null,
        gender: null,
        marital_status: null,
        nationality: null,
        tax_id: null,
        id_card_number: null,
        profession: null,
        father_name: null,
        mother_name: null,
        phone_1: null,
        phone_2: null,
        address_1: null,
        address_2: null,
        address_number: null,
        postal_code: null,
        id_city: null,
        state: null,
        country: null,
        neighborhood: null,
        // o ponto da casa no mapa das famílias
        latitude: null,
        longitude: null,
        geo_fonte: null,
        geo_chave: null,
        geo_falhou: false,
        baptism_status: null,
        baptism_date: null,
        conversion_date: null,
        church_role: null,
        ministry: null,
        notes: null,
        previous_church: null,
        spouse_name: null,
        spouse_christian: null,
        wedding_date: null,
        has_children: null,
        children_number: null,
        parentesco: null,
        familia: { disconnect: true },
        push_subscription: Prisma.DbNull,
        ip_assinatura: null,
        loyverse_id: null,
        qr_code: null,
        is_active: false,
        status: 'ANONIMIZADO',
    }
}

/** Tudo o que o portal guarda sobre o membro (direito de acesso, art. 15.º). */
export async function dadosDoMembro(id: number) {
    const membro = await prisma.membro.findUnique({
        where: { id },
        include: {
            familia: true,
            congregacao: { select: { id: true, nome: true } },
            escolaridade: true,
            cargos: true,
            grupos: { select: { id: true, nome: true } },
            lider_de_grupo: { select: { id: true, nome: true } },
            ministerios: { include: { departamento: { select: { id: true, nome: true } } } },
            escalas: { include: { evento: { select: { id: true, nome: true, data: true } } } },
            indisponibilidadeMembros: true,
            contribuicoes: true,
            pledges: true,
            recibosFiscais: true,
            saldoCantina: true,
            transacoesCantina: true,
            boleiasOferecidas: true,
            boleiasReservadas: true,
            matriculasEBD: true,
            presencasEBD: true,
        },
    })
    if (!membro) return null
    // Nunca sai: a cifra da senha e a subscricao tecnica das notificacoes.
    const { password: _password, push_subscription: _push, ...dados } = membro
    return { exportado_em: new Date().toISOString(), membro: dados }
}

export async function anonimizarMembro(id: number) {
    await prisma.membro.update({ where: { id }, data: camposAnonimosMembro(id) })
    // Ligacoes que so diziam quem a pessoa era
    await prisma.membro.update({
        where: { id },
        data: { cargos: { set: [] }, grupos: { set: [] } },
    })
}

// ── Visitantes ────────────────────────────────────────────────────────────────
export const CAMPOS_ANONIMOS_VISITANTE: Prisma.VisitanteUpdateInput = {
    nome: NOME_VISITANTE_ANONIMO,
    telefone: '',
    email: null,
    pedido_oracao: null,
    notas_lider: null,
}

export async function anonimizarVisitante(id: number) {
    await prisma.$transaction([
        prisma.visitante.update({ where: { id }, data: CAMPOS_ANONIMOS_VISITANTE }),
        prisma.acompanhamentoVisitante.updateMany({ where: { visitante_id: id }, data: { observacoes: null } }),
    ])
}
