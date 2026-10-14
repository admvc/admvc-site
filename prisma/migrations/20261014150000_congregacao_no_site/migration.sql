-- O site público passa a ler as congregações do portal. Só acrescenta colunas.
ALTER TABLE "Congregacao" ADD COLUMN "site_mostrar" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Congregacao" ADD COLUMN "site_descricao" TEXT;
ALTER TABLE "Congregacao" ADD COLUMN "site_horarios" TEXT;
