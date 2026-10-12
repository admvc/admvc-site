-- AlterTable
ALTER TABLE "membros" ADD COLUMN     "conversion_date" TIMESTAMP(3),
ADD COLUMN     "escolaridade_id" INTEGER;

-- CreateTable
CREATE TABLE "escolaridades" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "escolaridades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "escolaridades_nome_key" ON "escolaridades"("nome");

-- AddForeignKey
ALTER TABLE "membros" ADD CONSTRAINT "membros_escolaridade_id_fkey" FOREIGN KEY ("escolaridade_id") REFERENCES "escolaridades"("id") ON DELETE SET NULL ON UPDATE CASCADE;
