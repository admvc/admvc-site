-- AlterTable
ALTER TABLE "_ProfessorTurmaEBD" ADD CONSTRAINT "_ProfessorTurmaEBD_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ProfessorTurmaEBD_AB_unique";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "hash" TEXT;
