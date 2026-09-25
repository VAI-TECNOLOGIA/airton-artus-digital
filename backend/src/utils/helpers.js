/** Converte strings vazias em null (útil para FKs/enums opcionais antes do Zod/Prisma). */
export function nullifyEmpty(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) out[k] = v === '' ? null : v;
  return out;
}

/** Remove tudo que não for dígito de um telefone. */
export const onlyDigits = (s) => (s || '').replace(/\D/g, '');

/** Telefone BR canônico (DDD + número, sem o código do país 55). Usado como "login" e p/ casar telefones. */
export const brDigits = (s) => {
  let d = onlyDigits(s);
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  return d;
};
