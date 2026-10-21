-- 22/10/2026 · Divulgação 2.0: chave do Holyrics (só o SHA-256 fica guardado) para o módulo "Trazer as artes do culto".
-- Só ACRESCENTA uma coluna opcional; pode correr duas vezes.

ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "holyrics_chave_hash" TEXT;
