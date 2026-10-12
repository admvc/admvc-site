-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "cor_fundo" TEXT NOT NULL DEFAULT '#0b0d0c',
ADD COLUMN     "cor_primaria" TEXT NOT NULL DEFAULT '#3F6B4F',
ADD COLUMN     "cor_secundaria" TEXT NOT NULL DEFAULT '#7FAE93',
ADD COLUMN     "logo_url" TEXT;
