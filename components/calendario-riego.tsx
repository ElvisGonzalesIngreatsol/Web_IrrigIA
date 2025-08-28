"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useData } from "@/contexts/data-context"
import { useAuth } from "@/contexts/auth-context"
import { useNotifications } from "./notification-system"
import { Calendar, Plus, Edit, Trash2, Play, ChevronLeft, ChevronRight, CalendarDays, List } from "lucide-react"
import { useState, useMemo, useEffect } from "react"

export function CalendarioRiego() {
  const { schedules, fincas, addSchedule, updateSchedule, deleteSchedule } = useData()
  const { user } = useAuth()
  const { addNotification } = useNotifications()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedFinca, setSelectedFinca] = useState("")
  const [selectedLote, setSelectedLote] = useState("")
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [newSchedule, setNewSchedule] = useState({
    loteId: "",
    valvulaIds: [] as string[],
    startDate: "",
    startTime: "",
    duration: 30,
    frequency: "daily" as "daily" | "weekly" | "custom",
    isActive: true,
  })

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    const current = new Date(startDate)

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    return days
  }

  const getSchedulesForDate = (date: Date) => {
    return schedules.filter((schedule) => {
      const scheduleDate = new Date(schedule.nextExecution)
      return scheduleDate.toDateString() === date.toDateString() && schedule.isActive
    })
  }

  const getScheduleColor = (schedule: any, index: number) => {
    const colors = [
      "bg-blue-500", // Primary irrigation
      "bg-green-500", // Completed irrigation
      "bg-orange-500", // Maintenance
      "bg-purple-500", // Special programs
      "bg-red-500", // Emergency/alerts
    ]
    return colors[index % colors.length]
  }

  const userFincas = useMemo(() => {
    if (user?.role === "admin") {
      return fincas
    }

    const assignedFincas = user?.fincaIds
      ? fincas.filter((f) => user.fincaIds!.includes(f.id))
      : user?.fincaId
        ? fincas.filter((f) => f.id === user.fincaId)
        : []

    return assignedFincas
  }, [fincas, user])

  const autoSelectedFinca = useMemo(() => {
    if (user?.role === "client" && userFincas.length === 1) {
      return userFincas[0].id
    }
    return selectedFinca
  }, [user, userFincas, selectedFinca])

  const selectedFincaData = fincas.find((f) => f.id === autoSelectedFinca)
  const availableLotes = selectedFincaData?.lotes || []
  const selectedLoteData = availableLotes.find((l) => l.id === selectedLote)
  const availableValvulas = selectedLoteData?.valvulas || []

  useEffect(() => {
    if (user?.role === "client" && userFincas.length === 1 && availableLotes.length > 0 && !selectedLote) {
      const firstLote = availableLotes[0]
      setSelectedLote(firstLote.id)
      setNewSchedule((prev) => ({ ...prev, loteId: firstLote.id }))
    }
  }, [user, userFincas, availableLotes, selectedLote])

  const allValvulas = fincas.flatMap((finca) =>
    finca.lotes.flatMap((lote) =>
      lote.valvulas.map((valvula) => ({
        ...valvula,
        loteName: lote.name,
        fincaName: finca.name,
      })),
    ),
  )

  const handleAddSchedule = () => {
    if (
      !newSchedule.loteId ||
      newSchedule.valvulaIds.length === 0 ||
      !newSchedule.startTime ||
      !newSchedule.startDate
    ) {
      addNotification({
        type: "error",
        title: "Error",
        message: "Por favor completa todos los campos requeridos incluyendo fecha y al menos una válvula",
        autoClose: true,
        duration: 3000,
      })
      return
    }

    const [year, month, day] = newSchedule.startDate.split("-").map(Number)
    const [hours, minutes] = newSchedule.startTime.split(":").map(Number)
    const nextExecution = new Date(year, month - 1, day, hours, minutes, 0, 0)

    if (nextExecution < new Date()) {
      addNotification({
        type: "error",
        title: "Error",
        message: "La fecha y hora seleccionada debe ser futura",
        autoClose: true,
        duration: 3000,
      })
      return
    }

    newSchedule.valvulaIds.forEach((valvulaId) => {
      addSchedule({
        ...newSchedule,
        valvulaId,
        nextExecution,
      })
    })

    setNewSchedule({
      loteId: "",
      valvulaIds: [],
      startDate: "",
      startTime: "",
      duration: 30,
      frequency: "daily",
      isActive: true,
    })
    setSelectedFinca("")
    setSelectedLote("")
    setShowAddDialog(false)

    addNotification({
      type: "success",
      title: "Programa Creado",
      message: `Se han creado ${newSchedule.valvulaIds.length} programa(s) de riego exitosamente`,
      autoClose: true,
      duration: 3000,
    })
  }

  const handleFincaChange = (fincaId: string) => {
    setSelectedFinca(fincaId)
    setSelectedLote("")
    setNewSchedule((prev) => ({ ...prev, loteId: "", valvulaIds: [] }))
  }

  const handleLoteChange = (loteId: string) => {
    setSelectedLote(loteId)
    setNewSchedule((prev) => ({ ...prev, loteId, valvulaIds: [] }))
  }

  const handleValvulaToggle = (valvulaId: string, checked: boolean) => {
    setNewSchedule((prev) => ({
      ...prev,
      valvulaIds: checked ? [...prev.valvulaIds, valvulaId] : prev.valvulaIds.filter((id) => id !== valvulaId),
    }))
  }

  const handleSelectAllValvulas = (selectAll: boolean) => {
    setNewSchedule((prev) => ({
      ...prev,
      valvulaIds: selectAll ? availableValvulas.map((v) => v.id) : [],
    }))
  }

  const getValvulaInfo = (valvulaId: string) => {
    return allValvulas.find((v) => v.id === valvulaId)
  }

  const getFrequencyText = (frequency: string) => {
    switch (frequency) {
      case "daily":
        return "Diario"
      case "weekly":
        return "Semanal"
      case "custom":
        return "Personalizado"
      default:
        return frequency
    }
  }

  const filteredSchedules = useMemo(() => {
    if (user?.role === "admin") {
      return schedules
    }

    // For client users, only show schedules from their assigned fincas
    const userFincaIds = userFincas.map((f) => f.id)
    return schedules.filter((schedule) => {
      const valvulaInfo = getValvulaInfo(schedule.valvulaId)
      return (
        valvulaInfo &&
        userFincaIds.some((fincaId) =>
          fincas.find((f) => f.id === fincaId)?.lotes.some((l) => l.valvulas.some((v) => v.id === schedule.valvulaId)),
        )
      )
    })
  }, [schedules, user, userFincas, fincas])

  const activeSchedules = filteredSchedules.filter((s) => s.isActive).length
  const totalSchedules = filteredSchedules.length

  const monthNames = [
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SEPTIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE",
  ]

  const dayNames = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"]

  const handleToggleSchedule = (scheduleId: string, checked: boolean) => {
    updateSchedule(scheduleId, { isActive: checked })
    addNotification({
      type: "success",
      title: "Programa Actualizado",
      message: `El programa de riego ha sido ${checked ? "activado" : "desactivado"} exitosamente`,
      autoClose: true,
      duration: 3000,
    })
  }

  const handleDeleteSchedule = (scheduleId: string) => {
    deleteSchedule(scheduleId)
    addNotification({
      type: "success",
      title: "Programa Eliminado",
      message: "El programa de riego ha sido eliminado exitosamente",
      autoClose: true,
      duration: 3000,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[rgba(28,53,45,1)]">
            {user?.role === "client" ? "Mi Calendario de Riego" : "Calendario de Riego"}
          </h1>
          <p className="text-muted-foreground">
            {user?.role === "client"
              ? "Visualiza y gestiona los horarios de riego de tu finca"
              : "Programa y gestiona los horarios de riego automático"}
          </p>
          {user?.role === "client" && userFincas.length === 1 && (
            <div className="mt-2 flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-[rgba(166,178,139,0.1)] text-[rgba(28,53,45,1)] border-[rgba(166,178,139,1)]"
              >
                📍 {userFincas[0].name} - {userFincas[0].location}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border p-1 bg-[rgba(166,178,139,1)]">
            <Button
              className=""
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Mes
            </Button>
            <Button
              className=""
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4 mr-2" />
              Lista
            </Button>
          </div>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Programa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nuevo Programa de Riego</DialogTitle>
                <DialogDescription>Configura un nuevo programa de riego automático</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  {(user?.role === "admin" || userFincas.length > 1) && (
                    <div className="space-y-2">
                      <Label htmlFor="finca">Finca</Label>
                      <Select value={autoSelectedFinca} onValueChange={handleFincaChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una finca" />
                        </SelectTrigger>
                        <SelectContent>
                          {userFincas.map((finca) => (
                            <SelectItem key={finca.id} value={finca.id}>
                              {finca.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {user?.role === "client" && userFincas.length === 1 && (
                    <div className="space-y-2">
                      <Label>Finca</Label>
                      <div className="p-2 bg-muted rounded-md text-sm">{userFincas[0].name}</div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="lote">Lote</Label>
                    <Select value={selectedLote} onValueChange={handleLoteChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un lote" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableLotes.map((lote) => (
                          <SelectItem key={lote.id} value={lote.id}>
                            {lote.name} - {lote.cropType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {availableValvulas.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Seleccionar Válvulas</Label>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => handleSelectAllValvulas(true)}>
                          Seleccionar Todas
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectAllValvulas(false)}
                        >
                          Deseleccionar Todas
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 max-h-48 overflow-y-auto border rounded-lg p-3">
                      {availableValvulas.map((valvula) => (
                        <div key={valvula.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md">
                          <input
                            type="checkbox"
                            id={`valvula-${valvula.id}`}
                            checked={newSchedule.valvulaIds.includes(valvula.id)}
                            onChange={(e) => handleValvulaToggle(valvula.id, e.target.checked)}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                          <label
                            htmlFor={`valvula-${valvula.id}`}
                            className="flex-1 text-sm font-medium cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <span>{valvula.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {valvula.flowRate} L/min
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {valvula.tipo === "aspersion"
                                ? "Aspersión"
                                : valvula.tipo === "goteo"
                                  ? "Goteo"
                                  : "Microaspersión"}
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {newSchedule.valvulaIds.length} de {availableValvulas.length} válvulas seleccionadas
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Fecha de Inicio</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newSchedule.startDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setNewSchedule((prev) => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startTime">Hora de Inicio</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={newSchedule.startTime}
                      onChange={(e) => setNewSchedule((prev) => ({ ...prev, startTime: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Duración (minutos)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      max="180"
                      value={newSchedule.duration}
                      onChange={(e) =>
                        setNewSchedule((prev) => ({ ...prev, duration: Number.parseInt(e.target.value) }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frecuencia</Label>
                    <Select
                      value={newSchedule.frequency}
                      onValueChange={(value: "daily" | "weekly" | "custom") =>
                        setNewSchedule((prev) => ({ ...prev, frequency: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diario</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={newSchedule.isActive}
                      onChange={(e) => setNewSchedule((prev) => ({ ...prev, isActive: e.target.checked }))}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <Label htmlFor="isActive" className="cursor-pointer">
                      Activar programa inmediatamente
                    </Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddSchedule}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Programa
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {user?.role === "client" ? "Mis Programas Activos" : "Programas Activos"}
            </CardTitle>
            <Play className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeSchedules}</div>
            <p className="text-xs text-muted-foreground">de {totalSchedules} programas totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próxima Ejecución</CardTitle>
            <CardDescription>
              {user?.role === "client" ? "Tu próximo riego programado" : "Verifica la próxima ejecución programada"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {filteredSchedules.filter((s) => s.isActive).length > 0
                ? new Date(
                    Math.min(...filteredSchedules.filter((s) => s.isActive).map((s) => s.nextExecution.getTime())),
                  ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "--:--"}
            </div>
            <p className="text-xs text-muted-foreground">siguiente riego programado</p>
          </CardContent>
        </Card>
      </div>

      {viewMode === "calendar" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Hoy
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-xl font-semibold">
                    {monthNames[currentDate.getMonth()]} DE {currentDate.getFullYear()}
                  </h2>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {dayNames.map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {generateCalendarDays().map((date, index) => {
                const isCurrentMonth = date.getMonth() === currentDate.getMonth()
                const isToday = date.toDateString() === new Date().toDateString()
                const daySchedules = getSchedulesForDate(date)

                return (
                  <div
                    key={index}
                    className={`min-h-[100px] p-1 border rounded-lg ${
                      isCurrentMonth ? "bg-background" : "bg-muted/30"
                    } ${isToday ? "ring-2 ring-primary" : ""}`}
                  >
                    <div
                      className={`text-sm font-medium mb-1 ${
                        isCurrentMonth ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {daySchedules.slice(0, 3).map((schedule, scheduleIndex) => {
                        const valvulaInfo = getValvulaInfo(schedule.valvulaId)
                        return (
                          <div
                            key={schedule.id}
                            className={`text-xs p-1 rounded text-white font-medium ${getScheduleColor(schedule, scheduleIndex)}`}
                          >
                            {schedule.startTime} {valvulaInfo?.name}
                          </div>
                        )
                      })}
                      {daySchedules.length > 3 && (
                        <div className="text-xs text-muted-foreground">+{daySchedules.length - 3} más</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de programas */}
      {viewMode === "list" && (
        <Card>
          <CardHeader>
            <CardTitle>{user?.role === "client" ? "Mis Programas de Riego" : "Programas de Riego"}</CardTitle>
            <CardDescription>
              {user?.role === "client"
                ? "Gestiona los programas de riego de tu finca"
                : "Gestiona todos los programas de riego configurados"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredSchedules.length > 0 ? (
              <div className="space-y-4">
                {filteredSchedules.map((schedule) => {
                  const valvulaInfo = getValvulaInfo(schedule.valvulaId)
                  return (
                    <div key={schedule.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {valvulaInfo?.name} - {valvulaInfo?.loteName}
                          </p>
                          {user?.role === "admin" && (
                            <p className="text-xs text-muted-foreground">Finca: {valvulaInfo?.fincaName}</p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {schedule.startTime} • {schedule.duration} min • {getFrequencyText(schedule.frequency)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Próxima ejecución: {schedule.nextExecution.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={schedule.isActive ? "default" : "secondary"}>
                          {schedule.isActive ? "Activo" : "Inactivo"}
                        </Badge>

                        <Switch
                          checked={schedule.isActive}
                          onCheckedChange={(checked) => handleToggleSchedule(schedule.id, checked)}
                        />

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            addNotification({
                              type: "info",
                              title: "Función en Desarrollo",
                              message: "La edición de programas estará disponible pronto",
                              autoClose: true,
                              duration: 3000,
                            })
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>

                        <Button variant="outline" size="sm" onClick={() => handleDeleteSchedule(schedule.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>
                  {user?.role === "client"
                    ? "No tienes programas de riego configurados"
                    : "No hay programas de riego configurados"}
                </p>
                <Button variant="outline" className="mt-2 bg-transparent" onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {user?.role === "client" ? "Crear Mi Primer Programa" : "Crear Primer Programa"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
