import { Component, type ErrorInfo, type ReactNode } from 'react'
import * as Sentry from '@sentry/react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack)
    Sentry.captureException(error, {
      contexts: { react: { componentStack: info.componentStack ?? '' } },
    })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: '0.75rem',
            padding: '2rem',
            textAlign: 'center',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
            Algo salió mal
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
            Ocurrió un error inesperado. Recarga la página para continuar.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem 1.25rem',
              borderRadius: '0.375rem',
              background: '#111827',
              color: '#fff',
              border: 'none',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Recargar página
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
