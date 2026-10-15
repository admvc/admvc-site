-- Rotina dos cultos (Pregações): a ordem de cada culto e os modelos por congregação. Só cria tabelas novas.
-- CreateTable
CREATE TABLE "rotinas_culto" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "itens" JSONB NOT NULL,
    "atualizado_por" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rotinas_culto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rotinas_modelo" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "congregacao_id" INTEGER,
    "nome" TEXT NOT NULL,
    "itens" JSONB NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rotinas_modelo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rotinas_culto_evento_id_key" ON "rotinas_culto"("evento_id");

-- CreateIndex
CREATE INDEX "rotinas_culto_tenant_id_idx" ON "rotinas_culto"("tenant_id");

-- CreateIndex
CREATE INDEX "rotinas_modelo_tenant_id_idx" ON "rotinas_modelo"("tenant_id");

-- AddForeignKey
ALTER TABLE "rotinas_culto" ADD CONSTRAINT "rotinas_culto_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rotinas_culto" ADD CONSTRAINT "rotinas_culto_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rotinas_modelo" ADD CONSTRAINT "rotinas_modelo_congregacao_id_fkey" FOREIGN KEY ("congregacao_id") REFERENCES "Congregacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rotinas_modelo" ADD CONSTRAINT "rotinas_modelo_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

