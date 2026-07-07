import prisma from '../config/prisma.js';

/** Registra uma entrada de auditoria. Nunca quebra o fluxo principal. */
export async function audit({ userId, action, entity, entityId, changes, ip }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entity,
        entityId: entityId || null,
        changes: changes ?? undefined,
        ip: ip || null,
      },
    });
  } catch (err) {
    console.warn('[audit] falha ao registrar log:', err.message);
  }
}
