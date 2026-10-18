import { useRef, useState, type MouseEvent, type ReactNode, type WheelEvent } from 'react';
import './PanZoomViewer.css';
interface PanZoomViewerProps {
  children: ReactNode;
}
const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.2;
export function PanZoomViewer({ children }: PanZoomViewerProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  function clampScale(value: number): number {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
  }
  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setScale((current) => clampScale(current + delta));
  }
  function handleMouseDown(event: MouseEvent<HTMLDivElement>) {
    dragState.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  }
  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (!dragState.current) {
      return;
    }
    const dx = event.clientX - dragState.current.startX;
    const dy = event.clientY - dragState.current.startY;
    setOffset({ x: dragState.current.originX + dx, y: dragState.current.originY + dy });
  }
  function stopDragging() {
    dragState.current = null;
  }
  function zoomIn() {
    setScale((current) => clampScale(current + ZOOM_STEP));
  }
  function zoomOut() {
    setScale((current) => clampScale(current - ZOOM_STEP));
  }
  function reset() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }
  return (<div className="pan-zoom">
   <div className="pan-zoom__viewport" onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={stopDragging} onMouseLeave={stopDragging}>
    <div className="pan-zoom__surface" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}>
     {children}
    </div>
   </div>
   <div className="pan-zoom__controls">
    <button type="button" onClick={zoomOut} aria-label="Zoom out">
     −
    </button>
    <span className="pan-zoom__scale">{Math.round(scale * 100)}%</span>
    <button type="button" onClick={zoomIn} aria-label="Zoom in">
     +
    </button>
    <button type="button" onClick={reset} className="pan-zoom__reset">
     Reset
    </button>
   </div>
  </div>);
}
