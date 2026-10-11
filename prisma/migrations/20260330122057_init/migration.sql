/*
  Warnings:

  - A unique constraint covering the columns `[nome,tenant_id]` on the table `Departamento` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[membro_id,departamento_id]` on the table `IntegranteDepartamento` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenant_id` to the `AvisoMural` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `Contribuicao` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `Departamento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `Escala` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `EtapaObra` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `Evento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `Familia` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `FuncaoDepartamento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `Grupo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `IntegranteDepartamento` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `LancamentoFinanceiro` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `ObjetivoFinanceiro` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `PedidoSaldoCantina` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `ProjetoObra` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `Rifa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `RifaNumero` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `acompanhamento_visitantes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `membros` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `visitantes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'MANAGER';

-- DropIndex
DROP INDEX "Departamento_nome_key";

-- AlterTable
ALTER TABLE "AvisoMural" ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Contribuicao" ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Departamento" ADD COLUMN     "compromissoId" INTEGER,
ADD COLUMN     "congregacaoId" INTEGER,
ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Escala" ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "EtapaObra" ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Evento" ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Familia" ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "FuncaoDepartamento" ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Grupo" ADD COLUMN     "compromissoId" INTEGER,
ADD COLUMN     "congregacaoId" INTEGER,
ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "IntegranteDepartamento" ADD COLUMN     "pode_gerir_escalas" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "LancamentoFinanceiro" ADD COLUMN     "congregacaoId" INTEGER,
ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "ObjetivoFinanceiro" ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "PedidoSaldoCantina" ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "ProjetoObra" ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Rifa" ADD COLUMN     "numero_sorteado_2" INTEGER,
ADD COLUMN     "numero_sorteado_3" INTEGER,
ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "RifaNumero" ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "acompanhamento_visitantes" ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "membros" ADD COLUMN     "congregacao_id" INTEGER,
ADD COLUMN     "gdpr_aceite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gdpr_data_assinatura" TIMESTAMP(3),
ADD COLUMN     "gdpr_validade" TIMESTAMP(3),
ADD COLUMN     "neighborhood" TEXT,
ADD COLUMN     "permanecer_aceite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "permanecer_data_assinatura" TIMESTAMP(3),
ADD COLUMN     "permanecer_validade" TIMESTAMP(3),
ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "visitantes" ADD COLUMN     "email" TEXT,
ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Musica" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "artista" TEXT,
    "bpm" INTEGER,
    "link_video" TEXT,
    "holyrics_id" TEXT,

    CONSTRAINT "Musica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "plano" TEXT NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Congregacao" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Congregacao_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "EncontroGrupo_pkey" PRIMARY KEY ("id")
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
    "evento_id" INTEGER NOT NULL,
    "musica_id" TEXT NOT NULL,
    "tom_tocado" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "RepertorioEvento_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "Musica_holyrics_id_key" ON "Musica"("holyrics_id");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "EncontroGrupo_tenant_id_idx" ON "EncontroGrupo"("tenant_id");

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
CREATE INDEX "_MembrosPresentes_B_index" ON "_MembrosPresentes"("B");

-- CreateIndex
CREATE INDEX "_GestoresAgenda_B_index" ON "_GestoresAgenda"("B");

-- CreateIndex
CREATE INDEX "_CompromissoMembros_B_index" ON "_CompromissoMembros"("B");

-- CreateIndex
CREATE INDEX "_CompromissoVisitantes_B_index" ON "_CompromissoVisitantes"("B");

-- CreateIndex
CREATE INDEX "_CompromissoDepartamentos_B_index" ON "_CompromissoDepartamentos"("B");

-- CreateIndex
CREATE INDEX "_CompromissoGrupos_B_index" ON "_CompromissoGrupos"("B");

-- CreateIndex
CREATE INDEX "AvisoMural_tenant_id_idx" ON "AvisoMural"("tenant_id");

-- CreateIndex
CREATE INDEX "Contribuicao_tenant_id_idx" ON "Contribuicao"("tenant_id");

-- CreateIndex
CREATE INDEX "Departamento_tenant_id_idx" ON "Departamento"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "Departamento_nome_tenant_id_key" ON "Departamento"("nome", "tenant_id");

-- CreateIndex
CREATE INDEX "Escala_tenant_id_idx" ON "Escala"("tenant_id");

-- CreateIndex
CREATE INDEX "EtapaObra_tenant_id_idx" ON "EtapaObra"("tenant_id");

-- CreateIndex
CREATE INDEX "Evento_tenant_id_idx" ON "Evento"("tenant_id");

-- CreateIndex
CREATE INDEX "Familia_tenant_id_idx" ON "Familia"("tenant_id");

-- CreateIndex
CREATE INDEX "FuncaoDepartamento_tenant_id_idx" ON "FuncaoDepartamento"("tenant_id");

-- CreateIndex
CREATE INDEX "Grupo_tenant_id_idx" ON "Grupo"("tenant_id");

-- CreateIndex
CREATE INDEX "IntegranteDepartamento_tenant_id_idx" ON "IntegranteDepartamento"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "IntegranteDepartamento_membro_id_departamento_id_key" ON "IntegranteDepartamento"("membro_id", "departamento_id");

-- CreateIndex
CREATE INDEX "LancamentoFinanceiro_tenant_id_idx" ON "LancamentoFinanceiro"("tenant_id");

-- CreateIndex
CREATE INDEX "ObjetivoFinanceiro_tenant_id_idx" ON "ObjetivoFinanceiro"("tenant_id");

-- CreateIndex
CREATE INDEX "PedidoSaldoCantina_tenant_id_idx" ON "PedidoSaldoCantina"("tenant_id");

-- CreateIndex
CREATE INDEX "ProjetoObra_tenant_id_idx" ON "ProjetoObra"("tenant_id");

-- CreateIndex
CREATE INDEX "Rifa_tenant_id_idx" ON "Rifa"("tenant_id");

-- CreateIndex
CREATE INDEX "RifaNumero_tenant_id_idx" ON "RifaNumero"("tenant_id");

-- CreateIndex
CREATE INDEX "acompanhamento_visitantes_tenant_id_idx" ON "acompanhamento_visitantes"("tenant_id");

-- CreateIndex
CREATE INDEX "membros_tenant_id_idx" ON "membros"("tenant_id");

-- CreateIndex
CREATE INDEX "visitantes_tenant_id_idx" ON "visitantes"("tenant_id");

-- AddForeignKey
ALTER TABLE "Congregacao" ADD CONSTRAINT "Congregacao_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros" ADD CONSTRAINT "membros_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros" ADD CONSTRAINT "membros_congregacao_id_fkey" FOREIGN KEY ("congregacao_id") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Familia" ADD CONSTRAINT "Familia_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Departamento" ADD CONSTRAINT "Departamento_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Departamento" ADD CONSTRAINT "Departamento_congregacaoId_fkey" FOREIGN KEY ("congregacaoId") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegranteDepartamento" ADD CONSTRAINT "IntegranteDepartamento_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_congregacaoId_fkey" FOREIGN KEY ("congregacaoId") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncontroGrupo" ADD CONSTRAINT "EncontroGrupo_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncontroGrupo" ADD CONSTRAINT "EncontroGrupo_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escala" ADD CONSTRAINT "Escala_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuncaoDepartamento" ADD CONSTRAINT "FuncaoDepartamento_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjetivoFinanceiro" ADD CONSTRAINT "ObjetivoFinanceiro_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoFinanceiro" ADD CONSTRAINT "LancamentoFinanceiro_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LancamentoFinanceiro" ADD CONSTRAINT "LancamentoFinanceiro_congregacaoId_fkey" FOREIGN KEY ("congregacaoId") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rifa" ADD CONSTRAINT "Rifa_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RifaNumero" ADD CONSTRAINT "RifaNumero_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoSaldoCantina" ADD CONSTRAINT "PedidoSaldoCantina_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribuicao" ADD CONSTRAINT "Contribuicao_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitantes" ADD CONSTRAINT "visitantes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acompanhamento_visitantes" ADD CONSTRAINT "acompanhamento_visitantes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjetoObra" ADD CONSTRAINT "ProjetoObra_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtapaObra" ADD CONSTRAINT "EtapaObra_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvisoMural" ADD CONSTRAINT "AvisoMural_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agenda" ADD CONSTRAINT "Agenda_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agenda" ADD CONSTRAINT "Agenda_dono_id_fkey" FOREIGN KEY ("dono_id") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compromisso" ADD CONSTRAINT "Compromisso_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compromisso" ADD CONSTRAINT "Compromisso_agenda_id_fkey" FOREIGN KEY ("agenda_id") REFERENCES "Agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepertorioEvento" ADD CONSTRAINT "RepertorioEvento_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepertorioEvento" ADD CONSTRAINT "RepertorioEvento_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepertorioEvento" ADD CONSTRAINT "RepertorioEvento_musica_id_fkey" FOREIGN KEY ("musica_id") REFERENCES "Musica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MembrosPresentes" ADD CONSTRAINT "_MembrosPresentes_A_fkey" FOREIGN KEY ("A") REFERENCES "EncontroGrupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MembrosPresentes" ADD CONSTRAINT "_MembrosPresentes_B_fkey" FOREIGN KEY ("B") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GestoresAgenda" ADD CONSTRAINT "_GestoresAgenda_A_fkey" FOREIGN KEY ("A") REFERENCES "Agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GestoresAgenda" ADD CONSTRAINT "_GestoresAgenda_B_fkey" FOREIGN KEY ("B") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompromissoMembros" ADD CONSTRAINT "_CompromissoMembros_A_fkey" FOREIGN KEY ("A") REFERENCES "Compromisso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompromissoMembros" ADD CONSTRAINT "_CompromissoMembros_B_fkey" FOREIGN KEY ("B") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompromissoVisitantes" ADD CONSTRAINT "_CompromissoVisitantes_A_fkey" FOREIGN KEY ("A") REFERENCES "Compromisso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompromissoVisitantes" ADD CONSTRAINT "_CompromissoVisitantes_B_fkey" FOREIGN KEY ("B") REFERENCES "visitantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompromissoDepartamentos" ADD CONSTRAINT "_CompromissoDepartamentos_A_fkey" FOREIGN KEY ("A") REFERENCES "Compromisso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompromissoDepartamentos" ADD CONSTRAINT "_CompromissoDepartamentos_B_fkey" FOREIGN KEY ("B") REFERENCES "Departamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompromissoGrupos" ADD CONSTRAINT "_CompromissoGrupos_A_fkey" FOREIGN KEY ("A") REFERENCES "Compromisso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompromissoGrupos" ADD CONSTRAINT "_CompromissoGrupos_B_fkey" FOREIGN KEY ("B") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
