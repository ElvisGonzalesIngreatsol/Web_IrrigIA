"use client"

import type React from "react"
import { useState } from "react"
import { useData } from "@/contexts/data-context"
import { useNotifications } from "@/components/notification-system"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Trash2, Search, Cpu, Battery, Wifi, MonitorIcon as Sensors } from "lucide-react"
import type { Nodo } from "@/types"
import Swal from "sweetalert2"

export function NodosManagement() {
  const { nodos, fincas, lotes, sensors, addNodo, updateNodo, deleteNodo, generateAutoSensors } = useData()
  const { addNotification } = useNotifications()
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingNodo, setEditingNodo] = useState<Nodo | null>(null)

  const [formData, setFormData] = useState<{
    name: string
    fincaId: string
    loteId: string
    deviceId: string
    coordinates: { lat: number; lng: number }
    status: "active" | "inactive" | "maintenance"
    batteryLevel: number
  }>({
    name: "",
    fincaId: "",
    loteId: "",
    deviceId: "",
    coordinates: { lat: 0, lng: 0 },
    status: "active",
    batteryLevel: 85,
  })

  const filteredNodos = nodos.filter(
    (nodo) =>
      nodo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nodo.deviceId.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.fincaId || !formData.loteId || !formData.deviceId) {
      addNotification({
        type: "error",
        title: "Error de validación",
        message: "Por favor completa todos los campos requeridos",
      })
      return
    }

    if (editingNodo) {
      updateNodo(editingNodo.id.toString(), {
        ...formData,
        fincaId: Number(formData.fincaId),
        loteId: Number(formData.loteId),
      })
      addNotification({
        type: "success",
        title: "Nodo actualizado",
        message: `${formData.name} ha sido actualizado correctamente`,
      })
    } else {
      addNodo({
        ...formData,
        fincaId: Number(formData.fincaId),
        loteId: Number(formData.loteId),
        lastActivity: new Date(),
      })
      addNotification({
        type: "success",
        title: "Nodo creado",
        message: `${formData.name} ha sido creado con sensores automáticos`,
      })
    }

    resetForm()
    setIsDialogOpen(false)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      fincaId: "",
      loteId: "",
      deviceId: "",
      coordinates: { lat: 0, lng: 0 },
      status: "active",
      batteryLevel: 85,
    })
    setEditingNodo(null)
  }

  const handleEdit = (nodo: Nodo) => {
    setEditingNodo(nodo)
    setFormData({
      name: nodo.name,
      fincaId: nodo.fincaId.toString(),
      loteId: nodo.loteId.toString(),
      deviceId: nodo.deviceId,
      coordinates: nodo.coordinates,
      status: nodo.status,
      batteryLevel: nodo.batteryLevel,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (nodoId: string) => {
    const nodo = nodos.find((n) => n.id.toString() === nodoId.toString())
    if (nodo) {
      Swal.fire({
        title: "¿Estás seguro?",
        text: `¿Estás seguro de eliminar el nodo ${nodo.name}? Esto también eliminará todos sus sensores.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#1C352D",
        cancelButtonColor: "#A6B28B",
        confirmButtonText: "Aceptar",
        cancelButtonText: "Cancelar",
      }).then((result) => {
        if (result.isConfirmed) {
          deleteNodo(nodoId)
          addNotification({
            type: "warning",
            title: "Nodo eliminado",
            message: `${nodo.name} ha sido eliminado del sistema`,
          })
        }
      })
    }
  }

  const handleRegenerateSensors = (nodoId: string) => {
    const nodo = nodos.find((n) => n.id.toString() === nodoId.toString())
    if (nodo) {
      generateAutoSensors(nodo.loteId.toString(), nodoId.toString())
      addNotification({
        type: "success",
        title: "Sensores regenerados",
        message: `Se han regenerado los sensores para ${nodo.name}`,
      })
    }
  }

  const getNodoStats = (nodoId: string) => {
    const nodoSensors = sensors.filter((s) => s.nodoId !== undefined && s.nodoId.toString() === nodoId.toString())
    const onlineSensors = nodoSensors.filter((s) => s.status === "online")

    return {
      totalSensors: nodoSensors.length,
      onlineSensors: onlineSensors.length,
      soilSensors: nodoSensors.filter((s) => s.sensorCategory === "soil").length,
      airSensors: nodoSensors.filter((s) => s.sensorCategory === "air").length,
    }
  }

  const availableLotes = lotes.filter((lote) => lote.fincaId.toString() === formData.fincaId.toString())

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[rgba(28,53,45,1)]">Gestión de Nodos</h1>
          <p className="text-muted-foreground">Administra los nodos IoT y sus sensores automáticos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Nodo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingNodo ? "Editar Nodo" : "Crear Nuevo Nodo"}</DialogTitle>
              <DialogDescription>
                {editingNodo ? "Modifica los datos del nodo" : "Los sensores se generarán automáticamente"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Nodo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Nodo Norte A"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deviceId">ID del Dispositivo *</Label>
                  <Input
                    id="deviceId"
                    value={formData.deviceId}
                    onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                    placeholder="Ej: NODE_001"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="finca">Finca *</Label>
                  <Select
                    value={formData.fincaId}
                    onValueChange={(value) => setFormData({ ...formData, fincaId: value, loteId: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar finca" />
                    </SelectTrigger>
                    <SelectContent>
                      {fincas.map((finca) => (
                        <SelectItem key={finca.id} value={finca.id.toString()}>
                          {finca.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lote">Lote *</Label>
                  <Select
                    value={formData.loteId}
                    onValueChange={(value) => {
                      const lote = availableLotes.find((l) => l.id.toString() === value.toString())
                      setFormData({
                        ...formData,
                        loteId: value,
                        coordinates: lote?.centerCoordinates || { lat: 0, lng: 0 },
                      })
                    }}
                    disabled={!formData.fincaId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar lote" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLotes.map((lote) => (
                        <SelectItem key={lote.id} value={lote.id.toString()}>
                          {lote.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "active" | "inactive" | "maintenance") =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                      <SelectItem value="maintenance">Mantenimiento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="battery">Nivel de Batería (%)</Label>
                  <Input
                    id="battery"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.batteryLevel}
                    onChange={(e) => setFormData({ ...formData, batteryLevel: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingNodo ? "Actualizar Nodo" : "Crear Nodo"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nodos</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nodos.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nodos Activos</CardTitle>
            <Wifi className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{nodos.filter((n) => n.status === "active").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sensores</CardTitle>
            <Sensors className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{sensors.filter((s) => s.nodoId).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Batería Promedio</CardTitle>
            <Battery className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {nodos.length > 0 ? Math.round(nodos.reduce((sum, n) => sum + n.batteryLevel, 0) / nodos.length) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Nodos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o ID de dispositivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Nodos ({filteredNodos.length})</CardTitle>
          <CardDescription>Gestiona los nodos IoT y sus sensores automáticos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nodo</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Batería</TableHead>
                  <TableHead>Sensores</TableHead>
                  <TableHead>Última Actividad</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNodos.map((nodo) => {
                  const stats = getNodoStats(nodo.id.toString())
                  const finca = fincas.find((f) => f.id === nodo.fincaId)
                  const lote = lotes.find((l) => l.id === nodo.loteId)

                  return (
                    <TableRow key={nodo.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{nodo.name}</div>
                          <div className="text-sm text-muted-foreground">{nodo.deviceId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{finca?.nombre}</div>
                          <div className="text-muted-foreground">{lote?.nombre}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            nodo.status === "active"
                              ? "default"
                              : nodo.status === "maintenance"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {nodo.status === "active"
                            ? "Activo"
                            : nodo.status === "maintenance"
                              ? "Mantenimiento"
                              : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Battery
                            className={`h-4 w-4 ${nodo.batteryLevel > 50 ? "text-green-500" : nodo.batteryLevel > 20 ? "text-yellow-500" : "text-red-500"}`}
                          />
                          <span
                            className={
                              nodo.batteryLevel > 50
                                ? "text-green-600"
                                : nodo.batteryLevel > 20
                                  ? "text-yellow-600"
                                  : "text-red-600"
                            }
                          >
                            {nodo.batteryLevel}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>
                            {stats.onlineSensors}/{stats.totalSensors} Online
                          </div>
                          <div className="text-muted-foreground">
                            {stats.soilSensors} Suelo, {stats.airSensors} Aire
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {nodo.lastActivity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRegenerateSensors(nodo.id.toString())}
                            title="Regenerar sensores"
                          >
                            <Sensors className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(nodo)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(nodo.id.toString())}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
