-- 20/10/2026 · Alertas de encontro das equipas: cancelar (sem apagar), "Vou / Não posso" e alertas já fechados por pessoa.
-- Só ACRESCENTA (uma coluna opcional e duas tabelas novas); pode correr duas vezes.

ALTER TABLE "agenda_departamento" ADD COLUMN IF NOT EXISTS "cancelado_em" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "agenda_respostas" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "agenda_id" INTEGER NOT NULL,
    "membro_id" INTEGER NOT NULL,
    "resposta" TEXT NOT NULL,
    "motivo" TEXT,
    "respondido_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agenda_respostas_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "agenda_alertas_fechados" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "agenda_id" INTEGER NOT NULL,
    "membro_id" INTEGER NOT NULL,
    "fechado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agenda_alertas_fechados_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "agenda_respostas_tenant_id_idx" ON "agenda_respostas"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "agenda_respostas_agenda_id_membro_id_key" ON "agenda_respostas"("agenda_id", "membro_id");
CREATE INDEX IF NOT EXISTS "agenda_alertas_fechados_tenant_id_idx" ON "agenda_alertas_fechados"("tenant_id");
CREATE UNIQUE INDEX IF NOT EXISTS "agenda_alertas_fechados_agenda_id_membro_id_key" ON "agenda_alertas_fechados"("agenda_id", "membro_id");

DO $$ BEGIN ALTER TABLE "agenda_respostas" ADD CONSTRAINT "agenda_respostas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "agenda_respostas" ADD CONSTRAINT "agenda_respostas_agenda_id_fkey" FOREIGN KEY ("agenda_id") REFERENCES "agenda_departamento"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "agenda_respostas" ADD CONSTRAINT "agenda_respostas_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "agenda_alertas_fechados" ADD CONSTRAINT "agenda_alertas_fechados_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "agenda_alertas_fechados" ADD CONSTRAINT "agenda_alertas_fechados_agenda_id_fkey" FOREIGN KEY ("agenda_id") REFERENCES "agenda_departamento"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "agenda_alertas_fechados" ADD CONSTRAINT "agenda_alertas_fechados_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
