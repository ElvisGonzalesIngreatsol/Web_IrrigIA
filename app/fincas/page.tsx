import { FincasManagement } from "@/components/fincas-management"
import { ProtectedRoute } from "@/components/protected-route"

export default function FincasPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <FincasManagement />
    </ProtectedRoute>
  )
}
