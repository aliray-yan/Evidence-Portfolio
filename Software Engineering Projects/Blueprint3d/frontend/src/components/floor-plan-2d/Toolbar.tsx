import type { LengthUnit } from '../../types/floorPlan';
import type { Tool } from './types';
interface ToolbarProps {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  unit: LengthUnit;
  onUnitChange: (unit: LengthUnit) => void;
}
const TOOLS: {
  id: Tool;
  label: string;
}[] = [
  { id: 'select', label: 'Select' },
  { id: 'wall', label: 'Add wall' },
  { id: 'room', label: 'Add room' },
];
const UNITS: LengthUnit[] = ['m', 'cm', 'ft', 'in'];
export function Toolbar({ tool, onToolChange, unit, onUnitChange }: ToolbarProps) {
  return (<div className="toolbar">
   <div className="toolbar__group">
    {TOOLS.map((item) => (<button key={item.id} type="button" className={`toolbar__button${tool === item.id ? ' is-active' : ''}`} onClick={() => onToolChange(item.id)}>
      {item.label}
     </button>))}
   </div>
   <label className="toolbar__unit">
    Units
    <select value={unit} onChange={(event) => onUnitChange(event.target.value as LengthUnit)}>
     {UNITS.map((u) => (<option key={u} value={u}>
       {u}
      </option>))}
    </select>
   </label>
  </div>);
}
