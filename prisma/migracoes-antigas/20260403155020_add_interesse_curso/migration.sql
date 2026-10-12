-- CreateEnum
CREATE TYPE "StatusInteresse" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

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

-- CreateIndex
CREATE INDEX "interesses_curso_tenant_id_idx" ON "interesses_curso"("tenant_id");

-- CreateIndex
CREATE INDEX "interesses_curso_curso_id_status_idx" ON "interesses_curso"("curso_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "interesses_curso_curso_id_membro_id_key" ON "interesses_curso"("curso_id", "membro_id");

-- AddForeignKey
ALTER TABLE "interesses_curso" ADD CONSTRAINT "interesses_curso_curso_id_fkey" FOREIGN KEY ("curso_id") REFERENCES "cursos_ebd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interesses_curso" ADD CONSTRAINT "interesses_curso_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interesses_curso" ADD CONSTRAINT "interesses_curso_aprovado_por_id_fkey" FOREIGN KEY ("aprovado_por_id") REFERENCES "membros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interesses_curso" ADD CONSTRAINT "interesses_curso_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
