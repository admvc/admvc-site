-- 19/10/2026 · Agenda das equipas: foto do encontro e a lista de quem esteve (como nos Grupos e PGs).
-- Só ACRESCENTA (uma coluna opcional e uma tabela nova); pode correr duas vezes.

ALTER TABLE "agenda_departamento" ADD COLUMN IF NOT EXISTS "foto_url" TEXT;

CREATE TABLE IF NOT EXISTS "_PresentesAgendaDepto" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_PresentesAgendaDepto_AB_pkey" PRIMARY KEY ("A","B")
);
CREATE INDEX IF NOT EXISTS "_PresentesAgendaDepto_B_index" ON "_PresentesAgendaDepto"("B");

DO $$ BEGIN
    ALTER TABLE "_PresentesAgendaDepto" ADD CONSTRAINT "_PresentesAgendaDepto_A_fkey" FOREIGN KEY ("A") REFERENCES "agenda_departamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE "_PresentesAgendaDepto" ADD CONSTRAINT "_PresentesAgendaDepto_B_fkey" FOREIGN KEY ("B") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
