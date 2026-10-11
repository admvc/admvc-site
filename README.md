# ADMVC Cloud

> **"Se muito bem-vindo, fica para sempre!"** — Plataforma multi-tenant de gestao integrada para igrejas.

## Sobre o Projecto

O **ADMVC Cloud** e uma plataforma SaaS completa para gestao de igrejas que cobre acolhimento de visitantes, gestao de membros, departamentos, escalas de servico, louvor com cifras, educacao (cursos e escola biblica), financas completas (fundos, despesas, orcamento, donativos online, recibos IRS), sistema de vendas com POS, assistencia social, boleia solidaria com tracking em tempo real, inventario e comunicacao — tudo num unico portal com acesso baseado em roles.

### Numeros

| | Quantidade |
|---|---|
| Paginas | 119+ |
| APIs REST | 21+ |
| Server Actions | 35+ ficheiros |
| Componentes React | 280+ |
| Modelos de Dados | 65+ |
| Features em Producao | 80+ |

---

## Stack Tecnologica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14+ (App Router, Server Actions) |
| Linguagem | TypeScript |
| Base de Dados | PostgreSQL (pool max=2 para serverless) |
| ORM | Prisma 7.5 (adapter pg, extensions multi-tenant) |
| Estilizacao | Tailwind CSS + Lucide Icons |
| Auth | Custom cookie-based (bcryptjs) |
| Cache | Upstash Redis (fail-open) + unstable_cache |
| Rate Limiting | In-memory (lib/rate-limit.ts) + Upstash Redis |
| Email | Resend API |
| Ficheiros | Vercel Blob Storage |
| Imagens | Sharp (compressao WebP automatica no upload) |
| PDF | @react-pdf/renderer (lazy loaded) |
| Mapas | Leaflet + React-Leaflet (dynamic import) |
| QR Code | react-qr-code (exibicao) + html5-qrcode (camera scanner) |
| Push Notifications | Web Push API (VAPID) |
| Testes | Vitest |
| Integracoes | Loyverse (opcional), Holyrics, Mesa de Som X32, Lumikit, Spotify, YouTube |

---

## Arquitectura

