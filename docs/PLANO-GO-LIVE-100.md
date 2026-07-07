# Plano Go-Live 100% — Márcio Binsely Digital

**Data:** 02/07/2026 · **Contrato:** V1 em 02/07 · V Final em 20/07 · Saldo em 20/08
**Produção:** https://vai-campanha-p3rvaegd7-elisonperini-bots-projects.vercel.app
**Repo:** https://github.com/VAI-TECNOLOGIA/marcio-binsely-digital (privado)
**Login master:** admin@marciobinsely.com · senha rotacionada (guardada fora deste doc)

---

## 1. Estado atual — o que JÁ está pronto e verificado

| Item | Status | Verificação |
|---|---|---|
| App full-stack em produção (Vercel serverless + Neon Postgres) | 🟢 | smoke test HTTP 200 + login JWT |
| Banco limpo (zero dado fake de apoiador/voluntário/ação) | 🟢 | `/api/public/stats` = 0/0/0/0 |
| Senha admin rotacionada (forte, fora do git) | 🟢 | login testado hoje |
| Uploads persistentes (Vercel Blob, store `marcio-binsely-uploads`) | 🟢 | upload+download E2E |
| RBAC granular por perfil (LIDER/MEMBRO/PARCEIRO) em todas as rotas | 🟢 | auditado + curl 401 |
| Mapa político profissional (tile Voyager + AO VIVO 30s + sidebar) | 🟢 | screenshot em prod |
| Google Maps opcional (liga com env var, fallback gratuito) | 🟡 | PR #1 aberto, MERGEABLE |
| Código no GitHub VAI-TECNOLOGIA | 🟢 | main + branch feature |
| Landing pública com dados reais do candidato (redes, WhatsApp, trajetória) | 🟢 | auditada |
| Materiais de apoio (apresentação comercial, treinamento, PDFs) | 🟢 | entregues |

**Conclusão da auditoria (3 agentes):** não há bug bloqueante. O que separa o sistema de "100% funcional para o cliente" é **bootstrap de dados, conteúdo real, canais oficiais e 4 pendências técnicas** — detalhadas abaixo.

---

## 2. FASE 0 — Bootstrap de produção ✅ CONCLUÍDA em 02/07/2026

| # | Tarefa | Status |
|---|---|---|
| 0.1 | Merge PR #1 (Google Maps toggle) + deploy | ✅ mergeado (`55f1921`) e em prod |
| 0.2 | Seed prod-safe: 3 roles, 6 regiões POA, 12 cidades RS, 8 tarefas, 6 materiais | ✅ idempotente, verificado via API |
| 0.3 | Settings `campaign` + `goals` + `theme` preenchidos | ✅ landing pública lê `/api/public/campaign` |
| 0.4 | ⚠️ Confirmar nº de urna real (12345) | 🔶 **PENDENTE — cliente** |
| 0.5 | Smoke test (dashboard, configurações, mapa, logins) | ✅ screenshots em prod |
| 0.6 | Usuário do Julian (LIDER) criado | ✅ senha entregue por canal seguro |

**Bônus resolvido — drift de schema:** o banco Neon de prod estava com schema MULTI-TENANT antigo (tabela `Tenant` + colunas `tenantId NOT NULL`, resquício do projeto vai-campanha de ~36 dias atrás) e faltavam índices únicos (`Region_name_key`, `Setting_key_key`). Sincronizado via `prisma db push` — banco agora bate 1:1 com o `schema.prisma` do repo. Sem esse fix, qualquer INSERT em Region/City/Setting quebraria.

**Entregável V1 do contrato: cumprida.** URL de prod atual: https://vai-campanha-rckjbxruf-elisonperini-bots-projects.vercel.app

---

## 3. FASE 1 — Conteúdo real + acesso definitivo (03–08/07) 🟠

| # | Tarefa | Detalhe | Quem | Esforço |
|---|---|---|---|---|
| 1.1 | **Domínio próprio** | Decidir (`marcio.vaitecnologia.com`, `marcio.vai-sistema.com` ou domínio novo) → `vercel domains` + DNS + atualizar `PUBLIC_URL`/`CORS_ORIGIN` | Cliente decide, Dev executa | 30 min + DNS |
| 1.2 | **Vercel ↔ GitHub connect** | Autorizar app Vercel na org VAI-TECNOLOGIA (github.com/organizations/VAI-TECNOLOGIA/settings/installations) → `vercel git connect` → push = deploy automático | **Usuário autoriza**, Dev conecta | 10 min |
| 1.3 | **E-mail transacional (reset de senha)** | ✅ FEITO 02/07 (`c37bd4f`): `email.service.js` (Resend, fallback simulado), páginas `/esqueci-senha` + `/redefinir-senha`, link no login. **Falta só criar conta Resend e setar `RESEND_API_KEY` + `EMAIL_FROM` na Vercel** — até lá o link é logado no servidor | Dev ✅ / chave: Cliente | — |
| 1.4 | **PWA (instalar no celular)** | ✅ FEITO 02/07 (`c37bd4f`): manifest + service worker (autoUpdate), ícones da foto do candidato, app shell offline, API sempre na rede. Verificado em prod | Dev ✅ | — |
| 1.5 | **Depoimentos reais na landing** | Substituir Rosa/João/Ana (fake) por 3 depoimentos autorizados com nome/foto | **Cliente envia**, Dev aplica | 30 min |
| 1.6 | Remover toasts de prova social fake + disclaimers "ilustrativo" da landing | Quando 1.5 estiver ok | Dev | 30 min |
| 1.7 | Criar contas da equipe real (coordenadores MEMBRO, parceiros PARCEIRO) | UI `/usuarios` — Julian faz sozinho após treinado | Cliente | — |

