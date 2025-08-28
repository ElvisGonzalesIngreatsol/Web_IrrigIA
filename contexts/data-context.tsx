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

// Datos simulados para cultivo de banano
const initialUsers: User[] = [
  {
    id: "1",
    name: "Juan Pérez",
    email: "juan@irrigia.com",
    password: "admin123",
    phone: "+593 99 123 4567",
    role: "admin",
    isActive: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Juan",
    lastLogin: new Date(),
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "2",
    name: "María González",
    email: "maria@finca1.com",
    password: "client123",
    phone: "+593 99 234 5678",
    role: "client",
    fincaId: "1",
    isActive: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maria",
    lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000),
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "3",
    name: "Carlos Rodríguez",
    email: "carlos@finca2.com",
    password: "client456",
    phone: "+593 99 345 6789",
    role: "client",
    fincaId: "2",
    isActive: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos",
    lastLogin: new Date(Date.now() - 4 * 60 * 60 * 1000),
    createdAt: new Date("2024-02-01"),
  },
  {
    id: "4",
    name: "Ana Morales",
    email: "ana@finca3.com",
    password: "client789",
    phone: "+593 99 456 7890",
    role: "client",
    fincaId: "3",
    isActive: true,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ana",
    lastLogin: new Date(Date.now() - 6 * 60 * 60 * 1000),
    createdAt: new Date("2024-02-15"),
  },
]

const initialFincas: Finca[] = [
  {
    id: "1",
    name: "Bananera San José",
    location: "Los Ríos, Ecuador",
    area: 45.5,
    owner: "Juan Pérez",
    status: "active",
    coordinates: [
      { lat: -1.2394, lng: -79.4678 },
      { lat: -1.2397, lng: -79.4675 },
      { lat: -1.24, lng: -79.468 },
      { lat: -1.2396, lng: -79.4683 },
    ],
    mapCoordinates: { lat: -1.2397, lng: -79.4679, zoom: 16 },
    lotes: [], // Se llenará dinámicamente
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    name: "Plantación El Oro",
    location: "El Oro, Ecuador",
    area: 62.3,
    owner: "María González",
    status: "active",
    coordinates: [
      { lat: -3.2594, lng: -79.9578 },
      { lat: -3.2597, lng: -79.9575 },
      { lat: -3.26, lng: -79.958 },
      { lat: -3.2596, lng: -79.9583 },
    ],
    mapCoordinates: { lat: -3.2597, lng: -79.9579, zoom: 16 },
    lotes: [], // Se llenará dinámicamente
    createdAt: new Date("2024-02-01"),
  },
  {
    id: "3",
    name: "Bananera Los Andes",
    location: "Guayas, Ecuador",
    area: 38.7,
    owner: "Carlos Rodríguez",
    status: "active",
    coordinates: [
      { lat: -2.1894, lng: -79.8878 },
      { lat: -2.1897, lng: -79.8875 },
      { lat: -2.19, lng: -79.888 },
      { lat: -2.1896, lng: -79.8883 },
    ],
    mapCoordinates: { lat: -2.1897, lng: -79.8879, zoom: 16 },
    lotes: [], // Se llenará dinámicamente
    createdAt: new Date("2024-02-15"),
  },
  {
    id: "4",
    name: "Finca Valle Verde",
    location: "Manabí, Ecuador",
    area: 55.2,
    owner: "Ana López",
    status: "active",
    coordinates: [
      { lat: -0.9594, lng: -80.7278 },
      { lat: -0.9597, lng: -80.7275 },
      { lat: -0.96, lng: -80.728 },
      { lat: -0.9596, lng: -80.7283 },
    ],
    mapCoordinates: { lat: -0.9597, lng: -80.7279, zoom: 16 },
    lotes: [], // Se llenará dinámicamente
    createdAt: new Date("2024-03-01"),
  },
]

