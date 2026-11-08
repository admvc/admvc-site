-- Fotos: reacoes com emoji (8/11/2026). Acrescenta a coluna "emoji" (as reacoes que ja existem ficam como coracao)
-- e o unico passa a ser (foto, aparelho, emoji): uma de cada emoji por aparelho. Nenhuma linha muda ou desaparece.
ALTER TABLE "foto_reacoes" ADD COLUMN "emoji" TEXT NOT NULL DEFAULT '❤️';

CREATE UNIQUE INDEX "foto_reacoes_foto_id_aparelho_hash_emoji_key" ON "foto_reacoes"("foto_id", "aparelho_hash", "emoji");

-- O unico antigo (so foto + aparelho) e mais apertado e e substituido pelo novo; e um indice, nao dados.
DROP INDEX "foto_reacoes_foto_id_aparelho_hash_key";
