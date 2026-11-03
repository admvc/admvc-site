-- Fotos: etiquetas (so Midia/administracao), reacoes de coracao e pedidos para retirar foto. 3 de novembro de 2026.
-- SO ACRESCENTA: 1 coluna opcional (bytes_mini) e 4 tabelas novas com indices e chaves estrangeiras. Nada do que existe muda.

-- AlterTable
ALTER TABLE "FotoAlbum" ADD COLUMN     "bytes_mini" INTEGER;

-- CreateTable
CREATE TABLE "foto_etiquetas" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#6b7280',
    "icone" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "esconde" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "foto_etiquetas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "foto_album_etiquetas" (
    "foto_id" INTEGER NOT NULL,
    "etiqueta_id" INTEGER NOT NULL,
    "membro_id" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "foto_album_etiquetas_pkey" PRIMARY KEY ("foto_id","etiqueta_id")
);

-- CreateTable
CREATE TABLE "foto_reacoes" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "foto_id" INTEGER NOT NULL,
    "aparelho_hash" TEXT NOT NULL,
    "ip_hash" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "foto_reacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "foto_pedidos_retirar" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "album_id" INTEGER NOT NULL,
    "foto_id" INTEGER,
    "motivo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDENTE',
    "ip_hash" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidido_em" TIMESTAMP(3),
    "decidido_por" INTEGER,

    CONSTRAINT "foto_pedidos_retirar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "foto_etiquetas_tenant_id_nome_key" ON "foto_etiquetas"("tenant_id", "nome");

-- CreateIndex
CREATE INDEX "foto_album_etiquetas_etiqueta_id_idx" ON "foto_album_etiquetas"("etiqueta_id");

-- CreateIndex
CREATE INDEX "foto_reacoes_foto_id_idx" ON "foto_reacoes"("foto_id");

-- CreateIndex
CREATE UNIQUE INDEX "foto_reacoes_foto_id_aparelho_hash_key" ON "foto_reacoes"("foto_id", "aparelho_hash");

-- CreateIndex
CREATE INDEX "foto_pedidos_retirar_tenant_id_estado_idx" ON "foto_pedidos_retirar"("tenant_id", "estado");

-- CreateIndex
CREATE INDEX "foto_pedidos_retirar_foto_id_idx" ON "foto_pedidos_retirar"("foto_id");

-- AddForeignKey
ALTER TABLE "foto_album_etiquetas" ADD CONSTRAINT "foto_album_etiquetas_foto_id_fkey" FOREIGN KEY ("foto_id") REFERENCES "FotoAlbum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foto_album_etiquetas" ADD CONSTRAINT "foto_album_etiquetas_etiqueta_id_fkey" FOREIGN KEY ("etiqueta_id") REFERENCES "foto_etiquetas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foto_reacoes" ADD CONSTRAINT "foto_reacoes_foto_id_fkey" FOREIGN KEY ("foto_id") REFERENCES "FotoAlbum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "foto_pedidos_retirar" ADD CONSTRAINT "foto_pedidos_retirar_foto_id_fkey" FOREIGN KEY ("foto_id") REFERENCES "FotoAlbum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

