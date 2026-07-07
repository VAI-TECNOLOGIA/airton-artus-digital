// ============================================================
//  Escopo de dados por perfil (RBAC a nível de linha).
// ============================================================

// Hierarquia: LIDER e MEMBRO enxergam toda a base interna; PARCEIRO (apoiador
// externo) não acessa listagens internas de apoiadores/voluntários.
const SEE_ALL_ROLES = ['LIDER', 'MEMBRO'];
const NO_ROW = { id: '00000000-0000-0000-0000-000000000000' };

/** Apoiadores/Voluntários: equipe interna vê tudo; parceiro não vê a base. */
export function supporterScope(req) {
  const u = req.user;
  if (!u) return NO_ROW;
  if (SEE_ALL_ROLES.includes(u.role)) return {};
  return NO_ROW; // PARCEIRO e demais: sem acesso à base interna
}

/** Entidades com regionId: equipe interna vê tudo. */
export function regionScope() {
  return {};
}

/** Igual ao regionScope, mas inclui registros globais (regionId = null). */
export function regionScopeWithGlobal() {
  return {};
}
