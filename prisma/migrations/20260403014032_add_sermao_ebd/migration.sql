-- CreateTable
CREATE TABLE "Sermao" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "texto_corpo" TEXT,
    "referencias_biblicas" JSONB,
    "notas_privadas" TEXT,
    "tags" JSONB,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "partilhado_whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "data_pregacao" TIMESTAMP(3) NOT NULL,
    "pregador_id" INTEGER NOT NULL,
    "evento_id" INTEGER,
    "congregacao_id" INTEGER,
    "tenant_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sermao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscolaBiblica" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tema" TEXT,
    "data" TIMESTAMP(3) NOT NULL,
    "material_apoio" TEXT,
    "perguntas_discussao" JSONB,
    "professor_id" INTEGER NOT NULL,
    "sermao_id" TEXT,
    "congregacao_id" INTEGER,
    "tenant_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EscolaBiblica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresencaEBD" (
    "id" SERIAL NOT NULL,
    "escola_biblica_id" TEXT NOT NULL,
    "membro_id" INTEGER NOT NULL,
    "presente" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PresencaEBD_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sermao_tenant_id_idx" ON "Sermao"("tenant_id");

-- CreateIndex
CREATE INDEX "Sermao_pregador_id_idx" ON "Sermao"("pregador_id");

-- CreateIndex
CREATE INDEX "EscolaBiblica_tenant_id_idx" ON "EscolaBiblica"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "PresencaEBD_escola_biblica_id_membro_id_key" ON "PresencaEBD"("escola_biblica_id", "membro_id");

-- AddForeignKey
ALTER TABLE "Sermao" ADD CONSTRAINT "Sermao_pregador_id_fkey" FOREIGN KEY ("pregador_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sermao" ADD CONSTRAINT "Sermao_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "Evento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sermao" ADD CONSTRAINT "Sermao_congregacao_id_fkey" FOREIGN KEY ("congregacao_id") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sermao" ADD CONSTRAINT "Sermao_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscolaBiblica" ADD CONSTRAINT "EscolaBiblica_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscolaBiblica" ADD CONSTRAINT "EscolaBiblica_sermao_id_fkey" FOREIGN KEY ("sermao_id") REFERENCES "Sermao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscolaBiblica" ADD CONSTRAINT "EscolaBiblica_congregacao_id_fkey" FOREIGN KEY ("congregacao_id") REFERENCES "Congregacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscolaBiblica" ADD CONSTRAINT "EscolaBiblica_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresencaEBD" ADD CONSTRAINT "PresencaEBD_escola_biblica_id_fkey" FOREIGN KEY ("escola_biblica_id") REFERENCES "EscolaBiblica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresencaEBD" ADD CONSTRAINT "PresencaEBD_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
