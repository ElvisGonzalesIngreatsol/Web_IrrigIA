"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Cpu } from "lucide-react"
import { apiService } from "@/lib/api"
import Swal from "sweetalert2"

interface Device {
  id: string
  nombre: string
  descripcion?: string
  deviceEui: string
  joinEui: string
  deviceProfile: string
  isDisabled: boolean
}

export function GestionDispositivos() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDevice, setEditingDevice] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    deviceEui: "",
    joinEui: "",
    deviceProfile: "",
    isDisabled: false,
  })

  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      deviceEui: "",
      joinEui: "",
      deviceProfile: "",
      isDisabled: false,
    })
    setEditingDevice(null)
  }

  const fetchDevices = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiService.getDevices?.()
      if (response && response.success) {
        setDevices(response.data.data || [])
      } else {
        setDevices([])
        setError(response?.error || "Error al obtener dispositivos")
      }
    } catch (err: any) {
      setDevices([])
      setError(err?.message || "Error al cargar dispositivos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDevices()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      let response
      if (editingDevice) {
        response = await apiService.updateDevice?.(editingDevice, formData)
      } else {
        response = await apiService.createDevice?.(formData)
      }
      if (response && response.success) {
        Swal.fire({
          title: editingDevice ? "Dispositivo actualizado" : "Dispositivo creado",
          icon: "success",
          confirmButtonColor: "#1C352D",
        })
        setIsDialogOpen(false)
        resetForm()
        fetchDevices()
      } else {
        Swal.fire({
          title: "Error",
          text: response?.error || "No se pudo guardar el dispositivo",
          icon: "error",
          confirmButtonColor: "#1C352D",
        })
      }
    } catch (err: any) {
      Swal.fire({
        title: "Error",
        text: err?.message || "No se pudo guardar el dispositivo",
        icon: "error",
        confirmButtonColor: "#1C352D",
      })
    }
  }

  const handleEdit = (device: Device) => {
    setFormData({
      nombre: device.nombre,
      descripcion: device.descripcion || "",
      deviceEui: device.deviceEui,
      joinEui: device.joinEui,
      deviceProfile: device.deviceProfile,
      isDisabled: device.isDisabled,
    })
    setEditingDevice(device.id)
    setIsDialogOpen(true)
  }

  const handleDelete = (device: Device) => {
    Swal.fire({
      title: "¿Estás seguro?",
      text: `Se eliminará el dispositivo "${device.nombre}"`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#1C352D",
      cancelButtonColor: "#A6B28B",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await apiService.deleteDevice?.(device.id)
          if (response && response.success) {
            Swal.fire({
              title: "¡Eliminado!",
              text: "El dispositivo ha sido eliminado correctamente",
              icon: "success",
              confirmButtonColor: "#1C352D",
            })
            fetchDevices()
          } else {
            Swal.fire({
              title: "Error",
              text: response?.error || "No se pudo eliminar el dispositivo",
              icon: "error",
              confirmButtonColor: "#1C352D",
            })
          }
        } catch (err: any) {
          Swal.fire({
            title: "Error",
            text: err?.message || "No se pudo eliminar el dispositivo",
            icon: "error",
            confirmButtonColor: "#1C352D",
          })
        }
      }
    })
  }

  return (
    <div className="space-y-8 p-6 min-h-screen" style={{ backgroundColor: "#F9F6F3" }}>
      <div className="rounded-xl shadow-sm p-6 border" style={{ backgroundColor: "#F9F6F3", borderColor: "#A6B28B" }}>
        <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: "#1C352D" }}>
          <Cpu className="h-7 w-7" />
          Gestión de Dispositivos
        </h1>
        <p className="mt-2" style={{ color: "#1C352D" }}>
          Administra los dispositivos conectados al sistema.
        </p>
      </div>

      <Card className="shadow-lg border-0" style={{ backgroundColor: "#F9F6F3" }}>
        <CardHeader className="flex flex-row items-center justify-between rounded-t-lg border px-6 py-6 rounded-xl shadow-sm" style={{ backgroundColor: "#F9F6F3" }}>
          <div>
            <CardTitle className="flex items-center gap-2 text-[rgba(28,53,45,1)]">
              <Cpu className="h-5 w-5" />
              Dispositivos
            </CardTitle>
            <CardDescription className="text-[rgba(28,53,45,1)]" style={{ color: "#A6B28B" }}>
              Lista de dispositivos registrados
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open) }}>
            <DialogTrigger asChild>
              <Button
                className="shadow-lg transition-all duration-300 transform hover:scale-105"
                style={{
                  backgroundColor: "#1C352D",
                  color: "#F9F6F3",
                  borderColor: "#A6B28B",
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Dispositivo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-gray-800">
                  {editingDevice ? "Editar Dispositivo" : "Agregar Dispositivo"}
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  {editingDevice
                    ? "Modifica los datos del dispositivo"
                    : "Agrega un nuevo dispositivo al sistema"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-6 py-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="device-nombre" className="text-right font-medium">
                        Nombre del dispositivo
                      </Label>
                      <Input
                        id="device-nombre"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        className="col-span-3 border-2 focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="device-descripcion" className="text-right font-medium">
                        Descripción
                      </Label>
                      <Textarea
                        id="device-descripcion"
                        value={formData.descripcion}
                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        className="col-span-3 border-2 focus:border-blue-500 transition-colors"
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="device-eui" className="text-right font-medium">
                        Device EUI (EUI64)
                      </Label>
                      <Input
                        id="device-eui"
                        value={formData.deviceEui}
                        onChange={(e) => setFormData({ ...formData, deviceEui: e.target.value })}
                        className="col-span-3 border-2 focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="join-eui" className="text-right font-medium">
                        Join EUI (EUI64)
                      </Label>
                      <Input
                        id="join-eui"
                        value={formData.joinEui}
                        onChange={(e) => setFormData({ ...formData, joinEui: e.target.value })}
                        className="col-span-3 border-2 focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="device-profile" className="text-right font-medium">
                        Device profile
                      </Label>
                      <Input
                        id="device-profile"
                        value={formData.deviceProfile}
                        onChange={(e) => setFormData({ ...formData, deviceProfile: e.target.value })}
                        className="col-span-3 border-2 focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="device-disabled" className="text-right font-medium">
                        El dispositivo está deshabilitado
                      </Label>
                      <input
                        id="device-disabled"
                        type="checkbox"
                        checked={formData.isDisabled}
                        onChange={(e) => setFormData({ ...formData, isDisabled: e.target.checked })}
                        className="col-span-3 w-5 h-5"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false)
                      resetForm()
                    }}
                    className="border-2 hover:bg-gray-50"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 bg-[rgba(28,53,45,1)]"
                  >
                    {editingDevice ? "Actualizar Dispositivo" : "Agregar Dispositivo"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center text-lg text-gray-500 py-8">Cargando dispositivos...</div>
          ) : error ? (
            <div className="text-center text-lg text-red-500 py-8">{error}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow style={{ borderColor: "#A6B28B" }}>
                  <TableHead style={{ color: "#1C352D" }}>Nombre</TableHead>
                  <TableHead style={{ color: "#1C352D" }}>Descripción</TableHead>
                  <TableHead style={{ color: "#1C352D" }}>Device EUI</TableHead>
                  <TableHead style={{ color: "#1C352D" }}>Join EUI</TableHead>
                  <TableHead style={{ color: "#1C352D" }}>Device profile</TableHead>
                  <TableHead style={{ color: "#1C352D" }}>Estado</TableHead>
                  <TableHead className="text-center" style={{ color: "#1C352D" }}>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id} style={{ borderColor: "#A6B28B" }}>
                    <TableCell>{device.nombre}</TableCell>
                    <TableCell>{device.descripcion}</TableCell>
                    <TableCell>{device.deviceEui}</TableCell>
                    <TableCell>{device.joinEui}</TableCell>
                    <TableCell>{device.deviceProfile}</TableCell>
                    <TableCell>
                      <Badge
                        className="text-xs font-medium"
                        style={{
                          backgroundColor: device.isDisabled ? "#F5C9B0" : "#1C352D",
                          color: device.isDisabled ? "#1C352D" : "#F9F6F3",
                        }}
                      >
                        {device.isDisabled ? "Deshabilitado" : "Activo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-2 transition-colors bg-transparent text-xs h-8"
                          style={{
                            borderColor: "#A6B28B",
                            color: "#1C352D",
                            backgroundColor: "transparent",
                          }}
                          onClick={() => handleEdit(device)}
                        >
                          <Edit className="h-3 w-3 mr-1 flex-shrink-0" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-2 transition-colors bg-transparent text-xs h-8"
                          style={{
                            borderColor: "#F5C9B0",
                            color: "#1C352D",
                            backgroundColor: "transparent",
                          }}
                          onClick={() => handleDelete(device)}
                        >
                          <Trash2 className="h-3 w-3 mr-1 flex-shrink-0" />
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
