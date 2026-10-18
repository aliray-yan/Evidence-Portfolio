import { RequestHandler, Router } from 'express';
import path from 'node:path';
import multer from 'multer';
import { getProjectById } from '../services/projects/projectsRepository';
import { Blueprint, createBlueprint, getBlueprintById, listBlueprintsForProject, setBlueprintStatus, } from '../services/blueprints/blueprintsRepository';
import { detectMimeType } from '../services/blueprints/fileSignature';
import { readBlueprintFile, saveBlueprintFile } from '../services/blueprints/storage';
import { HeuristicBlueprintAnalyzer } from '../services/blueprint-processing/HeuristicBlueprintAnalyzer';
import { rasterizePdf } from '../services/blueprint-processing/rasterize';
import { upsertFloorPlan } from '../services/floor-plans/floorPlanRepository';
import { isValidFloorPlanShape } from '../services/floor-plans/validateShape';
import { env } from '../config/env';
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadSizeBytes },
});
const analyzer = new HeuristicBlueprintAnalyzer();
const activeProjects = new Set<string>();
// Mounted at /api/projects/:id/blueprints — mergeParams exposes the parent's
// :id here, but Express's path-based type inference can't see across that
// mount boundary, so the param shape is declared explicitly below instead.
interface ProjectParams {
  id: string;
}
interface BlueprintParams extends ProjectParams {
  blueprintId: string;
}
export const blueprintsRouter = Router({ mergeParams: true });
blueprintsRouter.param('blueprintId', (_req, res, next, id: string) => { if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
  res.status(400).json({ error: 'Invalid blueprint ID' });
  return;
} next(); });
function sanitizeFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() ?? 'upload';
  return base.slice(0, 255);
}
const listForProject: RequestHandler<ProjectParams> = async (req, res, next) => {
  try {
    const { id: projectId } = req.params;
    const project = await getProjectById(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    const blueprints = await listBlueprintsForProject(projectId);
    res.json(blueprints);
  }
  catch (error) {
    next(error);
  }
};
const uploadForProject: RequestHandler<ProjectParams> = async (req, res, next) => {
  try {
    const { id: projectId } = req.params;
    const project = await getProjectById(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'No file was uploaded (expected field "blueprint")' });
      return;
    }
    const detectedMimeType = detectMimeType(req.file.buffer);
    if (!detectedMimeType) {
      res
        .status(415)
        .json({ error: 'Unsupported file type — only PDF, PNG, and JPEG are accepted' });
      return;
    }
    const { storagePath } = await saveBlueprintFile(req.file.buffer, detectedMimeType);
    const blueprint = await createBlueprint({
      projectId,
      originalFilename: sanitizeFilename(req.file.originalname),
      storagePath,
      mimeType: detectedMimeType,
      fileSizeBytes: req.file.size,
    });
    res.status(201).json(blueprint);
  }
  catch (error) {
    next(error);
  }
};
const getOne: RequestHandler<BlueprintParams> = async (req, res, next) => {
  try {
    const { id: projectId, blueprintId } = req.params;
    const blueprint = await getBlueprintById(projectId, blueprintId);
    if (!blueprint) {
      res.status(404).json({ error: 'Blueprint not found' });
      return;
    }
    const { storagePath: _storagePath, ...publicBlueprint } = blueprint;
    res.json(publicBlueprint);
  }
  catch (error) {
    next(error);
  }
};
const getFile: RequestHandler<BlueprintParams> = async (req, res, next) => {
  try {
    const { id: projectId, blueprintId } = req.params;
    const blueprint = await getBlueprintById(projectId, blueprintId);
    if (!blueprint) {
      res.status(404).json({ error: 'Blueprint not found' });
      return;
    }
    const buffer = await readBlueprintFile(blueprint.storagePath);
    res.setHeader('Content-Type', blueprint.mimeType);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    // Uploaded PDFs can be embedded by the separate frontend origin.
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' " + env.corsOrigin);
    res.send(buffer);
  }
  catch (error) {
    next(error);
  }
};
/**
* Runs after the response has already gone out (see analyzeBlueprint) — a
* fire-and-forget background job with no queue, appropriate for this
* project's scale. Success or failure both end by recording a final
* status; nothing here is ever left "processing" forever short of the
* process itself dying.
*/
async function runAnalysis(projectId: string, blueprint: Blueprint & {
  storagePath: string;
}, plotWidthMeters?: number, plotLengthMeters?: number): Promise<void> {
  try {
    let imagePath = blueprint.storagePath;
    if (blueprint.mimeType === 'application/pdf') {
      imagePath = await rasterizePdf(blueprint.storagePath, path.dirname(blueprint.storagePath));
    }
    const draft = await analyzer.analyze({ imagePath, plotWidthMeters, plotLengthMeters });
    Object.assign(draft.metadata, { sourceBlueprintId: blueprint.id });
    if (!isValidFloorPlanShape(draft)) {
      throw new Error('Analysis worker produced an invalid floor plan shape');
    }
    await upsertFloorPlan(projectId, draft as unknown as Record<string, unknown>);
    await setBlueprintStatus(blueprint.id, 'completed');
  }
  catch (error) {
    console.error('Blueprint analysis failed:', error);
    try {
      await setBlueprintStatus(blueprint.id, 'failed');
    }
    catch (statusError) {
      console.error('Could not save failed analysis status:', statusError);
    }
  }
  finally {
    activeProjects.delete(projectId);
  }
}
const analyzeBlueprint: RequestHandler<BlueprintParams> = async (req, res, next) => {
  try {
    const { id: projectId, blueprintId } = req.params;
    const blueprint = await getBlueprintById(projectId, blueprintId);
    if (!blueprint) {
      res.status(404).json({ error: 'Blueprint not found' });
      return;
    }
    const plotWidthMeters = req.body?.plotWidthMeters;
    const plotLengthMeters = req.body?.plotLengthMeters;
    if (plotWidthMeters !== undefined && (typeof plotWidthMeters !== 'number' || !Number.isFinite(plotWidthMeters) || plotWidthMeters <= 0 || plotWidthMeters > 500)) {
      res.status(400).json({ error: 'Known plot width must be between 0 and 500 metres' });
      return;
    }
    if (plotLengthMeters !== undefined && (typeof plotLengthMeters !== 'number' || !Number.isFinite(plotLengthMeters) || plotLengthMeters <= 0 || plotLengthMeters > 500)) {
      res.status(400).json({ error: 'Known plot length must be between 0 and 500 metres' });
      return;
    }
    if (activeProjects.has(projectId)) {
      res.status(409).json({ error: 'This project already has an analysis running' });
      return;
    }
    activeProjects.add(projectId);
    try {
      await setBlueprintStatus(blueprint.id, 'processing');
    }
    catch (error) {
      activeProjects.delete(projectId);
      throw error;
    }
    res.status(202).json({ status: 'processing' });
    // Intentionally not awaited — the response above has already been sent.
    void runAnalysis(projectId, blueprint, plotWidthMeters, plotLengthMeters);
  }
  catch (error) {
    next(error);
  }
};
const getAnalysisStatus: RequestHandler<BlueprintParams> = async (req, res, next) => {
  try {
    const { id: projectId, blueprintId } = req.params;
    const blueprint = await getBlueprintById(projectId, blueprintId);
    if (!blueprint) {
      res.status(404).json({ error: 'Blueprint not found' });
      return;
    }
    res.json({ status: blueprint.processingStatus });
  }
  catch (error) {
    next(error);
  }
};
blueprintsRouter.get('/', listForProject);
blueprintsRouter.post('/', upload.single('blueprint'));
blueprintsRouter.post('/', uploadForProject);
blueprintsRouter.get('/:blueprintId', getOne);
blueprintsRouter.get('/:blueprintId/file', getFile);
blueprintsRouter.post('/:blueprintId/analyze', analyzeBlueprint);
blueprintsRouter.get('/:blueprintId/analysis-status', getAnalysisStatus);
