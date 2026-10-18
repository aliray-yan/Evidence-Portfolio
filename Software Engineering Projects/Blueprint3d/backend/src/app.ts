import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { healthRouter } from './routes/health';
import { projectsRouter } from './routes/projects';
import { blueprintsRouter } from './routes/blueprints';
import { floorPlansRouter } from './routes/floorPlans';
import { materialsRouter } from './routes/materials';
import { notFoundHandler } from './middleware/notFound';
import { analysisRouter } from './routes/analysis';
import { errorHandler } from './middleware/errorHandler';
export function createApp(): Express {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: [env.corsOrigin,env.corsOrigin.replace('localhost','127.0.0.1')] }));
  app.use(express.json({ limit: '5mb' }));
  app.param('id', (req, res, next, id: string) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      res.status(400).json({ error: 'Invalid project ID' });
      return;
    }
    next();
  });
  app.use('/api/analysis',analysisRouter);
  app.use('/api/health', healthRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/projects/:id/blueprints', blueprintsRouter);
  app.use('/api/projects/:id/floor-plan', floorPlansRouter);
  app.use('/api/materials', materialsRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
