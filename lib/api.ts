const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://back.irrigia.ingreatsol.com"
//const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.0.115:3001"

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

interface LoginResponse {
  token: string
  refresh_token?: string
  user: {
    id: number
    nombre: string
    email: string
    rol: "ADMIN" | "USER"
    telefono?: string
    isActive?: boolean
  }
}

class ApiService {
  private baseUrl: string
  private token: string | null = null

  constructor() {
    this.baseUrl = API_BASE_URL
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("token")
    }
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token)
    }
  }

  clearToken() {
    this.token = null
    if (typeof window !== "undefined") {
      localStorage.removeItem("token")
    }
  }

  public async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    }

    // Add any additional headers from options
    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers[key] = value
        })
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          headers[key] = value
        })
      } else {
        Object.assign(headers, options.headers)
      }
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    try {
      console.log(`[v0] API Request: ${options.method || "GET"} ${url}`)

      const response = await fetch(url, {
        ...options,
        headers,
        mode: "cors",
        credentials: "omit",
      })

      console.log(`[v0] Response Status:`, response.status)

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { message: errorText }
        }

        return {
          success: false,
          error: errorData.message || errorData.error || `HTTP ${response.status}`,
        }
      }

      const data = await response.json()
      console.log(`[v0] API Response Success:`, data)

      return {
        success: true,
        data,
      }
    } catch (error: unknown) {
      console.error("[v0] API Error:", error)

      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        console.log("[v0] Backend is offline: Failed to fetch")
        return {
          success: false,
          error: "Backend no disponible. Usando modo demo.",
        }
      }

      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      return {
        success: false,
        error: `Error de conexión: ${errorMessage}`,
      }
    }
  }

  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await this.request<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })

      if (!response.success) {
        // Handle specific authentication errors
        if (response.error?.includes("401") || response.error?.includes("Unauthorized")) {
          return {
            success: false,
            error: "Credenciales incorrectas. Verifique su email y contraseña.",
          }
        }

        if (response.error?.includes("404") || response.error?.includes("Not Found")) {
          return {
            success: false,
            error: "Usuario no encontrado. Verifique su email.",
          }
        }

        if (response.error?.includes("403") || response.error?.includes("Forbidden")) {
          return {
            success: false,
            error: "Cuenta desactivada. Contacte al administrador.",
          }
        }
      }

      return response
    } catch (error) {
      console.error("Login error:", error)
      throw error
    }
  }

  async register(userData: {
    email: string
    password: string
    nombre: string
    telefono?: string
    rol?: "ADMIN" | "USER"
  }): Promise<ApiResponse<any>> {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    })
  }

  async getProfile(): Promise<ApiResponse<any>> {
    return this.request("/api/auth/profile")
  }

  async updateProfile(updates: any): Promise<ApiResponse<any>> {
    return this.request("/api/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(updates),
    })
  }

  async getDashboardData(): Promise<ApiResponse<any>> {
    return this.request("/api/dashboard")
  }

  async getMediciones(params?: any): Promise<ApiResponse<any>> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ""
    return this.request(`/api/mediciones${queryString}`)
  }

  async getFincas2(params?: any): Promise<ApiResponse<any>> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ""
    return this.request(`/api/fincas${queryString}`)
  }

  async getLotes(params?: any): Promise<ApiResponse<any>> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ""
    return this.request(`/api/lotes${queryString}`)
  }

  async getValvulas(params?: any): Promise<ApiResponse<any>> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ""
    return this.request(`/api/valvulas${queryString}`)
  }

  async controlValvula(valvulaId: number, action: "ABIERTA" | "CERRADA", duracion?: number): Promise<ApiResponse<any>> {
    return this.request(`/api/valvulas/downlink`, {
      method: "POST",
      body: JSON.stringify({
        valvulaId,
        accion: action,
        duracion,
      }),
    })
  }

  async getPlanesRiego(params?: any): Promise<ApiResponse<any>> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ""
    return this.request(`/api/planes-riego${queryString}`)
  }

  async createPlanRiego(planData: any): Promise<ApiResponse<any>> {
    return this.request("/api/planes-riego", {
      method: "POST",
      body: JSON.stringify(planData),
    })
  }

  async updatePlanRiego(planId: string, planData: any): Promise<ApiResponse<any>> {
    return this.request(`/api/planes-riego/${planId}`, {
      method: "PATCH",
      body: JSON.stringify(planData),
    })
  }

  async deletePlanRiego(planId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/planes-riego/${planId}`, {
      method: "DELETE",
    })
  }

  async getUsers(params?: any): Promise<ApiResponse<any>> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ""
    return this.request(`/api/users${queryString}`)
  }

  async createUser(userData: {
    nombre: string
    email: string
    password: string
    telefono?: string
    rol: "ADMIN" | "USER"
    fincaId?: number
    isActive?: boolean
  }): Promise<ApiResponse<any>> {
    return this.request("/api/users", {
      method: "POST",
      body: JSON.stringify(userData),
    })
  }

  async updateUser(
    userId: number,
    userData: {
      nombre?: string
      email?: string
      password?: string
      telefono?: string
      rol?: "ADMIN" | "USER"
      fincaId?: number
      isActive?: boolean
    },
  ): Promise<ApiResponse<any>> {
    return this.request(`/api/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(userData),
    })
  }

  async deleteUser(userId: number): Promise<ApiResponse<any>> {
    return this.request(`/api/users/${userId}`, {
      method: "DELETE",
    })
  }

  async resetUserPassword(userId: number): Promise<ApiResponse<{ temporaryPassword: string }>> {
    return this.request(`/api/users/${userId}/reset-password`, {
      method: "POST",
    })
  }

  async healthCheck(): Promise<ApiResponse<any>> {
    return this.request("/health")
  }

  async getAllFincas(params?: any): Promise<ApiResponse<any[]>> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ""
    return this.request(`/api/fincas/all${queryString}`)
  }

  // Farm management endpoints
  async getFincas(): Promise<any[]> {
    const response = await this.request<any[]>("/api/fincas/all")
    if (!response.success) {
      throw new Error(response.error || "Error al obtener fincas")
    }
    return response.data || []
  }

  async createFinca(fincaData: {
    name: string
    location: string
    area: number
    coordinates?: any[]
    latitude: number
    longitude: number
  }): Promise<any> {
    const response = await this.request<any>("/api/fincas", {
      method: "POST",
      body: JSON.stringify(fincaData),
    })
    if (!response.success) {
      throw new Error(response.error || "Error al crear finca")
    }
    return response.data
  }

  async updateFinca(
    fincaId: number,
    fincaData: {
      name?: string
      location?: string
      area?: number
      coordinates?: any[]
      mapCoordinates?: any
    },
  ): Promise<any> {
    const response = await this.request<any>(`/api/fincas/${fincaId}`, {
      method: "PATCH",
      body: JSON.stringify(fincaData),
    })
    if (!response.success) {
      throw new Error(response.error || "Error al actualizar finca")
    }
    return response.data
  }

  async deleteFinca(fincaId: number): Promise<void> {
    const response = await this.request(`/api/fincas/${fincaId}`, {
      method: "DELETE",
    })
    if (!response.success) {
      throw new Error(response.error || "Error al eliminar finca")
    }
  }

  async getAllFincasFromTodas(params?: any): Promise<ApiResponse<any[]>> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : ""
    return this.request(`/api/fincas/todas${queryString}`)
  }

  async createLote(loteData: {
    nombre: string
    fincaId: number
    hectareas: number
    state?: boolean
    valvulaIds?: number[]
    coordinates: { lat: number; lng: number }[]
  }): Promise<ApiResponse<any>> {
    return this.request("/api/lotes", {
      method: "POST",
      body: JSON.stringify(loteData),
    })
  }

  async updateLote(loteId: string, loteData: {
    nombre: string
    fincaId: number
    hectareas: number
    state?: boolean
    valvulaIds?: number[]
    coordinates: { lat: number; lng: number }[]
  }): Promise<ApiResponse<any>> {
    return this.request(`/api/lotes/${loteId}`, {
      method: "PATCH",
      body: JSON.stringify(loteData),
    })
  }

  async deleteLote(loteId: string): Promise<ApiResponse<any>> {
    const response = await this.request(`/api/lotes/${loteId}`, {
      method: "DELETE",
    })
    // Si la respuesta es { success: true }, devolverlo así explícitamente
    if (response && response.success) {
      return { success: true }
    }
    return response
  }

  async getDevices(): Promise<ApiResponse<any>> {
    return this.request("/api/devices")
  }

  async createDevice(deviceData: {
    nombre: string
    descripcion?: string
    deviceEui: string
    joinEui: string
    deviceProfile: string
    isDisabled: boolean
  }): Promise<ApiResponse<any>> {
    return this.request("/api/devices", {
      method: "POST",
      body: JSON.stringify(deviceData),
    })
  }

  async updateDevice(deviceId: string, deviceData: {
    nombre: string
    descripcion?: string
    deviceEui: string
    joinEui: string
    deviceProfile: string
    isDisabled: boolean
  }): Promise<ApiResponse<any>> {
    return this.request(`/api/devices/${deviceId}`, {
      method: "PATCH",
      body: JSON.stringify(deviceData),
    })
  }

  async deleteDevice(deviceId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/devices/${deviceId}`, {
      method: "DELETE",
    })
  }

}

export const apiService = new ApiService()
export default apiService
