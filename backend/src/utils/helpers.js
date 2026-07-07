/** Converte strings vazias em null (útil para FKs/enums opcionais antes do Zod/Prisma). */
export function nullifyEmpty(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) out[k] = v === '' ? null : v;
  return out;
}

/** Remove tudo que não for dígito de um telefone. */
export const onlyDigits = (s) => (s || '').replace(/\D/g, '');
