-- AlterTable
ALTER TABLE "EscolaBiblica" ADD COLUMN     "conteudo" TEXT,
ADD COLUMN     "link_aula" TEXT;

-- AlterTable
ALTER TABLE "atividades_ebd" ADD COLUMN     "perguntas" JSONB;

-- AlterTable
ALTER TABLE "notas_ebd" ADD COLUMN     "respostas" JSONB;
