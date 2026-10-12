-- CreateTable: junction table for M:N TurmaEBD <-> Membro (professores)
CREATE TABLE "_ProfessorTurmaEBD" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ProfessorTurmaEBD_AB_unique" ON "_ProfessorTurmaEBD"("A", "B");
CREATE INDEX "_ProfessorTurmaEBD_B_index" ON "_ProfessorTurmaEBD"("B");

-- Migrate existing data: copy professor_id into the junction table
INSERT INTO "_ProfessorTurmaEBD" ("A", "B")
SELECT "professor_id", "id" FROM "turmas_ebd"
WHERE "professor_id" IS NOT NULL;

-- Drop the old column
ALTER TABLE "turmas_ebd" DROP COLUMN "professor_id";

-- AddForeignKey
ALTER TABLE "_ProfessorTurmaEBD" ADD CONSTRAINT "_ProfessorTurmaEBD_A_fkey" FOREIGN KEY ("A") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ProfessorTurmaEBD" ADD CONSTRAINT "_ProfessorTurmaEBD_B_fkey" FOREIGN KEY ("B") REFERENCES "turmas_ebd"("id") ON DELETE CASCADE ON UPDATE CASCADE;
