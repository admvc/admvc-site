-- 23/10/2026 · Divulgação: "padrão da igreja" (estilo, cores, redes e fundo com que os kits novos começam).
-- Só ACRESCENTA uma coluna opcional; pode correr duas vezes.

ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "divulgacao_padrao" JSONB;
