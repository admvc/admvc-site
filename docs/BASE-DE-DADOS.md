# Base de dados: migrações e base de teste

## Migrações

Desde outubro de 2026 há **uma migração de base**, `prisma/migrations/0_base`, que cria
o schema atual inteiro. As 36 migrações antigas não recriavam a base (cerca de 35
tabelas tinham sido criadas com `db push`). Ficam em `prisma/migracoes-antigas/`, só
para consulta: o Prisma não as usa.

### Uma vez, na produção (depois do deploy desta mudança)

```
npx prisma migrate resolve --applied 0_base
```

Isto **não muda tabelas**: só regista que a `0_base` já está aplicada. A produção já
tem tudo; foi verificado com `prisma migrate diff`: "No difference detected".

### Daqui em diante

- Mudar o schema: editar `prisma/schema.prisma` e criar a migração com
  `npx prisma migrate dev --name o_que_mudou`, **na base de teste** (ver abaixo).
- Produção: `npx prisma migrate deploy`. Aplica só as migrações novas.
- **Não usar `db push` na produção.** Foi assim que as migrações deixaram de bater
  certo com a base.

## Base de teste

Fica no Supabase do Ateliê, num schema próprio, `admvc_teste`, com dados fictícios. A
produção não é tocada.

| Comando | O que faz |
|---|---|
| `npm run test:db:preparar` | Cria/atualiza as tabelas no `admvc_teste` e **apaga e volta a criar** os dados fictícios |
| `npm run dev:teste` | O portal em http://localhost:3001 com a base de teste |
| `npm run test:db` | Testes de integração (permissões, senhas, RGPD) na base de teste |
| `npm test` | Testes sem base (rápidos) |

- O `.env` precisa de `DATABASE_URL_TESTE`: a ligação do Supabase com
  `schema=admvc_teste`.
- Os scripts recusam correr se o schema não for `admvc_teste`.
- **Contas de teste** (senha `senha-de-teste-123`):
  - `admin@a.teste`, `congregation-admin@a.teste`, `leader@a.teste`,
    `finance@a.teste`, `manager@a.teste`, `user@a.teste` e `outro@a.teste`;
  - as mesmas em `@b.teste` (segunda igreja);
  - `senha-antiga@a.teste`, com a senha `admvc123`: deve ser recusada;
  - Super Admin: `sa@teste.teste`.

## Horas dos eventos (regra)

As datas/horas de cultos, eventos, escalas e compromissos estão gravadas como **hora de Lisboa
"escrita" em UTC**: um culto às 20:00 fica `20:00Z`, no verão e no inverno. Por isso:
- ao gravar: `new Date(\`${dia}T${hora}:00Z\`)` ou `setUTCHours` (nunca `setHours`);
- ao mostrar: `timeZone: 'UTC'` (nunca o fuso do browser nem `Europe/Lisbon`);
- carimbos de "quando aconteceu" (`criado_em`, pagamentos, logs) são instantes reais:
  mostram-se com `timeZone: 'Europe/Lisbon'`.

## Agenda por grupo e regras repetidas (21/10/2026)

- `agenda_departamento` guarda os encontros de uma **equipa (departamento) OU de um grupo**: `departamento_id` e
  `grupo_id` são opcionais, mas um dos dois é obrigatório (CHECK). Quem filtra encontros por `departamento_id`
  (páginas/ações da equipa) nunca vê os de grupo; as páginas pessoais (Início, Agenda, alertas) juntam os dois.
- `agenda_regras`: "toda a 1.ª segunda, 20h00, Grupo de Homens" (`alvo = ENCONTRO`) ou "toda a 3.ª quarta, culto
  direcionado aos Jovens" (`alvo = CULTO`). Gera até 3 meses à frente (`lib/agenda-regras.ts`), uma linha por regra e dia
  (`regra_id` nos encontros e nos `Evento`); o cron diário `/api/cron/agenda-regras` mantém. Não mexe no que já existe;
  um culto só se cria se não houver outro culto nessa noite (18h–22h).
- `Evento.grupo_id` = culto direcionado a um grupo (todos o veem; o grupo recebe lembrete na véspera). Em produção os
  "departamentos" da Mídia/Louvor/Obreiros/Acolhimento são departamentos do sistema; Homens, Mulheres, Casais, Jovens e
  Adolescentes, Evangelismo e Missões… são **Grupos & PGs** (mesmo que o nome comece por "Departamento de").
- Quem cria (reuniões do grupo e cultos direcionados): administração, o Pastor (cargo na ficha: `church_role` ou cargos)
  e o líder do próprio grupo; o líder só mexe no seu (`lib/agenda-grupos.ts`).
