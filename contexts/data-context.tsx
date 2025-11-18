"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import type {
  User,
  Finca,
  Lote,
  Valvula,
  Sensor,
  Nodo,
  IrrigationSchedule,
  Notification,
  WeatherData,
  SystemStatus,
  IrrigationSuggestion,
} from "@/types"

interface DataContextType {
  users: User[]
  fincas: Finca[]
  lotes: Lote[]
  valvulas: Valvula[]
  sensors: Sensor[]
  schedules: IrrigationSchedule[]
  notifications: Notification[]
  weather: WeatherData | null
  systemStatus: SystemStatus | null
  suggestions: IrrigationSuggestion[]
  nodos: Nodo[]
  addUser: (user: Omit<User, "id" | "createdAt">) => void
  updateUser: (id: string, user: Partial<User>) => void
  deleteUser: (id: string) => void
  addFinca: (finca: Omit<Finca, "id" | "createdAt">) => void
  updateFinca: (id: string, finca: Partial<Finca>) => void
  deleteFinca: (id: string) => void
  addLote: (lote: Omit<Lote, "id" | "createdAt">) => void
  updateLote: (id: string, lote: Partial<Lote>) => void
  deleteLote: (id: string) => void
  addValvula: (valvula: Omit<Valvula, "id" | "createdAt" | "lastActivity">) => void
  updateValvula: (id: string, valvula: Partial<Valvula>) => void
  deleteValvula: (id: string) => void
  toggleValvula: (id: string) => void
  addSchedule: (schedule: Omit<IrrigationSchedule, "id" | "createdAt">) => void
  updateSchedule: (id: string, schedule: Partial<IrrigationSchedule>) => void
  deleteSchedule: (id: string) => void
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "isRead">) => void
  markNotificationAsRead: (id: string) => void
  addNodo: (nodo: Omit<Nodo, "id" | "createdAt" | "sensors">) => void
  updateNodo: (id: string, nodo: Partial<Nodo>) => void
  deleteNodo: (id: string) => void
  addSensor: (sensor: Omit<Sensor, "id">) => void
  updateSensor: (id: string, sensor: Partial<Sensor>) => void
  deleteSensor: (id: string) => void
  generateAutoSensors: (loteId: string, nodoId?: string, valvulaId?: string) => void
  addSuggestion: (suggestion: Omit<IrrigationSuggestion, "id">) => void
  removeSuggestion: (id: string) => void
  applySuggestion: (id: string) => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

