/** Erro de aplicação com status HTTP — capturado pelo errorHandler central. */
export class AppError extends Error {
  constructor(message, statusCode = 400, code = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}
