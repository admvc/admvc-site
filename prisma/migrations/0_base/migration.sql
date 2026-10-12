-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "StatusInteresse" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "TipoInscricao" AS ENUM ('LIVRE', 'DEPARTAMENTO', 'GRUPO');

-- CreateEnum
CREATE TYPE "CategoriaCurso" AS ENUM ('EBD', 'LIVRE', 'DISCIPULADO', 'SEMINARIO');

-- CreateEnum
CREATE TYPE "StatusCurso" AS ENUM ('PLANEADO', 'EM_CURSO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusMatricula" AS ENUM ('ATIVA', 'TRANCADA', 'CONCLUIDA', 'DESISTENTE');

-- CreateEnum
CREATE TYPE "TipoAtividade" AS ENUM ('EXERCICIO', 'PROVA', 'TRABALHO', 'PARTICIPACAO');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'LEADER', 'ADMIN', 'CONGREGATION_ADMIN', 'FINANCE', 'MANAGER');

-- CreateEnum
CREATE TYPE "InventarioCategoria" AS ENUM ('ELETRONICO', 'INSTRUMENTO', 'MOVEL', 'VEICULO', 'FERRAMENTA', 'VESTUARIO', 'LIVRO', 'CONSUMIVEL', 'OUTRO');

-- CreateEnum
CREATE TYPE "InventarioEstado" AS ENUM ('OTIMO', 'BOM', 'REGULAR', 'DANIFICADO', 'INUTILIZAVEL');

-- CreateEnum
CREATE TYPE "MovimentoTipo" AS ENUM ('ENTRADA', 'SAIDA', 'EMPRESTIMO', 'DEVOLUCAO', 'MANUTENCAO', 'RETORNO_MANUTENCAO', 'TRANSFERENCIA', 'AJUSTE');

