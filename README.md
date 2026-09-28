# Airton Artus Digital

Plataforma web completa para **gestão da campanha** de Airton Artus — apoiadores, voluntários, mobilização de rua, faixas, mídia kit, mapa político, CRM de atendimento, disparos, demandas da população, relatórios e painel de TV.

> Candidato: **Airton Artus** · Candidato a Deputado Estadual · RS · PDT
> Base: **Venâncio Aires / Vale do Taquari** · médico, ex-prefeito (2009–2016) e deputado estadual (2023–2026)
> Identidade visual: **navy `#1B1D39` + ouro `#E8AF3C` + faixa tricolor do RS** (verde `#398254` · vermelho `#BD2E2F` · ouro), tipografia display Anton.

---

## Stack

| Camada        | Tecnologia                                              |
| ------------- | ------------------------------------------------------- |
| Front-end     | **React 18** + Vite + React Router + Recharts + Leaflet |
| Back-end      | **Node.js + Express** (ESM)                             |
| Banco         | **PostgreSQL**                                          |
| ORM           | **Prisma**                                              |
| Autenticação  | **JWT** + bcrypt                                        |
| Upload        | **Vercel Blob** em produção · local (multer) em dev     |
| Mapa          | **Leaflet** + CartoDB (Google Maps opcional)            |
| Integrações   | Arquitetura pronta p/ **WhatsApp Oficial, Instagram, Messenger, SMS** |

---

## Estrutura de pastas

```
airton-artus-digital/
├── docker-compose.yml        # PostgreSQL pronto p/ desenvolvimento
├── package.json              # scripts orquestradores (setup, dev)
├── vercel.json               # build + rewrites + cron (produção Vercel)
├── api/index.mjs             # função serverless que serve a API Express
├── README.md
├── ARQUITETURA.md            # visão de arquitetura detalhada
│
├── backend/
│   ├── prisma/ (schema.prisma · seed.js · bootstrap-prod.mjs)
│   └── src/ (config · middlewares · utils · services · controllers · routes · app.js · server.js)
│
└── frontend/
    ├── public/ (candidato.jpg · img/ · marca.svg · favicon.svg · ícones PWA)
    └── src/ (api · context · components · config · lib · pages · styles)
```

---

## Como rodar localmente

### Pré-requisitos
- **Node.js 18+**
- **Docker** (para o PostgreSQL) — ou um PostgreSQL local

### Passo a passo
```bash
# 1. Variáveis de ambiente (os defaults já casam com o docker-compose)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env   # opcional

# 2. Instala o orquestrador (concurrently) na raiz
npm install

# 3. Instala back + front, sobe o Postgres, cria as tabelas e popula os dados
npm run setup

# 4. Sobe back-end (:4000) e front-end (:5173) juntos
npm run dev
```
Acesse **http://localhost:5173** (login) ou **http://localhost:5173/lp** (landing page pública).

> Sem Docker? Aponte `DATABASE_URL` no `backend/.env` para o seu PostgreSQL e rode `npm run prisma:migrate && npm run seed`.
> **macOS (Homebrew):** se o Postgres não iniciar, exporte `LC_ALL=C LANG=C` antes de subir o serviço.

### Acesso inicial (seed de desenvolvimento)

| Perfil            | E-mail                          | Senha       |
| ----------------- | ------------------------------- | ----------- |
| **Líder**         | `admin@airtonartus.com.br`      | `Admin@123` |
| Coordenação Vale  | `vale@airtonartus.com.br`       | `Admin@123` |
| Coordenação Metro | `metro@airtonartus.com.br`      | `Admin@123` |
| Supervisão        | `supervisao@airtonartus.com.br` | `Admin@123` |
| Parceiro          | `parceiro@airtonartus.com.br`   | `Admin@123` |
| Marketing         | `marketing@airtonartus.com.br`  | `Admin@123` |
| Materiais         | `materiais@airtonartus.com.br`  | `Admin@123` |
| Atendimento       | `atendimento@airtonartus.com.br`| `Admin@123` |

> ⚠️ O `seed.js` cria **dados fictícios de demonstração** e **apaga a base** — é só para dev.
> Em produção use `npm --prefix backend run bootstrap:prod` (idempotente, só dados de referência + admin).

---

