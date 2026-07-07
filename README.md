# 🟥🟩🟨 Márcio Binsely Digital

Plataforma web completa para **gestão de campanha política** — voluntários, apoiadores, mobilização de rua, faixas, mídia kit, mapa político, CRM de atendimento, disparos, demandas da população, relatórios e painel de TV.

> Candidato: **Márcio Bins Ely** · Vereador de Porto Alegre/RS · PDT · nº **12345**
> Identidade visual: **Trabalhismo Gaúcho** — tricolor da bandeira do RS (vermelho + verde + amarelo) sobre fundo creme, tipografia slab.

---

## 🧱 Stack

| Camada        | Tecnologia                                              |
| ------------- | ------------------------------------------------------- |
| Front-end     | **React 18** + Vite + React Router + Recharts + Leaflet |
| Back-end      | **Node.js + Express** (ESM)                             |
| Banco         | **PostgreSQL**                                          |
| ORM           | **Prisma**                                              |
| Autenticação  | **JWT** + bcrypt                                        |
| Upload        | **Local** (multer) — preparado para **S3** compatível   |
| Mapa          | **Leaflet** + OpenStreetMap                             |
| Integrações   | Arquitetura pronta p/ **WhatsApp Oficial, Instagram, Messenger, SMS** |

---

## 📁 Estrutura de pastas

```
marcio-binsely-digital/
├── docker-compose.yml        # PostgreSQL pronto p/ desenvolvimento
├── package.json              # scripts orquestradores (setup, dev)
├── README.md
├── ARQUITETURA.md            # visão de arquitetura detalhada
│
├── backend/
│   ├── prisma/ (schema.prisma · seed.js)
│   └── src/ (config · middlewares · utils · services · controllers · routes · app.js · server.js)
│
└── frontend/
    ├── public/ (foto.png · logo.png · candidato.svg)
    └── src/ (api · context · components · config · lib · pages · styles)
```

---

## 🚀 Como rodar localmente

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

### 🔑 Acesso inicial (seed)

| Perfil            | E-mail                          | Senha       |
| ----------------- | ------------------------------- | ----------- |
| **Administrador** | `admin@marciobinsely.com`       | `Admin@123` |
| Coordenador       | `norte@marciobinsely.com`       | `Admin@123` |
| Coordenador       | `sul@marciobinsely.com`         | `Admin@123` |
| Supervisor        | `supervisor@marciobinsely.com`  | `Admin@123` |
| Voluntário        | `voluntario@marciobinsely.com`  | `Admin@123` |
| Marketing         | `marketing@marciobinsely.com`   | `Admin@123` |
| Materiais         | `materiais@marciobinsely.com`   | `Admin@123` |
| Atendimento       | `atendimento@marciobinsely.com` | `Admin@123` |

---

## 🖼️ Imagens da campanha
- `frontend/public/foto.png` — **foto do candidato** (usada no login e na LP, com tratamento duotone).
- `frontend/public/logo.png` — logo da campanha.
- Para trocar a foto, substitua `frontend/public/foto.png` (o CSS já a referencia em `--candidate-photo`).

---

## 🧩 Módulos
Autenticação · Dashboard · Apoiadores & Voluntários (antifraude) · Confirmação automática (WhatsApp) · CRM de comunicação · Mural · Mídia Kit · Engajamento (pontuação/ranking) · Pedidos de material (anti-desperdício) · Faixas · Mapa político · Ações de rua · Agenda · Disparador · Automações · Demandas (Kanban) · Relatórios · Painel TV · Configurações · **Landing Page pública** (`/lp`).

---

## 🔌 Integrações futuras
WhatsApp Cloud API (oficial), Instagram Direct, Messenger e SMS passam pelo roteador `services/messaging.service.js` (provider pattern). Tudo **simulado** por padrão — basta preencher credenciais no `.env` e trocar `WHATSAPP_PROVIDER=meta_cloud`. Detalhes em **[ARQUITETURA.md](ARQUITETURA.md)**.

> ⚖️ Conectar apenas APIs **oficiais/autorizadas**, em conformidade com a legislação eleitoral e a LGPD.

---

## 🛰️ Operação em produção (runbook)

**Infra:** Vercel (frontend estático + API Express serverless via `api/index.mjs`) · Postgres Neon (integração `marcelopolitico`) · Vercel Blob (`marcio-binsely-uploads`) para uploads.

### Deploy

```bash
vercel --prod            # deploy manual (raiz do repo, projeto vai-campanha)
```

> Recomendado: conectar o repo GitHub ao projeto Vercel (`vercel git connect`) para deploy automático a cada push na `main`.

### Variáveis de ambiente (produção)

| Var | Função | Estado |
|---|---|---|
| `APP_DATABASE_URL` / `APP_DIRECT_URL` | Postgres Neon (pooled / direto) | ✅ via integração Neon |
| `JWT_SECRET` | Assinatura dos tokens | ✅ |
| `UPLOAD_DRIVER` | `blob` em produção (Vercel Blob) | ✅ |
| `BLOB_READ_WRITE_TOKEN` | Token do Blob store | ✅ via integração |
| `CRON_SECRET` | Protege `/api/cron/*` (Vercel envia como Bearer) | ✅ |
| `RESEND_API_KEY` / `EMAIL_FROM` | E-mail transacional (reset de senha) | 🔶 pendente chave |
| `WHATSAPP_PROVIDER` + `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp real (Meta Cloud API) | 🔶 modo `simulado` |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps no /mapa (fallback: CartoDB) | 🔶 opcional |

### Cron de automações

`vercel.json` agenda `GET /api/cron/automations` **diariamente às 09:00 BRT** (12:00 UTC). O endpoint exige `Authorization: Bearer ${CRON_SECRET}`.

- `ANIVERSARIO`: roda todo dia para aniversariantes do dia.
- Demais tipos: disparam quando `triggerDate` = hoje.
- Idempotente (não repete destinatário no mesmo dia) · máx. 100 envios/execução.
- Execução manual: `curl -H "Authorization: Bearer $CRON_SECRET" https://<prod>/api/cron/automations`

### Bootstrap de dados de referência

O banco de produção já contém: 3 perfis, 6 regiões de POA, 12 cidades RS, 8 tarefas, 6 materiais e settings da campanha. Para recriar num ambiente novo, usar o padrão de rota one-shot documentado em `docs/PLANO-GO-LIVE-100.md` (nunca rodar `prisma/seed.js` em produção — ele TRUNCATE e cria dados fake).

### Geolocalização de apoiadores

Todo cadastro (landing pública e manual) recebe automaticamente `cityId`/`regionId` (lookup pelo nome da cidade) e `lat/lng` aproximado (centroide da cidade + dispersão ~2km determinística — `backend/src/utils/geo.js`). Coordenada manual no formulário tem precedência.
