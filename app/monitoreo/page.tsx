import { MonitoreoAvanzado } from "@/components/monitoreo-avanzado"
import { ProtectedRoute } from "@/components/protected-route"

export default function MonitoreoPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <MonitoreoAvanzado />
    </ProtectedRoute>
  )
}
