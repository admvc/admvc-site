-- Registo das capas/títulos aplicados às lives do YouTube. 19 de novembro de 2026.
-- SÓ ACRESCENTA: 1 tabela nova com 2 índices. Nada do que existe muda.
-- CreateTable
CREATE TABLE "youtube_lives_registo" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "evento_id" INTEGER,
    "broadcast_id" TEXT NOT NULL,
    "live_titulo" TEXT NOT NULL,
    "titulo_aplicado" TEXT,
    "estado" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "por" TEXT,
    "resultado" TEXT NOT NULL,
    "mensagem" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "youtube_lives_registo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "youtube_lives_registo_tenant_id_criado_em_idx" ON "youtube_lives_registo"("tenant_id", "criado_em");

-- CreateIndex
CREATE INDEX "youtube_lives_registo_broadcast_id_estado_idx" ON "youtube_lives_registo"("broadcast_id", "estado");

