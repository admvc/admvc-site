-- Lives do YouTube criadas pelo portal (LA1-LA6). 19 de novembro de 2026.
-- SÓ ACRESCENTA: 1 coluna opcional no tenant (id da chave fixa; a chave nunca se grava) e 3 colunas opcionais no evento.
-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "youtube_stream_id" TEXT;

-- AlterTable
ALTER TABLE "Evento" ADD COLUMN "transmitir_youtube" BOOLEAN,
ADD COLUMN "youtube_live_id" TEXT,
ADD COLUMN "youtube_live_criada_em" TIMESTAMP(3);
