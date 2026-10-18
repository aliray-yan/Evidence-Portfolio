import type { LengthUnit } from '../types/floorPlan';
import { toMeters } from './units';
export function parseDimensionInput(input:string,unit:LengthUnit):number|undefined {
  let text=input.trim().replace(/[′’‘]/g,"'").replace(/[″“”]/g,'"').replace(/(\d)½/g,'$1.5').replace(/(\d)¼/g,'$1.25').replace(/(\d)¾/g,'$1.75');
  if(!text)return undefined;
  const imperial=text.match(/^\s*(\d+(?:\.\d+)?)\s*'\s*-?\s*(\d+(?:\.\d+)?)?\s*"?\s*$/);
  if(imperial){const inches=Number(imperial[2]??0);if(inches>=12)throw new Error('Inches must be below 12.');const meters=(Number(imperial[1])+inches/12)*.3048;if(meters<=0)throw new Error('Enter a positive dimension.');return meters;}
  const suffix=text.match(/\s*(m|ft|cm|in)\s*$/i);const actualUnit=suffix?suffix[1].toLowerCase() as LengthUnit:unit;
  text=text.replace(/\s*(m|ft|cm|in)\s*$/i,'');
  const value=Number(text);if(!Number.isFinite(value)||value<=0)throw new Error('Enter a positive dimension, e.g. 40.125 ft or 40\'-1½".');
  return toMeters(value,actualUnit);
}
