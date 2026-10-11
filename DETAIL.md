# ADMVC Cloud — Documentacao Detalhada

Descricao completa de cada modulo, funcionalidade e componente da plataforma.

---

## 1. AUTENTICACAO E SESSAO

### Login (`/membros/login`)
- Formulario de email + password
- Hash com bcryptjs, sessao via cookie `admvc_session`
- Cookie contem: `id`, `role`, `tenant_id`, `plano`, `cong` (congregacao)
- Rate limiting: 5 tentativas por email, 15 por IP a cada 15 minutos (Upstash Redis)
- Rate limiter fail-open: se Redis estiver indisponivel, login funciona sem rate limit
- Apos login, redireciona por role: ADMIN → `/admin/dashboard`, outros → `/membros/dashboard`

### Super-Admin (`/super-admin/login`)
- Tabela `SuperAdmin` separada (sem tenant_id)
- Cookie proprio `admvc_sa_session`
- Rate limiting: 5 tentativas por IP a cada 60 segundos (in-memory)
- Acesso a gestao de todas as igrejas e modulos

### Middleware (`middleware.ts`)
- Extrai dados do cookie e injeta headers para server components
- Protege rotas por role (ADMIN para `/admin/*`)
- Verifica modulos do plano e bloqueia rotas nao incluidas

---

## 2. PAINEL DO MEMBRO (`/membros/dashboard`)

### Header Mobile
- **Avatar + nome** do membro (nao clicavel — edicao via engrenagem)
- **Sino** (bell): notificacoes de acolhimento e mural
- **Engrenagem** (settings): dropdown com:
  - "Editar Perfil" → abre DrawerEditarPerfil
  - "Indisponibilidades" → abre ModalIndisponibilidade (so se membro tem departamento)
  - "Alto Contraste" → toggle de modo alto contraste
- **Logout** (vermelho)

### Dashboard Mobile — Grelha de Icones (3 colunas)
- **Versiculo do Dia**: rotacao de 31 versiculos + QR Code do membro
- **Banner POS Cantina**: aparece se membro esta escalado na cantina hoje
- **Onde Eu Sirvo** (full-width, condicional): so visivel se membro pertence a algum departamento
- **Grelha 3x3**: Agenda, Boleia, Cursos, Cantina, Contribua, Ministerios, Oracoes, Redes Sociais, Extrato
- **Devocional** (full-width): versiculo em destaque com botao partilhar WhatsApp
- Icones ampliados (28px) e texto legivel (text-[10px]) para melhor visibilidade mobile
- Ministerios desabilitado (opacity) se membro nao tem departamento

### Modais Mobile
- **Onde Eu Sirvo**: bottom sheet com CardDepartamentoMembro (equipa, funcoes, contactos)
- **Ministerios**: escalas do membro + departamentos com equipa
- **Agenda**: proximos eventos com detalhe expandivel e partilha WhatsApp
- **Redes Sociais**: links Instagram, Facebook, YouTube, Website (configurados na personalizacao)
- **Cursos**: cursos activos com inscricao

### Desktop (Tab Home)
- **Minhas Escalas**: cards dos proximos eventos com confirmacao/recusa
- **Setlist Palco**: botao fullscreen para musicos do louvor
- **Agenda da Igreja**: proximos eventos com fontes ampliadas
- **Aniversariantes do Mes**
- **YouTube e Instagram widgets** (se configurados)

### Financas (acessivel via menu ou icone Extrato)
- **Contribuicoes**: objectivos financeiros e historico
- **Cantina**: saldo, carregamentos e extrato
- **Extrato financeiro**: impressao via browser (PDF)

---

## 3. PAINEL ADMINISTRATIVO (`/admin/*`)

### Sidebar
- Menu lateral collapsible com navegacao por seccoes: Igreja, Modulos, Sistema
- Logo da igreja (se configurado) no topo
- Filtro de congregacao (dropdown) para admins com multiplas sedes
- Menu mobile com hamburger + drawer animado
- CONGREGATION_ADMIN ve apenas a sua congregacao (dropdown bloqueado)
- **Breadcrumbs** em todas as paginas admin (Configuracoes, Congregacoes, Escalas, Eventos, Familias, Inventario, Membros, Midia, Personalizacao, Relatorios)
- Try/catch no layout: se DB falhar, sidebar degrada sem crash