---

## 4. FASE 2 — Canais oficiais (09–15/07) 🟡

> O código do WhatsApp **já está pronto** (Meta Cloud API v20.0, webhook incluso). O gargalo é burocracia Meta — **iniciar o processo JÁ** porque verificação de empresa pode levar 1-2 semanas.

| # | Tarefa | Detalhe | Quem | Esforço |
|---|---|---|---|---|
| 2.1 | **Conta Meta Business + WhatsApp Cloud API** | Criar app na Meta, verificar empresa, registrar número comercial da campanha | **Cliente** (com guia do Dev) | burocracia 3-14 dias |
| 2.2 | Ativar WhatsApp real | Setar `WHATSAPP_PROVIDER=meta_cloud` + `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_NUMBER_ID` na Vercel + configurar webhook na Meta + teste E2E | Dev | 2-3 h |
| 2.3 | **Automações** | ✅ FEITO 02/07 (`1048789`): motor completo (`automation.service.js`) + Vercel Cron diário 09:00 BRT + rota protegida por CRON_SECRET. ANIVERSARIO diário; demais tipos por triggerDate; idempotente; cap 100/execução | Dev ✅ | — |
| 2.4 | **Treinamento da equipe** | 2 sessões remotas de 2h (contratuais) usando o deck `Treinamento-Equipe.pdf` já pronto | Dev + equipe | 2×2 h |
| 2.5 | Google Maps com chave real (opcional) | Cliente ativa "Maps JavaScript API" no Google Cloud → `VITE_GOOGLE_MAPS_API_KEY` → mapa upgrada sozinho (PR #1) | Cliente + Dev | 30 min |

---

## 5. FASE 3 — Entrega final V-Final (16–20/07) 🟢

| # | Tarefa | Detalhe | Quem | Esforço |
|---|---|---|---|---|
| 3.1 | SMS real (opcional — decidir se a campanha usará) | Implementar `services/sms.service.js` (Twilio/Zenvia) — hoje é stub | Dev | 1-2 dias |
| 3.2 | Teste E2E completo com dados reais + equipe usando | Roteiro de aceite por módulo, com Julian | Dev + Cliente | ½ dia |
| 3.3 | Hardening final | ✅ FEITO 02/07 (`1048789`): rate-limit por instância + trava global 60 cadastros/min no /join; headers de segurança globais (nosniff, X-Frame DENY, Referrer-Policy, Permissions-Policy); errorHandler corrigido (import do client gerado + 400 p/ validação Prisma). Bônus perf: code splitting (bundle -19%, landing ~25KB) | Dev ✅ | — |
| 3.4 | Documentação de uso + handoff | 🟡 PARCIAL: runbook de operação no README (deploy, envs, cron, bootstrap, geo). Falta: guia rápido por perfil p/ equipe | Dev | 2 h |
| 3.5 | **Assinatura de aceite da V Final** | Formaliza entrega → saldo em 20/08 | Cliente | — |

---

## 6. Backlog pós-entrega (evolutivo — fora do contrato, aditivo)

- Fila de broadcasts p/ >5k contatos (Redis/BullMQ) — hoje aguenta ~500/dia com re-chamada em lotes de 25
- Retry automático de mensagens com FALHA
- Lazy-load do bundle (1.86 MB → dividir mapa/charts por rota)
- Instagram/Messenger inbound (hoje só WhatsApp tem webhook)
- Relatório de crescimento com agregação SQL (quando base > 100k)
- App nativo (se a adoção do PWA não bastar)

---

## 7. Dependências que SÓ o cliente resolve (pedir hoje)

1. ✅ **Confirmar nº de urna** (12345?) — 5 min, bloqueia branding
2. 📸 **3 depoimentos reais autorizados** (nome + texto + foto) — bloqueia landing 100%
3. 🌐 **Escolher domínio** — bloqueia URL definitiva
4. 🏢 **Iniciar Meta Business** (CNPJ da campanha/comitê, número comercial) — bloqueia WhatsApp real; MAIOR RISCO DE PRAZO
5. 🔑 (Opcional) Cartão no Google Cloud pra Maps API — senão continua no mapa gratuito atual, que já está profissional
6. 👥 Lista da equipe (nome/e-mail/papel) pra criar as contas

## 8. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Verificação Meta Business demorar >2 semanas | WhatsApp real atrasa p/ depois da V Final | Iniciar HOJE; sistema opera em modo simulado sem quebrar |
| Urna 12345 estar errada | Rebranding em 6+ telas + materiais | Confirmar antes da Fase 1 |
| Cliente demorar com depoimentos/conteúdo | Landing segue com disclaimer "ilustrativo" | Não bloqueia operação interna |
| Outra sessão/dev mexendo em paralelo (deploy de 4h atrás não rastreado) | Conflito de deploy | Após 1.2, todo deploy via git push → histórico único |

---

*Gerado a partir de auditoria automatizada em 3 frentes (conteúdo frontend, integrações backend, dados de operação) + estado real de produção verificado por smoke test em 02/07/2026.*
