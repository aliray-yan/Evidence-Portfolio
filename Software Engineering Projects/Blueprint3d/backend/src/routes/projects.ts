import { Router } from 'express';
import { createProject, deleteProject, getProjectById, listProjects, updateProject, } from '../services/projects/projectsRepository';
export const projectsRouter = Router();
projectsRouter.param('id', (_req, res, next, id: string) => { if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
  res.status(400).json({ error: 'Invalid project ID' });
  return;
} next(); });
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
projectsRouter.get('/', async (_req, res, next) => {
  try {
    const projects = await listProjects();
    res.json(projects);
  }
  catch (error) {
    next(error);
  }
});
projectsRouter.post('/', async (req, res, next) => {
  try {
    const { name, description } = req.body ?? {};
    if (!isNonEmptyString(name)) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const project = await createProject({
      name: name.trim(),
      description: typeof description === 'string' ? description : null,
    });
    res.status(201).json(project);
  }
  catch (error) {
    next(error);
  }
});
projectsRouter.get('/:id', async (req, res, next) => {
  try {
    const project = await getProjectById(req.params.id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(project);
  }
  catch (error) {
    next(error);
  }
});
projectsRouter.patch('/:id', async (req, res, next) => {
  try {
    const { name, description } = req.body ?? {};
    if (name !== undefined && !isNonEmptyString(name)) {
      res.status(400).json({ error: 'name must be a non-empty string' });
      return;
    }
    if (description !== undefined && description !== null && typeof description !== 'string') {
      res.status(400).json({ error: 'description must be a string or null' });
      return;
    }
    const project = await updateProject(req.params.id, {
      name: typeof name === 'string' ? name.trim() : undefined,
      description,
    });
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(project);
  }
  catch (error) {
    next(error);
  }
});
projectsRouter.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await deleteProject(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.status(204).send();
  }
  catch (error) {
    next(error);
  }
});