## Imagens da campanha
- `frontend/public/candidato.jpg` — retrato oficial (login, sidebar e LP).
- `frontend/public/img/` — fotos reais usadas na landing (hero, saúde, mobilização, proximidade, escuta, família).
- `frontend/public/marca.svg` / `favicon.svg` — monograma "A" com a faixa tricolor.
- Para trocar qualquer foto, substitua o arquivo mantendo o nome (o CSS/JSX já referencia).

---

## Módulos
Autenticação · Dashboard · Apoiadores & Voluntários (antifraude) · Confirmação automática (WhatsApp) · CRM de comunicação · Mural · Mídia Kit · Engajamento (pontuação/ranking) · Pedidos de material (anti-desperdício) · Faixas · Mapa político · Ações de rua · Agenda · Disparador · Automações · Demandas (Kanban) · Relatórios · Painel TV · Configurações · **Landing Page pública** (`/lp`).

## Privacidade / LGPD (exigência Play Store & App Store)

- **Páginas legais públicas** (estáticas, servidas antes do rewrite do SPA): `/legal/politica-de-privacidade.html`, `/legal/termos-de-uso.html`, `/legal/excluir-conta.html`, `/legal/excluir-dados.html`. Fonte em `docs/legal/*.md` — edite o `.md` e rode `node docs/legal/build-html.mjs` pra regenerar.
- **Exclusão de conta (usuário logado):** ícone "Excluir minha conta" no topo do painel → confirma com senha → `DELETE /api/auth/me` (bloqueia o último Líder ativo; sessões morrem na hora).
- **Exclusão de dados do apoiador (sem login):** página pública **`/excluir-dados`** — telefone → código de 6 dígitos no WhatsApp do próprio número → exclusão imediata (`/api/public/data-deletion/request|confirm`). Também funciona 100% pelo WhatsApp: **"EXCLUIR MEUS DADOS"** → código → confirmação.
- **Opt-out de mensagens:** responder **"SAIR"** (ou parar/cancelar/descadastrar) marca `optOutAt` — automações e disparos pulam o contato dali em diante.
- A exclusão remove/anonimiza também as cópias de PII (conversas, contatos de disparo, faixas, logs de automação) e registra trilha em `AuditLog` com telefone mascarado — ver `backend/src/services/privacy.service.js`.
- **Consentimento LGPD destacado** (checkbox obrigatório) nos formulários públicos da LP — apoio político é dado sensível (LGPD art. 5º, II / art. 11).

---

## Integrações futuras
WhatsApp Cloud API (oficial), Instagram Direct, Messenger e SMS passam pelo roteador `services/messaging.service.js` (provider pattern). Tudo **simulado** por padrão — basta preencher credenciais no `.env` e trocar `WHATSAPP_PROVIDER=meta_cloud`. Detalhes em **[ARQUITETURA.md](ARQUITETURA.md)**.

> ⚖️ Conectar apenas APIs **oficiais/autorizadas**, em conformidade com a legislação eleitoral e a LGPD. Enquanto durar a **campanha**, o material público não deve conter pedido explícito de voto.

---

## Operação em produção (runbook)

**Infra (atual): Railway** — projeto `airton-artus-digital` (workspace VAI TECNOLOGIA):

| Serviço | O que é | URL |
|---|---|---|
| `api` | Express + Prisma (deploy da pasta `backend/`), volume de 5 GB em `/app/uploads` | https://api-production-e419.up.railway.app |
| `web` | Frontend Vite estático (deploy da pasta `frontend/`, SPA fallback) | https://web-production-3d52.up.railway.app |
| `Postgres` | Banco de produção | interno (`DATABASE_URL` referenciada pela api) |
| `cron-automations` | Cron diário 09:00 BRT (imagem `curlimages/curl`) → `GET /api/cron/automations` | — |

### Deploy (Railway)

```bash
# backend (rodar na raiz do repo)
railway up ./backend --path-as-root --service api --ci -m "descrição"

# frontend
railway up ./frontend --path-as-root --service web --ci -m "descrição"
```

> Alterou o schema do Prisma? Rode antes do deploy:
> `APP_DATABASE_URL=<DATABASE_PUBLIC_URL do Postgres> npx prisma db push` (na pasta `backend/`).

Variáveis já configuradas na `api`: `APP_DATABASE_URL`/`APP_DIRECT_URL` (referência ao Postgres), `JWT_SECRET`, `CRON_SECRET`, `NODE_ENV`, `UPLOAD_DRIVER=local` + `UPLOAD_PERSISTENT=1` (volume), `CORS_ORIGIN`, `PUBLIC_URL`. Na `web`: `VITE_API_URL`, `RAILPACK_SPA_OUTPUT_DIR=dist`, `NPM_CONFIG_PRODUCTION=false`.

