/** Encapsula handlers async e encaminha erros para o middleware central. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
