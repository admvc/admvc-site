-- Rotinas do culto (alertas das artes, "Já postei", início do culto no Holyrics). 20 de novembro de 2026.
-- SÓ ACRESCENTA: 1 coluna opcional no Tenant e 1 tabela nova. Nada do que existe muda.
-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "rotina_culto" JSONB;

-- CreateTable
CREATE TABLE "rotina_registos" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "membro_id" INTEGER,
    "ok" BOOLEAN NOT NULL DEFAULT true,
    "chave" TEXT,
    "detalhes" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rotina_registos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rotina_registos_chave_key" ON "rotina_registos"("chave");

-- CreateIndex
CREATE INDEX "rotina_registos_tenant_id_evento_id_tipo_idx" ON "rotina_registos"("tenant_id", "evento_id", "tipo");
