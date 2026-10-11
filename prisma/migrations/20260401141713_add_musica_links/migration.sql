/*
  Warnings:

  - You are about to drop the `Musica` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RepertorioEvento" DROP CONSTRAINT "RepertorioEvento_musica_id_fkey";

-- DropTable
DROP TABLE "Musica";

-- CreateTable
CREATE TABLE "musicas" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "artista" TEXT,
    "bpm" INTEGER,
    "tom" TEXT,
    "link_video" TEXT,
    "link_letra" TEXT,
    "link_cifra" TEXT,
    "link_audio" TEXT,
    "holyrics_id" TEXT,

    CONSTRAINT "musicas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "musicas_holyrics_id_key" ON "musicas"("holyrics_id");

-- AddForeignKey
ALTER TABLE "RepertorioEvento" ADD CONSTRAINT "RepertorioEvento_musica_id_fkey" FOREIGN KEY ("musica_id") REFERENCES "musicas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
