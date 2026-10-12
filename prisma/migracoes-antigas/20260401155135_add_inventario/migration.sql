-- CreateEnum
CREATE TYPE "InventarioCategoria" AS ENUM ('ELETRONICO', 'INSTRUMENTO', 'MOVEL', 'VEICULO', 'FERRAMENTA', 'VESTUARIO', 'LIVRO', 'CONSUMIVEL', 'OUTRO');

-- CreateEnum
CREATE TYPE "InventarioEstado" AS ENUM ('OTIMO', 'BOM', 'REGULAR', 'DANIFICADO', 'INUTILIZAVEL');

-- CreateEnum
CREATE TYPE "MovimentoTipo" AS ENUM ('ENTRADA', 'SAIDA', 'EMPRESTIMO', 'DEVOLUCAO', 'MANUTENCAO', 'RETORNO_MANUTENCAO', 'TRANSFERENCIA', 'AJUSTE');

-- CreateTable
CREATE TABLE "inventario_itens" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "categoria" "InventarioCategoria" NOT NULL DEFAULT 'OUTRO',
    "estado" "InventarioEstado" NOT NULL DEFAULT 'BOM',
    "numero_serie" TEXT,
    "codigo_patrimonio" TEXT,
    "marca" TEXT,
    "modelo" TEXT,
    "cor" TEXT,
    "quantidade_total" INTEGER NOT NULL DEFAULT 1,
    "quantidade_disponivel" INTEGER NOT NULL DEFAULT 1,
    "data_aquisicao" TIMESTAMP(3),
    "valor_aquisicao" DOUBLE PRECISION,
    "fornecedor" TEXT,
    "nota_fiscal" TEXT,
    "tem_garantia" BOOLEAN NOT NULL DEFAULT false,
    "garantia_validade" TIMESTAMP(3),
    "garantia_info" TEXT,
    "localizacao" TEXT,
    "foto_url" TEXT,
    "dono_tipo" TEXT,
    "dono_departamento_id" INTEGER,
    "dono_grupo_id" INTEGER,
    "dono_membro_id" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventario_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventario_movimentos" (
    "id" SERIAL NOT NULL,
    "item_id" INTEGER NOT NULL,
    "tipo" "MovimentoTipo" NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responsavel" TEXT,
    "destino" TEXT,
    "data_retorno_prevista" TIMESTAMP(3),
    "data_retorno_real" TIMESTAMP(3),
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventario_movimentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventario_itens_codigo_patrimonio_key" ON "inventario_itens"("codigo_patrimonio");

-- CreateIndex
CREATE INDEX "inventario_itens_tenant_id_idx" ON "inventario_itens"("tenant_id");

-- CreateIndex
CREATE INDEX "inventario_itens_categoria_idx" ON "inventario_itens"("categoria");

-- CreateIndex
CREATE INDEX "inventario_itens_dono_departamento_id_idx" ON "inventario_itens"("dono_departamento_id");

-- CreateIndex
CREATE INDEX "inventario_itens_dono_grupo_id_idx" ON "inventario_itens"("dono_grupo_id");

-- CreateIndex
CREATE INDEX "inventario_itens_dono_membro_id_idx" ON "inventario_itens"("dono_membro_id");

-- CreateIndex
CREATE INDEX "inventario_movimentos_item_id_idx" ON "inventario_movimentos"("item_id");

-- AddForeignKey
ALTER TABLE "inventario_itens" ADD CONSTRAINT "inventario_itens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_itens" ADD CONSTRAINT "inventario_itens_dono_departamento_id_fkey" FOREIGN KEY ("dono_departamento_id") REFERENCES "Departamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_itens" ADD CONSTRAINT "inventario_itens_dono_grupo_id_fkey" FOREIGN KEY ("dono_grupo_id") REFERENCES "Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_itens" ADD CONSTRAINT "inventario_itens_dono_membro_id_fkey" FOREIGN KEY ("dono_membro_id") REFERENCES "membros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario_movimentos" ADD CONSTRAINT "inventario_movimentos_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventario_itens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
