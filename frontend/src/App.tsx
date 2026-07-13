import { Routes, Route, Navigate } from 'react-router-dom'
import { DEV_AUTH_DISABLED } from './config/auth'
import { MainLayout } from './layouts/MainLayout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { LandingPage } from './features/landing/LandingPage'
import { Dashboard } from './pages/Dashboard/Dashboard'
import { Login } from './pages/Login/Login'
import { Register } from './pages/Register/Register'
import { NotFoundPage } from './pages/NotFound/NotFoundPage'
import { ConnectionErrorPage } from './pages/ConnectionError/ConnectionErrorPage'
import { ClientsPage } from './features/clients/pages/ClientsPage'
import { ClientDetailPage } from './features/clients/pages/ClientDetailPage'
import { SalesTaxPage } from './features/sales-tax/pages/SalesTaxPage'
import { WithholdingPage } from './features/withholding/pages/WithholdingPage'
import { DocumentsPage } from './features/documents/pages/DocumentsPage'
import { ComplianceViewPage } from './features/documents/pages/ComplianceViewPage'
import { AdminRoute } from './components/auth/AdminRoute'
import { AdminLayout } from './pages/Admin/AdminLayout'
import { AdminDashboard } from './pages/Admin/AdminDashboard'
import { UserManagement } from './pages/Admin/UserManagement'
import { Whts165Page } from './features/documents/pages/Whts165Page'
import { TasksPage } from './features/tasks/pages/TasksPage'
import { ReportsPage } from './features/reports/pages/ReportsPage'
import { SettingsPage } from './features/settings/pages/SettingsPage'
import { BackupPage } from './features/backup/pages/BackupPage'
import { Agentation } from 'agentation'

// In dev mode, ensure a token always exists so ProtectedRoute and API interceptor never redirect away
if (DEV_AUTH_DISABLED && !localStorage.getItem('token')) {
  localStorage.setItem('token', 'dev-token')
  localStorage.setItem('user', JSON.stringify({ id: 'dev-user', name: 'Dev User', username: 'dev', role: 'admin' }))
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="/connection-error" element={<ConnectionErrorPage />} />
        {/* Admin Portal routes */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
        </Route>
        {/* All routes inside MainLayout with sidebar */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/:clientId" element={<ClientDetailPage />} />
          <Route path="/client" element={<Navigate to="/clients" replace />} />
          <Route path="/sales-tax" element={<SalesTaxPage />} />
          <Route path="/withholding" element={<WithholdingPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/document" element={<Navigate to="/documents" replace />} />
          <Route path="/compliance" element={<ComplianceViewPage />} />
          <Route path="/whts-165" element={<Whts165Page />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/backups" element={<BackupPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {import.meta.env.DEV && <Agentation />}
    </>
  )
}

export default App
