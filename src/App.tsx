import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { LoginPage, RegisterPage, DashboardPage, BuscaPage, CasosListPage, CasoFormPage, InvestigadoPage, CautelaresPage, RelatoriosPage, ImportacaoPage } from '@/pages'
import { ProtectedRoute, RoleGuard, AppLayout } from '@/components'

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#161B22',
          color: '#E6EDF3',
          border: '1px solid #30363D'
        }
      }} />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Rotas Protegidas */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <AppLayout><DashboardPage /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/busca" element={
          <ProtectedRoute>
            <AppLayout><BuscaPage /></AppLayout>
          </ProtectedRoute>
        } />

        {/* Gestão de Casos */}
        <Route path="/casos" element={
          <ProtectedRoute>
            <AppLayout><CasosListPage /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/casos/novo" element={
          <ProtectedRoute>
            <RoleGuard feature="editar-caso">
              <AppLayout><CasoFormPage /></AppLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />
        <Route path="/casos/:id" element={
          <ProtectedRoute>
            <AppLayout><CasoFormPage /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/investigado/:id" element={
          <ProtectedRoute>
            <AppLayout><InvestigadoPage /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/cautelares" element={
          <ProtectedRoute>
            <AppLayout><CautelaresPage /></AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/relatorios" element={
          <ProtectedRoute>
            <RoleGuard feature="visualizar-relatorios">
              <AppLayout><RelatoriosPage /></AppLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />

        <Route path="/importacao" element={
          <ProtectedRoute>
            <RoleGuard feature="editar-caso">
              <AppLayout><ImportacaoPage /></AppLayout>
            </RoleGuard>
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
