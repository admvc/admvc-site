-- 24/10/2026 · Imagem (ícone) de cada grupo, como os departamentos já têm. Só ACRESCENTA uma coluna opcional; pode correr duas vezes.

ALTER TABLE "Grupo" ADD COLUMN IF NOT EXISTS "foto_url" TEXT;
