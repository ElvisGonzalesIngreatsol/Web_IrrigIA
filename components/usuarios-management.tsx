"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useData } from "@/contexts/data-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination } from "@/components/table-pagination"
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { User } from "@/types"
import { apiService } from "@/lib/api"

const showDeleteConfirmation = (userName: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const dialog = document.createElement("div")
    dialog.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    dialog.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
        <div class="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
          <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-center mb-2">¿Eliminar Usuario?</h3>
        <p class="text-gray-600 text-center mb-6">¿Estás seguro de que quieres eliminar a <strong>${userName}</strong>? Esta acción no se puede deshacer.</p>
        <div class="flex gap-3">
          <button id="cancel-btn" class="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors">
            Cancelar
          </button>
          <button id="confirm-btn" class="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
            Eliminar
          </button>
        </div>
      </div>
    `

    document.body.appendChild(dialog)

    const cancelBtn = dialog.querySelector("#cancel-btn")
    const confirmBtn = dialog.querySelector("#confirm-btn")

    const cleanup = () => {
      document.body.removeChild(dialog)
    }

    cancelBtn?.addEventListener("click", () => {
      cleanup()
      resolve(false)
    })

    confirmBtn?.addEventListener("click", () => {
      cleanup()
      resolve(true)
    })

    // Close on backdrop click
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        cleanup()
        resolve(false)
      }
    })
  })
}

const showNotification = (type: "success" | "error" | "info", title: string, message: string): void => {
  const notification = document.createElement("div")
  notification.className =
    "fixed top-4 right-4 z-50 max-w-sm w-full bg-white rounded-lg shadow-lg border p-4 animate-in slide-in-from-right-full duration-300"

  const iconMap = {
    success:
      '<svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>',
    error:
      '<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>',
    info: '<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
  }

  const colorMap = {
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200",
    info: "bg-blue-50 border-blue-200",
  }

  notification.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0 mt-0.5">
        ${iconMap[type]}
      </div>
      <div class="flex-1 min-w-0">
        <h4 class="text-sm font-semibold text-gray-900 mb-1">${title}</h4>
        <p class="text-sm text-gray-600">${message}</p>
      </div>
      <button class="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors" onclick="this.parentElement.parentElement.remove()">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  `

  notification.className += ` ${colorMap[type]}`
  document.body.appendChild(notification)

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.animation = "slide-out-to-right-full 300ms ease-in forwards"
      setTimeout(() => {
        if (notification.parentElement) {
          document.body.removeChild(notification)
        }
      }, 300)
    }
  }, 5000)
}

