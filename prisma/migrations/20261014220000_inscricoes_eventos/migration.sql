-- Inscrições em eventos (Chá de Mulheres e seguintes). Só cria tabelas novas.
-- CreateTable
CREATE TABLE "eventos_inscricao" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "subtitulo" TEXT,
    "descricao" TEXT,
    "local" TEXT,
    "inicio" TIMESTAMP(3) NOT NULL,
    "inscricoes_ate" TIMESTAMP(3),
    "vagas" INTEGER,
    "preco_eur" DOUBLE PRECISION,
    "pagamento" TEXT,
    "precisa_confirmacao" BOOLEAN NOT NULL DEFAULT true,
    "aberto_visitantes" BOOLEAN NOT NULL DEFAULT true,
    "campos" JSONB,
    "cor_principal" TEXT NOT NULL DEFAULT '#3F6B4F',
    "cor_fundo" TEXT NOT NULL DEFAULT '#F5F1EA',
    "imagem_url" TEXT,
    "grupo_id" INTEGER,
    "departamento_id" INTEGER,
    "estado" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_inscricao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscricoes" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "evento_inscricao_id" INTEGER NOT NULL,
    "membro_id" INTEGER,
    "visitante_id" INTEGER,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "respostas" JSONB,
    "estado" TEXT NOT NULL DEFAULT 'PENDENTE',
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "pago_em" TIMESTAMP(3),
    "codigo" TEXT NOT NULL,
    "consentimento_em" TIMESTAMP(3) NOT NULL,
    "quer_contacto" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inscricoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eventos_inscricao_tenant_id_idx" ON "eventos_inscricao"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "eventos_inscricao_tenant_id_slug_key" ON "eventos_inscricao"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "inscricoes_evento_inscricao_id_idx" ON "inscricoes"("evento_inscricao_id");

-- CreateIndex
CREATE INDEX "inscricoes_tenant_id_idx" ON "inscricoes"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "inscricoes_evento_inscricao_id_codigo_key" ON "inscricoes"("evento_inscricao_id", "codigo");

-- AddForeignKey
ALTER TABLE "eventos_inscricao" ADD CONSTRAINT "eventos_inscricao_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_inscricao" ADD CONSTRAINT "eventos_inscricao_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_inscricao" ADD CONSTRAINT "eventos_inscricao_departamento_id_fkey" FOREIGN KEY ("departamento_id") REFERENCES "Departamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_evento_inscricao_id_fkey" FOREIGN KEY ("evento_inscricao_id") REFERENCES "eventos_inscricao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_visitante_id_fkey" FOREIGN KEY ("visitante_id") REFERENCES "visitantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

