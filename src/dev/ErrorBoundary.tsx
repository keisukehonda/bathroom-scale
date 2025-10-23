// src/dev/ErrorBoundary.tsx
import React from 'react';
export default class ErrorBoundary extends React.Component<{children: React.ReactNode},{error?:Error,info?:React.ErrorInfo}>{
  state: {error?:Error,info?:React.ErrorInfo} = {};
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('🛑 ErrorBoundary:', error);
    console.error('🧱 Component stack:', info.componentStack);
    this.setState({ error, info });
  }
  render() {
    if (this.state.error) {
      return <pre style={{whiteSpace:'pre-wrap',color:'crimson',padding:12}}>
{String(this.state.error)}{"\n"}{this.state.info?.componentStack}
</pre>;
    }
    return this.props.children;
  }
}