### Dashboard (`/admin/dashboard`)
- KPIs: membros activos, familias, batizados, escalas pendentes, aprovacoes
- Proximos eventos com contagem de escalados e mensagem do evento
- Aniversariantes do mes
- Alerta de documentos pendentes (GDPR/Permanecer) com botao de renovacao
- Painel Holyrics (se configurado)

### Gestao de Membros (`/admin/membros`)
- Lista com filtros: status, role, cidade, genero, compliance, familia
- Ordenacao por qualquer coluna (nome, email, cidade, etc.)
- Vista tabela ou cards
- Pesquisa por nome, email, telefone, cidade, cargo
- Paginacao configuravel (10, 25, 50, 100, todos)
- **Imprimir**: cartoes de membro (PDF credit-card) e lista completa (PDF A4) — lazy loaded
- **Importar/Exportar CSV**: analise previa, validacao, skip duplicados

### Cadastrar Membro (`/admin/membros/cadastro`)
- Formulario em 4 passos: Dados Pessoais, Morada, Eclesiastico, Familia e Legal
- Codigo postal portugues com auto-preenchimento (API geoapi.pt)
- Upload de foto (Vercel Blob) com Image sizes optimizado
- Validacao de email unico

### Visualizar Membro (`/admin/membros/visualizar/[id]`)
- 5 abas: Perfil, Morada, Familia, Eclesiastico, Servico
- Campos: phone_2, data_admissao, aprovado_por, congregacao, parentesco
- Status documental (GDPR e Permanecer) com validade

### Familias (`/admin/familias`)
- Agrupamento de membros por familia
- Pesquisa por nome de familia ou membro
- Criar nova familia e vincular membros

### Congregacoes (`/admin/congregacoes`)
- Criar/editar congregacoes (nome, cidade, endereco)
- Associar membros a congregacoes (individual ou em massa)

---

## 4. ESTRUTURA DA IGREJA (`/admin/configuracoes`)

### Departamentos
- Criar departamento com congregacao (local ou global)
- Mesmo nome permitido em congregacoes diferentes (ex: "Louvor Leiria" e "Louvor Barcelos")
- **Painel de gestao** (modal com 3 abas):
  - **Equipa**: vincular membros com multiplas funcoes, pesquisa, delegacao de escalas. Query otimizada com select.
  - **Cargos**: criar/remover funcoes do departamento
  - **Definicoes**: nome, lider, congregacao, notas
- Try/catch: se DB falhar, pagina carrega vazia em vez de crash
- Invalidacao Redis ao criar/excluir departamento

### Cargos Eclesiasticos
- Cargos globais (Diacono, Pastor, Evangelista, etc.)
- Criar e excluir via submenu na pagina de estrutura

### Regioes Customizadas
- Regioes personalizaveis por tenant (default: Norte, Centro, Sul, Lisboa, Online)
- Invalidacao Redis ao salvar

### Grupos / PGs
- Gestao de pequenos grupos com dia, horario, local
- Geocodificacao automatica (OpenStreetMap)
- Mapa de grupos com Leaflet (dynamic import, ssr: false)
- Publicacao no site publico (flag publico)
- **Modal Gerir Grupo** com historico de encontros colapsavel:
  - Apenas 5 encontros visiveis por default, restantes em "Ver mais"
  - Cada encontro colapsavel com `<details>` (data+tema visivel, foto+presentes ao expandir)
  - Fotos com `loading="lazy"` para evitar carregamento desnecessario
  - Registo de presencas com checklist de membros
- Invalidacao Redis ao atualizar grupo

---

## 5. ESCALAS DE SERVICO

### Admin Escalas (`/admin/escalas`)
- **Montador de escalas**: 5 passos inline (Departamento → Evento → Funcao → Membro → Horario)
- Eventos filtrados pela congregacao do departamento seleccionado
- Verificacao de indisponibilidade do membro antes de escalar
- **Calendario**: visao mensal com eventos e escalas
- **Quadro geral**: lista de escalados por evento com accoes (editar, eliminar)

### Gestao do Lider (`/escalas/gestao/[id]`)
- Mesmo montador mas pre-filtrado pelo departamento do lider
- Eventos filtrados pela congregacao do departamento
- Estatisticas: voluntarios aptos, cargos criados, proximo evento

### Criar Evento
- Modal com 2 modos: evento unico (data) ou culto regular (dia da semana + frequencia + duracao)
- Seleccao de congregacao

