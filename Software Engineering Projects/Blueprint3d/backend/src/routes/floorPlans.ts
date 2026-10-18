import { RequestHandler, Router } from 'express';
import { getProjectById } from '../services/projects/projectsRepository';
import { getFloorPlanByProjectId, upsertFloorPlan, } from '../services/floor-plans/floorPlanRepository';
import { isValidFloorPlanShape } from '../services/floor-plans/validateShape';
import { validateFloorPlan } from '../services/validation/validateFloorPlan';
interface ProjectParams {
  id: string;
}
export const floorPlansRouter = Router({ mergeParams: true });
const getFloorPlan: RequestHandler<ProjectParams> = async (req, res, next) => {
  try {
    const { id: projectId } = req.params;
    const project = await getProjectById(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    const floorPlan = await getFloorPlanByProjectId(projectId);
    if (!floorPlan) {
      res.status(404).json({ error: 'No floor plan saved for this project yet' });
      return;
    }
    res.json(floorPlan);
  }
  catch (error) {
    next(error);
  }
};
const putFloorPlan: RequestHandler<ProjectParams> = async (req, res, next) => {
  try {
    const { id: projectId } = req.params;
    const project = await getProjectById(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    if (!isValidFloorPlanShape(req.body)) {
      res.status(400).json({
        error: 'Invalid floor plan document — expected a plot {width, length}, a valid unit, ' +
          'and array fields for walls/rooms/doors/windows/stairs/columns',
      });
      return;
    }
    const saved = await upsertFloorPlan(projectId, req.body);
    res.json(saved);
  }
  catch (error) {
    next(error);
  }
};
const postValidate: RequestHandler<ProjectParams> = async (req, res, next) => {
  try {
    const { id: projectId } = req.params;
    const project = await getProjectById(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    if (req.body !== undefined && !isValidFloorPlanShape(req.body)) {
      res.status(400).json({ error: 'Invalid floor plan document' });
      return;
    }
    const floorPlan = req.body ?? await getFloorPlanByProjectId(projectId);
    if (!floorPlan) {
      res.status(404).json({ error: 'No floor plan to validate — save one first or include it in the request body' });
      return;
    }
    res.json({ issues: validateFloorPlan(floorPlan) });
  }
  catch (error) {
    next(error);
  }
};
floorPlansRouter.get('/', getFloorPlan);
floorPlansRouter.put('/', putFloorPlan);
floorPlansRouter.post('/validate', postValidate);
