import { Router } from 'express';
import multer from 'multer';
import { mkdtemp,writeFile,rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { detectMimeType } from '../services/blueprints/fileSignature';
import { HeuristicBlueprintAnalyzer } from '../services/blueprint-processing/HeuristicBlueprintAnalyzer';
import { rasterizePdf } from '../services/blueprint-processing/rasterize';
import { isValidFloorPlanShape } from '../services/floor-plans/validateShape';
export const analysisRouter=Router();
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:20*1024*1024}}),analyzer=new HeuristicBlueprintAnalyzer();
let active=0;
analysisRouter.get('/health',(_req,res)=>res.json({service:'blueprint3d-analysis',engine:'cv-ocr',databaseRequired:false}));
analysisRouter.post('/image',upload.single('blueprint'),async(req,res,next)=>{
  let directory:string|undefined;let counted=false;
  if(active>=2){res.status(429).json({error:'Two analyses are running. Try again shortly.'});return;}
  try {
    if(!req.file){res.status(400).json({error:'Upload a PNG, JPG or PDF blueprint.'});return;}
    const mime=detectMimeType(req.file.buffer);if(!mime){res.status(415).json({error:'Unsupported blueprint format.'});return;}
    const width=req.body?.plotWidthMeters?Number(req.body.plotWidthMeters):undefined;
    const length=req.body?.plotLengthMeters?Number(req.body.plotLengthMeters):undefined;
    if([width,length].some(v=>v!==undefined&&(!Number.isFinite(v)||v<=0||v>500))){res.status(400).json({error:'Plot dimensions must be between 0 and 500 metres.'});return;}
    active++;counted=true;
    directory=await mkdtemp(path.join(os.tmpdir(),'blueprint3d-analysis-'));
    let filename=path.join(directory,mime==='application/pdf'?'plan.pdf':mime==='image/png'?'plan.png':'plan.jpg');
    await writeFile(filename,req.file.buffer);
    if(mime==='application/pdf')filename=await rasterizePdf(filename,directory);
    const plan=await analyzer.analyze({imagePath:filename,plotWidthMeters:width,plotLengthMeters:length});
    if(!isValidFloorPlanShape(plan))throw new Error('Analysis produced malformed geometry. Try a clearer drawing.');
    res.json(plan);
  } catch(error) {
    if(error instanceof Error){res.status(422).json({error:error.message});return;}
    next(error);
  } finally {
    if(counted)active--;
    if(directory)await rm(directory,{recursive:true,force:true}).catch(()=>{});
  }
});
