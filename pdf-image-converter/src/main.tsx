import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

function Root() {
  useEffect(() => {
    const saved = window.localStorage.getItem('theme') as 'light' | 'dark' | null
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    const theme = saved ?? (prefersDark ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [])

  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
