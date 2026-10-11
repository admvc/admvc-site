/*
  Warnings:

  - You are about to drop the column `funcao` on the `IntegranteDepartamento` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[evento_id,membro_id,funcao_id]` on the table `Escala` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Escala_evento_id_membro_id_key";

-- AlterTable
ALTER TABLE "Escala" ADD COLUMN     "funcao_id" INTEGER,
ADD COLUMN     "motivo_recusa" TEXT;

-- AlterTable
ALTER TABLE "IntegranteDepartamento" DROP COLUMN "funcao";

-- AlterTable
ALTER TABLE "membros" ALTER COLUMN "lang" SET DEFAULT 'Português';

-- CreateTable
CREATE TABLE "FuncaoSelecionada" (
    "id" SERIAL NOT NULL,
    "integrante_departamento_id" INTEGER NOT NULL,
    "funcao_id" INTEGER NOT NULL,

    CONSTRAINT "FuncaoSelecionada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indisponibilidades_membro" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
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

-- CreateIndex
CREATE INDEX "indisponibilidades_membro_tenant_id_idx" ON "indisponibilidades_membro"("tenant_id");

-- CreateIndex
CREATE INDEX "indisponibilidades_membro_membro_id_idx" ON "indisponibilidades_membro"("membro_id");

-- CreateIndex
CREATE UNIQUE INDEX "mensagens_evento_evento_id_key" ON "mensagens_evento"("evento_id");

-- CreateIndex
CREATE INDEX "mensagens_evento_tenant_id_idx" ON "mensagens_evento"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "Escala_evento_id_membro_id_funcao_id_key" ON "Escala"("evento_id", "membro_id", "funcao_id");

-- AddForeignKey
ALTER TABLE "FuncaoSelecionada" ADD CONSTRAINT "FuncaoSelecionada_funcao_id_fkey" FOREIGN KEY ("funcao_id") REFERENCES "FuncaoDepartamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuncaoSelecionada" ADD CONSTRAINT "FuncaoSelecionada_integrante_departamento_id_fkey" FOREIGN KEY ("integrante_departamento_id") REFERENCES "IntegranteDepartamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escala" ADD CONSTRAINT "Escala_funcao_id_fkey" FOREIGN KEY ("funcao_id") REFERENCES "FuncaoDepartamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indisponibilidades_membro" ADD CONSTRAINT "indisponibilidades_membro_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indisponibilidades_membro" ADD CONSTRAINT "indisponibilidades_membro_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_evento" ADD CONSTRAINT "mensagens_evento_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_evento" ADD CONSTRAINT "mensagens_evento_pregador_id_fkey" FOREIGN KEY ("pregador_id") REFERENCES "membros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_evento" ADD CONSTRAINT "mensagens_evento_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
