import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import toast from 'react-hot-toast'
import App from './App.tsx'
import './index.css'
import './lib/leaflet-setup'

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      console.error('Query Error:', error);
      toast.error(`Erro ao carregar dados: ${error.message}`);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      console.error('Mutation Error:', error);
      toast.error(`Ação falhou: ${error.message}`);
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1, // Tenta mais 1 vez se falhar (útil para pequenas perdas de rede)
      refetchOnWindowFocus: false, // Menos requisições em background ao mudar abas
    },
  },
})

// Inicializa a store de autenticação antes de renderizar
const initApp = async () => {
  const store = useAuthStore.getState()
  await store.init()

  createRoot(document.getElementById('root')!).render(
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

initApp()
