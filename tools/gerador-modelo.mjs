/**
 * Gerador do Prisma: escreve `generated/modelo.ts` com as tabelas e os campos
 * do schema — o que a copia completa e o restauro precisam de saber (que
 * colunas ha, quais sao obrigatorias, que chaves estrangeiras, quais se
 * preenchem sozinhas). Igual ao do Atelie.
 *
 * No Prisma 7 o cliente ja nao traz o `Prisma.dmmf` completo; o modelo so
 * chega aos geradores. Corre em cada `prisma generate` (tambem no build da
 * Vercel), por isso nunca fica atrasado em relacao ao schema.
 *
 * Tambem lista as tabelas escondidas das relacoes muitos-para-muitos sem
 * modelo (`_LideresGrupo`, `_CargoToMembro`...): o Prisma cria-as sozinho,
 * com as colunas A e B, e nao tem acessor para elas.
 *
 * JavaScript simples de proposito: o Prisma chama-o com `node`.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import helper from '@prisma/generator-helper';

const { generatorHandler } = helper;

generatorHandler({
  onManifest: () => ({
    prettyName: 'Modelo para a copia e o restauro',
    defaultOutput: '../generated/modelo.ts',
  }),
  onGenerate: async (options) => {
    const destino = options.generator.output?.value;
    if (!destino) throw new Error('gerador-modelo: falta o output.');
    const dm = options.dmmf.datamodel;

    const modelos = dm.models.map((m) => ({
      name: m.name,
      dbName: m.dbName ?? m.name,
      fields: m.fields.map((f) => ({
        name: f.name,
        dbName: f.dbName ?? f.name,
        kind: f.kind,
        type: f.type,
        isList: f.isList,
        isRequired: f.isRequired,
        hasDefaultValue: f.hasDefaultValue,
        isUpdatedAt: Boolean(f.isUpdatedAt),
        relationFromFields: f.relationFromFields ?? [],
        // "autoincrement", "now", "uuid"... ou null para um valor fixo.
        defaultFn: f.default && typeof f.default === 'object' && 'name' in f.default ? f.default.name : null,
      })),
    }));

    // Muitos-para-muitos implicito: os dois lados sao listas e nenhum tem chave.
    // A coluna A aponta para o modelo que vem primeiro por ordem alfabetica.
    const implicitas = new Map();
    for (const m of dm.models) {
      for (const f of m.fields) {
        if (f.kind !== 'object' || !f.isList || !f.relationName) continue;
        const outro = dm.models.find((x) => x.name === f.type);
        const lado = outro?.fields.find((g) => g.relationName === f.relationName && g !== f);
        if (!lado || !lado.isList) continue;
        const [a, b] = [m.name, f.type].sort();
        implicitas.set(f.relationName, { name: `_${f.relationName}`, a, b });
      }
    }

    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(
      destino,
      [
        '// Gerado por tools/gerador-modelo.mjs em cada `prisma generate`. Nao editar.',
        '',
        'export interface CampoDoModelo {',
        '  name: string;',
        '  dbName: string;',
        "  kind: 'scalar' | 'enum' | 'object' | 'unsupported';",
        '  type: string;',
        '  isList: boolean;',
        '  isRequired: boolean;',
        '  hasDefaultValue: boolean;',
        '  isUpdatedAt: boolean;',
        '  relationFromFields: string[];',
        '  defaultFn: string | null;',
        '}',
        '',
        'export interface ModeloDaBase {',
        '  name: string;',
        '  dbName: string;',
        '  fields: CampoDoModelo[];',
        '}',
        '',
        '/** Tabela escondida de um muitos-para-muitos: colunas A (modelo `a`) e B (modelo `b`). */',
        'export interface TabelaDeLigacao {',
        '  name: string;',
        '  a: string;',
        '  b: string;',
        '}',
        '',
        `export const MODELOS: ModeloDaBase[] = ${JSON.stringify(modelos, null, 2)};`,
        '',
        `export const LIGACOES: TabelaDeLigacao[] = ${JSON.stringify([...implicitas.values()], null, 2)};`,
        '',
      ].join('\n'),
    );
  },
});