// Función para construir datos jerárquicos
const buildHierarchicalData = (fincas: Finca[], lotes: Lote[], valvulas: Valvula[], sensors: Sensor[]): Finca[] => {
  return fincas.map((finca) => ({
    ...finca,
    lotes: lotes
      .filter((lote) => lote.fincaId === finca.id)
      .map((lote) => ({
        ...lote,
        valvulas: valvulas.filter((valvula) => valvula.loteId === lote.id),
        sensors: sensors.filter((sensor) => sensor.loteId === lote.id),
      })),
  }))
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([])
  const [baseFincas, setBaseFincas] = useState<Finca[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [valvulas, setValvulas] = useState<Valvula[]>([])
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [schedules, setSchedules] = useState<IrrigationSchedule[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [suggestions, setSuggestions] = useState<IrrigationSuggestion[]>([])
  const [nodos, setNodos] = useState<Nodo[]>([])

  // Construir datos jerárquicos dinámicamente
  const fincas = buildHierarchicalData(baseFincas, lotes, valvulas, sensors)

  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)

  // Simular datos en tiempo real
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    const startInterval = () => {
      interval = setInterval(() => {
        // Verificar que los componentes aún estén montados antes de actualizar
        if (document.visibilityState === "visible") {
          // Actualizar sensores
          setSensors((prev) =>
            prev.map((sensor) => ({
              ...sensor,
              value: Math.max(0, sensor.value + (Math.random() - 0.5) * 2),
              lastReading: new Date(),
            })),
          )

          // Actualizar válvulas activas
          setValvulas((prev) =>
            prev.map((valvula) => ({
              ...valvula,
              caudal: valvula.isActive ? Math.max(0, (valvula.caudal || 0) + (Math.random() - 0.5) * 3) : 0,
            })),
          )

          // Actualizar estado del sistema
          setSystemStatus((prev) =>
            prev
              ? {
                  ...prev,
                  lastUpdate: new Date(),
                  connectivity: Math.max(90, Math.min(100, prev.connectivity + (Math.random() - 0.5) * 2)),
                }
              : null,
          )
        }
      }, 30000)
    }

    startInterval()

    // Cleanup function para prevenir memory leaks
    return () => {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }
  }, [])

  const addUser = (user: Omit<User, "id" | "createdAt">) => {
    const newUser: User = {
      ...user,
      id: Math.floor(Math.random() * 1000000),
      createdAt: new Date().toISOString(),
    }
    setUsers((prev) => [...prev, newUser])
  }

  const updateUser = (id: string, userData: Partial<User>) => {
    setUsers((prev) => prev.map((user) => (user.id.toString() === id ? { ...user, ...userData } : user)))
  }

  const deleteUser = (id: string) => {
    setUsers((prev) => prev.filter((user) => user.id.toString() !== id))
  }

  const addFinca = (finca: Omit<Finca, "id" | "createdAt">) => {
    const newFinca: Finca = {
      ...finca,
      id: Math.floor(Math.random() * 1000000),
      createdAt: new Date().toISOString(),
      lotes: [], // Se llenará dinámicamente
    }
    setBaseFincas((prev) => [...prev, newFinca])
  }

  const updateFinca = (id: string, fincaData: Partial<Finca>) => {
    setBaseFincas((prev) => prev.map((finca) => (finca.id.toString() === id ? { ...finca, ...fincaData } : finca)))
  }

  const deleteFinca = (id: string) => {
    setBaseFincas((prev) => prev.filter((finca) => finca.id.toString() !== id))
    // También eliminar lotes y válvulas relacionadas
    setLotes((prev) => prev.filter((lote) => lote.fincaId.toString() !== id))
    setValvulas((prev) => prev.filter((valvula) => valvula.fincaId.toString() !== id))
  }

  const addLote = (lote: Omit<Lote, "id" | "createdAt">) => {
    const newLote: Lote = {
      ...lote,
      id: Math.floor(Math.random() * 1000000),
      createdAt: new Date().toISOString(),
      valvulas: [],
      sensors: [],
    }
    setLotes((prev) => [...prev, newLote])

    // Generar nodo por defecto y sensores automáticamente
    setTimeout(() => {
      const defaultNodo = {
        name: `Nodo ${newLote.nombre}`,
        fincaId: newLote.fincaId,
        loteId: newLote.id,
        deviceId: `NODE_${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        coordinates: newLote.centerCoordinates,
        status: "active" as const,
        batteryLevel: 85 + Math.random() * 15,
        lastActivity: new Date(),
      }
      addNodo(defaultNodo)
    }, 200)
  }

  const updateLote = (id: string, loteData: Partial<Lote>) => {
    setLotes((prev) => prev.map((lote) => (lote.id.toString() === id ? { ...lote, ...loteData } : lote)))
  }

  const deleteLote = (id: string) => {
    setLotes((prev) => prev.filter((lote) => lote.id.toString() !== id))
    // También eliminar válvulas relacionadas
    setValvulas((prev) => prev.filter((valvula) => valvula.loteId.toString() !== id))
  }

  const addValvula = (valvula: Omit<Valvula, "id" | "createdAt">) => {
    const newValvula: Valvula = {
      ...valvula,
      id: Math.floor(Math.random() * 1000000),
      createdAt: new Date().toISOString(),
    }
    setValvulas((prev) => [...prev, newValvula])

    // Generar sensores automáticamente para la nueva válvula
    setTimeout(() => {
      generateAutoSensors(valvula.loteId.toString(), undefined, newValvula.id.toString())
    }, 100)
  }

  const updateValvula = (id: string, valvulaData: Partial<Valvula>) => {
    setValvulas((prev) =>
      prev.map((valvula) => (valvula.id.toString() === id ? { ...valvula, ...valvulaData, lastActivity: new Date() } : valvula)),
    )
  }

  const deleteValvula = (id: string) => {
    setValvulas((prev) => prev.filter((valvula) => valvula.id.toString() !== id))
  }

  const toggleValvula = (id: string) => {
    setValvulas((prev) =>
      prev.map((valvula) =>
        valvula.id.toString() === id
          ? {
              ...valvula,
              isOpen: !valvula.estado,
              flowRate: !valvula.estado ? valvula.caudal || 0 : 0,
              lastActivity: new Date(),
            }
          : valvula,
      ),
    )
  }

  // Funciones para schedules
  const addSchedule = (schedule: Omit<IrrigationSchedule, "id" | "createdAt">) => {
    const newSchedule: IrrigationSchedule = {
      ...schedule,
      id: Math.floor(Math.random() * 1000000),
      createdAt: new Date(),
    }
    setSchedules((prev) => [...prev, newSchedule])
  }

  const updateSchedule = (id: string, scheduleData: Partial<IrrigationSchedule>) => {
    setSchedules((prev) => prev.map((schedule) => (schedule.id.toString() === id ? { ...schedule, ...scheduleData } : schedule)))
  }

  const deleteSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((schedule) => schedule.id.toString() !== id))
  }

  const addNotification = (notification: Omit<Notification, "id" | "timestamp" | "isRead">) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.floor(Math.random() * 1000000),
      timestamp: new Date(),
      isRead: false,
    }
    setNotifications((prev) => [newNotification, ...prev])
  }

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id.toString() === id ? { ...notification, isRead: true } : notification)),
    )
  }

  const addNodo = (nodo: Omit<Nodo, "id" | "createdAt" | "sensors">) => {
    const newNodo: Nodo = {
      ...nodo,
      id: Math.floor(Math.random() * 1000000),
      createdAt: new Date(),
      sensors: [],
    }
    setNodos((prev) => [...prev, newNodo])

    // Generar sensores automáticamente para el nuevo nodo
    setTimeout(() => {
      generateAutoSensors(nodo.loteId.toString(), newNodo.id.toString())
    }, 100)
  }

  const updateNodo = (id: string, nodoData: Partial<Nodo>) => {
    setNodos((prev) => prev.map((nodo) => (nodo.id.toString() === id ? { ...nodo, ...nodoData } : nodo)))
  }

  const deleteNodo = (id: string) => {
    setNodos((prev) => prev.filter((nodo) => nodo.id.toString() !== id))
    // También eliminar sensores relacionados
    setSensors((prev) => prev.filter((sensor) => sensor.nodoId?.toString() !== id))
  }

  const addSensor = (sensor: Omit<Sensor, "id">) => {
    const newSensor: Sensor = {
      ...sensor,
      id: Math.floor(Math.random() * 1000000),
    }
    setSensors((prev) => [...prev, newSensor])
  }

  const updateSensor = (id: string, sensorData: Partial<Sensor>) => {
    setSensors((prev) => prev.map((sensor) => (sensor.id.toString() === id ? { ...sensor, ...sensorData } : sensor)))
  }

  const deleteSensor = (id: string) => {
    setSensors((prev) => prev.filter((sensor) => sensor.id.toString() !== id))
  }

  const generateAutoSensors = (loteId: string, nodoId?: string, valvulaId?: string) => {
    const lote = lotes.find((l) => l.id.toString() === loteId)
    if (!lote) return

    const newSensors: Sensor[] = []

    if (nodoId) {
      const nodo = nodos.find((n) => n.id.toString() === nodoId)
      if (nodo) {
        // Sensores de suelo por nodo
        const soilSensors = [
          {
            name: `Sensor Temperatura Suelo ${nodo.name}`,
            type: "temperature",
            unit: "°C",
            sensorCategory: "soil",
            value: 25 + Math.random() * 5,
          },
          {
            name: `Sensor Humedad Suelo ${nodo.name}`,
            type: "humidity",
            unit: "%",
            sensorCategory: "soil",
            value: 60 + Math.random() * 20,
          },
          {
            name: `Sensor pH Suelo ${nodo.name}`,
            type: "ph",
            unit: "pH",
            sensorCategory: "soil",
            value: 6 + Math.random() * 2,
          },
        ]

        // Sensores de aire por nodo
        const airSensors = [
          {
            name: `Sensor Temperatura Aire ${nodo.name}`,
            type: "temperature",
            unit: "°C",
            sensorCategory: "air",
            value: 26 + Math.random() * 4,
          },
          {
            name: `Sensor Humedad Aire ${nodo.name}`,
            type: "humidity",
            unit: "%",
            sensorCategory: "air",
            value: 65 + Math.random() * 15,
          },
        ]

        soilSensors.forEach((sensorData) => {
                  newSensors.push({
                    id: Math.floor(Math.random() * 1000000),
                    ...sensorData,
                    type: sensorData.type as "ph" | "temperature" | "humidity" | "flow" | "pressure",
                    sensorCategory: sensorData.sensorCategory as "soil",
                    status: "online",
                    lastReading: new Date(),
                    location: `${lote.nombre} - ${nodo.name}`,
                    batteryLevel: 80 + Math.random() * 20,
                    loteId: loteId as any,
                    nodoId: nodoId as any,
                  })
                })
        airSensors.forEach((sensorData) => {
                  newSensors.push({
                    id: Math.floor(Math.random() * 1000000),
                    ...sensorData,
                    type: sensorData.type as "ph" | "temperature" | "humidity" | "flow" | "pressure",
                    sensorCategory: sensorData.sensorCategory as "air",
                    status: "online",
                    lastReading: new Date(),
                    location: `${lote.nombre} - ${nodo.name}`,
                    batteryLevel: 80 + Math.random() * 20,
                    loteId: loteId as any,
                    nodoId: nodoId as any,
                  })
                })
      }
    }

    if (valvulaId) {
      const valvula = valvulas.find((v) => v.id.toString() === valvulaId)
      if (valvula) {
        // Sensores de agua por válvula
        interface WaterSensorData {
          name: string
          type: "pressure" | "temperature" | "flow"
          unit: string
          sensorCategory: "water"
          value: number
        }
        const waterSensors: WaterSensorData[] = [
          {
            name: `Sensor Presión ${valvula.nombre}`,
            type: "pressure",
            unit: "bar",
            sensorCategory: "water",
            value: 1.5 + Math.random() * 1,
          },
          {
            name: `Sensor Temperatura Agua ${valvula.nombre}`,
            type: "temperature",
            unit: "°C",
            sensorCategory: "water",
            value: 22 + Math.random() * 4,
          },
          {
            name: `Sensor Flujo ${valvula.nombre}`,
            type: "flow",
            unit: "L/min",
            sensorCategory: "water",
            value: valvula.caudal || 20 + Math.random() * 15,
          },
        ];

        waterSensors.forEach((sensorData: WaterSensorData) => {
          newSensors.push({
            id: Math.floor(Math.random() * 1000000),
            ...sensorData,
            sensorCategory: sensorData.sensorCategory,
            status: "online",
            lastReading: new Date(),
            location: `${lote.nombre} - ${valvula.nombre}`,
            batteryLevel: 75 + Math.random() * 25,
            loteId: loteId as any,
            valvulaId: valvulaId as any,
          })
        })
      }
    }
    // Agregar todos los sensores generados
    setSensors((prev) => [...prev, ...newSensors])
  }

  const addSuggestion = (suggestion: Omit<IrrigationSuggestion, "id">) => {
    const newSuggestion: IrrigationSuggestion = {
      ...suggestion,
      id: Math.floor(Math.random() * 1000000),
    }
    setSuggestions((prev) => [newSuggestion, ...prev])

    // Add notification for new suggestion
    addNotification({
      type: "info",
      title: "Nueva Sugerencia de IA",
      message: `Se ha generado una nueva sugerencia de riego para ${suggestion.loteName}`,
      fincaId: suggestion.fincaId,
    })
  }

  const removeSuggestion = (id: string) => {
    setSuggestions((prev) => prev.filter((suggestion) => suggestion.id.toString() !== id))
  }

  const applySuggestion = (id: string) => {
    const suggestion = suggestions.find((s) => s.id.toString() === id)
    if (!suggestion) return

    // Find valves in the suggested lote
    const loteValves = valvulas.filter((v) => v.loteId === suggestion.loteId)

    if (loteValves.length > 0) {
      // Activate the first valve (or all valves in the lote)
      loteValves.forEach((valve) => {
        updateValvula(valve.id.toString(), {
          isActive: true,
          caudal: valve.caudal || 25,
        })
      })

      // Add notification for applied suggestion
      addNotification({
        type: "success",
        title: "Sugerencia Aplicada",
        message: `Se ha iniciado el riego en ${suggestion.loteName} por ${suggestion.recommendedDuration} minutos`,
        fincaId: suggestion.fincaId,
      })

      // Schedule to turn off valves after recommended duration
      setTimeout(
        () => {
          loteValves.forEach((valve) => {
            updateValvula(valve.id.toString(), {
              isActive: false,
              caudal: 0,
            })
          })

          addNotification({
            type: "info",
            title: "Riego Completado",
            message: `El riego automático en ${suggestion.loteName} ha finalizado`,
            fincaId: suggestion.fincaId,
          })
        },
        suggestion.recommendedDuration * 60 * 1000,
      ) // Convert minutes to milliseconds
    }

    // Remove the applied suggestion
    removeSuggestion(id)
  }

  return (
    <DataContext.Provider
      value={{
        users,
        fincas,
        lotes,
        valvulas,
        sensors,
        schedules,
        notifications,
        weather,
        systemStatus,
        suggestions,
        nodos,
        addUser,
        updateUser,
        deleteUser,
        addFinca,
        updateFinca,
        deleteFinca,
        addLote,
        updateLote,
        deleteLote,
        addValvula,
        updateValvula,
        deleteValvula,
        toggleValvula,
        addSchedule,
        updateSchedule,
        deleteSchedule,
        addNotification,
        markNotificationAsRead,
        addNodo,
        updateNodo,
        deleteNodo,
        addSensor,
        updateSensor,
        deleteSensor,
        generateAutoSensors,
        addSuggestion,
        removeSuggestion,
        applySuggestion,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}
