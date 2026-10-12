# Cópias de segurança da base de dados

O GitHub faz uma cópia da base (`pg_dump`), confirma que se restaura, cifra-a e guarda-a
como artefacto do repositório. Workflow: `.github/workflows/copia-base.yml`.

## Configurar (uma vez)

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

## O que cada cópia faz

1. `pg_dump` da base inteira.
2. Restaura-a num PostgreSQL descartável e compara o número de linhas de `membros`,
   `Tenant`, `visitantes` e `escalas` com a base real. Se não bater certo, falha.
   (Se alguém se registar no próprio segundo da cópia, a comparação pode falhar: basta
   repetir.)
3. Cifra com AES-256 e a frase-passe.
4. Guarda o ficheiro `copia-admvc-AAAA-MM-DD.dump.gpg` como artefacto.

Se alguma coisa falhar, o GitHub envia um email a quem tem notificações de Actions
ligadas (por omissão, o dono do repositório).

## Restaurar

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

## Notas

- Os dados são pessoais (RGPD): os artefactos só são visíveis a quem tem acesso ao
  repositório, e estão cifrados. Não descarregar para computadores partilhados; apagar
  `copia.dump` depois de usar.
- Num repositório **público**, o GitHub desliga os agendamentos ao fim de 60 dias sem
  atividade. Num repositório privado isso não acontece.
