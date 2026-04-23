import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import App from './App.tsx'
import './index.css'
import './lib/leaflet-setup'

const queryClient = new QueryClient()

// Inicializa a store de autenticação antes de renderizar
const initApp = async () => {
  const store = useAuthStore.getState()
  await store.init()

  createRoot(document.getElementById('root')!).render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  )
}

initApp()
