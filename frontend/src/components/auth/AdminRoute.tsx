import { Navigate } from 'react-router-dom'
import { authService } from '@/services/authService'

interface AdminRouteProps {
  children: React.ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const token = authService.getToken()
  const user = authService.getUser()

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  // Check if user is admin
  const isAdmin = user.role === 'admin' || user.username === 'admin@admin'

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
