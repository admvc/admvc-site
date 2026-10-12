# Permissões do portal

Quem pode fazer o quê, por módulo.

**Regra geral:** as páginas escondem os botões, mas **cada action volta a verificar**.
Uma action é um pedido ao servidor que qualquer pessoa com sessão pode fazer
diretamente, sem passar pela página. Até outubro de 2026, várias só verificavam a
sessão.

## Papéis

| Papel | Quem é |
|---|---|
| `ADMIN` | Administração da igreja: acesso a tudo da sua igreja. |
| `CONGREGATION_ADMIN` | Administração de uma congregação: quase tudo o que o ADMIN faz. |
| `FINANCE` | Tesouraria: finanças, recibos, despesas, orçamento. |
| `LEADER` | Líder: escalas, grupos, mensagens dos eventos. |
| `MANAGER` | (Hoje sem permissões próprias além de membro.) |
| `USER` | Membro. |
| Super Admin | Plataforma (outra sessão, outro login). |

Além dos papéis, há **equipas**. Pertence-se a uma equipa por estar, ou ser líder, num
departamento cujo nome contém certas palavras:

| Equipa | Palavras no nome do departamento | Onde está a regra |
|---|---|---|
| Assistência Social | social, despensa, assist | `lib/equipas.ts` |
| Cantina | cantina | `lib/equipas.ts` |
| Acolhimento | acolhimento, integração | `lib/acolhimento-permissions.ts` |
| Diaconia (obreiros) | diaconia, diácono, obreiro | `lib/obreiros-permissions.ts` |
| Louvor | líder do Louvor, ou integrante com "pode gerir escalas" | `lib/louvor-permissoes.ts` |
| Ensino / Pregação | admin; líderes de departamento (cursos); Diaconia com função Discipulado ou Pastor | `lib/cursos-permissoes.ts` |

## Por módulo

| Módulo | Ver | Gerir (criar, editar, apagar) | Pessoal (só o próprio) |
|---|---|---|---|
| Membros | admin | admin (`ADMIN`, `CONGREGATION_ADMIN`); anonimizar só `ADMIN` | editar o seu perfil, assinar os seus termos, descarregar os seus dados |
| Escalas | membros | admin, líder do departamento, ou integrante com "pode gerir escalas" ou função de líder | confirmar e recusar as suas escalas, as suas indisponibilidades |
| Mensagem do evento | membros | `ADMIN`, `CONGREGATION_ADMIN`, `LEADER` | — |
| Grupos | membros | admin, ou líder do grupo (encontros, horário) | — |
| Pregações e aulas EBD | membros | regra "Pregação" (admin, Diaconia com Discipulado/Pastor) | — |
| Cursos, turmas, notas | membros | regra "Ensino" (admin, líderes de departamento, Diaconia com Discipulado/Pastor) | responder às atividades, manifestar interesse |
| Louvor (repertório, cifras, músicas) | membros | equipa Louvor | — |
| Visitantes | equipa Acolhimento | contactos e agendamentos: equipa; atribuir responsável e notas de líder: líder do Acolhimento ou admin; anonimizar: admin | — |
| Obreiros | equipa Diaconia | relatório: líder ou admin | — |
| Assistência Social | equipa Social, `FINANCE`, admin | igual | — |
| Cantina (caixa, turnos, fiados, cardápio, despesas) | equipa Cantina, admin | igual; relatórios e histórico também `FINANCE` | o seu saldo e extrato (e os da família) |
| Finanças, fundos, orçamento, recibos | `ADMIN`, `CONGREGATION_ADMIN`, `FINANCE` | igual (algumas só `ADMIN` + `FINANCE`) | os seus recibos e pledges |
| Inventário | `ADMIN`, `CONGREGATION_ADMIN`, `FINANCE`, `LEADER` | igual | — |
| Mural | membros | apagar: o autor ou `ADMIN` | publicar |
| Boleias | membros | — | as suas ofertas, reservas e localização |
| Agenda (gabinete) | membros (pedir marcação) | `ADMIN`, `CONGREGATION_ADMIN`, `LEADER` | — |
| Mídia, marca, configurações | `ADMIN` | `ADMIN` | — |

**Separação entre igrejas:** todas as consultas passam pelo cliente da igreja da sessão
(`getDb()` / `getTenantClient`), que junta `tenant_id` a buscas, criações, alterações e
remoções. Um registo de outra igreja é tratado como "não encontrado".

## O que mudou em outubro de 2026 (semana 3)

- As actions passam a aplicar as mesmas regras que as páginas já usavam: pregação,
  ensino, assistência, cantina, acolhimento, obreiros, escalas e louvor.
- 13 modelos com `tenant_id` não eram filtrados pelo cliente da igreja (sermões, EBD,
  cursos, turmas, notas, cestas…). Já são, e o `upsert` também.
- `financeiro-actions` (36 sítios) e `grupo-actions` (5) usavam um `prisma` que só
  existia em desenvolvimento: **em produção essas ações falhavam**. Passaram ao cliente
  da igreja.
- Agenda: usava o cliente global (acesso a agendas de outras igrejas por id).
- Um membro deixou de poder:
  - confirmar ou recusar escalas de outros;
  - assinar termos ou documentos RGPD em nome de outros;
  - alterar o perfil de outro membro (corrigido na semana 2);
  - ver o saldo da cantina de quem não é da sua família.
- Removidas duas actions sem verificação nenhuma: uma gravava no registo do Super
  Admin, a outra estava comentada.
- Importar cifras: o servidor só vai buscar páginas `https` do CifraClub (antes
  aceitava qualquer endereço que contivesse a palavra).

## Para o dono decidir

1. **`CONGREGATION_ADMIN` nas escalas:** antes só o `ADMIN` (além dos líderes) podia
   criar escalas de qualquer departamento. Agora o admin de congregação também pode,
   como no resto do admin. Manter?
2. **Aulas da EBD** seguem a regra das pregações (como a página `/pregacao`) e não a
   dos cursos. Certo?
3. **Catálogos partilhados entre igrejas:** os **cargos** e as **músicas** não têm
   igreja. Um admin de qualquer igreja pode apagar um cargo para todas. Com uma só
   igreja não importa; se o portal for vendido a outras, passam a ser por igreja.
4. **`MANAGER`** não tem permissões próprias. Retirar o papel, ou definir para que
   serve?
5. **Mural:** qualquer membro publica para qualquer departamento ou grupo. Só para os
   seus?
