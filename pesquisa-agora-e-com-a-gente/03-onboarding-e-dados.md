# 03 · Onboarding e dados coletados (observado ✅)

Funil **"Bora começar"** — exibido como **passo 1/4** (os passos 2–4 ficam após preenchimento; não avançamos para não criar conta).

## Passo 1/4 — "Bora começar"
> "A gente só precisa do básico pra te conectar com gente que tá mobilizando perto de ti."

| Campo | Tipo | Observações |
|------|------|-------------|
| **Nome completo** | texto | obrigatório |
| **CEP** | máscara `00000-000` | base de geolocalização |
| **Data de nascimento** | selects dia / mês / ano (1920–2012) | maioridade/faixa etária |
| **Telefone** | máscara `(51) 9 9999-9999` | DDD gaúcho como placeholder |
| **E-mail** | email | login |
| **Senha** | mínimo 6 caracteres | |
| **Gênero** | chips (seleção): `mulher`, `homem`, `mulher trans`, `homem trans`, `travesti`, `não-binárie`, `outro`, `prefiro não dizer` | **inclusivo** |
| **Raça / cor** | select: `branca`, `parda/preta`, `indígena`, `amarela` | padrão IBGE |
| **Política de privacidade (LGPD)** | checkbox + link | consentimento explícito |
| **Notificações de chamamentos perto de mim** | checkbox (opt-in) | push/geo |

**Nota exibida (literal):**
> "O app adapta os textos ao teu gênero · pessoas trans, não-binárie e travestis recebem linguagem neutra (ex: 'voluntariado', 'coordenação')."

CTA: **"Continuar →"**.

## Passos 2–4 (inferidos 🔎)
- **Passo 2:** interesses / causas / como quer ajudar (tipos de voluntariado).
- **Passo 3:** confirmação de região / atividades sugeridas perto de você.
- **Passo 4:** primeira ação / boas-vindas ("entra no movimento").

## Modelo de dados implícito (para referência)
```
Apoiador {
  nomeCompleto, cep, dataNascimento, telefone, email, senha(hash),
  genero (enum inclusivo), racaCor (enum IBGE),
  consentimentoLGPD (bool + timestamp + versão da política),
  optInNotificacoes (bool),
  lat/lng (derivados do CEP), regiao
}
```

## Lições de produto
1. **Coleta mínima mas estratégica** — só o necessário para geolocalizar e contatar.
2. **Inclusão como valor de marca** — gênero/raça + linguagem adaptativa não são "extras", são posicionamento.
3. **LGPD + opt-in** desde o primeiro toque (consentimento granular: privacidade ≠ notificações).
4. **CEP como chave** de toda a experiência hiperlocal.
