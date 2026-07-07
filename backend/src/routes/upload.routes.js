import { Router } from 'express';
import { upload } from '../middlewares/upload.js';
import * as uploadCtrl from '../controllers/upload.controller.js';

const r = Router();

r.post('/', upload.single('file'), uploadCtrl.uploadSingle);

export default r;