Webhook do WhatsApp (Meta Cloud API): `https://api-production-e419.up.railway.app/api/whatsapp/webhook`.

---

### Deploy alternativo (Vercel — legado)

**Infra:** Vercel (frontend estático + API Express serverless via `api/index.mjs`) · Postgres Neon · Vercel Blob para uploads.

```bash
vercel --prod            # deploy manual (raiz do repo, projeto airton-artus)
```

### Variáveis de ambiente (produção)

| Var | Função |
|---|---|
| `APP_DATABASE_URL` / `APP_DIRECT_URL` | Postgres Neon (pooled / direto) |
| `JWT_SECRET` | Assinatura dos tokens (openssl rand -base64 48) |
| `UPLOAD_DRIVER` | `blob` em produção (Vercel Blob) |
| `BLOB_READ_WRITE_TOKEN` | Token do Blob store |
| `CRON_SECRET` | Protege `/api/cron/*` (Vercel envia como Bearer) |
| `RESEND_API_KEY` / `EMAIL_FROM` | E-mail transacional (reset de senha) — opcional |
| `WHATSAPP_PROVIDER` + `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp real (Meta Cloud API) — inicia `simulado` |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps no /mapa (fallback: CartoDB) — opcional |

### Cron de automações

`vercel.json` agenda `GET /api/cron/automations` **diariamente às 09:00 BRT** (12:00 UTC). O endpoint exige `Authorization: Bearer ${CRON_SECRET}`.

- `ANIVERSARIO`: roda todo dia para aniversariantes do dia.
- Demais tipos: disparam quando `triggerDate` = hoje.
- Idempotente (não repete destinatário no mesmo dia) · máx. 100 envios/execução.
- Execução manual: `curl -H "Authorization: Bearer $CRON_SECRET" https://<prod>/api/cron/automations`

### Bootstrap de dados de referência (produção)

```bash
APP_DATABASE_URL=... ADMIN_PASS='SenhaForte' npm --prefix backend run bootstrap:prod
```
Cria (idempotente): 3 perfis, 6 regiões do RS, 28 cidades (foco Vale do Taquari), 8 tarefas, 6 materiais, configurações da campanha e o usuário admin. **Nunca rode `prisma/seed.js` em produção** — ele apaga a base e cria dados fake.

### Geolocalização de apoiadores

Todo cadastro (landing pública e manual) recebe automaticamente `cityId`/`regionId` (lookup pelo nome da cidade) e `lat/lng` aproximado (centroide da cidade + dispersão ~2km determinística — `backend/src/utils/geo.js`). Coordenada manual no formulário tem precedência. Default: Venâncio Aires.

---

## Produção definitiva — VPS próprio (desde 21/07/2026)

**Servidor:** VPS Debian 13 · IP `179.197.232.140` · projeto em `/opt/airton-artus`
**Stack:** Node 22 + PM2 (`airton-api`, porta 4000) · PostgreSQL 17 local (`airton_artus`) · Nginx + Let's Encrypt · UFW (22/80/443)

| Domínio | Papel |
|---|---|
| `app.airtonartus.com.br` | Sistema (painel da equipe) — SSL ativo |
| `www.airtonartus.com.br` | Site público (landing na raiz) — aguardando registro DNS |
| `airtonartus.com.br` | Redireciona para o www |
| `airton.vai-sistema.com` | Endereço antigo — redireciona (301) para o app |

**Operação:**
- Backend: `pm2 ls` / `pm2 logs airton-api` / `pm2 restart airton-api`
- Uploads: disco local (`/opt/airton-artus/backend/uploads`), servidos via `/uploads`
- Cron de automações: crontab root, diário 12:00 UTC (09:00 BRT) via `curl localhost:4000/api/cron/automations`
- SSL do www/apex: rodar `/root/ssl-www.sh` após criar os registros DNS
- Deploy de atualização: `rsync` do repo para `/opt/airton-artus` (excluir node_modules/.env), `npm --prefix frontend run build` no servidor e `pm2 restart airton-api`
- Segredos de produção: somente em `/opt/airton-artus/backend/.env` no servidor (chmod 600)
