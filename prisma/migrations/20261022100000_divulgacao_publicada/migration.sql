-- 22/10/2026 · Divulgação 2.0: "Publicar para a igreja". As artes desenhadas ficam guardadas (ligações do Blob) para a
-- página aberta /divulgar e para o Holyrics. Só ACRESCENTA colunas opcionais; pode correr duas vezes.

ALTER TABLE "divulgacao_kits" ADD COLUMN IF NOT EXISTS "publicado" JSONB;
ALTER TABLE "divulgacao_kits" ADD COLUMN IF NOT EXISTS "publicado_em" TIMESTAMP(3);
ALTER TABLE "divulgacao_kits" ADD COLUMN IF NOT EXISTS "publicado_receita" JSONB;
