/*
  Warnings:

  - Added the required column `tenant_id` to the `inventario_movimentos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Escala" ADD COLUMN     "congregacao_id" INTEGER;

-- AlterTable
ALTER TABLE "Evento" ADD COLUMN     "congregacao_id" INTEGER;

-- AlterTable
ALTER TABLE "RepertorioEvento" ADD COLUMN     "congregacao_id" INTEGER;

-- AlterTable
ALTER TABLE "indisponibilidades_membro" ADD COLUMN     "congregacao_id" INTEGER;

-- AlterTable
ALTER TABLE "inventario_itens" ADD COLUMN     "congregacao_id" INTEGER;

-- AlterTable
ALTER TABLE "inventario_movimentos" ADD COLUMN     "congregacao_id" INTEGER,
ADD COLUMN     "tenant_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "mensagens_evento" ADD COLUMN     "congregacao_id" INTEGER;

-- CreateIndex
CREATE INDEX "inventario_movimentos_tenant_id_idx" ON "inventario_movimentos"("tenant_id");

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_congregacao_id_fkey" FOREIGN KEY ("congregacao_id") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escala" ADD CONSTRAINT "Escala_congregacao_id_fkey" FOREIGN KEY ("congregacao_id") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepertorioEvento" ADD CONSTRAINT "RepertorioEvento_congregacao_id_fkey" FOREIGN KEY ("congregacao_id") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indisponibilidades_membro" ADD CONSTRAINT "indisponibilidades_membro_congregacao_id_fkey" FOREIGN KEY ("congregacao_id") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_evento" ADD CONSTRAINT "mensagens_evento_congregacao_id_fkey" FOREIGN KEY ("congregacao_id") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_itens" ADD CONSTRAINT "inventario_itens_congregacao_id_fkey" FOREIGN KEY ("congregacao_id") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_movimentos" ADD CONSTRAINT "inventario_movimentos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_movimentos" ADD CONSTRAINT "inventario_movimentos_congregacao_id_fkey" FOREIGN KEY ("congregacao_id") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
