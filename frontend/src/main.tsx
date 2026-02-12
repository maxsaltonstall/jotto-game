import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { initializeDatadogRUM } from './utils/datadog-rum'

// Initialize Datadog RUM to track frontend performance and user interactions
initializeDatadogRUM();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
