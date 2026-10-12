-- CreateEnum
CREATE TYPE "TipoInscricao" AS ENUM ('LIVRE', 'DEPARTAMENTO', 'GRUPO');

-- AlterTable
ALTER TABLE "cursos_ebd" ADD COLUMN     "aprovado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aprovado_em" TIMESTAMP(3),
ADD COLUMN     "aprovado_por_id" INTEGER,
ADD COLUMN     "criado_por_id" INTEGER,
ADD COLUMN     "data_abertura_inscricoes" TIMESTAMP(3),
ADD COLUMN     "departamento_ids" JSONB,
ADD COLUMN     "ementa" TEXT,
ADD COLUMN     "grupo_ids" JSONB,
ADD COLUMN     "is_externo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "link_externo" TEXT,
ADD COLUMN     "responsavel_nome" TEXT,
ADD COLUMN     "responsavel_tel" TEXT,
ADD COLUMN     "tipo_inscricao" "TipoInscricao" NOT NULL DEFAULT 'LIVRE',
ADD COLUMN     "vagas_maximas" INTEGER;

-- CreateIndex
CREATE INDEX "cursos_ebd_aprovado_idx" ON "cursos_ebd"("aprovado");

-- AddForeignKey
ALTER TABLE "cursos_ebd" ADD CONSTRAINT "cursos_ebd_aprovado_por_id_fkey" FOREIGN KEY ("aprovado_por_id") REFERENCES "membros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cursos_ebd" ADD CONSTRAINT "cursos_ebd_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "membros"("id") ON DELETE SET NULL ON UPDATE CASCADE;
