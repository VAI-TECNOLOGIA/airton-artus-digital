# 04 · Comparativo vs. nosso sistema + Roadmap

## Posicionamento: são complementares
- **"Agora é com a Gente"** = **front-end do apoiador** (mobilização hiperlocal, mobile-first).
- **Airton Artus Digital (nosso)** = **back-office de gestão** (admin/coordenação: CRM, materiais, mapa, relatórios, RBAC, disparos, demandas...).

A maior oportunidade é **incorporar a camada do apoiador** ao nosso sistema (que já é muito mais completo no back-office).

## Comparativo

| Recurso | Eles | Nós (hoje) | Ação |
|--------|:---:|:---:|------|
| Back-office de gestão (CRM, materiais, faixas, relatórios, RBAC) | 🔎 limitado | ✅ forte | manter |
| Mapa político / georreferência | 🔎 | ✅ (Leaflet, lat/lng) | manter |
| Antifraude (telefone duplicado, blacklist) | ❓ | ✅ | manter |
| Auto-cadastro público do apoiador | ✅ | ✅ (LP `/lp`) | **alinhar campos** |
| **Geo por CEP** (auto-preenche + "perto de mim") | ✅ | ⚠️ só lat/lng manual | **ADICIONAR** |
| **Onboarding inclusivo** (gênero/raça + linguagem adaptada) | ✅ | ❌ | **ADICIONAR** |
| **Consentimento LGPD + opt-in granular** | ✅ | ⚠️ parcial | **ADICIONAR** |
| **Atividades "perto de mim" + RSVP/check-in** | ✅ | ⚠️ ações são só admin | **ADICIONAR** |
| **"Movimento em tempo real"** (contadores ao vivo) | ✅ | ⚠️ dashboard admin | **ADICIONAR (versão apoiador)** |
| **Notificações de "chamamentos" por proximidade (push)** | ✅ | ❌ | **ADICIONAR** |
| **App/PWA mobile-first do apoiador** | ✅ | ❌ (temos LP estática) | **ADICIONAR (maior esforço)** |
| Engajamento/pontuação/ranking | 🔎 provável | ✅ | manter (reaproveitar p/ apoiador) |
| Mídia kit, disparos, demandas (Kanban), agenda | ❓ | ✅ | manter |

---

## Roadmap priorizado (mapeado à nossa arquitetura)

### 🟢 P1 — Quick wins (1–2 dias)

**1. Onboarding inclusivo + LGPD nos cadastros**
- `backend/prisma/schema.prisma` → no model `Supporter`, adicionar:
  ```prisma
  gender        Gender?          // enum
  race          Race?            // enum
  lgpdConsent   Boolean  @default(false)
  lgpdConsentAt DateTime?
  notifyOptIn   Boolean  @default(false)
  ```
  e os enums:
  ```prisma
  enum Gender { MULHER HOMEM MULHER_TRANS HOMEM_TRANS TRAVESTI NAO_BINARIE OUTRO NAO_DIZER }
  enum Race { BRANCA PARDA_PRETA INDIGENA AMARELA }
  ```
- `backend/src/controllers/public.controller.js` e `supporter.controller.js` → aceitar os novos campos (Zod) + gravar `lgpdConsentAt` quando `lgpdConsent=true`.
- `frontend/src/pages/Landing.jsx` (form da LP) e `config/resources.jsx` (form de apoiadores) → chips de gênero, select raça/cor, checkboxes LGPD e opt-in.
- `frontend/src/config/enums.js` → labels PT-BR de `Gender`/`Race`.

**2. Auto-preenchimento por CEP (ViaCEP)**
- `frontend` → ao digitar o CEP no form, chamar `https://viacep.com.br/ws/<cep>/json/` e preencher `street`, `neighborhood`, `cityName` automaticamente.
- (Opcional) geocodificar via Nominatim/OpenCage → `lat`/`lng` para popular o mapa sem digitação.

### 🟡 P2 — Camada do apoiador (3–5 dias)

**3. "Atividades perto de mim" + RSVP (público)**
- Reaproveitar `StreetAction`/`Event` (já têm `lat`/`lng`).
- Novos endpoints públicos em `public.controller.js`:
  - `GET /api/public/activities?cep=` ou `?lat=&lng=` → lista atividades futuras ordenadas por proximidade (fórmula de Haversine).
  - `POST /api/public/rsvp` → confirma presença (cria `Engagement`/novo model `ActivityRSVP`).
- Nova página/rota pública `frontend/src/pages/Atividades.jsx` (lista/mapa de atividades + botão "Eu vou").

**4. "Movimento em tempo real" (versão apoiador)**
- `GET /api/public/momentum` → contadores: novos apoiadores hoje/semana, total na região do CEP, atividades próximas.
- Componente de contadores animados na LP (`Landing.jsx`) — "o movimento está crescendo".

**5. Linguagem adaptada ao gênero (UI)**
- Helper em `frontend/src/lib/` → `termo('voluntario', gender)` devolve "voluntário/voluntária/voluntárie". Aplicar nos textos do apoiador.

### 🔴 P3 — App do apoiador (PWA) + push (1–2 semanas)

**6. PWA mobile-first do apoiador**
- Adicionar `frontend/public/manifest.json` + service worker (vite-plugin-pwa) → instalável no celular.
- Portal autenticado do apoiador (login simples) com: meu perfil, atividades perto, meus pontos/conquistas, chamamentos.

**7. "Chamamentos" geolocalizados + notificações push**
- Estender `Notice`/`BroadcastCampaign` com **geo-targeting** (raio a partir de um ponto/bairro).
- Web Push (VAPID) e/ou WhatsApp Cloud (já temos o provider) para notificar apoiadores no raio que deram `notifyOptIn`.
- Model `Chamamento` (ou reuso de `StreetAction` + flag `isCall`) com `targetLat/targetLng/radiusKm`.

---

## O que **não** copiar / cuidar
- **LGPD/eleitoral:** coleta de raça/cor e geolocalização exige base legal, finalidade e consentimento claros. Manter a política de privacidade e o opt-in granular (privacidade ≠ push).
- **Inclusão é posicionamento, não enfeite:** se adotar linguagem adaptada ao gênero, fazer de forma consistente (revisar todos os textos do apoiador).
- **Push só com opt-in** e respeitando horários/limites das APIs oficiais.

## Resumo executivo
Nosso sistema já é **mais robusto no back-office**. O que falta — e o concorrente faz bem — é a **experiência do apoiador**: **CEP→geo**, **atividades perto + RSVP**, **momentum em tempo real**, **onboarding inclusivo + LGPD** e, no topo, um **PWA mobile** com **chamamentos por proximidade**. Comece por **P1** (baixo esforço, alto valor de marca) e evolua para o **PWA do apoiador** (P3) como grande diferencial.
