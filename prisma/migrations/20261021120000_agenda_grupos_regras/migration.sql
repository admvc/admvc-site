-- 21/10/2026 · Agenda por GRUPO e regras repetidas (toda a 1.ª segunda, última quarta…):
--  · encontros da agenda também de um grupo (departamento_id passa a opcional + grupo_id; CHECK: um dos dois);
--  · cultos (Evento) direcionados a um grupo; encontros e cultos podem vir de uma regra;
--  · tabela nova das regras.
-- Só ACRESCENTA (colunas opcionais, tabela nova, um DROP NOT NULL que alarga); pode correr duas vezes.

CREATE TABLE IF NOT EXISTS "agenda_regras" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "alvo" TEXT NOT NULL,
    "departamento_id" INTEGER,
    "grupo_id" INTEGER,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'REUNIAO',
    "dia_semana" INTEGER NOT NULL,
    "semana_do_mes" INTEGER NOT NULL,
    "hora" TEXT NOT NULL DEFAULT '20:00',
    "local" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "gerado_ate" TIMESTAMP(3),
    "criado_por" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "agenda_regras_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "agenda_regras_tenant_id_idx" ON "agenda_regras"("tenant_id");

ALTER TABLE "agenda_departamento" ALTER COLUMN "departamento_id" DROP NOT NULL;
ALTER TABLE "agenda_departamento" ADD COLUMN IF NOT EXISTS "grupo_id" INTEGER;
ALTER TABLE "agenda_departamento" ADD COLUMN IF NOT EXISTS "regra_id" INTEGER;
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "grupo_id" INTEGER;
ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "regra_id" INTEGER;
CREATE INDEX IF NOT EXISTS "agenda_departamento_grupo_id_inicio_idx" ON "agenda_departamento"("grupo_id", "inicio");
CREATE INDEX IF NOT EXISTS "agenda_departamento_regra_id_idx" ON "agenda_departamento"("regra_id");

DO $$ BEGIN ALTER TABLE "agenda_departamento" ADD CONSTRAINT "agenda_departamento_equipa_ck" CHECK ("departamento_id" IS NOT NULL OR "grupo_id" IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "agenda_regras" ADD CONSTRAINT "agenda_regras_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "agenda_regras" ADD CONSTRAINT "agenda_regras_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "Departamento"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "agenda_regras" ADD CONSTRAINT "agenda_regras_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "agenda_departamento" ADD CONSTRAINT "agenda_departamento_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "agenda_departamento" ADD CONSTRAINT "agenda_departamento_regra_id_fkey" FOREIGN KEY ("regra_id") REFERENCES "agenda_regras"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Evento" ADD CONSTRAINT "Evento_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Evento" ADD CONSTRAINT "Evento_regra_id_fkey" FOREIGN KEY ("regra_id") REFERENCES "agenda_regras"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