const initialLotes: Lote[] = [
  {
    id: "1",
    name: "Sector Norte",
    fincaId: "1",
    area: 15.2,
    crop: "Banano Cavendish",
    cropType: "Banano Cavendish",
    valvulas: [], // Se llenará dinámicamente
    sensors: [], // Se llenará dinámicamente
    coordinates: [
      { lat: -1.2394, lng: -79.4678 },
      { lat: -1.2396, lng: -79.4676 },
      { lat: -1.2398, lng: -79.4679 },
      { lat: -1.2396, lng: -79.4681 },
    ],
    centerCoordinates: { lat: -1.2396, lng: -79.4679 },
    createdAt: new Date("2024-01-20"),
  },
  {
    id: "2",
    name: "Sector Sur",
    fincaId: "1",
    area: 18.5,
    crop: "Banano Cavendish",
    cropType: "Banano Cavendish",
    valvulas: [], // Se llenará dinámicamente
    sensors: [], // Se llenará dinámicamente
    coordinates: [
      { lat: -1.2398, lng: -79.4681 },
      { lat: -1.24, lng: -79.4679 },
      { lat: -1.2402, lng: -79.4682 },
      { lat: -1.24, lng: -79.4684 },
    ],
    centerCoordinates: { lat: -1.24, lng: -79.4682 },
    createdAt: new Date("2024-01-20"),
  },
  {
    id: "3",
    name: "Bloque A",
    fincaId: "2",
    area: 20.8,
    crop: "Banano Cavendish",
    cropType: "Banano Cavendish",
    valvulas: [], // Se llenará dinámicamente
    sensors: [], // Se llenará dinámicamente
    coordinates: [
      { lat: -3.2594, lng: -79.9578 },
      { lat: -3.2596, lng: -79.9576 },
      { lat: -3.2598, lng: -79.9579 },
      { lat: -3.2596, lng: -79.9581 },
    ],
    centerCoordinates: { lat: -3.2596, lng: -79.9579 },
    createdAt: new Date("2024-02-05"),
  },
  {
    id: "4",
    name: "Bloque B",
    fincaId: "2",
    area: 22.1,
    crop: "Banano Cavendish",
    cropType: "Banano Cavendish",
    valvulas: [], // Se llenará dinámicamente
    sensors: [], // Se llenará dinámicamente
    coordinates: [
      { lat: -3.2598, lng: -79.9581 },
      { lat: -3.26, lng: -79.9579 },
      { lat: -3.2602, lng: -79.9582 },
      { lat: -3.26, lng: -79.9584 },
    ],
    centerCoordinates: { lat: -3.26, lng: -79.4682 },
    createdAt: new Date("2024-02-05"),
  },
  {
    id: "5",
    name: "Parcela Central",
    fincaId: "3",
    area: 25.3,
    crop: "Banano Cavendish",
    cropType: "Banano Cavendish",
    valvulas: [], // Se llenará dinámicamente
    sensors: [], // Se llenará dinámicamente
    coordinates: [
      { lat: -2.1894, lng: -79.8878 },
      { lat: -2.1896, lng: -79.8876 },
      { lat: -2.1898, lng: -79.8879 },
      { lat: -2.1896, lng: -79.8881 },
    ],
    centerCoordinates: { lat: -2.1896, lng: -79.8879 },
    createdAt: new Date("2024-02-20"),
  },
  {
    id: "6",
    name: "Zona Este",
    fincaId: "4",
    area: 28.7,
    crop: "Banano Cavendish",
    cropType: "Banano Cavendish",
    valvulas: [], // Se llenará dinámicamente
    sensors: [], // Se llenará dinámicamente
    coordinates: [
      { lat: -0.9594, lng: -80.7278 },
      { lat: -0.9596, lng: -80.7276 },
      { lat: -0.9598, lng: -80.7279 },
      { lat: -0.9596, lng: -80.7281 },
    ],
    centerCoordinates: { lat: -0.9596, lng: -80.7279 },
    createdAt: new Date("2024-03-05"),
  },
]