export function UsuariosManagement() {
  const { fincas } = useData()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resettingPassword, setResettingPassword] = useState<Record<number, boolean>>({})
  const [temporaryPasswords, setTemporaryPasswords] = useState<Record<number, string>>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(6)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "" as "" | "ADMIN" | "USER", // Changed to allow empty string for validation
    fincaId: "",
    isActive: true,
  })

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("[v0] Fetching users from backend...")

      const response = await apiService.getUsers()

      if (response.success && response.data) {
        console.log("[v0] Users fetched successfully:", response.data)

        // Handle different possible response structures
        const usersData = response.data.users || response.data.data || response.data
        const mappedUsers = Array.isArray(usersData)
          ? usersData.map((user: any) => ({
              id: user.id || Math.floor(Math.random() * 1000000),
              name: user.name || user.nombre || "Sin nombre",
              email: user.email || "",
              password: user.password || "••••••••",
              phone: user.phone || user.telefono || "",
              role: (user.role || user.rol) === "ADMIN" ? "ADMIN" : "USER",
              fincaId: user.fincaId || user.finca_id || "",
              isActive: user.isActive !== undefined ? user.isActive : true,
              avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name || user.nombre}`,
              createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
              lastLogin: user.lastLogin ? new Date(user.lastLogin) : new Date(),
            }))
          : []

        setUsers(mappedUsers)
        console.log("[v0] Mapped users:", mappedUsers)
      } else {
        console.error("[v0] Failed to fetch users:", response.error)
        setError(response.error || "Error al cargar usuarios")
      }
    } catch (error) {
      console.error("[v0] Error fetching users:", error)
      setError("Error de conexión al cargar usuarios")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const totalItems = users.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)
  const paginatedUsers = users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    if (!formData.role) {
      setError("Debe seleccionar un rol para el usuario")
      setSubmitting(false)
      return
    }

    try {
      console.log("[v0] Submitting user data:", formData)

      const payload = {
        ...formData,
        role: formData.role as "ADMIN" | "USER",
      }

      if (editingUser) {
        const response = await apiService.updateUser(editingUser.id, payload)
        if (response.success) {
          console.log("[v0] User updated successfully")
          showNotification(
            "success",
            "Usuario Actualizado",
            `El usuario ${formData.name} ha sido actualizado correctamente.`,
          )
          await fetchUsers() // Refresh the list
        } else {
          setError(response.error || "Error al actualizar usuario")
          showNotification("error", "Error al Actualizar", response.error || "No se pudo actualizar el usuario.")
          return
        }
      } else {
        const response = await apiService.createUser(payload)
        if (response.success) {
          console.log("[v0] User created successfully")
          showNotification("success", "Usuario Creado", `El usuario ${formData.name} ha sido creado exitosamente.`)
          await fetchUsers() // Refresh the list
        } else {
          setError(response.error || "Error al crear usuario")
          showNotification("error", "Error al Crear", response.error || "No se pudo crear el usuario.")
          return
        }
      }

      setIsDialogOpen(false)
      setEditingUser(null)
      setFormData({
        name: "",
        email: "",
        password: "",
        phone: "",
        role: "",
        fincaId: "",
        isActive: true,
      })
    } catch (error) {
      console.error("[v0] Error submitting user:", error)
      setError("Error de conexión al guardar usuario")
      showNotification("error", "Error de Conexión", "No se pudo conectar con el servidor. Intente nuevamente.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: user.password,
      phone: user.phone,
      role: user.role,
      fincaId: user.fincaId || "",
      isActive: user.isActive,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    const user = users.find((u) => u.id === id)
    const userName = user?.name || "este usuario"

    const confirmed = await showDeleteConfirmation(userName)

    if (confirmed) {
      try {
        setError(null)
        console.log("[v0] Deleting user:", id)

        const response = await apiService.deleteUser(id)
        if (response.success) {
          console.log("[v0] User deleted successfully")
          showNotification("success", "Usuario Eliminado", `El usuario ${userName} ha sido eliminado correctamente.`)
          await fetchUsers() // Refresh the list
        } else {
          setError(response.error || "Error al eliminar usuario")
          showNotification("error", "Error al Eliminar", response.error || "No se pudo eliminar el usuario.")
        }
      } catch (error) {
        console.error("[v0] Error deleting user:", error)
        setError("Error de conexión al eliminar usuario")
        showNotification("error", "Error de Conexión", "No se pudo conectar con el servidor para eliminar el usuario.")
      }
    }
  }

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }))
  }

  const getFincaName = (fincaId?: string) => {
    if (!fincaId) return "Sin asignar"
    const finca = fincas.find((f) => f.id === fincaId)
    return finca?.name || "Finca no encontrada"
  }

  const handleResetPassword = async (userId: number) => {
    try {
      setResettingPassword((prev) => ({ ...prev, [userId]: true }))
      setError(null)
      console.log("[v0] Resetting password for user:", userId)

      const response = await apiService.resetUserPassword(userId)
      if (response.success && response.data) {
        console.log("[v0] Password reset successfully")
        setTemporaryPasswords((prev) => ({
          ...prev,
          [userId]: response.data!.temporaryPassword,
        }))

        showNotification(
          "success",
          "Contraseña Reseteada",
          `Se generó una nueva contraseña temporal para ${users.find((u) => u.id === userId)?.name || "el usuario"}.`,
        )

        const dialog = document.createElement("div")
        dialog.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        dialog.innerHTML = `
          <div class="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div class="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-center mb-2">Contraseña Temporal Generada</h3>
            <p class="text-gray-600 text-center mb-4">Nueva contraseña temporal:</p>
            <div class="bg-gray-100 p-3 rounded-md text-center font-mono text-lg mb-4">
              ${response.data.temporaryPassword}
            </div>
            <p class="text-sm text-gray-500 text-center mb-6">El usuario debe cambiar esta contraseña en su próximo inicio de sesión.</p>
            <button id="close-btn" class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              Entendido
            </button>
          </div>
        `

        document.body.appendChild(dialog)

        const closeBtn = dialog.querySelector("#close-btn")
        closeBtn?.addEventListener("click", () => {
          document.body.removeChild(dialog)
        })
      } else {
        setError(response.error || "Error al resetear contraseña")
        showNotification("error", "Error al Resetear", response.error || "No se pudo resetear la contraseña.")
      }
    } catch (error) {
      console.error("[v0] Error resetting password:", error)
      setError("Error de conexión al resetear contraseña")
      showNotification("error", "Error de Conexión", "No se pudo conectar con el servidor para resetear la contraseña.")
    } finally {
      setResettingPassword((prev) => ({ ...prev, [userId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Cargando usuarios...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button variant="outline" size="sm" className="ml-2 bg-transparent" onClick={fetchUsers}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-[rgba(28,53,45,1)] mb-2">Gestión de Usuarios</h1>
          <p className="text-muted-foreground pl-1">Administra los usuarios del sistema</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen} modal>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent
            className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto"
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-lg font-semibold">
                {editingUser ? "Editar Usuario" : "Crear Nuevo Usuario"}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {editingUser
                  ? "Modifica los datos del usuario seleccionado"
                  : "Completa los datos para crear un nuevo usuario"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Nombre
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Contraseña{" "}
                    {editingUser && (
                      <span className="text-xs text-muted-foreground">(dejar vacío para mantener actual)</span>
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPasswords["form"] ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!editingUser}
                      placeholder={editingUser ? "Nueva contraseña (opcional)" : "Contraseña"}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => togglePasswordVisibility("form")}
                    >
                      {showPasswords["form"] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+57 300 123 4567"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Rol *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: "ADMIN" | "USER") => setFormData({ ...formData, role: value })}
                    required
                  >
                    <SelectTrigger className={!formData.role ? "border-red-500" : ""}>
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                      <SelectItem value="USER">Cliente</SelectItem>
                    </SelectContent>
                  </Select>
                  {!formData.role && <p className="text-sm text-red-500">Debe seleccionar un rol</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="finca">Finca Asignada</Label>
                  <Select
                    value={formData.fincaId}
                    onValueChange={(value) => setFormData({ ...formData, fincaId: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar finca" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {fincas.map((finca) => (
                        <SelectItem key={finca.id} value={finca.id}>
                          {finca.name} - {finca.location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="isActive">Estado del Usuario</Label>
                    <p className="text-sm text-muted-foreground">
                      {formData.isActive
                        ? "El usuario puede acceder al sistema"
                        : "El usuario no podrá acceder al sistema"}
                    </p>
                  </div>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                </div>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="w-full sm:w-auto"
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={submitting || !formData.role}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingUser ? "Actualizando..." : "Creando..."}
                    </>
                  ) : (
                    <>{editingUser ? "Actualizar" : "Crear"} Usuario</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Vista de cards para móviles */}
      <div className="grid gap-4 sm:hidden">
        {paginatedUsers.map((user) => (
          <Card key={user.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                  <AvatarFallback>
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">{user.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                      {user.role === "ADMIN" ? "Admin" : "Cliente"}
                    </Badge>
                    <Badge variant={user.isActive ? "default" : "destructive"}>
                      {user.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{user.phone}</span>
              </div>
              {user.fincaId && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{getFincaName(user.fincaId)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Creado: {user.createdAt.toLocaleDateString()}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => handleEdit(user)} className="flex-1">
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(user.id)} className="flex-1">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResetPassword(user.id)}
                  className="flex-1"
                  disabled={resettingPassword[user.id]}
                >
                  {resettingPassword[user.id] ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Resetear Contraseña
                    </>
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Vista de tabla para desktop */}
      <Card className="hidden sm:block">
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
          <CardDescription>
            {users.length} usuario{users.length !== 1 ? "s" : ""} registrado{users.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6">Usuario</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Finca</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Contraseña</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                          <AvatarFallback>
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Creado: {user.createdAt.toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{user.email}</div>
                        <div className="text-sm text-muted-foreground">{user.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                        {user.role === "ADMIN" ? "Administrador" : "Cliente"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{getFincaName(user.fincaId)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "destructive"}>
                        {user.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">{temporaryPasswords[user.id] || "••••••••"}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResetPassword(user.id)}
                          className="h-6 w-6 p-0"
                          title="Generar nueva contraseña temporal (Solo Admin)"
                          disabled={resettingPassword[user.id]}
                        >
                          {resettingPassword[user.id] ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {temporaryPasswords[user.id] ? "Temporal" : "Encriptada"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(user.id)}>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Eliminar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResetPassword(user.id)}
                          disabled={resettingPassword[user.id]}
                        >
                          {resettingPassword[user.id] ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Resetear Contraseña
                            </>
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-1" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalItems > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              startItem={startItem}
              endItem={endItem}
            />
          )}
        </CardContent>
      </Card>

      {totalItems > 0 && (
        <div className="sm:hidden">
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
            startItem={startItem}
            endItem={endItem}
          />
        </div>
      )}
    </div>
  )
}
