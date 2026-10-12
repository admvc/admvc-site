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
