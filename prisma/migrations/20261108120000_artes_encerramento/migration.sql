-- Artes do ENCERRAMENTO do Holyrics (banner da Cantina e arte da Assistência Social, por culto). 8 de novembro de 2026.
-- SÓ ACRESCENTA: 1 tabela nova com 1 índice único e 1 índice. Nada do que existe muda.

-- CreateTable
CREATE TABLE "artes_encerramento" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "criado_por" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artes_encerramento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "artes_encerramento_evento_id_tipo_key" ON "artes_encerramento"("evento_id", "tipo");

-- CreateIndex
CREATE INDEX "artes_encerramento_tenant_id_idx" ON "artes_encerramento"("tenant_id");
