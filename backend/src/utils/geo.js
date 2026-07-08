// Fallback de geolocalização por cidade.
// Quando um cadastro chega sem lat/lng (landing pública, cadastro manual sem
// coordenada), posicionamos o ponto no centroide da cidade com um deslocamento
// determinístico (~±2km) derivado de bairro+telefone — assim os pontos da mesma
// cidade não empilham no mesmo pixel e o mapa político funciona desde o 1º dia.
// Precisão real (geocoding por endereço) pode substituir depois sem migração:
// basta sobrescrever lat/lng.

const CITY_CENTROIDS = {
  // Vale do Taquari — base da pré-campanha
  'venâncio aires': [-29.6143, -52.1932],
  'venancio aires': [-29.6143, -52.1932],
  'lajeado': [-29.4669, -51.9614],
  'estrela': [-29.5017, -51.9651],
  'teutônia': [-29.4482, -51.8044],
  'teutonia': [-29.4482, -51.8044],
  'encantado': [-29.2367, -51.8703],
  'arroio do meio': [-29.4014, -51.945],
  'taquari': [-29.7997, -51.8644],
  'cruzeiro do sul': [-29.5147, -52.0964],
  'bom retiro do sul': [-29.607, -51.9451],
  'roca sales': [-29.2886, -51.8664],
  'mato leitão': [-29.528, -52.1278],
  'mato leitao': [-29.528, -52.1278],
  'santa clara do sul': [-29.475, -52.0847],
  // Vale do Rio Pardo e região
  'santa cruz do sul': [-29.7175, -52.4258],
  'vera cruz': [-29.7184, -52.5152],
  'sobradinho': [-29.4192, -53.0292],
  'barros cassal': [-29.0939, -52.5828],
  'soledade': [-28.8306, -52.5131],
  // Metropolitana e principais do RS
  'porto alegre': [-30.0346, -51.2177],
  'canoas': [-29.9178, -51.1836],
  'gravataí': [-29.9444, -50.9919],
  'gravatai': [-29.9444, -50.9919],
  'viamão': [-30.0819, -51.0233],
  'viamao': [-30.0819, -51.0233],
  'alvorada': [-29.9897, -51.0808],
  'cachoeirinha': [-29.9472, -51.0936],
  'são leopoldo': [-29.7603, -51.1472],
  'sao leopoldo': [-29.7603, -51.1472],
  'novo hamburgo': [-29.6783, -51.1306],
  'esteio': [-29.8617, -51.1792],
  'sapucaia do sul': [-29.8276, -51.145],
  'guaíba': [-30.1136, -51.325],
  'guaiba': [-30.1136, -51.325],
  'eldorado do sul': [-30.0847, -51.6187],
  'caxias do sul': [-29.1678, -51.1794],
  'bento gonçalves': [-29.1662, -51.5165],
  'bento goncalves': [-29.1662, -51.5165],
  'passo fundo': [-28.2576, -52.4091],
  'santa maria': [-29.6842, -53.8069],
  'pelotas': [-31.7654, -52.3376],
  'erechim': [-27.6339, -52.2747],
};

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Coordenada aproximada p/ (cidade, bairro, seed). Sempre retorna algo (default Venâncio Aires). */
export function fallbackLatLng({ cityName, neighborhood, seed = '' }) {
  const key = String(cityName || 'Venâncio Aires').trim().toLowerCase();
  const base = CITY_CENTROIDS[key] || CITY_CENTROIDS['venâncio aires'];
  const h = hashCode(`${key}|${(neighborhood || '').toLowerCase()}|${seed}`);
  const jLat = ((h % 1000) / 1000 - 0.5) * 0.036;      // ±0.018° ≈ 2 km
  const jLng = (((h >> 10) % 1000) / 1000 - 0.5) * 0.036;
  return { lat: +(base[0] + jLat).toFixed(6), lng: +(base[1] + jLng).toFixed(6) };
}

/** Resolve cityId/regionId a partir do nome da cidade (case-insensitive). */
export async function linkCityByName(prisma, cityName) {
  if (!cityName) return null;
  return prisma.city.findFirst({
    where: { name: { equals: String(cityName).trim(), mode: 'insensitive' } },
    select: { id: true, regionId: true },
  });
}
