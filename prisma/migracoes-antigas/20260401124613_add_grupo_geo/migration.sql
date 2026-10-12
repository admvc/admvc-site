-- AlterTable
ALTER TABLE "EncontroGrupo" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "publico" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "regiao" TEXT;
