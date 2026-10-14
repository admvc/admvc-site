-- Acolhimento: em que congregação esteve o visitante; e visitas registadas pelo
-- formulário público entram no histórico sem autor. Só acrescenta / afrouxa.
ALTER TABLE "visitantes" ADD COLUMN "congregacao_id" INTEGER;
CREATE INDEX "visitantes_congregacao_id_idx" ON "visitantes"("congregacao_id");
ALTER TABLE "visitantes" ADD CONSTRAINT "visitantes_congregacao_id_fkey" FOREIGN KEY ("congregacao_id") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "acompanhamento_visitantes" ALTER COLUMN "membro_id" DROP NOT NULL;
