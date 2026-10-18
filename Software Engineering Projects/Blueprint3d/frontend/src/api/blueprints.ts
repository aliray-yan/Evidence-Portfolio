import { enhancedAnalysis } from '../utils/enhancedAnalysis';
import { stagePlan,proposeWindows } from '../utils/staging';
import { assertFloorPlan } from '../utils/planValidation';
import { apiFetch } from './request';
import { API_BASE_URL, LOCAL_MODE } from './config';
import { readLocal, writeLocal, localSave, localUpload, localProject } from './localStore';
export interface Blueprint {
  id: string;
  projectId: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  uploadedAt: string;
}
export async function listBlueprints(projectId: string): Promise<Blueprint[]> {
  if (LOCAL_MODE) {
    localProject(projectId);
    return readLocal().blueprints[projectId] ?? [];
  }
  const response = await apiFetch(`${API_BASE_URL}/api/projects/${projectId}/blueprints`);
  if (!response.ok) {
    throw new Error(`Failed to load blueprints (${response.status})`);
  }
  return response.json() as Promise<Blueprint[]>;
}
export async function uploadBlueprint(projectId: string, file: File): Promise<Blueprint> {
  if (LOCAL_MODE)
    return localUpload(projectId, file);
  const formData = new FormData();
  formData.append('blueprint', file);
  const response = await apiFetch(`${API_BASE_URL}/api/projects/${projectId}/blueprints`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`Failed to upload blueprint (${response.status})`);
  }
  return response.json() as Promise<Blueprint>;
}
export function getBlueprintFileUrl(projectId: string, blueprintId: string): string {
  if (LOCAL_MODE)
    return readLocal().blueprints[projectId]?.find(b => b.id === blueprintId)?.dataUrl ?? '';
  return `${API_BASE_URL}/api/projects/${projectId}/blueprints/${blueprintId}/file`;
}
export async function analyzeBlueprint(projectId: string, blueprintId: string, plotWidthMeters?: number,options:{engine?:'enhanced'|'basic';plotLengthMeters?:number}={}): Promise<void> {
  if (LOCAL_MODE) {
    const data = readLocal();
    const blueprint = data.blueprints[projectId]?.find(b => b.id === blueprintId);
    if (!blueprint)
      throw new Error('Blueprint not found.');
    if (blueprint.mimeType === 'application/pdf'&&options.engine==='basic')
      throw new Error('Local analysis supports PNG and JPG. Export your PDF as an image, or use server mode.');
    if (blueprint.processingStatus === 'processing')
      throw new Error('Analysis is already running.');
    blueprint.processingStatus = 'processing';
    writeLocal(data);
    try {
      const { analyzeLocalImage } = await import('../utils/localBlueprintAnalyzer');
      let plan:import('../types/floorPlan').FloorPlan;
      if(options.engine==='basic'){plan=await analyzeLocalImage(blueprint.dataUrl,plotWidthMeters);plan.metadata.analysisEngine='browser-structural';plan.metadata.accuracyStatus='draft';}
      else{const file=await (await fetch(blueprint.dataUrl)).blob();plan=await enhancedAnalysis(file,blueprint.originalFilename,plotWidthMeters,options.plotLengthMeters);}
      assertFloorPlan(plan);
      plan=stagePlan(proposeWindows(plan));
      plan.metadata.sourceBlueprintId = blueprintId;
      localSave(projectId, plan);
      const latest = readLocal();
      const saved = latest.blueprints[projectId]?.find(b => b.id === blueprintId);
      if (saved)
        saved.processingStatus = 'completed';
      writeLocal(latest);
    }
    catch (e) {
      const latest = readLocal();
      const saved = latest.blueprints[projectId]?.find(b => b.id === blueprintId);
      if (saved)
        saved.processingStatus = 'failed';
      writeLocal(latest);
      throw e;
    }
    return;
  }
  const response = await apiFetch(`${API_BASE_URL}/api/projects/${projectId}/blueprints/${blueprintId}/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plotWidthMeters,plotLengthMeters:options.plotLengthMeters }) });
  if (!response.ok) {
    throw new Error(`Failed to start analysis (${response.status})`);
  }
}
export async function getAnalysisStatus(projectId: string, blueprintId: string): Promise<Blueprint['processingStatus']> {
  const response = await apiFetch(`${API_BASE_URL}/api/projects/${projectId}/blueprints/${blueprintId}/analysis-status`);
  if (!response.ok) {
    throw new Error(`Failed to check analysis status (${response.status})`);
  }
  const data = (await response.json()) as {
    status: Blueprint['processingStatus'];
  };
  return data.status;
}
