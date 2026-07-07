import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export function signToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function signResetToken(payload) {
  return jwt.sign({ ...payload, type: 'reset' }, env.jwtSecret, {
    expiresIn: env.jwtResetExpiresIn,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
