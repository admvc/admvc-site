-- Fase B (17/10): departamentos com escala vs. grupos de apoio. Só ACRESCENTA um campo e acerta nomes.
-- Os grupos de apoio (Acolhimento, Ação Social, Cantina, Evangelismo) continuam a ser departamentos
-- (os módulos decidem as permissões por eles), mas deixam de ter escala e aparecem como grupos.

ALTER TABLE "Departamento" ADD COLUMN "tem_escala" BOOLEAN NOT NULL DEFAULT true;

UPDATE "Departamento" SET "tem_escala" = false
WHERE "nome" IN ('Evangelismo e Missões', 'Acolhimento e Integração', 'Ação Social', 'Cantina');

-- Diaconia passa a chamar-se Obreiros (só se ainda não existir um com esse nome na mesma casa)
UPDATE "Departamento" d SET "nome" = 'Ministério dos Obreiros'
WHERE d."nome" = 'Ministério de Diaconia'
  AND NOT EXISTS (SELECT 1 FROM "Departamento" x WHERE x."nome" = 'Ministério dos Obreiros'
                  AND x."tenant_id" = d."tenant_id" AND x."congregacaoId" IS NOT DISTINCT FROM d."congregacaoId");

-- A "Diaconia" duplicada: apaga-se SÓ se não tiver nada ligado
DELETE FROM "Departamento" d
WHERE d."nome" = 'Diaconia'
  AND NOT EXISTS (SELECT 1 FROM "IntegranteDepartamento" WHERE "departamento_id" = d."id")
  AND NOT EXISTS (SELECT 1 FROM "InteresseDepartamento" WHERE "departamento_id" = d."id")
  AND NOT EXISTS (SELECT 1 FROM "Grupo" WHERE "departamento_id" = d."id")
  AND NOT EXISTS (SELECT 1 FROM "Escala" WHERE "departamento_id" = d."id")
  AND NOT EXISTS (SELECT 1 FROM "FuncaoDepartamento" WHERE "departamento_id" = d."id")
  AND NOT EXISTS (SELECT 1 FROM "AvisoMural" WHERE "departamento_id" = d."id")
  AND NOT EXISTS (SELECT 1 FROM "inventario_itens" WHERE "dono_departamento_id" = d."id")
  AND NOT EXISTS (SELECT 1 FROM "_CompromissoDepartamentos" WHERE "B" = d."id")
  AND NOT EXISTS (SELECT 1 FROM "eventos_inscricao" WHERE "departamento_id" = d."id");
