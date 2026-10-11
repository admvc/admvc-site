-- DropIndex
DROP INDEX IF EXISTS "Departamento_nome_tenant_id_key";

-- CreateIndex (allow same name per tenant if different congregation)
CREATE UNIQUE INDEX "Departamento_nome_tenant_id_congregacaoId_key" ON "Departamento"("nome", "tenant_id", "congregacaoId");
