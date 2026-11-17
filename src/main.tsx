import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { applyTheme } from './ui/theme'
import { installSkins } from './ui/skin'
import './styles.css'
import './blocks.css'
import './layout.css'
import './sections.css'

applyTheme()
installSkins()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
