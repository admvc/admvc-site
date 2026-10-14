-- A obra passa a campanha de tijolos (modelo do VOLTA). Só acrescenta colunas.
ALTER TABLE "ProjetoObra" ADD COLUMN "valorTijolo" DOUBLE PRECISION NOT NULL DEFAULT 1000;
ALTER TABLE "ProjetoObra" ADD COLUMN "arrecadado" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "ProjetoObra" ADD COLUMN "contribuintes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProjetoObra" ADD COLUMN "chamada" TEXT;
ALTER TABLE "ProjetoObra" ADD COLUMN "versiculo" TEXT;
ALTER TABLE "ProjetoObra" ADD COLUMN "versiculoRef" TEXT;
ALTER TABLE "ProjetoObra" ADD COLUMN "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
