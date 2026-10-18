import { API_BASE_URL } from '../api/config';
import type { FloorPlan } from '../types/floorPlan';
export async function enhancedAnalysis(file:Blob,filename:string,width?:number,length?:number):Promise<FloorPlan> {
  const data=new FormData();data.append('blueprint',file,filename);if(width)data.append('plotWidthMeters',String(width));if(length)data.append('plotLengthMeters',String(length));
  let response:Response;
  try {response=await fetch(API_BASE_URL+'/api/analysis/image',{method:'POST',body:data,signal:AbortSignal.timeout(120000)});}
  catch {throw new Error('The dimension-reading service is unavailable. Start the studio with npm run dev (starts both services), or choose Basic outline for an uncalibrated draft.');}
  const result:unknown=await response.json();
  if(!response.ok)throw new Error(typeof result==='object'&&result!==null&&'error' in result?String(result.error):'Blueprint analysis failed.');
  return result as FloorPlan;
}
