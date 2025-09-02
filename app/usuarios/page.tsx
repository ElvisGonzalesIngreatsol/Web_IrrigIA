import { UsuariosManagement } from "@/components/usuarios-management"
import { ProtectedRoute } from "@/components/protected-route"

export default function UsuariosPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <UsuariosManagement />
    </ProtectedRoute>
  )
}
