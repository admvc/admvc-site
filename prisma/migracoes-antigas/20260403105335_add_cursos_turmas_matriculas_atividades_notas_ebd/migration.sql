-- CreateEnum
CREATE TYPE "StatusCurso" AS ENUM ('PLANEADO', 'EM_CURSO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusMatricula" AS ENUM ('ATIVA', 'TRANCADA', 'CONCLUIDA', 'DESISTENTE');

-- CreateEnum
CREATE TYPE "TipoAtividade" AS ENUM ('EXERCICIO', 'PROVA', 'TRABALHO', 'PARTICIPACAO');

-- AlterTable
ALTER TABLE "EscolaBiblica" ADD COLUMN     "turma_id" TEXT;

-- AlterTable
ALTER TABLE "PresencaEBD" ADD COLUMN     "justificativa" TEXT;

-- CreateTable
CREATE TABLE "cursos_ebd" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "trimestre" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "data_inicio" TIMESTAMP(3) NOT NULL,
    "data_fim" TIMESTAMP(3) NOT NULL,
    "material_ref" TEXT,
    "nota_minima" DOUBLE PRECISION NOT NULL DEFAULT 7.0,
    "presenca_minima" DOUBLE PRECISION NOT NULL DEFAULT 75.0,
    "status" "StatusCurso" NOT NULL DEFAULT 'PLANEADO',
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
    "professor_id" INTEGER NOT NULL,
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
    "observacao" TEXT,
    "tenant_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notas_ebd_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cursos_ebd_tenant_id_idx" ON "cursos_ebd"("tenant_id");

-- CreateIndex
CREATE INDEX "cursos_ebd_ano_trimestre_idx" ON "cursos_ebd"("ano", "trimestre");

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
CREATE INDEX "EscolaBiblica_turma_id_idx" ON "EscolaBiblica"("turma_id");

-- AddForeignKey
ALTER TABLE "EscolaBiblica" ADD CONSTRAINT "EscolaBiblica_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas_ebd"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos_ebd" ADD CONSTRAINT "cursos_ebd_congregacao_id_fkey" FOREIGN KEY ("congregacao_id") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos_ebd" ADD CONSTRAINT "cursos_ebd_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turmas_ebd" ADD CONSTRAINT "turmas_ebd_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos_ebd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turmas_ebd" ADD CONSTRAINT "turmas_ebd_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
