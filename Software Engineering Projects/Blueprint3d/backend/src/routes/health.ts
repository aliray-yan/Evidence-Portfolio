import { Router } from 'express';
import { checkDatabaseConnection } from '../db/pool';
export const healthRouter = Router();
healthRouter.get('/', async (_req, res) => {
  const database = await checkDatabaseConnection();
  res.json({
    status: 'ok',
    service: 'blueprint3d-api',
    timestamp: new Date().toISOString(),
    database,
  });
});
