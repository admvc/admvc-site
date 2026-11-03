-- Louvor: músicas ligadas ao CSDB (csdb.app) — 03/11/2026.
-- Só ACRESCENTA: colunas novas (todas opcionais) em "musicas", a tabela "csdb_cache" e índices.
-- O passo final preenche "titulo_norm" das músicas que já existem (só onde está vazio: pode correr 2 vezes).

-- AlterTable
ALTER TABLE "musicas" ADD COLUMN     "ano" INTEGER,
ADD COLUMN     "compasso" TEXT,
ADD COLUMN     "compositores" TEXT[],
ADD COLUMN     "csdb_atualizado_em" TIMESTAMP(3),
ADD COLUMN     "csdb_track_id" INTEGER,
ADD COLUMN     "csdb_work_id" INTEGER,
ADD COLUMN     "duracao_seg" INTEGER,
ADD COLUMN     "idioma" TEXT,
ADD COLUMN     "isrc" TEXT,
ADD COLUMN     "link_playback" TEXT,
ADD COLUMN     "links" JSONB,
ADD COLUMN     "titulo_norm" TEXT;

-- CreateTable
CREATE TABLE "csdb_cache" (
    "id" SERIAL NOT NULL,
    "chave" TEXT NOT NULL,
    "resposta" JSONB NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "csdb_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "csdb_cache_chave_key" ON "csdb_cache"("chave");

-- CreateIndex
CREATE INDEX "csdb_cache_expira_em_idx" ON "csdb_cache"("expira_em");

-- CreateIndex
CREATE INDEX "musicas_tenant_id_titulo_norm_idx" ON "musicas"("tenant_id", "titulo_norm");

-- CreateIndex
CREATE UNIQUE INDEX "musicas_tenant_id_csdb_track_id_key" ON "musicas"("tenant_id", "csdb_track_id");

-- Preencher titulo_norm das músicas existentes (minúsculas, sem acentos, só letras/números e espaços simples).
-- Igual ao normalizarTitulo() de lib/csdb-dados.ts.
UPDATE "musicas"
SET "titulo_norm" = btrim(regexp_replace(
    lower(translate("titulo",
        'ÁÀÂÃÄÅáàâãäåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
        'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn')),
    '[^a-z0-9]+', ' ', 'g'))
WHERE "titulo_norm" IS NULL;
