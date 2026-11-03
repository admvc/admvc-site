-- Albuns de fotos dos cultos (galeria publica /fotos). 3 de novembro de 2026.
-- SO ACRESCENTA: duas tabelas novas, indices e chaves estrangeiras. Nada do que existe muda.

-- CreateTable
CREATE TABLE "AlbumFoto" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT,
    "capa_chave" TEXT,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "evento_id" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlbumFoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FotoAlbum" (
    "id" SERIAL NOT NULL,
    "album_id" INTEGER NOT NULL,
    "origem" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "miniatura" TEXT,
    "largura" INTEGER,
    "altura" INTEGER,
    "bytes" INTEGER,
    "hora" TIMESTAMP(3),
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FotoAlbum_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlbumFoto_slug_key" ON "AlbumFoto"("slug");

-- CreateIndex
CREATE INDEX "AlbumFoto_tenant_id_publicado_data_idx" ON "AlbumFoto"("tenant_id", "publicado", "data");

-- CreateIndex
CREATE INDEX "FotoAlbum_album_id_ordem_idx" ON "FotoAlbum"("album_id", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "FotoAlbum_album_id_origem_key" ON "FotoAlbum"("album_id", "origem");

-- AddForeignKey
ALTER TABLE "AlbumFoto" ADD CONSTRAINT "AlbumFoto_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumFoto" ADD CONSTRAINT "AlbumFoto_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "Evento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FotoAlbum" ADD CONSTRAINT "FotoAlbum_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "AlbumFoto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