```
admvc-site/
├── app/
│   ├── admin/                  # Painel administrativo (com breadcrumbs)
│   │   ├── dashboard/          # Dashboard admin
│   │   ├── membros/            # CRUD membros
│   │   ├── familias/           # Gestao de familias
│   │   ├── congregacoes/       # Multi-congregacao
│   │   ├── configuracoes/      # Estrutura departamental + regioes editaveis
│   │   ├── eventos/            # Gestao de eventos (calendario + tipos)
│   │   ├── escalas/            # Atribuicao de voluntarios
│   │   ├── inventario/         # Controlo de patrimonio
│   │   ├── relatorios/         # Relatorios gerais e escalas
│   │   ├── formacao/           # Pregacao e cursos EBD
│   │   ├── personalizacao/     # Branding por igreja
│   │   ├── midia/              # Holyrics, X32, Lumikit
│   │   └── auditoria/         # Logs de auditoria
│   ├── membros/                # Portal do membro
│   │   └── dashboard/          # Dashboard redesign mobile (grelha icones)
│   ├── cantina/                # Sistema de vendas completo
│   │   ├── pos/                # Ponto de venda (POS) com QR scanner
│   │   ├── produtos/           # CRUD produtos e categorias
│   │   ├── dashboard/          # Relatorios de vendas
│   │   ├── turnos/             # Abertura/fecho de caixa
│   │   ├── cardapio/           # Cardapio do dia por evento
│   │   ├── encomendas/         # Pre-encomendas para eventos
│   │   ├── carregar/           # Recarga self-service
│   │   ├── recargas/           # Aprovacao de recargas (cantina)
│   │   ├── fiados/             # Gestao de dividas
│   │   ├── visor/              # Ecra para o cliente
│   │   ├── tv/                 # TV Wall (digital signage)
│   │   ├── menu-local/         # Menu publico
│   │   ├── despesas/           # Despesas da cantina (isoladas)
│   │   ├── relatorio-financeiro/ # P&L da cantina
│   │   └── encomendar/         # Encomenda por evento
│   ├── financeiro/             # Gestao financeira profissional
│   │   ├── fundos/             # Contabilidade por fundos
│   │   ├── despesas/           # Registo e aprovacao de despesas
│   │   ├── orcamento/          # Orcamento anual (previsto vs real)
│   │   ├── recibos/            # Recibos IRS (geracao individual e lote)
│   │   ├── relatorios/         # DRE, balancete, fluxo caixa
│   │   ├── donativos/          # Gestao de donativos online
│   │   ├── pledges/            # Promessas de contribuicao
│   │   ├── reconciliacao/      # Reconciliacao bancaria
│   │   └── exportar/           # Exportacao fiscal SAFT-PT
│   ├── doar/[slug]/            # Pagina publica de donativos (sem login)
│   ├── boleia/                 # Boleia solidaria entre membros
│   │   ├── oferecer/           # Criar oferta de boleia
│   │   ├── minhas/             # Minhas ofertas e reservas
│   │   └── tracking/[ofertaId]/ # Tracking GPS em tempo real
│   ├── boasvindas/             # Formulario publico para visitantes
│   ├── assistencia/            # Assistencia social (stock, doacoes)
│   ├── departamentos/          # Acolhimento, Cantina, Financeiro, Obreiros
│   ├── escalas/                # Gestao de escalas por lider
│   ├── ensino/                 # Cursos, turmas, EBD
│   ├── grupos/                 # Pequenos grupos / celulas (com mapa Leaflet)
│   ├── louvor/                 # Holyrics, setlist, cifras
│   ├── pregacao/               # Sermoes e pregacoes
│   ├── gabinete/               # Agenda pastoral
│   ├── midia/                  # Holyrics, Mesa de Som X32, Lumikit
│   ├── tesouraria/             # Dashboard do tesoureiro
│   ├── super-admin/            # Gestao da plataforma SaaS
│   │   ├── dashboard/          # KPIs globais e alertas
│   │   ├── igrejas/            # CRUD de tenants
│   │   ├── igrejas/[id]/modulos/ # Modulos por igreja
│   │   ├── igrejas/[id]/tema/  # Temas visuais por igreja
│   │   ├── planos/             # Visualizacao de planos
│   │   ├── billing/            # Facturacao e receita
│   │   ├── admins/             # Gestao de super-admins
│   │   ├── impersonar/         # Impersonar igrejas
│   │   ├── comunicacao/        # Avisos plataforma
│   │   ├── nova-igreja/        # Criar nova igreja + admin
│   │   └── onboarding/[id]/    # Wizard de setup
│   └── api/                    # API routes (REST + docs)
│       └── boleia/tracking/    # API de tracking GPS (polling)
├── actions/                    # Server Actions (35+ ficheiros)
├── components/                 # Componentes React (280+ ficheiros)
├── lib/                        # Utilitarios
│   ├── prisma.ts               # Cliente Prisma multi-tenant
│   ├── db.ts                   # Helper getDb() centralizado
│   ├── auth-utils.ts           # Autenticacao e roles
│   ├── planos.ts               # Sistema de planos e modulos
│   ├── audit.ts                # Sistema de auditoria centralizado
│   ├── geocode.ts              # Geocodificacao (OpenStreetMap/Nominatim)
│   ├── rate-limit.ts           # Rate limiting in-memory
│   ├── image-utils.ts          # Compressao de imagens (sharp)
│   ├── web-push.ts             # Push notifications (VAPID)
│   ├── cursos-permissoes.ts    # Permissoes do modulo EBD/Cursos
│   └── loyverse-api.ts         # Integracao Loyverse (opcional)
├── prisma/                     # Schema (65+ modelos)
├── tests/                      # Testes (Vitest)
└── public/                     # Assets + PWA + service worker
```

---

## Modulos Principais

### Gestao de Membros e Igreja
- CRUD completo de membros com perfil, foto, escolaridade, cargos
- Gestao de familias (agrupamento familiar)
- Multi-congregacao com filtro por sede
- Departamentos com funcoes, lideres, delegacao e foto de capa
- Membro em 2 departamentos com turnos diferentes (MANHA/TARDE/NOITE)

