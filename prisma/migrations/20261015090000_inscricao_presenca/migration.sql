-- Inscrições: entrada no dia (quem chegou), para o sorteio entre as presentes. Só acrescenta uma coluna.
ALTER TABLE "inscricoes" ADD COLUMN "presente_em" TIMESTAMP(3);
