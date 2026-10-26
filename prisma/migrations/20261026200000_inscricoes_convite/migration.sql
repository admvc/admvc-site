-- 26/10/2026 · Inscrições: mostrar ou esconder o convite, agendar a divulgação e esconder o preço até haver contacto. Só ACRESCENTA colunas com valor por omissão (os eventos de hoje ficam como estão); pode correr duas vezes.

ALTER TABLE "eventos_inscricao" ADD COLUMN IF NOT EXISTS "convite_visivel" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "eventos_inscricao" ADD COLUMN IF NOT EXISTS "divulgar_em" TIMESTAMP(3);
ALTER TABLE "eventos_inscricao" ADD COLUMN IF NOT EXISTS "mostrar_preco" BOOLEAN NOT NULL DEFAULT true;