### Notificacoes por Email
- Quando membro confirma/recusa escala, o lider do departamento recebe email via Resend
- Template HTML dark com detalhes (nome, evento, data, funcao, motivo de recusa)

### Relatorio de Escalas
- **Admin** (`/admin/relatorios/escalas`): ranking de membros, KPIs, filtro por mes e departamento
- **Membro** (menu hamburger): relatorio pessoal por mes/ano com query otimizada (select em evento e departamento)

---

## 6. EDUCACAO (`/ensino`)

### Cursos e Formacao
- 4 categorias: EBD (escola biblica), Livre, Discipulado, Seminario
- Workflow de aprovacao: gestor cria → admin aprova → inscricoes abrem
- Agendamento de abertura de inscricoes (data/hora)
- Restricao por departamento ou grupo
- Cursos externos com link e responsavel
- **Multiplos professores por turma** (relacao M:N)

### Turmas
- Cada curso tem 1 ou mais turmas (ex: Adultos, Jovens)
- Multi-select de professores na criacao
- Matricula de alunos com workflow de interesse:
  1. Membro clica "Tenho Interesse"
  2. Gestor aprova e atribui turma
  3. Membro fica matriculado

### Aulas (Escola Biblica)
- Titulo, tema, data, professor (por aula)
- Link da aula (Teams, YouTube, Zoom)
- Conteudo detalhado e material de apoio
- Perguntas de discussao
- Ligacao a sermao (opcional)

### Atividades e Notas
- 4 tipos: Exercicio, Prova, Trabalho, Participacao
- Questionarios com perguntas (escrita, multipla escolha, verdadeiro/falso)
- Auto-correcao para multipla escolha e V/F
- Notas com peso ponderado
- Privacidade: aluno ve apenas a propria nota

### Presencas e Aprovacao
- Registo de presencas por aula
- Calculo automatico de aprovacao: nota minima + presenca minima
- Status: Ativa, Inativa, Concluida
- Auto-transicao do curso para CONCLUIDO quando todas as turmas estao calculadas

### Workflow Validado
- Aprovar curso exige pelo menos 1 turma criada
- Matricular alunos so em cursos EM_CURSO
- Manifestar interesse so em cursos EM_CURSO (nao PLANEADOS)
- Aprovar interesse valida que a turma pertence ao curso
- Membro e redireccionado para a turma correcta (mapeamento curso→turma via matricula)

---

## 7. PREGACAO (`/pregacao`)

### Sermoes
- Criacao com titulo, escritura, conteudo, pregador, evento, data
- Publicacao (rascunho/publicado)
- **Editor rico** (`/pregacao/editor/[id]`): edicao fullscreen com autosave
- Ligacao a eventos e aulas de EBD

---

## 8. LOUVOR E CIFRAS

### Holyrics (`/midia/holyrics`)
- Integracao com o software de projeccao Holyrics
- Sincronizacao de acervo musical

### Mesa de Som X32 (`/midia/mesax32`)
- Controlo remoto da mesa de som Behringer X32 via Holyrics
- Sem necessidade de proxy local

### Iluminacao Lumikit (`/midia/lumikit`)
- Controlo de cenas e dimmers de iluminacao

### Setlist / Modo Palco (`/louvor/setlist/[eventoId]`)
- Ecra fullscreen preto optimizado para palco
- Navegacao por swipe (mobile) e setas (desktop)
- Tom e BPM em destaque por musica
- Botoes de recursos: Letra, Cifra, Audio, Video (links externos)
- **Marcar como cantada** com contador
- **Wake Lock**: ecra nao apaga enquanto o musico esta no palco
- Drawer com lista completa e progresso
- **Pinch-to-zoom** na fonte + setas de navegacao no titulo

### Cifras Internas
- **Editor fullscreen**: escrever cifra com acordes entre `[colchetes]`
- **Importar do CifraClub**: colar texto copiado, converte automaticamente
  - Parser reconhece: tags `[Intro]`, `[Refrao]`, parenteses `( Cm Cm7(9) )`, acordes complexos (`Ab7M`, `Bb/Ab`, `Dsus4`, `Cm7(9)`)
  - Remove linhas `Tom:`, `Capo:`
- **Importar automatico via URL**: botao que busca a pagina do CifraClub server-side, extrai a cifra do HTML e guarda na BD (1 clique)
- **Visualizador** com 2 modos:
  - **Inline**: `[Am]Quando eu chorei`
  - **Separado**: acordes numa linha, letra na outra (modo por padrao)