const initialValvulas: Valvula[] = [
  {
    id: "1",
    name: "Válvula Norte A1",
    deviceId: "LORA_001",
    fincaId: "1",
    loteId: "1",
    isOpen: true,
    flowRate: 25.5,
    status: "active",
    coordinates: { lat: -1.2395, lng: -79.4678 },
    lastActivity: new Date(),
    tipo: "aspersion",
    caudal: 25.5,
    presion: 2.1,
    createdAt: new Date("2024-01-25"),
  },
  {
    id: "2",
    name: "Válvula Norte A2",
    deviceId: "LORA_002",
    fincaId: "1",
    loteId: "1",
    isOpen: false,
    flowRate: 0,
    status: "active",
    coordinates: { lat: -1.2397, lng: -79.4677 },
    lastActivity: new Date(Date.now() - 3600000),
    tipo: "goteo",
    caudal: 18.3,
    presion: 1.8,
    createdAt: new Date("2024-01-25"),
  },
  {
    id: "3",
    name: "Válvula Sur B1",
    deviceId: "LORA_003",
    fincaId: "1",
    loteId: "2",
    isOpen: true,
    flowRate: 30.2,
    status: "active",
    coordinates: { lat: -1.2399, lng: -79.4681 },
    lastActivity: new Date(),
    tipo: "aspersion",
    caudal: 30.2,
    presion: 2.3,
    createdAt: new Date("2024-01-25"),
  },
  {
    id: "4",
    name: "Válvula Bloque A1",
    deviceId: "LORA_004",
    fincaId: "2",
    loteId: "3",
    isOpen: false,
    flowRate: 0,
    status: "maintenance",
    coordinates: { lat: -3.2595, lng: -79.9578 },
    lastActivity: new Date(Date.now() - 7200000),
    tipo: "microaspersion",
    caudal: 22.7,
    presion: 1.9,
    createdAt: new Date("2024-02-10"),
  },
  {
    id: "5",
    name: "Válvula Bloque A2",
    deviceId: "LORA_005",
    fincaId: "2",
    loteId: "3",
    isOpen: true,
    flowRate: 28.8,
    status: "active",
    coordinates: { lat: -3.2597, lng: -79.9577 },
    lastActivity: new Date(),
    tipo: "aspersion",
    caudal: 28.8,
    presion: 2.0,
    createdAt: new Date("2024-02-10"),
  },
  {
    id: "6",
    name: "Válvula Bloque B1",
    deviceId: "LORA_006",
    fincaId: "2",
    loteId: "4",
    isOpen: true,
    flowRate: 32.1,
    status: "active",
    coordinates: { lat: -3.2599, lng: -79.9581 },
    lastActivity: new Date(),
    tipo: "goteo",
    caudal: 32.1,
    presion: 2.2,
    createdAt: new Date("2024-02-10"),
  },
  {
    id: "7",
    name: "Válvula Central C1",
    deviceId: "LORA_007",
    fincaId: "3",
    loteId: "5",
    isOpen: false,
    flowRate: 0,
    status: "active",
    coordinates: { lat: -2.1895, lng: -79.8878 },
    lastActivity: new Date(Date.now() - 1800000),
    tipo: "aspersion",
    caudal: 26.4,
    presion: 2.1,
    createdAt: new Date("2024-02-25"),
  },
  {
    id: "8",
    name: "Válvula Este D1",
    deviceId: "LORA_008",
    fincaId: "4",
    loteId: "6",
    isOpen: true,
    flowRate: 35.7,
    status: "active",
    coordinates: { lat: -0.9595, lng: -80.7278 },
    lastActivity: new Date(),
    tipo: "microaspersion",
    caudal: 35.7,
    presion: 2.4,
    createdAt: new Date("2024-03-10"),
  },
]

const initialSensors: Sensor[] = [
  {
    id: "1",
    name: "Sensor Humedad Suelo Norte",
    type: "humidity",
    value: 68,
    unit: "%",
    status: "online",
    lastReading: new Date(),
    location: "Sector Norte - Bananera San José",
    batteryLevel: 85,
    loteId: "1",
    nodoId: "1",
    sensorCategory: "soil",
  },
  {
    id: "2",
    name: "Sensor Temperatura Suelo Norte",
    type: "temperature",
    value: 26.5,
    unit: "°C",
    status: "online",
    lastReading: new Date(Date.now() - 5 * 60 * 1000),
    location: "Sector Norte - Bananera San José",
    batteryLevel: 92,
    loteId: "1",
    nodoId: "1",
    sensorCategory: "soil",
  },
  {
    id: "3",
    name: "Sensor pH Suelo Norte",
    type: "ph",
    value: 6.2,
    unit: "pH",
    status: "warning",
    lastReading: new Date(Date.now() - 15 * 60 * 1000),
    location: "Sector Norte - Bananera San José",
    batteryLevel: 45,
    loteId: "1",
    nodoId: "1",
    sensorCategory: "soil",
  },
  {
    id: "4",
    name: "Sensor Temperatura Aire Norte",
    type: "temperature",
    value: 28.5,
    unit: "°C",
    status: "online",
    lastReading: new Date(Date.now() - 2 * 60 * 1000),
    location: "Sector Norte - Bananera San José",
    batteryLevel: 88,
    loteId: "1",
    nodoId: "1",
    sensorCategory: "air",
  },
  {
    id: "5",
    name: "Sensor Humedad Aire Norte",
    type: "humidity",
    value: 72,
    unit: "%",
    status: "online",
    lastReading: new Date(),
    location: "Sector Norte - Bananera San José",
    batteryLevel: 90,
    loteId: "1",
    nodoId: "1",
    sensorCategory: "air",
  },
  // Sensores para válvulas
  {
    id: "6",
    name: "Sensor Presión Válvula Norte A1",
    type: "pressure",
    value: 2.1,
    unit: "bar",
    status: "online",
    lastReading: new Date(),
    location: "Válvula Norte A1 - Bananera San José",
    batteryLevel: 78,
    loteId: "1",
    valvulaId: "1",
    sensorCategory: "water",
  },
  {
    id: "7",
    name: "Sensor Flujo Válvula Norte A1",
    type: "flow",
    value: 25.5,
    unit: "L/min",
    status: "online",
    lastReading: new Date(),
    location: "Válvula Norte A1 - Bananera San José",
    batteryLevel: 82,
    loteId: "1",
    valvulaId: "1",
    sensorCategory: "water",
  },
  {
    id: "8",
    name: "Sensor Temperatura Agua Norte A1",
    type: "temperature",
    value: 24.2,
    unit: "°C",
    status: "online",
    lastReading: new Date(),
    location: "Válvula Norte A1 - Bananera San José",
    batteryLevel: 85,
    loteId: "1",
    valvulaId: "1",
    sensorCategory: "water",
  },
]