### Dashboard Mobile do Membro
- Menu engrenagem no header (Editar Perfil, Indisponibilidades)
- Grelha de icones 3 colunas: Onde Eu Sirvo, Agenda, Boleia, Cursos, Cantina, Contribua, Ministerios, Oracoes, Redes Sociais, Extrato Financeiro
- Icones e texto ampliados para melhor visibilidade mobile
- Visibilidade condicional (icones so aparecem se membro tem departamento)
- Modal Ministerios com escalas + equipa do departamento
- Seccao Devocional com versiculo do dia e partilha WhatsApp
- Fundo dark consistente em todos os modulos

### Eventos e Escalas (separados)
- **Eventos**: calendario mensal, 8 tipos com cores (Culto Regular, Especial, Rua, Convivio, Reuniao, Formacao, Missao, Outro), criacao unica ou recorrente
- **Escalas**: atribuicao de voluntarios por evento, departamento e funcao, verificacao de disponibilidade, confirmacao pelo membro

### Sistema de Vendas / Cantina (isolado do financeiro)
- POS mobile-first com bottom sheet, wake lock, modo caixa (fullscreen)
- 5 formas de pagamento: Creditos, Dinheiro, MBWay, Transferencia, Fiado
- Promocoes (ex: "2 por 5EUR") com calculo automatico
- Carteira digital por membro com saldo, recargas e extrato
- QR Code do membro (geracao + camera scanner no POS com fallback foto)
- Scanner QR: deteccao iOS, camera traseira preferencial, qrbox dinamico, fallback automatico
- Turnos de caixa (abertura/fecho com diferenca)
- Cardapio do dia por evento com quantidade disponivel
- Pre-encomendas para eventos (debita saldo, operador confirma entrega)
- Sistema de Fiado (compra a credito, liquidacao)
- Visor do cliente (segundo ecra com carrinho em tempo real via localStorage)
- TV Wall (digital signage com marquee e grelha)
- Limites parentais de consumo (diario/semanal)
- Recarga self-service (membro solicita, lider cantina aprova — isolado do financeiro)
- Extrato com botao WhatsApp + consumo dos filhos para pais
- Despesas da cantina separadas das despesas da igreja
- Transferencia cantina → fundo financeiro com auditoria
- P&L independente (receita, COGS, despesas, margem)

### Gestao Financeira Profissional (4 fases)
- **Fundos**: contabilidade por fundos (GERAL, CONSTRUCAO, MISSOES, SOCIAL, CANTINA, CUSTOM), saldo por fundo, fundos restritos, transferencias com validacao
- **Despesas**: submissao, aprovacao, rejeicao, pagamento; categorias por fundo; comprovativo; fornecedor
- **Orcamento**: anual por fundo e categoria, previsto vs real, alertas 80%/100%, barras de progresso
- **Recibos IRS**: geracao individual e em lote, PDF formatado (artigo 63 EBF), membro descarrega no dashboard
- **Relatorios**: DRE, balancete por fundo, fluxo de caixa mensal, comparativo mensal, top 10 contribuintes, export CSV e PDF
- **Donativos Online**: pagina publica /doar/[slug] (sem login), MBWay/Transferencia, anonimo, recorrente, selecao de fundo
- **Pledges**: promessas de contribuicao com acompanhamento, status (ATIVO/ATRASADO/CUMPRIDO/CANCELADO)
- **Reconciliacao Bancaria**: importar CSV (formato PT), auto-matching por valor+data, reconciliacao manual
- **Exportacao Fiscal**: CSV compativel com TOC (contribuicoes, despesas, donativos, lancamentos)
- **Extrato do membro**: impressao via browser (PDF)

### Boleia Solidaria (com Tracking GPS)
- Oferecer/reservar boleias para cultos e eventos
- Mapa Leaflet com pins dos pontos de partida
- Recorrencia semanal automatica
- Rating "obrigado" (coracao)
- Push notifications ao motorista (reserva/cancelamento)
- Privacidade: morada exacta so para quem reservou
- **Localizacao do passageiro**: captura GPS ao reservar
- **Tracking em tempo real**: pagina `/boleia/tracking/[ofertaId]`
  - Mapa Leaflet com markers coloridos (azul=motorista, verde=passageiro)
  - Actualizacao continua via `watchPosition` + polling API (7s)
  - Distancia estimada entre motorista e passageiro (km/metros)
  - Botao "Iniciar Viagem" (motorista) e "Partilhar Localizacao" (passageiro)
  - Push notification aos passageiros quando motorista inicia viagem
  - Auto-fit bounds no mapa

