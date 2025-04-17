import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// import PizzaCanvas from './PizzaCanvas.tsx'
import PizzaCanvas from './components/PizzaCanvas.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* <App /> */}
    <PizzaCanvas />
    
  </StrictMode>,
)
