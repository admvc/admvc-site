-- Ação Social (17/10): registo simples das famílias apoiadas. Só ACRESCENTA (tabela nova e um campo
-- opcional nas entregas e movimentos; o nome escrito à mão continua a funcionar).

CREATE TABLE "assistencia_familias" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "morada" TEXT,
    "pessoas" INTEGER NOT NULL DEFAULT 1,
    "notas" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "consentimento_em" TIMESTAMP(3) NOT NULL,
    "criado_por" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assistencia_familias_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "assistencia_familias_tenant_id_idx" ON "assistencia_familias"("tenant_id");
ALTER TABLE "assistencia_familias" ADD CONSTRAINT "assistencia_familias_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "assistencia_entregas_cesta" ADD COLUMN "familia_id" INTEGER;
ALTER TABLE "assistencia_entregas_cesta" ADD CONSTRAINT "assistencia_entregas_cesta_familia_id_fkey"
    FOREIGN KEY ("familia_id") REFERENCES "assistencia_familias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "assistencia_entregas_cesta_familia_id_idx" ON "assistencia_entregas_cesta"("familia_id");

ALTER TABLE "assistencia_movimentos" ADD COLUMN "familia_id" INTEGER;
ALTER TABLE "assistencia_movimentos" ADD CONSTRAINT "assistencia_movimentos_familia_id_fkey"
    FOREIGN KEY ("familia_id") REFERENCES "assistencia_familias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "assistencia_movimentos_familia_id_idx" ON "assistencia_movimentos"("familia_id");