### Assistencia Social
- Inventario de items (ALIMENTO, HIGIENE, VESTUARIO, OUTRO)
- 4 tipos de movimento: Doacao Recebida, Entrega Familia, Entrega Entidade, Repasse Cantina
- Alertas de stock baixo
- Dashboard com stats e agrupamento por categoria

### Acolhimento de Visitantes
- Registo via formulario publico (/boasvindas)
- Status: NOVO, EM_CONTACTO, CONSOLIDADO, NAO_RETORNOU, OUTRA_IGREJA, DESISTIU
- Acompanhamento com historico
- Notificacoes push e bell icon

### Portal Super-Admin (Plataforma SaaS)
- Dashboard com KPIs globais (igrejas, membros, planos pagos, alertas de saude)
- Gestao de igrejas: criar, editar, suspender, pesquisa e filtro por plano
- **Configuracao de Planos**: visualizacao comparativa dos 4 tiers (FREE/BASIC/PRO/ENTERPRISE) com modulos e limites
- **Temas Visuais por Igreja**: 6 presets de paleta, color pickers e preview em tempo real
- Gestao de modulos por igreja (16 modulos com override custom)
- Onboarding wizard (5 steps: branding, congregacoes, departamentos, admin, checklist)
- Billing: receita mensal, historico de planos, datas de inicio/fim
- Impersonar igrejas (auditado, sessao de 2h)
- Comunicacao: avisos plataforma (INFO/ALERTA/MANUTENCAO/NOVIDADE)
- Gestao de super-admins: criar, toggle ativo, alterar role (ADMIN/SUPPORT/VIEWER), eliminar
- Rate limiting no login (5 tentativas/min por IP)
- Audit logging de todas as acoes criticas

### Louvor e Midia
- Repertorio por evento (so lideres/delegados podem gerir)
- Integracao Holyrics (projeccao)
- Mesa de Som X32 (cenas/presets)
- Lumikit (iluminacao)
- Cifras internas com transposicao, auto-scroll, pinch-to-zoom

### Educacao (EBD / Cursos)
- 4 categorias: EBD (escola biblica), Livre, Discipulado, Seminario
- Workflow completo com validacoes:
  - Criar curso (PLANEADO) → Criar turma(s) → Aprovar curso (EM_CURSO) → Inscricoes → Aulas + Presencas → Actividades + Notas → Aprovacao final (CONCLUIDO)
- Aprovacao exige pelo menos 1 turma criada
- Inscricoes so permitidas em cursos EM_CURSO
- Calculo automatico de aprovacao (nota minima + presenca minima)
- Auto-transicao para CONCLUIDO quando todas as turmas estao calculadas
- Membro redireccionado para a turma correcta (nao mais turmas[0])
- Questionarios com auto-correcao (multipla escolha, V/F)
- Curso Permanecer (auto-matricula de novos membros)

---

## Multi-Tenant

Cada igreja e um `Tenant` isolado. O `getTenantClient()` em `lib/prisma.ts` filtra automaticamente todas as queries por `tenant_id`. O helper `getDb()` em `lib/db.ts` centraliza a obtencao do cliente filtrado.

Headers injectados pelo middleware:
- `x-tenant-id` — identificador da igreja
- `x-user-id` — identificador do membro
- `x-user-role` — role do membro
- `x-congregation-id` — congregacao (opcional)

---

## Roles e Permissoes

| Role | Acesso |
|------|--------|
| `USER` | Dashboard, escalas, grupos, mural, educacao, boleia, menu cantina |
| `LEADER` | + Gestao de departamentos e escalas do seu depto |
| `FINANCE` | + Tesouraria, despesas, relatorios financeiros |
| `CONGREGATION_ADMIN` | + Admin da sua congregacao |
| `ADMIN` | + Acesso total ao painel admin |
| `SuperAdmin` | Gestao da plataforma SaaS (auth separada) |

