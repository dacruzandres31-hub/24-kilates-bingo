import React from 'react';

/**
 * ErrorBoundary - Componente para capturar errores de renderizado en React.
 * Evita que toda la aplicación colapse por un error en un componente hijo.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Actualizar estado para mostrar UI de repuesto
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Loguear el error (aquí podrías enviar a un servicio como Sentry)
        console.error('🔴 [ErrorBoundary] Error capturado:', error);
        console.error('🔴 [ErrorBoundary] Info:', errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // UI de Fallback Personalizable
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // UI de Fallback Por defecto
            return (
                <div style={styles.container}>
                    <div style={styles.card}>
                        <div style={styles.icon}>⚠️</div>
                        <h2 style={styles.title}>¡Ups! Algo salió mal.</h2>
                        <p style={styles.message}>
                            Ocurrió un error inesperado en la aplicación.
                        </p>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details style={styles.details}>
                                <summary>Detalles del Error</summary>
                                <p>{this.state.error.toString()}</p>
                                <pre style={styles.stack}>{this.state.errorInfo?.componentStack}</pre>
                            </details>
                        )}
                        <button style={styles.button} onClick={this.handleReload}>
                            Recargar Página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Estilos inline básicos para asegurar que se vea bien sin CSS externo crítico
const styles = {
    container: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#111827',
        color: '#F3F4F6',
        fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    card: {
        backgroundColor: '#1F2937',
        padding: '2rem',
        borderRadius: '0.75rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        maxWidth: '28rem',
        width: '100%',
        textAlign: 'center',
        border: '1px solid #374151'
    },
    icon: {
        fontSize: '3rem',
        marginBottom: '1rem'
    },
    title: {
        fontSize: '1.5rem',
        fontWeight: 'bold',
        marginBottom: '0.5rem',
        color: '#F87171'
    },
    message: {
        color: '#9CA3AF',
        marginBottom: '1.5rem'
    },
    details: {
        marginTop: '1rem',
        marginBottom: '1rem',
        backgroundColor: '#374151',
        padding: '0.5rem',
        borderRadius: '0.25rem',
        textAlign: 'left',
        fontSize: '0.875rem',
        overflowX: 'auto'
    },
    stack: {
        fontSize: '0.75rem',
        color: '#D1D5DB',
        marginTop: '0.5rem'
    },
    button: {
        backgroundColor: '#3B82F6',
        color: 'white',
        padding: '0.75rem 1.5rem',
        borderRadius: '0.375rem',
        border: 'none',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    }
};

export default ErrorBoundary;
