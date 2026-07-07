// Fallback de geolocalização por cidade.
// Quando um cadastro chega sem lat/lng (landing pública, cadastro manual sem
// coordenada), posicionamos o ponto no centroide da cidade com um deslocamento
// determinístico (~±2km) derivado de bairro+telefone — assim os pontos da mesma
// cidade não empilham no mesmo pixel e o mapa político funciona desde o 1º dia.
// Precisão real (geocoding por endereço) pode substituir depois sem migração:
// basta sobrescrever lat/lng.

const CITY_CENTROIDS = {
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
};

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Coordenada aproximada p/ (cidade, bairro, seed). Sempre retorna algo (default POA). */
export function fallbackLatLng({ cityName, neighborhood, seed = '' }) {
  const key = String(cityName || 'Porto Alegre').trim().toLowerCase();
  const base = CITY_CENTROIDS[key] || CITY_CENTROIDS['porto alegre'];
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