- **Transposicao**: botoes +/- mudam todos os acordes (Am → Bm → Cm...)
- **Auto-scroll**: velocidade ajustavel com botoes +/- (0.3x a 5x), slider grande para palco, pausa ao tocar na tela com o dedo e retoma ao tirar
- **Pinch-to-zoom**: tamanho de fonte ajustavel por gesto
- **Navegacao entre musicas**: setas no titulo para ir para a proxima/anterior do setlist

---

## 9. ACOLHIMENTO DE VISITANTES

### Dashboard (`/departamentos/acolhimento/dashboard`)
- KPIs: novos, em contacto, atrasados (+24h), consolidados
- **Novos visitantes**: lista com WhatsApp e botao registar
- **Em acompanhamento**: lista com badges (Site/+24h), responsavel, historico
- **Consolidados**: avatares empilhados + modal com lista completa e timeline

### Ciclo de Vida
1. Visitante regista-se (formulario publico ou manual)
2. Status `NOVO` → equipa ve no dashboard e na bell de notificacoes
3. Membro do acolhimento regista contacto (WhatsApp/Chamada/Presencial)
4. Status muda para `EM_CONTACTO`
5. Apos integracao, muda para `CONSOLIDADO`

### Relatorio (`/departamentos/acolhimento/relatorio`)
- 8 KPIs com taxa de consolidacao e crescimento vs mes anterior
- Grafico de barras: visitantes por mes (ultimos 6 meses)
- Lista dos ultimos consolidados

### Notificacoes
- Bell icon no header do membro com badge animado
- Auto-refresh a cada 30 segundos
- Flash laranja pulsante quando chega visitante NOVO
- Botao "Activar Alertas" dentro do dropdown para push notifications

---

## 10. FINANCEIRO (isolado da cantina)

### Dashboard (`/departamentos/financeiro/dashboard`)
- Lancamentos com categorias e responsaveis
- Objectivos financeiros com progresso
- Rifas com numeros vendidos
- Contribuicoes e pagamentos MBWay
- **NAO inclui vendas/despesas da cantina** (separacao completa)

### Projecto Obra (`/departamentos/financeiro/obra`)
- Acompanhamento de projectos de construcao
- Etapas com progresso e orcamento

### Separacao Cantina ↔ Financeiro
- Recargas aprovadas por lideres da cantina (nao pelo financeiro)
- Despesas da cantina (DespesaCantina) separadas das da igreja (DespesaFinanceira)
- Transferencia cantina → fundo financeiro e o unico ponto de contacto (manual, com auditoria)
- P&L da cantina independente em `/cantina/relatorio-financeiro`

### Integracao Loyverse (opcional)
- Sincronizacao de saldo da cantina via API Loyverse
- Desabilitavel (sistema local como principal)

---

## 10b. BOLEIA SOLIDARIA — TRACKING GPS

### Oferta e Reserva (`/boleia`)
- Mapa Leaflet com pins dos pontos de partida (verde=vagas, cinzento=cheio)
- Recorrencia semanal automatica (cron job)
- Privacidade: morada exacta so para quem reservou
- Push notifications ao motorista (nova reserva/cancelamento)
- Captura GPS do passageiro ao reservar

### Tracking em Tempo Real (`/boleia/tracking/[ofertaId]`)
- **Tabela BoleiaTracking**: posicoes temporarias com papel (MOTORISTA/PASSAGEIRO)
- **API route `/api/boleia/tracking`**: GET posicoes ativas, POST actualizar posicao
- **Mapa Leaflet** com markers coloridos: azul (motorista), verde (passageiro), amarelo (ponto partida)
- **watchPosition**: actualizacao continua da posicao do utilizador
- **Polling a cada 7 segundos** para receber posicoes dos outros
- **Auto-fit bounds**: mapa ajusta zoom para mostrar todos os participantes
- **Distancia estimada** entre motorista e passageiro (Haversine, km/metros)
- **Botao "Iniciar Viagem"** (motorista) → push notification a todos os passageiros
- **Botao "Partilhar Localizacao"** (passageiro) → visivel no mapa do motorista
- **Botao "Parar"** → desactiva tracking e remove do mapa
- **Lista de participantes** com indicador online (verde pulsante)
- Links de tracking em `/boleia/minhas` para motorista e passageiro

