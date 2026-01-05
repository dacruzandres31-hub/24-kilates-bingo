import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'

// Configurar axios baseURL - vacío para usar rutas relativas en producción
axios.defaults.baseURL = '';

import ErrorBoundary from './helpers/ErrorBoundary.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode deshabilitado temporalmente para evitar doble ejecución de efectos de audio
  // <React.StrictMode>
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
  // </React.StrictMode>,
)
