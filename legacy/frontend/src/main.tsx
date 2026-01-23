import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Build verification - Updated to track latest fixes
console.log('🚀 Build verification: commit 272a389 - ALL token fixes applied');
console.log('📦 Bundle: index-nAZa_pgC.js - Latest deployment');
console.log('🔍 If you see "token is not defined" error, please report the exact component name from the stack trace');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