---

## 11. INVENTARIO (`/admin/inventario`)

- Controlo de patrimonio e equipamentos
- Categorias, estados, garantias
- Movimentos: emprestimo, manutencao, transferencia
- Donos: departamento, grupo ou membro
- Filtro por congregacao

---

## 12. GABINETE PASTORAL (`/gabinete`)

- Agenda pastoral com compromissos
- Categorias: Cafe com Pastor, Discipulado, Reuniao de Lideranca, etc.
- Agendamento por membros (`/membros/agendar`)
- Confirmacao por email (Resend)

---

## 13. COMUNICACAO

### Mural (`/membros/mural`)
- Avisos por departamento ou grupo
- Apenas membros do departamento/grupo veem os avisos
- Autor com avatar e data

### WhatsApp Templates (`lib/whatsapp-templates.ts`)
- 6 mensagens padrao: boas-vindas, convite grupo, lembrete escala, aniversario, follow-up, permanecer
- Componente `BotaoWhatsApp` com dropdown de templates

---

## 14. PERSONALIZACAO VISUAL (`/admin/personalizacao`)

### Cores
- **Primaria**: botoes, links, destaques
- **Secundaria**: badges, hover, elementos de suporte
- **Fundo**: cor de fundo geral (claro ou escuro)
- Cores derivadas automaticamente: border, texto principal, texto muted
- Deteccao automatica claro/escuro (texto adapta-se ao fundo)
- Suporte a opacidade Tailwind (`bg-figueira/10`, `border-figueira/20`)

### Logotipo
- Upload via Vercel Blob
- Aparece na sidebar admin (desktop e mobile)

### Preview
- Mini-dashboard em tempo real: sidebar, KPIs, cards, botoes
- Actualiza instantaneamente ao mudar cores

---

## 15. SUPER-ADMIN (`/super-admin/*`)

### Gestao de Igrejas
- Criar nova igreja com tenant, admin inicial e congregacao
- Activar/desactivar modulos por igreja
- Override de modulos via `modulos_custom` (JSONB)

---

## 16. RELATORIOS

### Membros (`/admin/relatorios`)
- 11 relatorios: cargos, idade, aniversarios, sexo, estado civil, batismo, evolucao entradas, cidades, bairros, compliance GDPR, permissoes
- Modal expansivel com lista de nomes por categoria
- Link para relatorio de escalas por membro

### Escalas (`/admin/relatorios/escalas`)
- Ranking por participacao
- Filtro por mes e departamento
- Breakdown de funcoes e departamentos por membro

### Acolhimento (`/departamentos/acolhimento/relatorio`)
- KPIs + grafico mensal + lista de consolidados

### Loyverse (`/admin/relatorios/loyverse`)
- Dados de vendas e clientes da API Loyverse
- Diagnostico de correspondencia membros ↔ clientes Loyverse

---

## 17. IMPRESSAO (PDF)

### Cartao de Membro
- Layout tipo cartao de credito (85x54mm)
- Header com cor primaria, nome, cargo, contacto, data admissao, status
- Multiplos cartoes por pagina A4

### Lista de Membros
- Tabela A4 com 7 colunas
- Linhas alternadas, header/footer
- Paginacao automatica
- Respeita filtros aplicados na lista

**Nota**: Componentes PDF carregados via `React.lazy()` para nao pesar no bundle inicial.

---

## 18. DOCUMENTOS (GDPR / PERMANECER)

- Cada membro tem flags: `aceite`, `data_assinatura`, `validade` (12 meses)
- Dashboard admin mostra membros com documentos pendentes/expirados
- Botao de renovacao no modal (admin pode renovar em nome do membro)
- Membro pode assinar na pagina de termos (`/membros/termos`)

---

## 19. PWA (Progressive Web App)

- `manifest.json` com icones (fundo solido para visibilidade), cores, orientacao portrait
- Service Worker com cache network-first
- Wake Lock no modo palco e cifras
- Ecra completo sem barra do browser
- Funciona com internet lenta (cache de paginas visitadas)

---

## 20. PERFORMANCE E CACHE

### Stack de Cache (3 camadas)

| Camada | Tecnologia | TTL | Descricao |
|---|---|---|---|
| CDN | Vercel Edge | — | Assets estaticos |
| Redis | Upstash (free tier) | 60-300s | Cache aplicacional (membros, deptos, grupos, sermoes, tenant) |
| PostgreSQL | Supabase | — | Source of truth |

