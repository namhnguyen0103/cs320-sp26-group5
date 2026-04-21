import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'


const globalStyle = document.createElement("style");
globalStyle.textContent = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
    background: #111;
  }
  #root {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
`;
document.head.appendChild(globalStyle);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
