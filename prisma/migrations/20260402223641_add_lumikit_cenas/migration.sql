-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "lumikit_cenas" JSONB;

-- AlterTable
ALTER TABLE "membros" ALTER COLUMN "ultimo_login" SET DATA TYPE TIMESTAMP(3);