### Redis Cache (`lib/redis.ts` + `lib/cache.ts`)
- Client centralizado com `cached<T>(key, ttl, fn)` — fail-open
- Keys multi-tenant: `admvc:{tenantId}:{entity}`
- TTLs: membros 60s, departamentos/grupos 120s, sermoes 60s, congregacoes/tenant 300s
- Invalidacao automatica via `invalidatePrefix()` e `invalidateKey()`
- Funcoes de invalidacao por entidade: `invalidateMembros()`, `invalidateDepartamentos()`, `invalidateGrupos()`, `invalidateSermoes()`, `invalidateTenant()`

### Otimizacoes de Queries
- Connection pool `max: 2` + `idleTimeoutMillis: 20000` (serverless-friendly)
- `select` em vez de `include: true` nas queries pesadas (EQUIPA, relatorio escalas, CSV export)
- `Image` com `sizes` em todos os avatares
- Lazy load: `@react-pdf/renderer` via `React.lazy()`, `leaflet` via `next/dynamic`

### Resiliencia
- Try/catch nos layouts criticos (admin, membro) com degradacao graceful
- Error boundaries no root, /admin e /membros
- Redis fail-open: se env vars ausentes ou Redis down, site funciona sem cache

---

## 21. SEGURANCA

| Mecanismo | Implementacao |
|-----------|---------------|
| Auth | Cookie httpOnly + bcryptjs |
| Rate Limiting | Upstash Redis (login membro) + in-memory (login SA: 5/min/IP), fail-open |
| Tenant Isolation | Prisma extensions (getTenantClient) |
| Role Check | requireAuth() / requireRole() em todas as actions |
| Headers | HSTS, X-Frame-Options, nosniff, strict referrer |
| CORS | Restringido a www.igrejaadmvc.org em producao |
| Audit | AuditLog com categoria, acao, actor, alvo |
| Error Boundaries | Root, /admin, /membros |
| APIs Debug | 404 em producao |

---

## 22. VARIAVEIS DE AMBIENTE

Ver `.env.example` para a lista completa. Principais:

| Variavel | Descricao |
|----------|-----------|
| DATABASE_URL | PostgreSQL connection string |
| UPSTASH_REDIS_REST_URL | Upstash Redis URL |
| UPSTASH_REDIS_REST_TOKEN | Upstash Redis token |
| KV_REST_API_URL | Alias Vercel KV (legacy) |
| KV_REST_API_TOKEN | Alias Vercel KV (legacy) |
| RESEND_API_KEY | API key do Resend (emails) |
| BLOB_READ_WRITE_TOKEN | Token do Vercel Blob (uploads) |
| LOYVERSE_ACCESS_TOKEN | Token da API Loyverse (cantina) |

---

## 23. MODELOS DE DADOS (PRISMA)

65+ modelos organizados por area:

**Core**: Tenant, Membro, Familia, Congregacao, SuperAdmin, Escolaridade, Cargo

**Departamentos**: Departamento, IntegranteDepartamento, FuncaoDepartamento, FuncaoSelecionada

**Grupos**: Grupo, EncontroGrupo

**Eventos**: Evento, Escala, MensagemEvento, IndisponibilidadeMembro

**Louvor**: Musica (com cifra_interna), RepertorioEvento

**Financeiro**: ObjetivoFinanceiro, LancamentoFinanceiro, Contribuicao, Rifa, RifaNumero, PedidoSaldoCantina

**Visitantes**: Visitante, AcompanhamentoVisitante

**Agenda**: Agenda, Compromisso

**Projectos**: ProjetoObra, EtapaObra

**Inventario**: ItemInventario, MovimentoInventario

**Comunicacao**: AvisoMural

**Educacao**: CursoEBD, TurmaEBD (M:N professores), MatriculaEBD, AtividadeEBD, NotaEBD, EscolaBiblica, PresencaEBD, InteresseCurso

**Pregacao**: Sermao

**Boleia**: BoleiaOferta, BoleiaReserva (com lat/lng passageiro), BoleiaTracking (posicoes tempo real)

**Cantina**: CategoriaCantina, ProdutoCantina, SaldoCantina, TransacaoCantina, PedidoSaldoCantina, TurnoCantina, FiadoCantina, DespesaCantina, PreEncomendaCantina, CardapioCantina

**Auditoria**: AuditLog
