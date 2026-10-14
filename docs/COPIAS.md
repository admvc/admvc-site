# Cópias de segurança da base de dados

Há duas, que se completam:

- **Na app** (Super Admin → Cópia de segurança): descarregar e restaurar a qualquer
  momento, como no Ateliê. É a do dia a dia.
- **No GitHub** (mais abaixo): uma cópia `pg_dump` cifrada, feita sozinha. É a rede de
  segurança se a app não abrir.

## Na app (Super Admin → Cópia de segurança)

Só um Super Admin com o papel **ADMIN**. Cada descarga e cada restauro ficam no registo do
Super Admin (`DESCARREGAR_COPIA`, `RESTAURAR_COPIA`).

**Descarregar cópia**: um `.json` com todas as tabelas de todas as igrejas, mais as tabelas
escondidas dos muitos-para-muitos (`_LideresGrupo`…). Não leva palavras-passe, tokens nem
os avisos no telemóvel (`push_subscription`); qualquer campo novo com `password`, `senha`,
`hash`, `token` ou `secret` no nome também fica de fora sozinho. Tem dados pessoais (RGPD):
guardar num sítio seguro.

**Restaurar**, em dois passos:

1. Escolher o ficheiro: a app mostra, por tabela, quantas linhas há agora e quantas ficam,
   e o que foi criado depois da cópia (perde-se). Recusa ficheiros que não sejam desta app,
   com dados de tabelas que já não existem, ou sem campos que hoje são obrigatórios.
2. Escrever **RESTAURAR**. A app grava primeiro uma cópia do que há agora (Blob privado,
   pasta `copias/`; sem ela não restaura) e depois substitui tudo numa só transação: ou fica
   tudo como na cópia, ou fica tudo como estava. As cópias gravadas assim aparecem em
   "Cópias guardadas pela app" e descarregam-se dali: um restauro errado desfaz-se com elas.

O restauro **não mexe** em:

- **Super Admins** e o seu registo;
- **registo de alterações** (`AuditLog`): fica, menos o de igrejas que não existem na cópia;
- **palavras-passe, tokens e avisos no telemóvel**: quem existe hoje fica com os seus; quem
  só existe na cópia entra com "Esqueci-me da palavra-passe".

As tabelas e a ordem saem do próprio schema (`tools/gerador-modelo.mjs` escreve
`generated/modelo.ts` em cada `prisma generate`): uma tabela nova entra na cópia sem
ninguém se lembrar dela. Limite pela app: ficheiros até ~9,5 MB; acima disso, a cópia do
GitHub.

Código: `lib/copia/` (gerar, restaurar, guardadas, acesso), `actions/copia-actions.ts`,
`app/super-admin/copia/`. Testes: `lib/__tests__/copia.test.ts` e
`tests/integracao/copia.test.ts` (com `COPIAS_PASTA_LOCAL`, as cópias de antes vão para uma
pasta local em vez do Blob de produção).

## No GitHub

O GitHub faz uma cópia da base (`pg_dump`), confirma que se restaura, cifra-a e guarda-a
como artefacto do repositório. Workflow: `.github/workflows/copia-base.yml`.

### Configurar (uma vez)

No GitHub: **Settings → Secrets and variables → Actions**.

**Secrets**

| Nome | Valor |
|---|---|
| `DATABASE_URL` | A mesma ligação direta à base que está no Vercel (`postgres://…db.prisma.io…`). |
| `BACKUP_PASSPHRASE` | Uma frase-passe longa (20 ou mais caracteres). **Guarde-a no gestor de senhas: sem ela, as cópias não se abrem.** |

**Variables** (opcionais)

| Nome | Valores | Por omissão |
|---|---|---|
| `BACKUP_PERIODICIDADE` | `mensal` (dia 1) · `semanal` (domingo) · `diaria` | `mensal` |
| `BACKUP_RETENCAO_DIAS` | Dias que cada cópia fica guardada (1 a 90). | `90` |

Para **mudar a periodicidade**, basta mudar `BACKUP_PERIODICIDADE`; o código não muda.

**O agendamento vem desligado** no workflow (linhas `schedule` comentadas). Depois de
configurar os segredos, tirar o `#` dessas duas linhas e fazer **Actions → Copia da base →
Run workflow**, para fazer a primeira
cópia e confirmar que tudo funciona.

### O que cada cópia faz

1. `pg_dump` da base inteira.
2. Restaura-a num PostgreSQL descartável e compara o número de linhas de `membros`,
   `Tenant`, `visitantes` e `escalas` com a base real. Se não bater certo, falha.
   (Se alguém se registar no próprio segundo da cópia, a comparação pode falhar: basta
   repetir.)
3. Cifra com AES-256 e a frase-passe.
4. Guarda o ficheiro `copia-admvc-AAAA-MM-DD.dump.gpg` como artefacto.

Se alguma coisa falhar, o GitHub envia um email a quem tem notificações de Actions
ligadas (por omissão, o dono do repositório).

### Restaurar

1. **Actions → Copia da base →** a execução pretendida **→ Artifacts**: descarregar e
   descompactar.
2. Decifrar:
   ```
   gpg --decrypt --output copia.dump copia-admvc-AAAA-MM-DD.dump.gpg
   ```
3. Restaurar numa base **vazia** (nova ou de teste):
   ```
   pg_restore --no-owner --no-privileges --dbname="postgres://…base-de-destino…" copia.dump
   ```
4. Apontar o `DATABASE_URL` do Vercel para a base restaurada, se for para substituir a de produção.

Nunca restaurar por cima da base de produção com dados: restaurar sempre para uma base
nova e trocar a ligação.

### Notas

- Os dados são pessoais (RGPD): os artefactos só são visíveis a quem tem acesso ao
  repositório, e estão cifrados. Não descarregar para computadores partilhados; apagar
  `copia.dump` depois de usar.
- Num repositório **público**, o GitHub desliga os agendamentos ao fim de 60 dias sem
  atividade. Num repositório privado isso não acontece.
