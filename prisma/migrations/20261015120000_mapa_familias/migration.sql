-- Mapa das famílias (só admins): coordenadas da casa de cada membro. Só acrescenta colunas.
-- AlterTable
ALTER TABLE "membros" ADD COLUMN     "geo_chave" TEXT,
ADD COLUMN     "geo_falhou" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "geo_fonte" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