-- CreateTable
CREATE TABLE "escolaridades" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "escolaridades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cargo" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Cargo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "musicas" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "artista" TEXT,
    "bpm" INTEGER,
    "tom" TEXT,
    "link_video" TEXT,
    "link_letra" TEXT,
    "link_cifra" TEXT,
    "link_audio" TEXT,
    "cifra_interna" TEXT,
    "holyrics_id" TEXT,

    CONSTRAINT "musicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "plano" TEXT NOT NULL DEFAULT 'FREE',
    "modulos_custom" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "ultimo_acesso" TIMESTAMP(3),
    "plano_inicio" TIMESTAMP(3),
    "plano_fim" TIMESTAMP(3),
    "valor_mensal" DOUBLE PRECISION,
    "onboarding_completo" BOOLEAN NOT NULL DEFAULT false,
    "onboarding_checklist" JSONB,
    "cor_primaria" TEXT NOT NULL DEFAULT '#3F6B4F',
    "cor_secundaria" TEXT NOT NULL DEFAULT '#7FAE93',
    "cor_fundo" TEXT NOT NULL DEFAULT '#0b0d0c',
    "logo_url" TEXT,
    "holyrics_url" TEXT,
    "holyrics_token" TEXT,
    "x32_ip" TEXT,
    "x32_port" INTEGER DEFAULT 10023,
    "lumikit_url" TEXT,
    "lumikit_cenas" JSONB,
    "x32_cenas" JSONB,
    "regioes_custom" JSONB,
    "youtube_channel_id" TEXT,
    "instagram_handle" TEXT,
    "curso_permanecer_id" TEXT,
    "loyverse_token" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Congregacao" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "codigo_postal" TEXT,
    "distrito" TEXT,
    "pais" TEXT DEFAULT 'Portugal',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "pastor" TEXT,
    "co_pastor" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "tenant_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Congregacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membros" (
    "id" SERIAL NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "avatar_file" TEXT,
    "birthdate" TIMESTAMP(3),
    "gender" TEXT,
    "marital_status" TEXT,
    "nationality" TEXT,
    "tax_id" TEXT,
    "id_card_number" TEXT,
    "profession" TEXT,
    "lang" TEXT DEFAULT 'Português',
    "father_name" TEXT,
    "mother_name" TEXT,
    "phone_1" TEXT,
    "phone_2" TEXT,
    "address_1" TEXT,
    "address_2" TEXT,
    "address_number" TEXT,
    "postal_code" TEXT,
    "id_city" TEXT,
    "state" TEXT,
    "country" TEXT DEFAULT 'Portugal',
    "baptism_status" TEXT DEFAULT 'Não Batizado',
    "baptism_date" TIMESTAMP(3),
    "church_role" TEXT DEFAULT 'Membro',
    "ministry" TEXT DEFAULT 'Geral',
    "entry_date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "previous_church" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "data_admissao" TIMESTAMP(3),
    "aprovado_por" TEXT,
    "spouse_name" TEXT,
    "spouse_christian" BOOLEAN DEFAULT false,
    "wedding_date" TIMESTAMP(3),
    "has_children" BOOLEAN DEFAULT false,
    "children_number" INTEGER DEFAULT 0,
    "familia_id" INTEGER,
    "parentesco" TEXT,
    "is_family_admin" BOOLEAN NOT NULL DEFAULT false,
    "ultimo_login" TIMESTAMP(3),
    "push_subscription" JSONB,
    "ip_assinatura" TEXT,
    "data_aceite" TIMESTAMP(3),
    "termo_aceite" BOOLEAN NOT NULL DEFAULT false,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "loyverse_id" TEXT,
    "conversion_date" TIMESTAMP(3),
    "escolaridade_id" INTEGER,
    "congregacao_id" INTEGER,
    "gdpr_aceite" BOOLEAN NOT NULL DEFAULT false,
    "gdpr_data_assinatura" TIMESTAMP(3),
    "gdpr_validade" TIMESTAMP(3),
    "neighborhood" TEXT,
    "permanecer_aceite" BOOLEAN NOT NULL DEFAULT false,
    "permanecer_data_assinatura" TIMESTAMP(3),
    "permanecer_validade" TIMESTAMP(3),
    "tenant_id" INTEGER NOT NULL,
    "qr_code" TEXT,
    "visitante_id" INTEGER,

    CONSTRAINT "membros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Familia" (
    "id" SERIAL NOT NULL,
    "surname" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "Familia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Departamento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "lider_id" INTEGER,
    "compromissoId" INTEGER,
    "congregacaoId" INTEGER,
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "foto_url" TEXT,
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "Departamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegranteDepartamento" (
    "id" SERIAL NOT NULL,
    "membro_id" INTEGER NOT NULL,
    "departamento_id" INTEGER NOT NULL,
    "data_entrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pode_gerir_escalas" BOOLEAN NOT NULL DEFAULT false,
    "turno" TEXT,
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "IntegranteDepartamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InteresseDepartamento" (
    "id" SERIAL NOT NULL,
    "membro_id" INTEGER NOT NULL,
    "departamento_id" INTEGER NOT NULL,
    "mensagem" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "InteresseDepartamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuncaoSelecionada" (
    "id" SERIAL NOT NULL,
    "integrante_departamento_id" INTEGER NOT NULL,
    "funcao_id" INTEGER NOT NULL,

    CONSTRAINT "FuncaoSelecionada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grupo" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "data_abertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dia_semana" TEXT NOT NULL,
    "horario" TEXT NOT NULL,
    "perfil" TEXT,
    "categoria" TEXT,
    "descricao" TEXT,
    "endereco" TEXT NOT NULL,
    "numero" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "pais" TEXT NOT NULL DEFAULT 'Portugal',
    "departamento_id" INTEGER,
    "compromissoId" INTEGER,
    "congregacaoId" INTEGER,
    "tenant_id" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "regiao" TEXT,
    "publico" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncontroGrupo" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "grupo_id" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "tema" TEXT NOT NULL,
    "foto_url" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "regiao" TEXT,
    "publico" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EncontroGrupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'CULTO_REGULAR',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "congregacao_id" INTEGER,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escala" (
    "id" SERIAL NOT NULL,
    "funcao" TEXT NOT NULL,
    "confirmado" BOOLEAN NOT NULL DEFAULT false,
    "horario" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evento_id" INTEGER NOT NULL,
    "departamento_id" INTEGER NOT NULL,
    "membro_id" INTEGER NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "congregacao_id" INTEGER,
    "funcao_id" INTEGER,
    "motivo_recusa" TEXT,

    CONSTRAINT "Escala_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuncaoDepartamento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "departamento_id" INTEGER NOT NULL,
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "FuncaoDepartamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjetivoFinanceiro" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "valor_mensal" DOUBLE PRECISION NOT NULL,
    "parcelas_total" INTEGER NOT NULL,
    "parcelas_pagas" INTEGER NOT NULL DEFAULT 0,
    "data_pagamento" INTEGER NOT NULL,
    "membro_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "ObjetivoFinanceiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LancamentoFinanceiro" (
    "id" SERIAL NOT NULL,
    "objetivo_id" INTEGER NOT NULL,
    "valor_pago" DOUBLE PRECISION NOT NULL,
    "data_recebimento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "forma_pagamento" TEXT NOT NULL,
    "comprovante_url" TEXT,
    "registrado_por_id" INTEGER NOT NULL,
    "congregacaoId" INTEGER,
    "fundo_id" INTEGER,
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "LancamentoFinanceiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rifa" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "premio" TEXT NOT NULL,
    "valor_numero" DOUBLE PRECISION NOT NULL,
    "total_numeros" INTEGER NOT NULL,
    "data_sorteio" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ATIVA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "numero_sorteado" INTEGER,
    "numero_sorteado_2" INTEGER,
    "numero_sorteado_3" INTEGER,
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "Rifa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RifaNumero" (
    "id" SERIAL NOT NULL,
    "numero" INTEGER NOT NULL,
    "rifa_id" INTEGER NOT NULL,
    "membro_id" INTEGER,
    "nome_externo" TEXT,
    "pago" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "RifaNumero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoSaldoCantina" (
    "id" SERIAL NOT NULL,
    "membro_id" INTEGER NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "forma_pagamento" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "PedidoSaldoCantina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contribuicao" (
    "id" SERIAL NOT NULL,
    "membro_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodo" TEXT,
    "observacao" TEXT,
    "fundo_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "Contribuicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitantes" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "pedido_oracao" TEXT,
    "data_primeira_visita" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_ultima_visita" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantidade_visitas" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'NOVO',
    "email" TEXT,
    "responsavel_id" INTEGER,
    "proximo_contacto" TIMESTAMP(3),
    "origem" TEXT,
    "notas_lider" TEXT,
    "prioridade" TEXT NOT NULL DEFAULT 'NORMAL',
    "consentimento_em" TIMESTAMP(3),
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "visitantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acompanhamento_visitantes" (
    "id" SERIAL NOT NULL,
    "visitante_id" INTEGER NOT NULL,
    "membro_id" INTEGER NOT NULL,
    "tipo_contacto" TEXT NOT NULL,
    "observacoes" TEXT,
    "data_contacto" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo_evento" TEXT NOT NULL DEFAULT 'CONTACTO',
    "status_anterior" TEXT,
    "status_novo" TEXT,
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "acompanhamento_visitantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjetoObra" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "objetivoFinal" DOUBLE PRECISION NOT NULL,
    "videoUrl" TEXT,
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "ProjetoObra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtapaObra" (
    "id" TEXT NOT NULL,
    "projeto_obra_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "alvo" DOUBLE PRECISION NOT NULL,
    "atual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "EtapaObra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvisoMural" (
    "id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autor_id" INTEGER NOT NULL,
    "departamento_id" INTEGER,
    "grupo_id" INTEGER,
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "AvisoMural_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agenda" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "is_publica" BOOLEAN NOT NULL DEFAULT true,
    "dono_id" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "horarios_disponiveis" JSONB,

    CONSTRAINT "Agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compromisso" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "data_inicio" TIMESTAMP(3) NOT NULL,
    "data_fim" TIMESTAMP(3) NOT NULL,
    "observacoes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AGENDADO',
    "agenda_id" INTEGER NOT NULL,
    "externos" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Compromisso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepertorioEvento" (
    "id" TEXT NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "congregacao_id" INTEGER,
    "evento_id" INTEGER NOT NULL,
    "musica_id" TEXT NOT NULL,
    "tom_tocado" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "RepertorioEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sermao" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto_corpo" TEXT,
    "referencias_biblicas" JSONB,
    "notas_privadas" TEXT,
    "tags" JSONB,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "partilhado_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "data_pregacao" TIMESTAMP(3) NOT NULL,
    "pregador_id" INTEGER NOT NULL,
    "evento_id" INTEGER,
    "congregacao_id" INTEGER,
    "tenant_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sermao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscolaBiblica" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tema" TEXT,
    "data" TIMESTAMP(3) NOT NULL,
    "link_aula" TEXT,
    "conteudo" TEXT,
    "material_apoio" TEXT,
    "perguntas_discussao" JSONB,
    "professor_id" INTEGER NOT NULL,
    "sermao_id" TEXT,
    "turma_id" TEXT,
    "congregacao_id" INTEGER,
    "tenant_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscolaBiblica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresencaEBD" (
    "id" SERIAL NOT NULL,
    "escola_biblica_id" TEXT NOT NULL,
    "membro_id" INTEGER NOT NULL,
    "presente" BOOLEAN NOT NULL DEFAULT true,
    "justificativa" TEXT,

    CONSTRAINT "PresencaEBD_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interesses_curso" (
    "id" SERIAL NOT NULL,
    "curso_id" TEXT NOT NULL,
    "membro_id" INTEGER NOT NULL,
    "mensagem" TEXT,
    "status" "StatusInteresse" NOT NULL DEFAULT 'PENDENTE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aprovado_em" TIMESTAMP(3),
    "aprovado_por_id" INTEGER,
    "turma_id" TEXT,
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "interesses_curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursos_ebd" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "ementa" TEXT,
    "categoria" "CategoriaCurso" NOT NULL DEFAULT 'EBD',
    "trimestre" INTEGER,
    "ano" INTEGER NOT NULL,
    "data_inicio" TIMESTAMP(3) NOT NULL,
    "data_fim" TIMESTAMP(3) NOT NULL,
    "carga_horaria" INTEGER,
    "vagas_maximas" INTEGER,
    "material_ref" TEXT,
    "nota_minima" DOUBLE PRECISION NOT NULL DEFAULT 7.0,
    "presenca_minima" DOUBLE PRECISION NOT NULL DEFAULT 75.0,
    "status" "StatusCurso" NOT NULL DEFAULT 'PLANEADO',
    "is_externo" BOOLEAN NOT NULL DEFAULT false,
    "link_externo" TEXT,
    "responsavel_nome" TEXT,
    "responsavel_tel" TEXT,
    "tipo_inscricao" "TipoInscricao" NOT NULL DEFAULT 'LIVRE',
    "departamento_ids" JSONB,
    "grupo_ids" JSONB,
    "aprovado" BOOLEAN NOT NULL DEFAULT false,
    "aprovado_por_id" INTEGER,
    "aprovado_em" TIMESTAMP(3),
    "data_abertura_inscricoes" TIMESTAMP(3),
    "criado_por_id" INTEGER,
    "congregacao_id" INTEGER,
    "tenant_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cursos_ebd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turmas_ebd" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "faixa_etaria" TEXT,
    "curso_id" TEXT NOT NULL,
    "congregacao_id" INTEGER,
    "tenant_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "turmas_ebd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matriculas_ebd" (
    "id" SERIAL NOT NULL,
    "turma_id" TEXT NOT NULL,
    "membro_id" INTEGER NOT NULL,
    "data_matricula" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StatusMatricula" NOT NULL DEFAULT 'ATIVA',
    "nota_final" DOUBLE PRECISION,
    "percentual_presenca" DOUBLE PRECISION,
    "aprovado" BOOLEAN,
    "tenant_id" INTEGER NOT NULL,

    CONSTRAINT "matriculas_ebd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atividades_ebd" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" "TipoAtividade" NOT NULL DEFAULT 'EXERCICIO',
    "descricao" TEXT,
    "perguntas" JSONB,
    "data_entrega" TIMESTAMP(3),
    "peso" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "nota_maxima" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "turma_id" TEXT NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atividades_ebd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notas_ebd" (
    "id" SERIAL NOT NULL,
    "atividade_id" TEXT NOT NULL,
    "membro_id" INTEGER NOT NULL,
    "nota" DOUBLE PRECISION,
    "entregue" BOOLEAN NOT NULL DEFAULT false,
    "respostas" JSONB,
    "observacao" TEXT,
    "tenant_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notas_ebd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "super_admins" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "super_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "super_admin_logs" (
    "id" SERIAL NOT NULL,
    "sa_id" INTEGER NOT NULL,
    "acao" TEXT NOT NULL,
    "detalhes" TEXT,
    "ip" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "super_admin_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avisos_plataforma" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'INFO',
    "tenant_id" INTEGER,
    "lido" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avisos_plataforma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plano_historico" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "plano_anterior" TEXT NOT NULL,
    "plano_novo" TEXT NOT NULL,
    "motivo" TEXT,
    "alterado_por" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plano_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indisponibilidades_membro" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "congregacao_id" INTEGER,
    "membro_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "dia_semana" INTEGER,
    "data_inicio" TIMESTAMP(3),
    "data_fim" TIMESTAMP(3),
    "hora_inicio" TEXT,
    "hora_fim" TEXT,
    "motivo" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "indisponibilidades_membro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens_evento" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "congregacao_id" INTEGER,
    "evento_id" INTEGER NOT NULL,
    "pregador_id" INTEGER,
    "titulo" TEXT,
    "texto_biblico" TEXT,
    "tema" TEXT,
    "notas" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mensagens_evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "actor_id" INTEGER,
    "actor_nome" TEXT,
    "alvo_id" INTEGER,
    "alvo_nome" TEXT,
    "alvo_tipo" TEXT,
    "acao" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descricao" TEXT,
    "dados_antes" TEXT,
    "dados_apos" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "hash" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventario_itens" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "congregacao_id" INTEGER,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "categoria" "InventarioCategoria" NOT NULL DEFAULT 'OUTRO',
    "estado" "InventarioEstado" NOT NULL DEFAULT 'BOM',
    "numero_serie" TEXT,
    "codigo_patrimonio" TEXT,
    "marca" TEXT,
    "modelo" TEXT,
    "cor" TEXT,
    "quantidade_total" INTEGER NOT NULL DEFAULT 1,
    "quantidade_disponivel" INTEGER NOT NULL DEFAULT 1,
    "data_aquisicao" TIMESTAMP(3),
    "valor_aquisicao" DOUBLE PRECISION,
    "fornecedor" TEXT,
    "nota_fiscal" TEXT,
    "tem_garantia" BOOLEAN NOT NULL DEFAULT false,
    "garantia_validade" TIMESTAMP(3),
    "garantia_info" TEXT,
    "localizacao" TEXT,
    "foto_url" TEXT,
    "dono_tipo" TEXT,
    "dono_departamento_id" INTEGER,
    "dono_grupo_id" INTEGER,
    "dono_membro_id" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventario_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventario_movimentos" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "congregacao_id" INTEGER,
    "item_id" INTEGER NOT NULL,
    "tipo" "MovimentoTipo" NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responsavel" TEXT,
    "destino" TEXT,
    "data_retorno_prevista" TIMESTAMP(3),
    "data_retorno_real" TIMESTAMP(3),
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventario_movimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boleia_ofertas" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "motorista_id" INTEGER NOT NULL,
    "evento_id" INTEGER,
    "data_hora_saida" TIMESTAMP(3) NOT NULL,
    "endereco_partida" TEXT NOT NULL,
    "zona_partida" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "vagas_total" INTEGER NOT NULL,
    "nota" TEXT,
    "recorrente" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ATIVA',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boleia_ofertas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boleia_reservas" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "oferta_id" INTEGER NOT NULL,
    "passageiro_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMADA',
    "agradecimento" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boleia_reservas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boleia_tracking" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "oferta_id" INTEGER NOT NULL,
    "membro_id" INTEGER NOT NULL,
    "papel" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boleia_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cantina_categorias" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cantina_categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cantina_produtos" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "categoria_id" INTEGER,
    "nome" TEXT NOT NULL,
    "preco" DOUBLE PRECISION NOT NULL,
    "custo" DOUBLE PRECISION,
    "imagem_url" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stock_minimo" INTEGER NOT NULL DEFAULT 0,
    "controla_stock" BOOLEAN NOT NULL DEFAULT true,
    "disponivel" BOOLEAN NOT NULL DEFAULT true,
    "promocoes" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cantina_produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cantina_saldos" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "membro_id" INTEGER NOT NULL,
    "saldo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "limite_diario" DOUBLE PRECISION,
    "limite_semanal" DOUBLE PRECISION,
    "atualizado" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cantina_saldos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cantina_transacoes" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "membro_id" INTEGER,
    "tipo" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "saldo_apos" DOUBLE PRECISION NOT NULL,
    "descricao" TEXT,
    "forma_pagamento" TEXT NOT NULL DEFAULT 'CREDITOS',
    "operador_id" INTEGER,
    "turno_id" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cantina_transacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cantina_itens_transacao" (
    "id" SERIAL NOT NULL,
    "transacao_id" INTEGER NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "preco_unitario" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "cantina_itens_transacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cantina_pagamentos" (
    "id" SERIAL NOT NULL,
    "transacao_id" INTEGER NOT NULL,
    "forma_pagamento" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "cantina_pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cantina_despesas" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categoria" TEXT,
    "fornecedor" TEXT,
    "comprovante_url" TEXT,
    "submetido_por" INTEGER NOT NULL,
    "aprovado_por" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cantina_despesas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cantina_turnos" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "operador_id" INTEGER NOT NULL,
    "abertura_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecho_em" TIMESTAMP(3),
    "valor_inicial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valor_final_esperado" DOUBLE PRECISION,
    "valor_final_real" DOUBLE PRECISION,
    "diferenca" DOUBLE PRECISION,
    "observacao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',

    CONSTRAINT "cantina_turnos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cantina_fiados" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "membro_id" INTEGER NOT NULL,
    "valor_devido" DOUBLE PRECISION NOT NULL,
    "transacao_id" INTEGER,
    "descricao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liquidado_em" TIMESTAMP(3),

    CONSTRAINT "cantina_fiados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cantina_pre_encomendas" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "membro_id" INTEGER NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entregue_em" TIMESTAMP(3),
    "cancelado_em" TIMESTAMP(3),

    CONSTRAINT "cantina_pre_encomendas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cantina_itens_pre_encomenda" (
    "id" SERIAL NOT NULL,
    "encomenda_id" INTEGER NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "preco_unitario" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "cantina_itens_pre_encomenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cantina_cardapios" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "nome" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cantina_cardapios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cantina_cardapio_itens" (
    "id" SERIAL NOT NULL,
    "cardapio_id" INTEGER NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "preco_especial" DOUBLE PRECISION,
    "quantidade_disponivel" INTEGER,

    CONSTRAINT "cantina_cardapio_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistencia_itens" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'unidade',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stock_minimo" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistencia_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistencia_movimentos" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "destinatario" TEXT,
    "observacao" TEXT,
    "registrado_por" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistencia_movimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistencia_tipos_cesta" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistencia_tipos_cesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistencia_itens_cesta" (
    "id" SERIAL NOT NULL,
    "tipo_cesta_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "assistencia_itens_cesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistencia_entregas_cesta" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "tipo_cesta_id" INTEGER NOT NULL,
    "destinatario" TEXT NOT NULL,
    "observacao" TEXT,
    "entregue_por" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistencia_entregas_cesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financeiro_fundos" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'CUSTOM',
    "restrito" BOOLEAN NOT NULL DEFAULT false,
    "saldo_atual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "alerta_orcamento_percentagem" INTEGER NOT NULL DEFAULT 80,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financeiro_fundos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financeiro_categorias_orcamento" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "fundo_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financeiro_categorias_orcamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financeiro_despesas" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "fundo_id" INTEGER NOT NULL,
    "categoria_id" INTEGER,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "forma_pagamento" TEXT,
    "fornecedor" TEXT,
    "comprovante_url" TEXT,
    "submetido_por" INTEGER NOT NULL,
    "aprovado_por" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financeiro_despesas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financeiro_orcamentos" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "fundo_id" INTEGER NOT NULL,
    "categoria_id" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "mes" INTEGER,
    "valor_previsto" DOUBLE PRECISION NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financeiro_orcamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financeiro_transferencias" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "fundo_origem_id" INTEGER NOT NULL,
    "fundo_destino_id" INTEGER NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "motivo" TEXT NOT NULL,
    "aprovado_por" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financeiro_transferencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financeiro_recibos" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "membro_id" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "valor_total" DOUBLE PRECISION NOT NULL,
    "numero_recibo" TEXT,
    "emitido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dados_igreja" JSONB,
    "dados_membro" JSONB,

    CONSTRAINT "financeiro_recibos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financeiro_donativos_online" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "fundo_id" INTEGER,
    "nome_doador" TEXT NOT NULL,
    "email_doador" TEXT,
    "nif_doador" TEXT,
    "valor" DOUBLE PRECISION NOT NULL,
    "forma_pagamento" TEXT NOT NULL,
    "referencia" TEXT,
    "recorrente" BOOLEAN NOT NULL DEFAULT false,
    "anonimo" BOOLEAN NOT NULL DEFAULT false,
    "mensagem" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "confirmado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financeiro_donativos_online_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financeiro_pledges" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "membro_id" INTEGER NOT NULL,
    "fundo_id" INTEGER,
    "valor_mensal" DOUBLE PRECISION NOT NULL,
    "duracao_meses" INTEGER NOT NULL,
    "data_inicio" TIMESTAMP(3) NOT NULL,
    "meses_cumpridos" INTEGER NOT NULL DEFAULT 0,
    "valor_cumprido" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financeiro_pledges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financeiro_contas_bancarias" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "iban" TEXT,
    "banco" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financeiro_contas_bancarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financeiro_movimentos_bancarios" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "conta_id" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "saldo_apos" DOUBLE PRECISION,
    "referencia" TEXT,
    "reconciliado" BOOLEAN NOT NULL DEFAULT false,
    "reconciliado_com" TEXT,
    "importado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financeiro_movimentos_bancarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CargoToMembro" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CargoToMembro_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProfessorTurmaEBD" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProfessorTurmaEBD_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_LideresGrupo" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_LideresGrupo_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MembrosGrupo" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_MembrosGrupo_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MembrosPresentes" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_MembrosPresentes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_GestoresAgenda" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_GestoresAgenda_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CompromissoDepartamentos" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CompromissoDepartamentos_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CompromissoGrupos" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CompromissoGrupos_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CompromissoMembros" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CompromissoMembros_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CompromissoVisitantes" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CompromissoVisitantes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "escolaridades_nome_key" ON "escolaridades"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Cargo_nome_key" ON "Cargo"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "musicas_holyrics_id_key" ON "musicas"("holyrics_id");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "membros_email_key" ON "membros"("email");

-- CreateIndex
CREATE UNIQUE INDEX "membros_loyverse_id_key" ON "membros"("loyverse_id");

-- CreateIndex
CREATE UNIQUE INDEX "membros_qr_code_key" ON "membros"("qr_code");

-- CreateIndex
CREATE INDEX "membros_tenant_id_idx" ON "membros"("tenant_id");

-- CreateIndex
CREATE INDEX "Familia_tenant_id_idx" ON "Familia"("tenant_id");

-- CreateIndex
CREATE INDEX "Departamento_tenant_id_idx" ON "Departamento"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "Departamento_nome_tenant_id_congregacaoId_key" ON "Departamento"("nome", "tenant_id", "congregacaoId");

-- CreateIndex
CREATE INDEX "IntegranteDepartamento_tenant_id_idx" ON "IntegranteDepartamento"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "IntegranteDepartamento_membro_id_departamento_id_turno_key" ON "IntegranteDepartamento"("membro_id", "departamento_id", "turno");

-- CreateIndex
CREATE INDEX "InteresseDepartamento_tenant_id_idx" ON "InteresseDepartamento"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "InteresseDepartamento_membro_id_departamento_id_key" ON "InteresseDepartamento"("membro_id", "departamento_id");

-- CreateIndex
CREATE INDEX "Grupo_tenant_id_idx" ON "Grupo"("tenant_id");

-- CreateIndex
CREATE INDEX "EncontroGrupo_tenant_id_idx" ON "EncontroGrupo"("tenant_id");

-- CreateIndex
CREATE INDEX "Evento_tenant_id_idx" ON "Evento"("tenant_id");

-- CreateIndex
CREATE INDEX "Escala_tenant_id_idx" ON "Escala"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "Escala_evento_id_membro_id_funcao_id_key" ON "Escala"("evento_id", "membro_id", "funcao_id");

-- CreateIndex
CREATE INDEX "FuncaoDepartamento_tenant_id_idx" ON "FuncaoDepartamento"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "FuncaoDepartamento_nome_departamento_id_key" ON "FuncaoDepartamento"("nome", "departamento_id");

-- CreateIndex
CREATE INDEX "ObjetivoFinanceiro_tenant_id_idx" ON "ObjetivoFinanceiro"("tenant_id");

-- CreateIndex
CREATE INDEX "LancamentoFinanceiro_tenant_id_idx" ON "LancamentoFinanceiro"("tenant_id");

-- CreateIndex
CREATE INDEX "LancamentoFinanceiro_fundo_id_idx" ON "LancamentoFinanceiro"("fundo_id");

-- CreateIndex
CREATE INDEX "Rifa_tenant_id_idx" ON "Rifa"("tenant_id");

-- CreateIndex
CREATE INDEX "RifaNumero_tenant_id_idx" ON "RifaNumero"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "RifaNumero_rifa_id_numero_key" ON "RifaNumero"("rifa_id", "numero");

-- CreateIndex
CREATE INDEX "PedidoSaldoCantina_tenant_id_idx" ON "PedidoSaldoCantina"("tenant_id");

-- CreateIndex
CREATE INDEX "Contribuicao_tenant_id_idx" ON "Contribuicao"("tenant_id");

-- CreateIndex
CREATE INDEX "Contribuicao_fundo_id_idx" ON "Contribuicao"("fundo_id");

-- CreateIndex
CREATE INDEX "visitantes_tenant_id_idx" ON "visitantes"("tenant_id");

-- CreateIndex
CREATE INDEX "visitantes_responsavel_id_idx" ON "visitantes"("responsavel_id");

-- CreateIndex
CREATE INDEX "acompanhamento_visitantes_tenant_id_idx" ON "acompanhamento_visitantes"("tenant_id");

-- CreateIndex
CREATE INDEX "acompanhamento_visitantes_visitante_id_idx" ON "acompanhamento_visitantes"("visitante_id");

-- CreateIndex
CREATE INDEX "ProjetoObra_tenant_id_idx" ON "ProjetoObra"("tenant_id");

-- CreateIndex
CREATE INDEX "EtapaObra_tenant_id_idx" ON "EtapaObra"("tenant_id");

-- CreateIndex
CREATE INDEX "AvisoMural_tenant_id_idx" ON "AvisoMural"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "Agenda_slug_key" ON "Agenda"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Agenda_dono_id_key" ON "Agenda"("dono_id");

-- CreateIndex
CREATE INDEX "Agenda_tenant_id_idx" ON "Agenda"("tenant_id");

-- CreateIndex
CREATE INDEX "Compromisso_tenant_id_idx" ON "Compromisso"("tenant_id");

-- CreateIndex
CREATE INDEX "RepertorioEvento_tenant_id_idx" ON "RepertorioEvento"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "RepertorioEvento_evento_id_musica_id_key" ON "RepertorioEvento"("evento_id", "musica_id");

-- CreateIndex
CREATE INDEX "Sermao_tenant_id_idx" ON "Sermao"("tenant_id");

-- CreateIndex
CREATE INDEX "Sermao_pregador_id_idx" ON "Sermao"("pregador_id");

-- CreateIndex
CREATE INDEX "EscolaBiblica_tenant_id_idx" ON "EscolaBiblica"("tenant_id");

-- CreateIndex
CREATE INDEX "EscolaBiblica_turma_id_idx" ON "EscolaBiblica"("turma_id");

-- CreateIndex
CREATE UNIQUE INDEX "PresencaEBD_escola_biblica_id_membro_id_key" ON "PresencaEBD"("escola_biblica_id", "membro_id");

-- CreateIndex
CREATE INDEX "interesses_curso_tenant_id_idx" ON "interesses_curso"("tenant_id");

-- CreateIndex
CREATE INDEX "interesses_curso_curso_id_status_idx" ON "interesses_curso"("curso_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "interesses_curso_curso_id_membro_id_key" ON "interesses_curso"("curso_id", "membro_id");

-- CreateIndex
CREATE INDEX "cursos_ebd_tenant_id_idx" ON "cursos_ebd"("tenant_id");

-- CreateIndex
CREATE INDEX "cursos_ebd_ano_idx" ON "cursos_ebd"("ano");

-- CreateIndex
CREATE INDEX "cursos_ebd_categoria_idx" ON "cursos_ebd"("categoria");

-- CreateIndex
CREATE INDEX "cursos_ebd_aprovado_idx" ON "cursos_ebd"("aprovado");

-- CreateIndex
CREATE INDEX "turmas_ebd_tenant_id_idx" ON "turmas_ebd"("tenant_id");

-- CreateIndex
CREATE INDEX "turmas_ebd_curso_id_idx" ON "turmas_ebd"("curso_id");

-- CreateIndex
CREATE INDEX "matriculas_ebd_tenant_id_idx" ON "matriculas_ebd"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "matriculas_ebd_turma_id_membro_id_key" ON "matriculas_ebd"("turma_id", "membro_id");

-- CreateIndex
CREATE INDEX "atividades_ebd_tenant_id_idx" ON "atividades_ebd"("tenant_id");

-- CreateIndex
CREATE INDEX "atividades_ebd_turma_id_idx" ON "atividades_ebd"("turma_id");

-- CreateIndex
CREATE INDEX "notas_ebd_tenant_id_idx" ON "notas_ebd"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "notas_ebd_atividade_id_membro_id_key" ON "notas_ebd"("atividade_id", "membro_id");

-- CreateIndex
CREATE UNIQUE INDEX "super_admins_email_key" ON "super_admins"("email");

-- CreateIndex
CREATE INDEX "super_admin_logs_sa_id_idx" ON "super_admin_logs"("sa_id");

-- CreateIndex
CREATE INDEX "super_admin_logs_criado_em_idx" ON "super_admin_logs"("criado_em");

-- CreateIndex
CREATE INDEX "avisos_plataforma_tenant_id_idx" ON "avisos_plataforma"("tenant_id");

-- CreateIndex
CREATE INDEX "plano_historico_tenant_id_idx" ON "plano_historico"("tenant_id");

-- CreateIndex
CREATE INDEX "indisponibilidades_membro_tenant_id_idx" ON "indisponibilidades_membro"("tenant_id");

-- CreateIndex
CREATE INDEX "indisponibilidades_membro_membro_id_idx" ON "indisponibilidades_membro"("membro_id");

-- CreateIndex
CREATE UNIQUE INDEX "mensagens_evento_evento_id_key" ON "mensagens_evento"("evento_id");

-- CreateIndex
CREATE INDEX "mensagens_evento_tenant_id_idx" ON "mensagens_evento"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_alvo_id_idx" ON "audit_logs"("alvo_id");

-- CreateIndex
CREATE INDEX "audit_logs_acao_idx" ON "audit_logs"("acao");

-- CreateIndex
CREATE INDEX "audit_logs_categoria_idx" ON "audit_logs"("categoria");

-- CreateIndex
CREATE INDEX "audit_logs_criado_em_idx" ON "audit_logs"("criado_em");

-- CreateIndex
CREATE UNIQUE INDEX "inventario_itens_codigo_patrimonio_key" ON "inventario_itens"("codigo_patrimonio");

-- CreateIndex
CREATE INDEX "inventario_itens_tenant_id_idx" ON "inventario_itens"("tenant_id");

-- CreateIndex
CREATE INDEX "inventario_itens_categoria_idx" ON "inventario_itens"("categoria");

-- CreateIndex
CREATE INDEX "inventario_itens_dono_departamento_id_idx" ON "inventario_itens"("dono_departamento_id");

-- CreateIndex
CREATE INDEX "inventario_itens_dono_grupo_id_idx" ON "inventario_itens"("dono_grupo_id");

-- CreateIndex
CREATE INDEX "inventario_itens_dono_membro_id_idx" ON "inventario_itens"("dono_membro_id");

-- CreateIndex
CREATE INDEX "inventario_movimentos_item_id_idx" ON "inventario_movimentos"("item_id");

-- CreateIndex
CREATE INDEX "inventario_movimentos_tenant_id_idx" ON "inventario_movimentos"("tenant_id");

-- CreateIndex
CREATE INDEX "boleia_ofertas_tenant_id_idx" ON "boleia_ofertas"("tenant_id");

-- CreateIndex
CREATE INDEX "boleia_ofertas_motorista_id_idx" ON "boleia_ofertas"("motorista_id");

-- CreateIndex
CREATE INDEX "boleia_ofertas_evento_id_idx" ON "boleia_ofertas"("evento_id");

-- CreateIndex
CREATE INDEX "boleia_ofertas_data_hora_saida_idx" ON "boleia_ofertas"("data_hora_saida");

-- CreateIndex
CREATE INDEX "boleia_reservas_tenant_id_idx" ON "boleia_reservas"("tenant_id");

-- CreateIndex
CREATE INDEX "boleia_reservas_passageiro_id_idx" ON "boleia_reservas"("passageiro_id");

-- CreateIndex
CREATE UNIQUE INDEX "boleia_reservas_oferta_id_passageiro_id_key" ON "boleia_reservas"("oferta_id", "passageiro_id");

-- CreateIndex
CREATE INDEX "boleia_tracking_tenant_id_idx" ON "boleia_tracking"("tenant_id");

-- CreateIndex
CREATE INDEX "boleia_tracking_oferta_id_ativo_idx" ON "boleia_tracking"("oferta_id", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "boleia_tracking_oferta_id_membro_id_key" ON "boleia_tracking"("oferta_id", "membro_id");

-- CreateIndex
CREATE INDEX "cantina_categorias_tenant_id_idx" ON "cantina_categorias"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "cantina_categorias_tenant_id_nome_key" ON "cantina_categorias"("tenant_id", "nome");

-- CreateIndex
CREATE INDEX "cantina_produtos_tenant_id_idx" ON "cantina_produtos"("tenant_id");

-- CreateIndex
CREATE INDEX "cantina_produtos_categoria_id_idx" ON "cantina_produtos"("categoria_id");

-- CreateIndex
CREATE UNIQUE INDEX "cantina_saldos_membro_id_key" ON "cantina_saldos"("membro_id");

-- CreateIndex
CREATE INDEX "cantina_saldos_tenant_id_idx" ON "cantina_saldos"("tenant_id");

-- CreateIndex
CREATE INDEX "cantina_transacoes_tenant_id_idx" ON "cantina_transacoes"("tenant_id");

-- CreateIndex
CREATE INDEX "cantina_transacoes_membro_id_idx" ON "cantina_transacoes"("membro_id");

-- CreateIndex
CREATE INDEX "cantina_transacoes_turno_id_idx" ON "cantina_transacoes"("turno_id");

-- CreateIndex
CREATE INDEX "cantina_transacoes_criado_em_idx" ON "cantina_transacoes"("criado_em");

-- CreateIndex
CREATE INDEX "cantina_itens_transacao_transacao_id_idx" ON "cantina_itens_transacao"("transacao_id");

-- CreateIndex
CREATE INDEX "cantina_pagamentos_transacao_id_idx" ON "cantina_pagamentos"("transacao_id");

-- CreateIndex
CREATE INDEX "cantina_despesas_tenant_id_idx" ON "cantina_despesas"("tenant_id");

-- CreateIndex
CREATE INDEX "cantina_despesas_status_idx" ON "cantina_despesas"("status");

-- CreateIndex
CREATE INDEX "cantina_turnos_tenant_id_idx" ON "cantina_turnos"("tenant_id");

-- CreateIndex
CREATE INDEX "cantina_turnos_operador_id_idx" ON "cantina_turnos"("operador_id");

-- CreateIndex
CREATE INDEX "cantina_fiados_tenant_id_idx" ON "cantina_fiados"("tenant_id");

-- CreateIndex
CREATE INDEX "cantina_fiados_membro_id_idx" ON "cantina_fiados"("membro_id");

-- CreateIndex
CREATE INDEX "cantina_pre_encomendas_tenant_id_idx" ON "cantina_pre_encomendas"("tenant_id");

-- CreateIndex
CREATE INDEX "cantina_pre_encomendas_membro_id_idx" ON "cantina_pre_encomendas"("membro_id");

-- CreateIndex
CREATE INDEX "cantina_pre_encomendas_evento_id_idx" ON "cantina_pre_encomendas"("evento_id");

-- CreateIndex
CREATE INDEX "cantina_itens_pre_encomenda_encomenda_id_idx" ON "cantina_itens_pre_encomenda"("encomenda_id");

-- CreateIndex
CREATE UNIQUE INDEX "cantina_cardapios_evento_id_key" ON "cantina_cardapios"("evento_id");

-- CreateIndex
CREATE INDEX "cantina_cardapios_tenant_id_idx" ON "cantina_cardapios"("tenant_id");

-- CreateIndex
CREATE INDEX "cantina_cardapio_itens_cardapio_id_idx" ON "cantina_cardapio_itens"("cardapio_id");

-- CreateIndex
CREATE UNIQUE INDEX "cantina_cardapio_itens_cardapio_id_produto_id_key" ON "cantina_cardapio_itens"("cardapio_id", "produto_id");

-- CreateIndex
CREATE INDEX "assistencia_itens_tenant_id_idx" ON "assistencia_itens"("tenant_id");

-- CreateIndex
CREATE INDEX "assistencia_movimentos_tenant_id_idx" ON "assistencia_movimentos"("tenant_id");

-- CreateIndex
CREATE INDEX "assistencia_movimentos_item_id_idx" ON "assistencia_movimentos"("item_id");

-- CreateIndex
CREATE INDEX "assistencia_tipos_cesta_tenant_id_idx" ON "assistencia_tipos_cesta"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "assistencia_itens_cesta_tipo_cesta_id_item_id_key" ON "assistencia_itens_cesta"("tipo_cesta_id", "item_id");

-- CreateIndex
CREATE INDEX "assistencia_entregas_cesta_tenant_id_idx" ON "assistencia_entregas_cesta"("tenant_id");

-- CreateIndex
CREATE INDEX "assistencia_entregas_cesta_tipo_cesta_id_idx" ON "assistencia_entregas_cesta"("tipo_cesta_id");

-- CreateIndex
CREATE INDEX "financeiro_fundos_tenant_id_idx" ON "financeiro_fundos"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "financeiro_fundos_tenant_id_nome_key" ON "financeiro_fundos"("tenant_id", "nome");

-- CreateIndex
CREATE INDEX "financeiro_categorias_orcamento_tenant_id_idx" ON "financeiro_categorias_orcamento"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "financeiro_categorias_orcamento_fundo_id_nome_key" ON "financeiro_categorias_orcamento"("fundo_id", "nome");

-- CreateIndex
CREATE INDEX "financeiro_despesas_tenant_id_idx" ON "financeiro_despesas"("tenant_id");

-- CreateIndex
CREATE INDEX "financeiro_despesas_fundo_id_idx" ON "financeiro_despesas"("fundo_id");

-- CreateIndex
CREATE INDEX "financeiro_despesas_status_idx" ON "financeiro_despesas"("status");

-- CreateIndex
CREATE INDEX "financeiro_orcamentos_tenant_id_idx" ON "financeiro_orcamentos"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "financeiro_orcamentos_fundo_id_categoria_id_ano_mes_key" ON "financeiro_orcamentos"("fundo_id", "categoria_id", "ano", "mes");

-- CreateIndex
CREATE INDEX "financeiro_transferencias_tenant_id_idx" ON "financeiro_transferencias"("tenant_id");

-- CreateIndex
CREATE INDEX "financeiro_recibos_tenant_id_idx" ON "financeiro_recibos"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "financeiro_recibos_tenant_id_membro_id_ano_key" ON "financeiro_recibos"("tenant_id", "membro_id", "ano");

-- CreateIndex
CREATE INDEX "financeiro_donativos_online_tenant_id_idx" ON "financeiro_donativos_online"("tenant_id");

-- CreateIndex
CREATE INDEX "financeiro_donativos_online_status_idx" ON "financeiro_donativos_online"("status");

-- CreateIndex
CREATE INDEX "financeiro_pledges_tenant_id_idx" ON "financeiro_pledges"("tenant_id");

-- CreateIndex
CREATE INDEX "financeiro_pledges_membro_id_idx" ON "financeiro_pledges"("membro_id");

-- CreateIndex
CREATE INDEX "financeiro_pledges_status_idx" ON "financeiro_pledges"("status");

-- CreateIndex
CREATE INDEX "financeiro_contas_bancarias_tenant_id_idx" ON "financeiro_contas_bancarias"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "financeiro_contas_bancarias_tenant_id_nome_key" ON "financeiro_contas_bancarias"("tenant_id", "nome");

-- CreateIndex
CREATE INDEX "financeiro_movimentos_bancarios_tenant_id_idx" ON "financeiro_movimentos_bancarios"("tenant_id");

-- CreateIndex
CREATE INDEX "financeiro_movimentos_bancarios_conta_id_idx" ON "financeiro_movimentos_bancarios"("conta_id");

-- CreateIndex
CREATE INDEX "financeiro_movimentos_bancarios_reconciliado_idx" ON "financeiro_movimentos_bancarios"("reconciliado");

-- CreateIndex
CREATE INDEX "_CargoToMembro_B_index" ON "_CargoToMembro"("B");

-- CreateIndex
CREATE INDEX "_ProfessorTurmaEBD_B_index" ON "_ProfessorTurmaEBD"("B");

-- CreateIndex
CREATE INDEX "_LideresGrupo_B_index" ON "_LideresGrupo"("B");

-- CreateIndex
CREATE INDEX "_MembrosGrupo_B_index" ON "_MembrosGrupo"("B");

-- CreateIndex
CREATE INDEX "_MembrosPresentes_B_index" ON "_MembrosPresentes"("B");

-- CreateIndex
CREATE INDEX "_GestoresAgenda_B_index" ON "_GestoresAgenda"("B");

-- CreateIndex
CREATE INDEX "_CompromissoDepartamentos_B_index" ON "_CompromissoDepartamentos"("B");

-- CreateIndex
CREATE INDEX "_CompromissoGrupos_B_index" ON "_CompromissoGrupos"("B");

-- CreateIndex
CREATE INDEX "_CompromissoMembros_B_index" ON "_CompromissoMembros"("B");

-- CreateIndex
CREATE INDEX "_CompromissoVisitantes_B_index" ON "_CompromissoVisitantes"("B");

-- AddForeignKey
ALTER TABLE "Congregacao" ADD CONSTRAINT "Congregacao_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros" ADD CONSTRAINT "membros_congregacao_id_fkey" FOREIGN KEY ("congregacao_id") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros" ADD CONSTRAINT "membros_escolaridade_id_fkey" FOREIGN KEY ("escolaridade_id") REFERENCES "escolaridades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros" ADD CONSTRAINT "membros_familia_id_fkey" FOREIGN KEY ("familia_id") REFERENCES "Familia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros" ADD CONSTRAINT "membros_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Familia" ADD CONSTRAINT "Familia_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Departamento" ADD CONSTRAINT "Departamento_congregacaoId_fkey" FOREIGN KEY ("congregacaoId") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Departamento" ADD CONSTRAINT "Departamento_lider_id_fkey" FOREIGN KEY ("lider_id") REFERENCES "membros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Departamento" ADD CONSTRAINT "Departamento_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegranteDepartamento" ADD CONSTRAINT "IntegranteDepartamento_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "Departamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegranteDepartamento" ADD CONSTRAINT "IntegranteDepartamento_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegranteDepartamento" ADD CONSTRAINT "IntegranteDepartamento_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteresseDepartamento" ADD CONSTRAINT "InteresseDepartamento_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteresseDepartamento" ADD CONSTRAINT "InteresseDepartamento_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "Departamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteresseDepartamento" ADD CONSTRAINT "InteresseDepartamento_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuncaoSelecionada" ADD CONSTRAINT "FuncaoSelecionada_funcao_id_fkey" FOREIGN KEY ("funcao_id") REFERENCES "FuncaoDepartamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuncaoSelecionada" ADD CONSTRAINT "FuncaoSelecionada_integrante_departamento_id_fkey" FOREIGN KEY ("integrante_departamento_id") REFERENCES "IntegranteDepartamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_congregacaoId_fkey" FOREIGN KEY ("congregacaoId") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "Departamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncontroGrupo" ADD CONSTRAINT "EncontroGrupo_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncontroGrupo" ADD CONSTRAINT "EncontroGrupo_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_congregacao_id_fkey" FOREIGN KEY ("congregacao_id") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escala" ADD CONSTRAINT "Escala_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "Departamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escala" ADD CONSTRAINT "Escala_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escala" ADD CONSTRAINT "Escala_funcao_id_fkey" FOREIGN KEY ("funcao_id") REFERENCES "FuncaoDepartamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escala" ADD CONSTRAINT "Escala_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escala" ADD CONSTRAINT "Escala_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escala" ADD CONSTRAINT "Escala_congregacao_id_fkey" FOREIGN KEY ("congregacao_id") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuncaoDepartamento" ADD CONSTRAINT "FuncaoDepartamento_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "Departamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuncaoDepartamento" ADD CONSTRAINT "FuncaoDepartamento_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjetivoFinanceiro" ADD CONSTRAINT "ObjetivoFinanceiro_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjetivoFinanceiro" ADD CONSTRAINT "ObjetivoFinanceiro_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoFinanceiro" ADD CONSTRAINT "LancamentoFinanceiro_congregacaoId_fkey" FOREIGN KEY ("congregacaoId") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoFinanceiro" ADD CONSTRAINT "LancamentoFinanceiro_objetivo_id_fkey" FOREIGN KEY ("objetivo_id") REFERENCES "ObjetivoFinanceiro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoFinanceiro" ADD CONSTRAINT "LancamentoFinanceiro_fundo_id_fkey" FOREIGN KEY ("fundo_id") REFERENCES "financeiro_fundos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoFinanceiro" ADD CONSTRAINT "LancamentoFinanceiro_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rifa" ADD CONSTRAINT "Rifa_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RifaNumero" ADD CONSTRAINT "RifaNumero_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RifaNumero" ADD CONSTRAINT "RifaNumero_rifa_id_fkey" FOREIGN KEY ("rifa_id") REFERENCES "Rifa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RifaNumero" ADD CONSTRAINT "RifaNumero_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoSaldoCantina" ADD CONSTRAINT "PedidoSaldoCantina_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoSaldoCantina" ADD CONSTRAINT "PedidoSaldoCantina_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribuicao" ADD CONSTRAINT "Contribuicao_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribuicao" ADD CONSTRAINT "Contribuicao_fundo_id_fkey" FOREIGN KEY ("fundo_id") REFERENCES "financeiro_fundos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribuicao" ADD CONSTRAINT "Contribuicao_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitantes" ADD CONSTRAINT "visitantes_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "membros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitantes" ADD CONSTRAINT "visitantes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acompanhamento_visitantes" ADD CONSTRAINT "acompanhamento_visitantes_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acompanhamento_visitantes" ADD CONSTRAINT "acompanhamento_visitantes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acompanhamento_visitantes" ADD CONSTRAINT "acompanhamento_visitantes_visitante_id_fkey" FOREIGN KEY ("visitante_id") REFERENCES "visitantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjetoObra" ADD CONSTRAINT "ProjetoObra_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtapaObra" ADD CONSTRAINT "EtapaObra_projeto_obra_id_fkey" FOREIGN KEY ("projeto_obra_id") REFERENCES "ProjetoObra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtapaObra" ADD CONSTRAINT "EtapaObra_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvisoMural" ADD CONSTRAINT "AvisoMural_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvisoMural" ADD CONSTRAINT "AvisoMural_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "Departamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvisoMural" ADD CONSTRAINT "AvisoMural_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvisoMural" ADD CONSTRAINT "AvisoMural_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agenda" ADD CONSTRAINT "Agenda_dono_id_fkey" FOREIGN KEY ("dono_id") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agenda" ADD CONSTRAINT "Agenda_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compromisso" ADD CONSTRAINT "Compromisso_agenda_id_fkey" FOREIGN KEY ("agenda_id") REFERENCES "Agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compromisso" ADD CONSTRAINT "Compromisso_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepertorioEvento" ADD CONSTRAINT "RepertorioEvento_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepertorioEvento" ADD CONSTRAINT "RepertorioEvento_musica_id_fkey" FOREIGN KEY ("musica_id") REFERENCES "musicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepertorioEvento" ADD CONSTRAINT "RepertorioEvento_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepertorioEvento" ADD CONSTRAINT "RepertorioEvento_congregacao_id_fkey" FOREIGN KEY ("congregacao_id") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sermao" ADD CONSTRAINT "Sermao_pregador_id_fkey" FOREIGN KEY ("pregador_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sermao" ADD CONSTRAINT "Sermao_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "Evento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sermao" ADD CONSTRAINT "Sermao_congregacao_id_fkey" FOREIGN KEY ("congregacao_id") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sermao" ADD CONSTRAINT "Sermao_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscolaBiblica" ADD CONSTRAINT "EscolaBiblica_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscolaBiblica" ADD CONSTRAINT "EscolaBiblica_sermao_id_fkey" FOREIGN KEY ("sermao_id") REFERENCES "Sermao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscolaBiblica" ADD CONSTRAINT "EscolaBiblica_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas_ebd"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscolaBiblica" ADD CONSTRAINT "EscolaBiblica_congregacao_id_fkey" FOREIGN KEY ("congregacao_id") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscolaBiblica" ADD CONSTRAINT "EscolaBiblica_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresencaEBD" ADD CONSTRAINT "PresencaEBD_escola_biblica_id_fkey" FOREIGN KEY ("escola_biblica_id") REFERENCES "EscolaBiblica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresencaEBD" ADD CONSTRAINT "PresencaEBD_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interesses_curso" ADD CONSTRAINT "interesses_curso_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos_ebd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interesses_curso" ADD CONSTRAINT "interesses_curso_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interesses_curso" ADD CONSTRAINT "interesses_curso_aprovado_por_id_fkey" FOREIGN KEY ("aprovado_por_id") REFERENCES "membros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interesses_curso" ADD CONSTRAINT "interesses_curso_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos_ebd" ADD CONSTRAINT "cursos_ebd_congregacao_id_fkey" FOREIGN KEY ("congregacao_id") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos_ebd" ADD CONSTRAINT "cursos_ebd_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos_ebd" ADD CONSTRAINT "cursos_ebd_aprovado_por_id_fkey" FOREIGN KEY ("aprovado_por_id") REFERENCES "membros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos_ebd" ADD CONSTRAINT "cursos_ebd_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "membros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turmas_ebd" ADD CONSTRAINT "turmas_ebd_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos_ebd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turmas_ebd" ADD CONSTRAINT "turmas_ebd_congregacao_id_fkey" FOREIGN KEY ("congregacao_id") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turmas_ebd" ADD CONSTRAINT "turmas_ebd_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas_ebd" ADD CONSTRAINT "matriculas_ebd_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas_ebd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas_ebd" ADD CONSTRAINT "matriculas_ebd_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matriculas_ebd" ADD CONSTRAINT "matriculas_ebd_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atividades_ebd" ADD CONSTRAINT "atividades_ebd_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas_ebd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atividades_ebd" ADD CONSTRAINT "atividades_ebd_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_ebd" ADD CONSTRAINT "notas_ebd_atividade_id_fkey" FOREIGN KEY ("atividade_id") REFERENCES "atividades_ebd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_ebd" ADD CONSTRAINT "notas_ebd_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_ebd" ADD CONSTRAINT "notas_ebd_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "super_admin_logs" ADD CONSTRAINT "super_admin_logs_sa_id_fkey" FOREIGN KEY ("sa_id") REFERENCES "super_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indisponibilidades_membro" ADD CONSTRAINT "indisponibilidades_membro_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indisponibilidades_membro" ADD CONSTRAINT "indisponibilidades_membro_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indisponibilidades_membro" ADD CONSTRAINT "indisponibilidades_membro_congregacao_id_fkey" FOREIGN KEY ("congregacao_id") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_evento" ADD CONSTRAINT "mensagens_evento_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_evento" ADD CONSTRAINT "mensagens_evento_pregador_id_fkey" FOREIGN KEY ("pregador_id") REFERENCES "membros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_evento" ADD CONSTRAINT "mensagens_evento_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_evento" ADD CONSTRAINT "mensagens_evento_congregacao_id_fkey" FOREIGN KEY ("congregacao_id") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_itens" ADD CONSTRAINT "inventario_itens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_itens" ADD CONSTRAINT "inventario_itens_congregacao_id_fkey" FOREIGN KEY ("congregacao_id") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_itens" ADD CONSTRAINT "inventario_itens_dono_departamento_id_fkey" FOREIGN KEY ("dono_departamento_id") REFERENCES "Departamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_itens" ADD CONSTRAINT "inventario_itens_dono_grupo_id_fkey" FOREIGN KEY ("dono_grupo_id") REFERENCES "Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_itens" ADD CONSTRAINT "inventario_itens_dono_membro_id_fkey" FOREIGN KEY ("dono_membro_id") REFERENCES "membros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_movimentos" ADD CONSTRAINT "inventario_movimentos_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventario_itens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_movimentos" ADD CONSTRAINT "inventario_movimentos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_movimentos" ADD CONSTRAINT "inventario_movimentos_congregacao_id_fkey" FOREIGN KEY ("congregacao_id") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boleia_ofertas" ADD CONSTRAINT "boleia_ofertas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boleia_ofertas" ADD CONSTRAINT "boleia_ofertas_motorista_id_fkey" FOREIGN KEY ("motorista_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boleia_ofertas" ADD CONSTRAINT "boleia_ofertas_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "Evento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boleia_reservas" ADD CONSTRAINT "boleia_reservas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boleia_reservas" ADD CONSTRAINT "boleia_reservas_oferta_id_fkey" FOREIGN KEY ("oferta_id") REFERENCES "boleia_ofertas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boleia_reservas" ADD CONSTRAINT "boleia_reservas_passageiro_id_fkey" FOREIGN KEY ("passageiro_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boleia_tracking" ADD CONSTRAINT "boleia_tracking_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boleia_tracking" ADD CONSTRAINT "boleia_tracking_oferta_id_fkey" FOREIGN KEY ("oferta_id") REFERENCES "boleia_ofertas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boleia_tracking" ADD CONSTRAINT "boleia_tracking_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cantina_categorias" ADD CONSTRAINT "cantina_categorias_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cantina_produtos" ADD CONSTRAINT "cantina_produtos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cantina_produtos" ADD CONSTRAINT "cantina_produtos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "cantina_categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cantina_saldos" ADD CONSTRAINT "cantina_saldos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cantina_saldos" ADD CONSTRAINT "cantina_saldos_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cantina_transacoes" ADD CONSTRAINT "cantina_transacoes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cantina_transacoes" ADD CONSTRAINT "cantina_transacoes_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cantina_transacoes" ADD CONSTRAINT "cantina_transacoes_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "cantina_turnos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cantina_itens_transacao" ADD CONSTRAINT "cantina_itens_transacao_transacao_id_fkey" FOREIGN KEY ("transacao_id") REFERENCES "cantina_transacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cantina_itens_transacao" ADD CONSTRAINT "cantina_itens_transacao_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "cantina_produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cantina_pagamentos" ADD CONSTRAINT "cantina_pagamentos_transacao_id_fkey" FOREIGN KEY ("transacao_id") REFERENCES "cantina_transacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cantina_despesas" ADD CONSTRAINT "cantina_despesas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cantina_turnos" ADD CONSTRAINT "cantina_turnos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cantina_turnos" ADD CONSTRAINT "cantina_turnos_operador_id_fkey" FOREIGN KEY ("operador_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cantina_fiados" ADD CONSTRAINT "cantina_fiados_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cantina_fiados" ADD CONSTRAINT "cantina_fiados_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cantina_pre_encomendas" ADD CONSTRAINT "cantina_pre_encomendas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cantina_pre_encomendas" ADD CONSTRAINT "cantina_pre_encomendas_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cantina_pre_encomendas" ADD CONSTRAINT "cantina_pre_encomendas_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cantina_itens_pre_encomenda" ADD CONSTRAINT "cantina_itens_pre_encomenda_encomenda_id_fkey" FOREIGN KEY ("encomenda_id") REFERENCES "cantina_pre_encomendas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cantina_itens_pre_encomenda" ADD CONSTRAINT "cantina_itens_pre_encomenda_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "cantina_produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cantina_cardapios" ADD CONSTRAINT "cantina_cardapios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cantina_cardapios" ADD CONSTRAINT "cantina_cardapios_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cantina_cardapio_itens" ADD CONSTRAINT "cantina_cardapio_itens_cardapio_id_fkey" FOREIGN KEY ("cardapio_id") REFERENCES "cantina_cardapios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cantina_cardapio_itens" ADD CONSTRAINT "cantina_cardapio_itens_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "cantina_produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistencia_itens" ADD CONSTRAINT "assistencia_itens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistencia_movimentos" ADD CONSTRAINT "assistencia_movimentos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistencia_movimentos" ADD CONSTRAINT "assistencia_movimentos_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "assistencia_itens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistencia_tipos_cesta" ADD CONSTRAINT "assistencia_tipos_cesta_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistencia_itens_cesta" ADD CONSTRAINT "assistencia_itens_cesta_tipo_cesta_id_fkey" FOREIGN KEY ("tipo_cesta_id") REFERENCES "assistencia_tipos_cesta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistencia_itens_cesta" ADD CONSTRAINT "assistencia_itens_cesta_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "assistencia_itens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistencia_entregas_cesta" ADD CONSTRAINT "assistencia_entregas_cesta_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistencia_entregas_cesta" ADD CONSTRAINT "assistencia_entregas_cesta_tipo_cesta_id_fkey" FOREIGN KEY ("tipo_cesta_id") REFERENCES "assistencia_tipos_cesta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_fundos" ADD CONSTRAINT "financeiro_fundos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_categorias_orcamento" ADD CONSTRAINT "financeiro_categorias_orcamento_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_categorias_orcamento" ADD CONSTRAINT "financeiro_categorias_orcamento_fundo_id_fkey" FOREIGN KEY ("fundo_id") REFERENCES "financeiro_fundos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_despesas" ADD CONSTRAINT "financeiro_despesas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_despesas" ADD CONSTRAINT "financeiro_despesas_fundo_id_fkey" FOREIGN KEY ("fundo_id") REFERENCES "financeiro_fundos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_despesas" ADD CONSTRAINT "financeiro_despesas_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "financeiro_categorias_orcamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_orcamentos" ADD CONSTRAINT "financeiro_orcamentos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_orcamentos" ADD CONSTRAINT "financeiro_orcamentos_fundo_id_fkey" FOREIGN KEY ("fundo_id") REFERENCES "financeiro_fundos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_orcamentos" ADD CONSTRAINT "financeiro_orcamentos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "financeiro_categorias_orcamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_transferencias" ADD CONSTRAINT "financeiro_transferencias_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_transferencias" ADD CONSTRAINT "financeiro_transferencias_fundo_origem_id_fkey" FOREIGN KEY ("fundo_origem_id") REFERENCES "financeiro_fundos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_transferencias" ADD CONSTRAINT "financeiro_transferencias_fundo_destino_id_fkey" FOREIGN KEY ("fundo_destino_id") REFERENCES "financeiro_fundos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_recibos" ADD CONSTRAINT "financeiro_recibos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_recibos" ADD CONSTRAINT "financeiro_recibos_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_donativos_online" ADD CONSTRAINT "financeiro_donativos_online_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_donativos_online" ADD CONSTRAINT "financeiro_donativos_online_fundo_id_fkey" FOREIGN KEY ("fundo_id") REFERENCES "financeiro_fundos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_pledges" ADD CONSTRAINT "financeiro_pledges_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_pledges" ADD CONSTRAINT "financeiro_pledges_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_pledges" ADD CONSTRAINT "financeiro_pledges_fundo_id_fkey" FOREIGN KEY ("fundo_id") REFERENCES "financeiro_fundos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_contas_bancarias" ADD CONSTRAINT "financeiro_contas_bancarias_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_movimentos_bancarios" ADD CONSTRAINT "financeiro_movimentos_bancarios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financeiro_movimentos_bancarios" ADD CONSTRAINT "financeiro_movimentos_bancarios_conta_id_fkey" FOREIGN KEY ("conta_id") REFERENCES "financeiro_contas_bancarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CargoToMembro" ADD CONSTRAINT "_CargoToMembro_A_fkey" FOREIGN KEY ("A") REFERENCES "Cargo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CargoToMembro" ADD CONSTRAINT "_CargoToMembro_B_fkey" FOREIGN KEY ("B") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessorTurmaEBD" ADD CONSTRAINT "_ProfessorTurmaEBD_A_fkey" FOREIGN KEY ("A") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessorTurmaEBD" ADD CONSTRAINT "_ProfessorTurmaEBD_B_fkey" FOREIGN KEY ("B") REFERENCES "turmas_ebd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LideresGrupo" ADD CONSTRAINT "_LideresGrupo_A_fkey" FOREIGN KEY ("A") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LideresGrupo" ADD CONSTRAINT "_LideresGrupo_B_fkey" FOREIGN KEY ("B") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MembrosGrupo" ADD CONSTRAINT "_MembrosGrupo_A_fkey" FOREIGN KEY ("A") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MembrosGrupo" ADD CONSTRAINT "_MembrosGrupo_B_fkey" FOREIGN KEY ("B") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MembrosPresentes" ADD CONSTRAINT "_MembrosPresentes_A_fkey" FOREIGN KEY ("A") REFERENCES "EncontroGrupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MembrosPresentes" ADD CONSTRAINT "_MembrosPresentes_B_fkey" FOREIGN KEY ("B") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GestoresAgenda" ADD CONSTRAINT "_GestoresAgenda_A_fkey" FOREIGN KEY ("A") REFERENCES "Agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GestoresAgenda" ADD CONSTRAINT "_GestoresAgenda_B_fkey" FOREIGN KEY ("B") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompromissoDepartamentos" ADD CONSTRAINT "_CompromissoDepartamentos_A_fkey" FOREIGN KEY ("A") REFERENCES "Compromisso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompromissoDepartamentos" ADD CONSTRAINT "_CompromissoDepartamentos_B_fkey" FOREIGN KEY ("B") REFERENCES "Departamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompromissoGrupos" ADD CONSTRAINT "_CompromissoGrupos_A_fkey" FOREIGN KEY ("A") REFERENCES "Compromisso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompromissoGrupos" ADD CONSTRAINT "_CompromissoGrupos_B_fkey" FOREIGN KEY ("B") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompromissoMembros" ADD CONSTRAINT "_CompromissoMembros_A_fkey" FOREIGN KEY ("A") REFERENCES "Compromisso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompromissoMembros" ADD CONSTRAINT "_CompromissoMembros_B_fkey" FOREIGN KEY ("B") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompromissoVisitantes" ADD CONSTRAINT "_CompromissoVisitantes_A_fkey" FOREIGN KEY ("A") REFERENCES "Compromisso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompromissoVisitantes" ADD CONSTRAINT "_CompromissoVisitantes_B_fkey" FOREIGN KEY ("B") REFERENCES "visitantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
