import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { fileUrl } from '../middlewares/upload.js';

export const uploadSingle = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Nenhum arquivo enviado', 400);
  res.status(201).json({
    url: fileUrl(req.file.filename),
    filename: req.file.filename,
    size: req.file.size,
    mime: req.file.mimetype,
  });
});