const initialNodos: Nodo[] = [
  {
    id: "1",
    name: "Nodo Norte A",
    fincaId: "1",
    loteId: "1",
    deviceId: "NODE_001",
    coordinates: { lat: -1.2395, lng: -79.4678 },
    status: "active",
    batteryLevel: 85,
    lastActivity: new Date(),
    sensors: [],
    createdAt: new Date("2024-01-25"),
  },
  {
    id: "2",
    name: "Nodo Sur B",
    fincaId: "1",
    loteId: "2",
    deviceId: "NODE_002",
    coordinates: { lat: -1.2399, lng: -79.4681 },
    status: "active",
    batteryLevel: 92,
    lastActivity: new Date(),
    sensors: [],
    createdAt: new Date("2024-01-25"),
  },
]

const initialSuggestions: IrrigationSuggestion[] = [
  {
    id: "1",
    fincaId: "1",
    loteId: "1",
    loteName: "Sector Norte - Bananera San José",
    priority: "high",
    reason: "Humedad del suelo por debajo del 60% - Crítico para banano",
    recommendedDuration: 45,
    estimatedWaterUsage: 1200,
    timestamp: new Date(),
  },
  {
    id: "2",
    fincaId: "2",
    loteId: "3",
    loteName: "Bloque A - Plantación El Oro",
    priority: "medium",
    reason: "Temperatura elevada (>28°C) - Estrés hídrico en banano",
    recommendedDuration: 35,
    estimatedWaterUsage: 950,
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    id: "3",
    fincaId: "3",
    loteId: "5",
    loteName: "Parcela Central - Bananera Los Andes",
    priority: "low",
    reason: "Riego preventivo - Mantenimiento de humedad óptima",
    recommendedDuration: 25,
    estimatedWaterUsage: 680,
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
  },
]

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
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [baseFincas, setBaseFincas] = useState<Finca[]>(initialFincas)
  const [lotes, setLotes] = useState<Lote[]>(initialLotes)
  const [valvulas, setValvulas] = useState<Valvula[]>(initialValvulas)
  const [sensors, setSensors] = useState<Sensor[]>(initialSensors)
  const [schedules, setSchedules] = useState<IrrigationSchedule[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [suggestions, setSuggestions] = useState<IrrigationSuggestion[]>(initialSuggestions)
  const [nodos, setNodos] = useState<Nodo[]>(initialNodos)

  // Construir datos jerárquicos dinámicamente
  const fincas = buildHierarchicalData(baseFincas, lotes, valvulas, sensors)

  const [weather, setWeather] = useState<WeatherData | null>({
    temperature: 27,
    humidity: 72,
    precipitation: 0,
    windSpeed: 8,
    forecast: [
      {
        date: "2024-01-15",
        temperature: { min: 22, max: 30 },
        precipitation: 0,
        humidity: 68,
      },
      {
        date: "2024-01-16",
        temperature: { min: 23, max: 31 },
        precipitation: 2,
        humidity: 75,
      },
      {
        date: "2024-01-17",
        temperature: { min: 21, max: 28 },
        precipitation: 8,
        humidity: 82,
      },
    ],
  })

  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>({
    connectivity: 96,
    activeDevices: 28,
    totalDevices: 30,
    lastUpdate: new Date(),
    alerts: 3,
  })

  // Simular actualizaciones en tiempo real
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
              flowRate: valvula.isOpen ? Math.max(0, valvula.flowRate + (Math.random() - 0.5) * 3) : 0,
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
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
    }
    setUsers((prev) => [...prev, newUser])
  }

  const updateUser = (id: string, userData: Partial<User>) => {
    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, ...userData } : user)))
  }

  const deleteUser = (id: string) => {
    setUsers((prev) => prev.filter((user) => user.id !== id))
  }

  const addFinca = (finca: Omit<Finca, "id" | "createdAt">) => {
    const newFinca: Finca = {
      ...finca,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      lotes: [], // Se llenará dinámicamente
    }
    setBaseFincas((prev) => [...prev, newFinca])
  }

  const updateFinca = (id: string, fincaData: Partial<Finca>) => {
    setBaseFincas((prev) => prev.map((finca) => (finca.id === id ? { ...finca, ...fincaData } : finca)))
  }

  const deleteFinca = (id: string) => {
    setBaseFincas((prev) => prev.filter((finca) => finca.id !== id))
    // También eliminar lotes y válvulas relacionadas
    setLotes((prev) => prev.filter((lote) => lote.fincaId !== id))
    setValvulas((prev) => prev.filter((valvula) => valvula.fincaId !== id))
  }

  const addLote = (lote: Omit<Lote, "id" | "createdAt">) => {
    const newLote: Lote = {
      ...lote,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      valvulas: [],
      sensors: [],
    }
    setLotes((prev) => [...prev, newLote])

    // Generar nodo por defecto y sensores automáticamente
    setTimeout(() => {
      const defaultNodo = {
        name: `Nodo ${newLote.name}`,
        fincaId: newLote.fincaId,
        loteId: newLote.id,
        deviceId: `NODE_${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        coordinates: newLote.centerCoordinates,
        status: "active",
        batteryLevel: 85 + Math.random() * 15,
        lastActivity: new Date(),
      }
      addNodo(defaultNodo)
    }, 200)
  }

  const updateLote = (id: string, loteData: Partial<Lote>) => {
    setLotes((prev) => prev.map((lote) => (lote.id === id ? { ...lote, ...loteData } : lote)))
  }

  const deleteLote = (id: string) => {
    setLotes((prev) => prev.filter((lote) => lote.id !== id))
    // También eliminar válvulas relacionadas
    setValvulas((prev) => prev.filter((valvula) => valvula.loteId !== id))
  }

  const addValvula = (valvula: Omit<Valvula, "id" | "createdAt" | "lastActivity">) => {
    const newValvula: Valvula = {
      ...valvula,
      id: Math.random().toString(36).substr(2, 9),
      lastActivity: new Date(),
      createdAt: new Date(),
    }
    setValvulas((prev) => [...prev, newValvula])

    // Generar sensores automáticamente para la nueva válvula
    setTimeout(() => {
      generateAutoSensors(valvula.loteId, undefined, newValvula.id)
    }, 100)
  }

  const updateValvula = (id: string, valvulaData: Partial<Valvula>) => {
    setValvulas((prev) =>
      prev.map((valvula) => (valvula.id === id ? { ...valvula, ...valvulaData, lastActivity: new Date() } : valvula)),
    )
  }

  const deleteValvula = (id: string) => {
    setValvulas((prev) => prev.filter((valvula) => valvula.id !== id))
  }

  const toggleValvula = (id: string) => {
    setValvulas((prev) =>
      prev.map((valvula) =>
        valvula.id === id
          ? {
              ...valvula,
              isOpen: !valvula.isOpen,
              flowRate: !valvula.isOpen ? valvula.caudal || 0 : 0,
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
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
    }
    setSchedules((prev) => [...prev, newSchedule])
  }

  const updateSchedule = (id: string, scheduleData: Partial<IrrigationSchedule>) => {
    setSchedules((prev) => prev.map((schedule) => (schedule.id === id ? { ...schedule, ...scheduleData } : schedule)))
  }

  const deleteSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((schedule) => schedule.id !== id))
  }

  const addNotification = (notification: Omit<Notification, "id" | "timestamp" | "isRead">) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      isRead: false,
    }
    setNotifications((prev) => [newNotification, ...prev])
  }

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, isRead: true } : notification)),
    )
  }

  const addNodo = (nodo: Omit<Nodo, "id" | "createdAt" | "sensors">) => {
    const newNodo: Nodo = {
      ...nodo,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      sensors: [],
    }
    setNodos((prev) => [...prev, newNodo])

    // Generar sensores automáticamente para el nuevo nodo
    setTimeout(() => {
      generateAutoSensors(nodo.loteId, newNodo.id)
    }, 100)
  }

  const updateNodo = (id: string, nodoData: Partial<Nodo>) => {
    setNodos((prev) => prev.map((nodo) => (nodo.id === id ? { ...nodo, ...nodoData } : nodo)))
  }

  const deleteNodo = (id: string) => {
    setNodos((prev) => prev.filter((nodo) => nodo.id !== id))
    // También eliminar sensores relacionados
    setSensors((prev) => prev.filter((sensor) => sensor.nodoId !== id))
  }

  const addSensor = (sensor: Omit<Sensor, "id">) => {
    const newSensor: Sensor = {
      ...sensor,
      id: Math.random().toString(36).substr(2, 9),
    }
    setSensors((prev) => [...prev, newSensor])
  }

  const updateSensor = (id: string, sensorData: Partial<Sensor>) => {
    setSensors((prev) => prev.map((sensor) => (sensor.id === id ? { ...sensor, ...sensorData } : sensor)))
  }

  const deleteSensor = (id: string) => {
    setSensors((prev) => prev.filter((sensor) => sensor.id !== id))
  }

  const generateAutoSensors = (loteId: string, nodoId?: string, valvulaId?: string) => {
    const lote = lotes.find((l) => l.id === loteId)
    if (!lote) return

    const newSensors: Sensor[] = []

    if (nodoId) {
      const nodo = nodos.find((n) => n.id === nodoId)
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
            id: Math.random().toString(36).substr(2, 9),
            ...sensorData,
            status: "online",
            lastReading: new Date(),
            location: `${lote.name} - ${nodo.name}`,
            batteryLevel: 80 + Math.random() * 20,
            loteId: loteId,
            nodoId: nodoId,
          })
        })

        airSensors.forEach((sensorData) => {
          newSensors.push({
            id: Math.random().toString(36).substr(2, 9),
            ...sensorData,
            status: "online",
            lastReading: new Date(),
            location: `${lote.name} - ${nodo.name}`,
            batteryLevel: 80 + Math.random() * 20,
            loteId: loteId,
            nodoId: nodoId,
          })
        })
      }
    }

    if (valvulaId) {
      const valvula = valvulas.find((v) => v.id === valvulaId)
      if (valvula) {
        // Sensores de agua por válvula
        const waterSensors = [
          {
            name: `Sensor Presión ${valvula.name}`,
            type: "pressure",
            unit: "bar",
            sensorCategory: "water",
            value: 1.5 + Math.random() * 1,
          },
          {
            name: `Sensor Temperatura Agua ${valvula.name}`,
            type: "temperature",
            unit: "°C",
            sensorCategory: "water",
            value: 22 + Math.random() * 4,
          },
          {
            name: `Sensor Flujo ${valvula.name}`,
            type: "flow",
            unit: "L/min",
            sensorCategory: "water",
            value: valvula.caudal || 20 + Math.random() * 15,
          },
        ]

        waterSensors.forEach((sensorData) => {
          newSensors.push({
            id: Math.random().toString(36).substr(2, 9),
            ...sensorData,
            status: "online",
            lastReading: new Date(),
            location: `${lote.name} - ${valvula.name}`,
            batteryLevel: 75 + Math.random() * 25,
            loteId: loteId,
            valvulaId: valvulaId,
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
      id: Math.random().toString(36).substr(2, 9),
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
    setSuggestions((prev) => prev.filter((suggestion) => suggestion.id !== id))
  }

  const applySuggestion = (id: string) => {
    const suggestion = suggestions.find((s) => s.id === id)
    if (!suggestion) return

    // Find valves in the suggested lote
    const loteValves = valvulas.filter((v) => v.loteId === suggestion.loteId)

    if (loteValves.length > 0) {
      // Activate the first valve (or all valves in the lote)
      loteValves.forEach((valve) => {
        updateValvula(valve.id, {
          isOpen: true,
          flowRate: valve.caudal || 25,
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
            updateValvula(valve.id, {
              isOpen: false,
              flowRate: 0,
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
