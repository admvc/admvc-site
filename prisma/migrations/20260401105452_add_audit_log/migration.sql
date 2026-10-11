-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "membro_id" INTEGER,
    "alvo_id" INTEGER,
    "alvo_tipo" TEXT,
    "acao" TEXT NOT NULL,
    "descricao" TEXT,
    "ip" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_membro_id_idx" ON "audit_logs"("membro_id");

-- CreateIndex
CREATE INDEX "audit_logs_alvo_id_idx" ON "audit_logs"("alvo_id");

-- CreateIndex
CREATE INDEX "audit_logs_criado_em_idx" ON "audit_logs"("criado_em");
