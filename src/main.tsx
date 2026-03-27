import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { createOllamaProvider } from './lib/llm/ollama'
import { DEFAULT_LLM_CONFIG } from './lib/types'

const provider = createOllamaProvider({
  baseUrl: DEFAULT_LLM_CONFIG.ollamaBaseUrl,
  model: DEFAULT_LLM_CONFIG.ollamaModel,
  temperature: DEFAULT_LLM_CONFIG.temperature,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App provider={provider} />
  </StrictMode>,
)
