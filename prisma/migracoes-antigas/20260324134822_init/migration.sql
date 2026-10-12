-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'LEADER', 'ADMIN', 'FINANCE');

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
    "lang" TEXT DEFAULT 'pt',
    "father_name" TEXT,
    "mother_name" TEXT,
    "phone_1" TEXT NOT NULL,
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
    "ip_assinatura" TEXT,
    "data_aceite" TIMESTAMP(3),
    "termo_aceite" BOOLEAN NOT NULL DEFAULT false,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "loyverse_id" TEXT,

    CONSTRAINT "membros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Familia" (
    "id" SERIAL NOT NULL,
    "surname" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Familia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Departamento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "lider_id" INTEGER,

    CONSTRAINT "Departamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegranteDepartamento" (
    "id" SERIAL NOT NULL,
    "membro_id" INTEGER NOT NULL,
    "departamento_id" INTEGER NOT NULL,
    "funcao" TEXT NOT NULL,
    "data_entrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegranteDepartamento_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "Grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cargo" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Cargo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

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

    CONSTRAINT "Escala_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuncaoDepartamento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "departamento_id" INTEGER NOT NULL,

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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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

    CONSTRAINT "acompanhamento_visitantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjetoObra" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "objetivoFinal" DOUBLE PRECISION NOT NULL,
    "videoUrl" TEXT,

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

    CONSTRAINT "AvisoMural_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "_CargoToMembro" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CargoToMembro_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "membros_email_key" ON "membros"("email");

-- CreateIndex
CREATE UNIQUE INDEX "membros_loyverse_id_key" ON "membros"("loyverse_id");

-- CreateIndex
CREATE UNIQUE INDEX "Departamento_nome_key" ON "Departamento"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Cargo_nome_key" ON "Cargo"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Escala_evento_id_membro_id_key" ON "Escala"("evento_id", "membro_id");

-- CreateIndex
CREATE UNIQUE INDEX "FuncaoDepartamento_nome_departamento_id_key" ON "FuncaoDepartamento"("nome", "departamento_id");

-- CreateIndex
CREATE UNIQUE INDEX "RifaNumero_rifa_id_numero_key" ON "RifaNumero"("rifa_id", "numero");

-- CreateIndex
CREATE INDEX "_LideresGrupo_B_index" ON "_LideresGrupo"("B");

-- CreateIndex
CREATE INDEX "_MembrosGrupo_B_index" ON "_MembrosGrupo"("B");

-- CreateIndex
CREATE INDEX "_CargoToMembro_B_index" ON "_CargoToMembro"("B");

-- AddForeignKey
ALTER TABLE "membros" ADD CONSTRAINT "membros_familia_id_fkey" FOREIGN KEY ("familia_id") REFERENCES "Familia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Departamento" ADD CONSTRAINT "Departamento_lider_id_fkey" FOREIGN KEY ("lider_id") REFERENCES "membros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegranteDepartamento" ADD CONSTRAINT "IntegranteDepartamento_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegranteDepartamento" ADD CONSTRAINT "IntegranteDepartamento_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "Departamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "Departamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escala" ADD CONSTRAINT "Escala_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escala" ADD CONSTRAINT "Escala_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "Departamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escala" ADD CONSTRAINT "Escala_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuncaoDepartamento" ADD CONSTRAINT "FuncaoDepartamento_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "Departamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjetivoFinanceiro" ADD CONSTRAINT "ObjetivoFinanceiro_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoFinanceiro" ADD CONSTRAINT "LancamentoFinanceiro_objetivo_id_fkey" FOREIGN KEY ("objetivo_id") REFERENCES "ObjetivoFinanceiro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RifaNumero" ADD CONSTRAINT "RifaNumero_rifa_id_fkey" FOREIGN KEY ("rifa_id") REFERENCES "Rifa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RifaNumero" ADD CONSTRAINT "RifaNumero_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoSaldoCantina" ADD CONSTRAINT "PedidoSaldoCantina_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribuicao" ADD CONSTRAINT "Contribuicao_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acompanhamento_visitantes" ADD CONSTRAINT "acompanhamento_visitantes_visitante_id_fkey" FOREIGN KEY ("visitante_id") REFERENCES "visitantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acompanhamento_visitantes" ADD CONSTRAINT "acompanhamento_visitantes_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtapaObra" ADD CONSTRAINT "EtapaObra_projeto_obra_id_fkey" FOREIGN KEY ("projeto_obra_id") REFERENCES "ProjetoObra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvisoMural" ADD CONSTRAINT "AvisoMural_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvisoMural" ADD CONSTRAINT "AvisoMural_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "Departamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvisoMural" ADD CONSTRAINT "AvisoMural_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LideresGrupo" ADD CONSTRAINT "_LideresGrupo_A_fkey" FOREIGN KEY ("A") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LideresGrupo" ADD CONSTRAINT "_LideresGrupo_B_fkey" FOREIGN KEY ("B") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MembrosGrupo" ADD CONSTRAINT "_MembrosGrupo_A_fkey" FOREIGN KEY ("A") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MembrosGrupo" ADD CONSTRAINT "_MembrosGrupo_B_fkey" FOREIGN KEY ("B") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CargoToMembro" ADD CONSTRAINT "_CargoToMembro_A_fkey" FOREIGN KEY ("A") REFERENCES "Cargo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CargoToMembro" ADD CONSTRAINT "_CargoToMembro_B_fkey" FOREIGN KEY ("B") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;
