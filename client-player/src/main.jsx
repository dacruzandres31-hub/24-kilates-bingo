import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'

// Configurar axios baseURL
axios.defaults.baseURL = 'http://localhost:3001';

ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode deshabilitado temporalmente para evitar doble ejecución de efectos de audio
  // <React.StrictMode>
    <App />
  // </React.StrictMode>,
)
