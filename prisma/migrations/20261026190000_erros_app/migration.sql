-- 26/10/2026 · Registo dos erros da app (ecrã "Algo correu mal" no telemóvel e erros do servidor), visto no Cloud em /super-admin/erros. Só ACRESCENTA uma tabela nova; pode correr duas vezes.

CREATE TABLE IF NOT EXISTS "erros_app" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "stack" TEXT,
    "digest" TEXT,
    "url" TEXT,
    "user_agent" TEXT,
    "tenant_id" INTEGER,
    "membro_id" INTEGER,
    "membro_nome" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "erros_app_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "erros_app_criado_em_idx" ON "erros_app"("criado_em");
CREATE INDEX IF NOT EXISTS "erros_app_digest_idx" ON "erros_app"("digest");
CREATE INDEX IF NOT EXISTS "erros_app_membro_id_idx" ON "erros_app"("membro_id");
