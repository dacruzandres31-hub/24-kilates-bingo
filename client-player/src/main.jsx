import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode deshabilitado temporalmente para evitar doble ejecución de efectos de audio
  // <React.StrictMode>
    <App />
  // </React.StrictMode>,
)
