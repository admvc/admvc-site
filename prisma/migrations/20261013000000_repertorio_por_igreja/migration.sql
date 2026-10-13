-- Repertorio por igreja (cada igreja tem as suas musicas) e o ministerio de
-- louvor marcado no departamento (em vez de procurar "louvor" no nome).

-- 1. Musicas: tenant_id, preenchido a partir dos cultos onde a musica foi
--    tocada; as que nunca foram tocadas ficam na primeira igreja.
ALTER TABLE "musicas" ADD COLUMN "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "tenant_id" INTEGER;

UPDATE "musicas" m SET "tenant_id" = (
    SELECT r."tenant_id" FROM "RepertorioEvento" r
    WHERE r."musica_id" = m."id"
    GROUP BY r."tenant_id" ORDER BY count(*) DESC, r."tenant_id" LIMIT 1
);
UPDATE "musicas" SET "tenant_id" = (SELECT min("id") FROM "Tenant") WHERE "tenant_id" IS NULL;

ALTER TABLE "musicas" ALTER COLUMN "tenant_id" SET NOT NULL;

DROP INDEX "musicas_holyrics_id_key";
CREATE INDEX "musicas_tenant_id_idx" ON "musicas"("tenant_id");
CREATE UNIQUE INDEX "musicas_tenant_id_holyrics_id_key" ON "musicas"("tenant_id", "holyrics_id");
ALTER TABLE "musicas" ADD CONSTRAINT "musicas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. Departamento: e_louvor (os que hoje tem "louvor" ou "music" no nome)
ALTER TABLE "Departamento" ADD COLUMN "e_louvor" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Departamento" SET "e_louvor" = true
WHERE "nome" ILIKE '%louvor%' OR "nome" ILIKE '%music%' OR "nome" ILIKE '%música%';

-- 3. Tema do portal da igreja ("verde" ou "louveapp"); o claro/escuro segue o telemovel.
ALTER TABLE "Tenant" ADD COLUMN "tema" TEXT NOT NULL DEFAULT 'verde';

-- 4. Sugestoes do lider: o lider (ou um nomeado) sugere uma pessoa para o
--    ministerio, com as funcoes; o administrador aprova.
ALTER TABLE "InteresseDepartamento" ADD COLUMN "sugerido_por_id" INTEGER,
ADD COLUMN "funcoes_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "InteresseDepartamento" ADD CONSTRAINT "InteresseDepartamento_sugerido_por_id_fkey" FOREIGN KEY ("sugerido_por_id") REFERENCES "membros"("id") ON DELETE SET NULL ON UPDATE CASCADE;
