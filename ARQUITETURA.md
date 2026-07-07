# 🏛️ Visão de Arquitetura — Márcio Binsely Digital

```
┌──────────────────────┐      HTTP/JSON (Bearer JWT)      ┌──────────────────────┐
│   FRONT-END (React)   │ ───────────────────────────────▶│   BACK-END (Express)  │
│  Vite · :5173         │  /api/* (proxy em dev)           │  REST API · :4000     │
│  /lp = landing pública│ ◀───────────────────────────────│  JWT + RBAC + Zod     │
└──────────────────────┘                                  └───────────┬───────────┘
                                                                       │ Prisma
                                                           ┌───────────▼───────────┐
                                                           │   PostgreSQL (Prisma) │
                                                           └───────────────────────┘
   Integrações (provider pattern, simuladas): WhatsApp Cloud · Instagram · Messenger · SMS
```

## 1. Front ↔ Back
- O front consome `/api/...` por caminho relativo; o **proxy do Vite** encaminha para `http://localhost:4000` em dev (sem CORS).
- **axios** (`src/api/client.js`) injeta `Authorization: Bearer <token>` e trata `401`.
- **AuthContext** reidrata a sessão via `GET /auth/me`.
- **`ResourcePage`** é o CRUD genérico do front (lista + busca + filtros + modal), dirigido por `config/resources.jsx`.
- **Landing Page** (`/lp`) é pública e usa os endpoints `/api/public/*` (stats + cadastro de voluntário com antifraude).

## 2. Banco (Prisma · PostgreSQL)
28+ models. `User` (enum `UserRole`) com auto-relação `manager → team`; `Region → City`; `Supporter` (pessoa na base) + `Volunteer` (extensão 1:1). Antifraude no cadastro: telefone duplicado → `SUSPEITO`; blacklist → `BLACKLIST`; tudo em `AuditLog`. Comunicação: `Conversation`/`Message`, `Demand` (Kanban), `BroadcastCampaign`/`BroadcastContact`, `Automation`. Config em `Setting` (JSON).

## 3. Integrações futuras
- **Roteador de canais** `services/messaging.service.js` → `sendViaChannel(channel, {to, body})` (usado por conversas, disparos, automações).
- **WhatsApp** `services/whatsapp.service.js`: `simulado` (padrão) ou `meta_cloud` (Graph API v20). Webhook pronto em `/api/whatsapp/webhook`; teste via `/api/whatsapp/simulate`.
- **Instagram/Messenger/SMS**: ramos prontos no roteador, plugáveis por credenciais no `.env`.
- `renderTemplate()` resolve `{{nome}}`, `{{cidade}}`, `{{bairro}}`, `{{responsavel}}`.

> ⚖️ Somente APIs oficiais/autorizadas, respeitando legislação eleitoral, políticas da Meta e LGPD.

## 4. Permissões (RBAC em 2 camadas)
- **Por rota:** middleware `authorize(...roles)` (`middlewares/rbac.js`).
- **Por linha:** `utils/scope.js` — Admin tudo · Coordenador sua região · Supervisor sua equipe · Voluntário próprio painel · Marketing publica mídia · Materiais aprova pedidos · Atendimento vê demandas/conversas.
- No front, `lib/permissions.js` filtra a navegação e `ResourcePage` respeita `writeRoles`/`deleteRoles`. Back-end é a fonte de verdade.

## 5. Escala (municipal → estadual/federal)
Geografia em árvore (`Region`/`City`, extensível com `parentId`), hierarquia `User.manager`, API **stateless** (JWT) atrás de load balancer, uploads em **S3**, disparos em **fila** (BullMQ/SQS), tempo real via **WebSocket**, e multi-campanha via `tenantId`. `AuditLog` dá rastreabilidade para auditorias eleitorais.
