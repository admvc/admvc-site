-- 22/10/2026 · Culto direcionado a um grupo = culto normal com o título mudado ("Quarta profética" → "Culto na Direção de Homens").
-- Guarda o nome antigo para o repor se a regra parar. Só ACRESCENTA (uma coluna opcional); pode correr duas vezes.

ALTER TABLE "Evento" ADD COLUMN IF NOT EXISTS "nome_original" TEXT;
