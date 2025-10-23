// src/dev/ErrorBoundary.tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null; info: ErrorInfo | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // 直上の自作コンポーネントが分かる
    console.error('🛑 ErrorBoundary:', error);
    console.error('🧱 Component stack:', info.componentStack);
    this.setState({ error, info });
  }

  override render() {
    if (this.state.error) {
      return (
        <pre style={{ whiteSpace: 'pre-wrap', color: 'crimson', padding: 12, background: '#fff5f5' }}>
{`App crashed:
${String(this.state.error)}
---
Component stack:
${this.state.info?.componentStack ?? ''}`}
        </pre>
      );
    }
    return this.props.children;
  }
}