Permissoes adicionais por departamento: Cantina (POS + recargas), Louvor (repertorio), Midia (Holyrics/X32/Lumikit), Acolhimento, Diaconia (pregacao/cursos).

---

## Sistema de Planos

| Plano | Modulos | Membros | Congregacoes |
|---|---|---|---|
| FREE | Mural | 50 | 1 |
| BASIC | + Escalas, Grupos, Acolhimento, Relatorios | 200 | 3 |
| PRO | + Financeiro, Cantina, Inventario, Pregacao, EBD, Boleia, Assistencia | Ilimitado | 10 |
| ENTERPRISE | Todos (+ Louvor, Personalizacao, Gabinete) | Ilimitado | Ilimitado |

Verificacao em 3 camadas: Middleware (Edge) → Pages (Server) → Actions (Server).

---

## Desktop UX

- **Breadcrumbs**: navegacao consistente em todas as paginas admin
- **Tipografia responsiva**: textos escalam via breakpoints `md:`
- **Icones padronizados**: 14px navegacao, 18px cards, 10px badges
- **Containers**: `max-w-6xl` padrao, `max-w-7xl` para tabelas
- **Padding responsivo**: `px-4 sm:px-6 lg:px-8`
- **Hover states**: `hover:border-figueira/30 hover:-translate-y-0.5`
- **Tooltips**: em botoes icon-only

---

## Seguranca

- Auth checks em ~150+ server actions (`requireAuth()` / `requireRole()`)
- Rate limiting: login Super Admin (5/min por IP), APIs publicas (5/min visitante, 30/min leitura)
- Tenant isolation via Prisma extensions (PROTECTED_MODELS)
- Super-Admin isolado (cookie, tabela e login proprios)
- Headers: HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy
- CORS restringido em producao
- Error boundaries no root, /admin e /membros
- Audit logging centralizado (lib/audit.ts) com categoria, acao, actor, alvo
- Validacao de data passada na agenda pastoral
- Compressao de imagens no upload (previne ficheiros grandes)

---

## PWA (Progressive Web App)

- Service Worker com cache e fallback offline
- Pagina offline com design dark theme
- Instalar: Android (Chrome > Menu > "Adicionar ao ecra inicial"), iPhone (Safari > Partilhar)
- Wake Lock no POS e modo palco (ecra nao desliga)
- Manifesto com cores da marca

---

## API Documentacao

`GET /api/docs` retorna JSON com todos os endpoints publicos e autenticados.

Rotas publicas:
- `GET /api/public/obra` — dados da campanha de construcao
- `GET /api/public/grupos` — lista de grupos publicos
- `POST /api/public/visitante` — registar visitante
- `GET /api/boleia/tracking` — posicoes de tracking (autenticado)
- `POST /api/boleia/tracking` — actualizar posicao (autenticado)
- `GET /doar/[slug]` — pagina publica de donativos

---

## Configuracao

```bash
# 1. Copiar variaveis de ambiente
cp .env.example .env

# 2. Instalar dependencias
npm install

# 3. Gerar cliente Prisma
npx prisma generate

# 4. Sincronizar base de dados
npx prisma db push

# 5. Popular com dados iniciais
npm run db:fresh

# 6. Iniciar em desenvolvimento
npm run dev

# 7. Correr testes
npm test
```

### Credenciais de Teste (seed)

| Tipo | Email | Password |
|------|-------|----------|
| Super Admin | sa@admvc.com | superadmin123 |
| Admin Igreja | admin@admvc.com | admin123 |

---

## Deploys

| Ambiente | URL | Branch |
|----------|-----|--------|
| Producao | app.igrejaadmvc.org | main |
| Site Publico | www.igrejaadmvc.org | admvc-website (repo separado) |

Deploy via Vercel CLI: `vercel --prod`

---

## Versao

**v2.7.0** — Abril 2026

---

## Licenca

Software de propriedade e uso exclusivo da Igreja Assembleia de Deus — Ministerio Visao de Conquista (ADMVC).
