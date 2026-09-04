import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { Vangnet } from './components/Vangnet'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Vangnet>
      <App />
    </Vangnet>
  </StrictMode>,
)
