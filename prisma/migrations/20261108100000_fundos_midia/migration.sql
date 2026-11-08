-- Banco de fundos da Mídia (imagens de fundo por categoria para as artes). 8 de novembro de 2026.
-- SÓ ACRESCENTA: 1 tabela nova com 1 índice. Nada do que existe muda.

-- CreateTable
CREATE TABLE "fundos_midia" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'ADMVC',
    "url" TEXT NOT NULL,
    "largura" INTEGER NOT NULL DEFAULT 0,
    "altura" INTEGER NOT NULL DEFAULT 0,
    "bytes" INTEGER NOT NULL DEFAULT 0,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_por" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fundos_midia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fundos_midia_tenant_id_categoria_ordem_idx" ON "fundos_midia"("tenant_id", "categoria", "ordem");
