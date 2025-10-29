export interface User {
  id: number
  name: string
  email: string
  password?: string
  phone?: string
  role: "ADMIN" | "USER"
  isActive: boolean
  fincaId?: number
  fincaIds?: number[] // Changed to number array for multiple fincas per client
  avatar?: string
  lastLogin?: Date
  createdAt: Date
}

export enum Role{
  USER = 'USER',
  ADMIN = 'ADMIN'
};

export enum EstadoValvula {
  ABIERTA = "ABIERTA",
  CERRADA = "CERRADA",
  PARCIAL = "PARCIAL",
  ERROR = "ERROR"
}



export interface Coordinate {
  lat: number
  lng: number
}

export interface LoteCoordinate {
  lat: number
  lng: number
}

export interface MapCoordinate extends LoteCoordinate {
  zoom: number
}

export interface Finca {
  id: number
  nombre: string
  location?: string
  descripcion?: string
  area: number
  lotes?: Lote[]
  latitude: number
  longitude: number
  status: "active" | "inactive"
  coordinates: LoteCoordinate[]
  createdAt: string
  mapCoordinates?: LoteCoordinate 
}

export interface Lote {
  id: number
  nombre: string
  fincaId: number
  area: number
  crop: string
  cropType: string
  valvulas: Valvula[]
  sensors: Sensor[]
  coordinates: LoteCoordinate[]
  centerCoordinates: LoteCoordinate
  soilType?: string
  plantingDate?: Date
  createdAt: Date
}

export interface Valvula {
  id: number
  nombre: string
  deviceId: number
  estado: string
  updatedAt: string
  isActive: boolean
  caudal?: number
  presion?: number
  descripcion?: string
  createdAt: string
  fincaId: number
  loteId: number
  coordinates: { lat: number; lng: number }
  needsMaintenance: boolean
  tipo: string
}

export interface Sensor {
  id: number
  name: string
  type: "humidity" | "temperature" | "ph" | "flow" | "pressure"
  value: number
  unit: string
  status: "online" | "offline" | "warning"
  lastReading: Date
  location: string
  batteryLevel?: number
  loteId: number
  nodoId?: number // Changed nodoId reference to number
  valvulaId?: number // Changed valvulaId reference to number
  sensorCategory?: "soil" | "air" | "water"
}

export interface SensorData {
  id: number
  deviceId: string
  fincaId: number
  loteId: number
  type: "soil_moisture" | "temperature" | "humidity" | "ph" | "pressure"
  value: number
  unit: string
  timestamp: Date
  coordinates: Coordinate
}

export interface IrrigationSchedule {
  id: number
  name: string
  loteId: number
  valvulaId: number
  startTime: string
  duration: number
  frequency: "daily" | "weekly" | "custom"
  isActive: boolean
  nextExecution: Date
  createdAt?: Date
}

export interface RiegoProgram {
  id: number
  name: string
  fincaId: number
  loteIds: number[]
  valvulaIds: number[]
  schedule: {
    days: number[] // 0-6 (Sunday-Saturday)
    startTime: string // HH:MM format
    duration: number // minutes
  }
  isActive: boolean
  createdAt?: Date
}

export interface RiegoSession {
  id: number
  programId?: number
  suggestionId?: number
  valvulaIds: number[]
  startTime: Date
  endTime?: Date
  status: "running" | "completed" | "cancelled"
  waterUsed: number // liters
  createdAt?: Date
}

export interface AirSensor {
  id: number
  name: string
  fincaId: number
  loteId?: number // Changed to number
  coordinates: Coordinate
  deviceId: string
  status: "active" | "inactive" | "maintenance"
  lastReading: {
    temperature: number // Celsius
    humidity: number // percentage
    timestamp: Date
  }
}

export interface SoilSensor {
  id: number
  name: string
  loteId: number
  fincaId: number
  coordinates: Coordinate
  deviceId: string
  status: "active" | "inactive" | "maintenance"
  depth: number // cm
  lastReading: {
    temperature: number // Celsius
    humidity: number // percentage
    ph: number
    timestamp: Date
  }
}

export interface WaterSensor {
  id: number
  name: string
  valvulaId: number
  fincaId: number
  deviceId: string
  status: "active" | "inactive" | "maintenance"
  lastReading: {
    pressure: number // bar
    flow: number // L/min
    temperature: number // Celsius
    timestamp: Date
  }
}

export interface WeatherPrediction {
  id: number
  fincaId: number
  date: Date
  temperature: {
    min: number
    max: number
    avg: number
  }
  humidity: {
    min: number
    max: number
    avg: number
  }
  precipitation: number // mm
  windSpeed: number // km/h
  uvIndex: number
}

export interface WeatherData {
  temperature: number
  humidity: number
  precipitation: number
  windSpeed: number
  forecast: Array<{
    date: string
    temperature: { min: number; max: number }
    precipitation: number
    humidity: number
  }>
}

export interface SystemStatus {
  connectivity: number
  activeDevices: number
  totalDevices: number
  lastUpdate: Date
  alerts: number
}

export interface IrrigationSuggestion {
  id: number
  fincaId: number
  loteId: number
  loteName: string
  priority: "high" | "medium" | "low"
  reason: string
  recommendedDuration: number
  estimatedWaterUsage: number
  timestamp: Date
}

export interface Alert {
  id: number
  fincaId: number
  loteId?: number
  valvulaId?: number
  type: "sensor" | "valve" | "system" | "weather"
  severity: "info" | "warning" | "error" | "critical"
  title: string
  message: string
  isRead: boolean
  createdAt?: Date
}

export interface Notification {
  id: number
  type: "success" | "error" | "warning" | "info"
  title: string
  message: string
  timestamp: Date
  isRead: boolean
}

export interface AIRecommendation {
  id: number
  type: "irrigation" | "maintenance" | "alert"
  title: string
  description: string
  priority: "low" | "medium" | "high"
  loteId?: number
  createdAt: Date
  isRead: boolean
}

export interface Nodo {
  id: number
  name: string
  fincaId: number
  loteId: number
  deviceId: string
  coordinates: Coordinate
  status: "active" | "inactive" | "maintenance"
  batteryLevel: number
  lastActivity: Date
  sensors: Sensor[]
  createdAt: Date
}

export interface AutoSensorConfig {
  // Sensores por nodo
  nodeSensors: {
    soilTemperature: boolean
    soilHumidity: boolean
    soilPH: boolean
    airTemperature: boolean
    airHumidity: boolean
  }
  // Sensores por válvula
  valveSensors: {
    waterPressure: boolean
    waterTemperature: boolean
    waterFlow: boolean
    valveStatus: boolean
  }
}

export interface LoginResponse {
  success: boolean
  data: {
    token: string
    refreshToken: string
    user: User
  }
}

export interface RegisterResponse {
  success: boolean
  data: {
    token: string
    refreshToken: string
    user: User
  }
}
