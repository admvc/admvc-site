-- CreateEnum
CREATE TYPE "CategoriaCurso" AS ENUM ('EBD', 'LIVRE', 'DISCIPULADO', 'SEMINARIO');

-- DropIndex
DROP INDEX "cursos_ebd_ano_trimestre_idx";

-- AlterTable
ALTER TABLE "cursos_ebd" ADD COLUMN     "carga_horaria" INTEGER,
ADD COLUMN     "categoria" "CategoriaCurso" NOT NULL DEFAULT 'EBD',
ALTER COLUMN "trimestre" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "cursos_ebd_ano_idx" ON "cursos_ebd"("ano");

-- CreateIndex
CREATE INDEX "cursos_ebd_categoria_idx" ON "cursos_ebd"("categoria");
