-- 21/10/2026 · Kit de artes de divulgação de um culto (Mídia → Divulgação): uma receita por evento.
-- Só ACRESCENTA (uma tabela nova); pode correr duas vezes.

CREATE TABLE IF NOT EXISTS "divulgacao_kits" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "receita" JSONB NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "divulgacao_kits_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "divulgacao_kits_evento_id_key" ON "divulgacao_kits"("evento_id");
CREATE INDEX IF NOT EXISTS "divulgacao_kits_tenant_id_idx" ON "divulgacao_kits"("tenant_id");

DO $$ BEGIN ALTER TABLE "divulgacao_kits" ADD CONSTRAINT "divulgacao_kits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "divulgacao_kits" ADD CONSTRAINT "divulgacao_kits_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
