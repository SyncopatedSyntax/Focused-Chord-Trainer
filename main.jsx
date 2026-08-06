import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fretworks/design/styles.css'
import App from './App.jsx'
import { ChordsProvider } from './lib/ChordsContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChordsProvider>
      <App />
    </ChordsProvider>
  </React.StrictMode>,
)
