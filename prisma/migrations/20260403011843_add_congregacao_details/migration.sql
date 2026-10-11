-- AlterTable
ALTER TABLE "Congregacao" ADD COLUMN     "co_pastor" TEXT,
ADD COLUMN     "codigo_postal" TEXT,
ADD COLUMN     "distrito" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "pais" TEXT DEFAULT 'Portugal',
ADD COLUMN     "pastor" TEXT,
ADD COLUMN     "telefone" TEXT;
