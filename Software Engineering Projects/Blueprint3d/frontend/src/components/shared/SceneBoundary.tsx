import { Component, type ReactNode } from 'react';
export class SceneBoundary extends Component<{
  children: ReactNode;
}, {
  failed: boolean;
}> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="empty-state"><h3>3D could not start on this device.</h3><p>Enable hardware acceleration in your browser and reload. You can still edit and export your 2D plan.</p><button className="secondary-button" onClick={() => window.location.reload()}>Reload viewer</button></div> : this.props.children; }
}
