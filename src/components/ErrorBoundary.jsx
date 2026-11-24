import { Component } from 'react';
import { clearSaved } from '../lib/idbStorage';

export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ fontFamily: 'system-ui', maxWidth: 420, margin: '15vh auto', padding: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: 20 }}>Something went wrong</h1>
        <p style={{ color: '#666', fontSize: 14 }}>{String(this.state.error?.message || this.state.error)}</p>
        <button style={{ padding: '12px 18px', border: 0, borderRadius: 12, background: '#a8761c', color: '#fff', fontWeight: 600, margin: 6 }} onClick={() => location.reload()}>Reload</button>
        <button style={{ padding: '12px 18px', border: '1px solid #ccc', borderRadius: 12, background: '#fff', fontWeight: 600, margin: 6 }} onClick={async () => { if (confirm('Clear this app\'s saved copy on this phone? Unsent changes will be lost.')) { await clearSaved((k) => String(k).startsWith('stitchbook-')); location.reload(); } }}>Reset saved data</button>
      </div>
    );
  }
}
