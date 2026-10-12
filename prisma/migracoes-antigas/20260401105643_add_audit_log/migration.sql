/*
  Warnings:

  - You are about to drop the column `membro_id` on the `audit_logs` table. All the data in the column will be lost.
  - Added the required column `categoria` to the `audit_logs` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "audit_logs_membro_id_idx";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "membro_id",
ADD COLUMN     "actor_id" INTEGER,
ADD COLUMN     "actor_nome" TEXT,
ADD COLUMN     "alvo_nome" TEXT,
ADD COLUMN     "categoria" TEXT NOT NULL,
ADD COLUMN     "dados_antes" TEXT,
ADD COLUMN     "dados_apos" TEXT,
ADD COLUMN     "user_agent" TEXT;

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_acao_idx" ON "audit_logs"("acao");

-- CreateIndex
CREATE INDEX "audit_logs_categoria_idx" ON "audit_logs"("categoria");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
