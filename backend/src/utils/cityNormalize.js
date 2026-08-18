// ============================================================
//  Normalização de CIDADE — padrão único de preenchimento.
//  Colapsa variações que fragmentavam o dashboard: espaço no
//  fim/início, caixa (VENANCIO), acento (Venancio vs Venâncio),
//  sufixo " RS", e typos de 1 letra (Rio patdo -> Rio Pardo).
//  Usado em TODOS os caminhos de escrita (cadastro manual, signup
//  público, landing e importação) + no agrupamento do gráfico.
// ============================================================

// Dicionário canônico (grafia oficial, com acento). Cobre o Vale do
// Taquari (base da pré-campanha) + Vale do Rio Pardo + Região
// Metropolitana + maiores do RS. Chave de match = sem acento/caixa.
const CANON = [
  // Vale do Taquari
  'Venâncio Aires', 'Lajeado', 'Estrela', 'Teutônia', 'Encantado', 'Arroio do Meio',
  'Taquari', 'Cruzeiro do Sul', 'Bom Retiro do Sul', 'Roca Sales', 'Mato Leitão',
  'Santa Clara do Sul', 'Boqueirão do Leão', 'Sério', 'Canudos do Vale', 'Marques de Souza',
  'Progresso', 'Pouso Novo', 'Travesseiro', 'Coqueiro Baixo', 'Capitão', 'Forquetinha',
  'Colinas', 'Westfália', 'Imigrante', 'Paverama', 'Fazenda Vilanova', 'Poço das Antas',
  'Doutor Ricardo', 'Vespasiano Corrêa', 'Muçum', 'Dois Lajeados', 'Nova Bréscia',
  'Anta Gorda', 'Putinga', 'Ilópolis', 'Arvorezinha', 'Relvado', 'Cerro Branco',
  // Vale do Rio Pardo e entorno
  'Santa Cruz do Sul', 'Vera Cruz', 'Rio Pardo', 'Passo do Sobrado', 'Sinimbu',
  'Herveiras', 'Vale do Sol', 'Vale Verde', 'General Câmara', 'Pântano Grande',
  'Encruzilhada do Sul', 'Sobradinho', 'Barros Cassal', 'Soledade', 'Segredo',
  'Lagoa Bonita do Sul', 'Tunas', 'Candelária', 'Gramado Xavier',
  // Metropolitana + maiores do RS
  'Porto Alegre', 'Canoas', 'Gravataí', 'Viamão', 'Alvorada', 'Cachoeirinha',
  'São Leopoldo', 'Novo Hamburgo', 'Esteio', 'Sapucaia do Sul', 'Guaíba',
  'Eldorado do Sul', 'Caxias do Sul', 'Bento Gonçalves', 'Passo Fundo', 'Santa Maria',
  'Pelotas', 'Erechim', 'Rio Grande', 'Uruguaiana', 'Bagé', 'Cachoeira do Sul',
];

/** Remove acentos, caixa, espaços repetidos e o sufixo " RS" — a chave de comparação. */
export function cityKey(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')     // tira acentos (combining marks)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\s,/-]+r\.?\s?s\.?$/, '') // tira " rs", " / rs", "-rs", " r.s." no fim
    .trim();
}

const CANON_BY_KEY = new Map(CANON.map((n) => [cityKey(n), n]));

const SMALL = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'di', 'du', 'del']);

/** Title Case pt-BR: mantém conectivos (do, da, de...) minúsculos, exceto no início. */
function titleCasePt(s) {
  const clean = String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim().replace(/[\s,/-]+RS$/i, '').trim();
  if (!clean) return clean;
  return clean
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i > 0 && SMALL.has(w) ? w : w.replace(/^([\p{L}])/u, (c) => c.toUpperCase())))
    .join(' ');
}

/** Distância de edição ≤ 1? (mesmo tamanho ±1, no máximo 1 diferença). */
function within1(a, b) {
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0, j = 0, diff = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++diff > 1) return false;
    if (la > lb) i++;
    else if (lb > la) j++;
    else { i++; j++; }
  }
  if (i < la || j < lb) diff++;
  return diff <= 1;
}

/**
 * Nome canônico da cidade. Colapsa variações de acento/caixa/espaço/sufixo e
 * corrige typos de 1 letra contra o dicionário. Cidade desconhecida -> Title Case limpo.
 */
export function canonicalCityName(raw) {
  if (raw == null || String(raw).trim() === '') return raw ?? null;
  const key = cityKey(raw);
  if (!key) return titleCasePt(raw);
  if (CANON_BY_KEY.has(key)) return CANON_BY_KEY.get(key);
  // fuzzy: aceita só se houver EXATAMENTE um vizinho a distância 1 (evita merge errado)
  if (key.length >= 5) {
    let match = null, n = 0;
    for (const [k, name] of CANON_BY_KEY) {
      if (within1(key, k)) { n++; match = name; if (n > 1) break; }
    }
    if (n === 1) return match;
  }
  return titleCasePt(raw);
}

/** Limpeza leve para bairro/texto livre: NFC + espaço único + Title Case. */
export function cleanPlace(raw) {
  if (raw == null || String(raw).trim() === '') return raw ?? null;
  return titleCasePt(raw);
}

/**
 * Resolve cidade para escrita: devolve nome canônico + cityId/regionId (quando a
 * cidade existe na tabela City). Um único ponto de verdade para todos os cadastros.
 */
export async function resolveCity(prisma, raw) {
  const cityName = canonicalCityName(raw);
  if (!cityName) return { cityName: cityName ?? null, cityId: null, regionId: null };
  const city = await prisma.city.findFirst({
    where: { name: { equals: cityName, mode: 'insensitive' } },
    select: { id: true, regionId: true },
  });
  return { cityName, cityId: city?.id || null, regionId: city?.regionId || null };
}
