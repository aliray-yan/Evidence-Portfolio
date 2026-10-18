import { Router } from 'express';
import { listMaterials } from '../services/materials/materialsRepository';
export const materialsRouter = Router();
materialsRouter.get('/', async (_req, res, next) => {
  try {
    res.json(await listMaterials());
  }
  catch (error) {
    next(error);
  }
});
