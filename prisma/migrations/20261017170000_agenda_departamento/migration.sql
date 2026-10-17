-- Agenda de cada departamento/grupo de apoio (17/10): reuniões, orações, ensaios… marcados pelo líder,
-- vistos pela equipa e pela administração; depois do encontro regista-se o que se fez (para relatório).
-- Só ACRESCENTA uma tabela. Horas como hora de Lisboa gravada em UTC (docs/BASE-DE-DADOS.md).

CREATE TABLE "agenda_departamento" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "departamento_id" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'REUNIAO',
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3),
    "local" TEXT,
    "descricao" TEXT,
    "registo" TEXT,
    "presentes" INTEGER,
    "criado_por" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agenda_departamento_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "agenda_departamento_tenant_id_idx" ON "agenda_departamento"("tenant_id");
CREATE INDEX "agenda_departamento_departamento_id_inicio_idx" ON "agenda_departamento"("departamento_id", "inicio");
ALTER TABLE "agenda_departamento" ADD CONSTRAINT "agenda_departamento_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "agenda_departamento" ADD CONSTRAINT "agenda_departamento_departamento_id_fkey"
    FOREIGN KEY ("departamento_id") REFERENCES "Departamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
