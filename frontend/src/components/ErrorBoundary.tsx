import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary para capturar errores de React y mostrar un fallback visible.
 * Útil para diagnosticar páginas en blanco.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          style={{
            padding: '2rem',
            maxWidth: '800px',
            margin: '2rem auto',
            fontFamily: 'system-ui, sans-serif',
            background: '#fff',
            border: '2px solid #e53e3e',
            borderRadius: '8px',
            color: '#1a202c'
          }}
        >
          <h2 style={{ color: '#e53e3e', marginBottom: '1rem' }}>
            ⚠️ Error en la aplicación
          </h2>
          <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>
            {this.state.error.message}
          </p>
          {this.state.errorInfo && (
            <pre
              style={{
                marginTop: '1rem',
                padding: '1rem',
                background: '#f7fafc',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '12px'
              }}
            >
              {this.state.errorInfo.componentStack}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: '#3182ce',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Recargar página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
