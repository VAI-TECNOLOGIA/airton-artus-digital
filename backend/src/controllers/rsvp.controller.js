import { z } from 'zod';
import crypto from 'node:crypto';
import prisma from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { onlyDigits } from '../utils/helpers.js';

/* Gera um token curto e único para o link público do evento. */
async function ensureToken(eventId) {
  const ev = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, rsvpToken: true } });
  if (!ev) throw new AppError('Evento não encontrado', 404);
  if (ev.rsvpToken) return ev.rsvpToken;
  for (let i = 0; i < 5; i++) {
    const token = crypto.randomBytes(6).toString('base64url'); // ~8 caracteres
    try {
      await prisma.event.update({ where: { id: eventId }, data: { rsvpToken: token } });
      return token;
    } catch { /* colisão improvável — tenta de novo */ }
  }
  throw new AppError('Não foi possível gerar o link', 500);
}

function counts(guests) {
  const confirmed = guests.filter((g) => g.status === 'CONFIRMADO');
  return {
    confirmed: confirmed.length,
    declined: guests.filter((g) => g.status === 'RECUSADO').length,
    // total de pessoas (confirmados + acompanhantes)
    people: confirmed.reduce((s, g) => s + 1 + (g.companions || 0), 0),
  };
}

/* ---------- Equipe (autenticado): lista de convidados de um evento ---------- */
export const listGuests = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const token = await ensureToken(id);
  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, title: true, date: true, time: true, location: true, cityName: true, neighborhood: true, status: true },
  });
  const guests = await prisma.eventGuest.findMany({ where: { eventId: id }, orderBy: { createdAt: 'desc' } });
  res.json({ event, token, counts: counts(guests), guests });
});

/* Remove um convidado da lista (autenticado). */
export const removeGuest = asyncHandler(async (req, res) => {
  await prisma.eventGuest.delete({ where: { id: req.params.guestId } });
  res.status(204).send();
});

/* ---------- Público (sem login): página e confirmação ---------- */
export const publicGet = asyncHandler(async (req, res) => {
  const event = await prisma.event.findUnique({
    where: { rsvpToken: req.params.token },
    select: { id: true, title: true, description: true, date: true, time: true, location: true, cityName: true, neighborhood: true, status: true },
  });
  if (!event) throw new AppError('Convite não encontrado', 404);
  const guests = await prisma.eventGuest.findMany({ where: { eventId: event.id }, select: { status: true, companions: true } });
  const c = counts(guests);
  res.json({ event, confirmed: c.confirmed, people: c.people });
});

const respondSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome'),
  phone: z.string().trim().min(8, 'Informe um telefone válido'),
  status: z.enum(['CONFIRMADO', 'RECUSADO']),
  companions: z.coerce.number().int().min(0).max(50).optional(),
});

export const publicRespond = asyncHandler(async (req, res) => {
  const event = await prisma.event.findUnique({ where: { rsvpToken: req.params.token }, select: { id: true } });
  if (!event) throw new AppError('Convite não encontrado', 404);

  const data = respondSchema.parse(req.body || {});
  const phone = onlyDigits(data.phone);
  if (phone.length < 8) throw new AppError('Informe um telefone válido', 400);

  // Uma resposta por telefone por evento — reconfirmar atualiza a anterior.
  const guest = await prisma.eventGuest.upsert({
    where: { eventId_phone: { eventId: event.id, phone } },
    create: {
      eventId: event.id,
      name: data.name.trim(),
      phone,
      status: data.status,
      companions: data.status === 'CONFIRMADO' ? (data.companions || 0) : 0,
    },
    update: {
      name: data.name.trim(),
      status: data.status,
      companions: data.status === 'CONFIRMADO' ? (data.companions || 0) : 0,
    },
    select: { status: true },
  });

  res.json({ ok: true, status: guest.status });
});
