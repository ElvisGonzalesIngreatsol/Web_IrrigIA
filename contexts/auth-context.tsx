"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import type { User } from "@/types"
import { apiService } from "@/lib/api"

interface AuthContextType {
  user: User | null
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; needsVerification?: boolean; message?: string }>
  logout: () => void
  isLoading: boolean
  sendVerificationCode: (email: string, phone?: string) => Promise<boolean>
  verifyCode: (email: string, code: string) => Promise<boolean>
  resendCode: (email: string) => Promise<boolean>
  updateProfile: (updates: Partial<User>) => Promise<boolean>
  shouldRedirectToDashboard: boolean
  setShouldRedirectToDashboard: React.Dispatch<React.SetStateAction<boolean>>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [shouldRedirectToDashboard, setShouldRedirectToDashboard] = useState(false)

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem("user")
    const storedToken = localStorage.getItem("token")

    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser)
        const validatedUser: User = {
          ...parsedUser,
          id: String(parsedUser.id),
          createdAt: new Date(parsedUser.createdAt),
          lastLogin: parsedUser.lastLogin ? new Date(parsedUser.lastLogin) : undefined,
        }
        setUser(validatedUser)
        apiService.setToken(storedToken)

        validateStoredSession(validatedUser, storedToken)
      } catch (error) {
        console.error("Error parsing stored user:", error)
        clearStoredSession()
      }
    }
    setIsLoading(false)
  }, [])

  const validateStoredSession = async (storedUser: User, token: string) => {
    try {
      const response = await apiService.getProfile()
      if (!response.success) {
        console.warn("Stored session invalid, clearing...")
        clearStoredSession()
      }
    } catch (error) {
      console.error("Session validation failed:", error)
      clearStoredSession()
    }
  }

  const clearStoredSession = () => {
    setUser(null)
    apiService.clearToken()
    localStorage.removeItem("user")
    localStorage.removeItem("token")
  }

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; needsVerification?: boolean; message?: string }> => {
    setIsLoading(true)

    try {
      console.log("[v0] Attempting backend authentication...")
      const response = await apiService.login(email, password)

      console.log("[v0] Backend response:", response)
      console.log("[v0] Response data structure:", JSON.stringify(response.data, null, 2))

      if (response.success && response.data) {
        let token: string
        let backendUser: any

        // The backend returns: { success: true, data: { token, refreshToken, user } }
        if (response.data.data) {
          // If there's a nested data object
          token = response.data.data.token || response.data.data.token
          backendUser = response.data.data.user
        } else {
          // Direct structure: { success: true, data: { token, user } }
          token = response.data.token || response.data.token
          backendUser = response.data.user
        }

        console.log("[v0] Extracted token:", token ? "Present" : "Missing")
        console.log("[v0] Extracted user data:", backendUser)

        if (!backendUser || (!backendUser.id && !backendUser._id && !backendUser.email)) {
          console.error("[v0] Backend user data is missing or invalid")
          console.error("[v0] Expected user object with id/email, got:", backendUser)
          setIsLoading(false)
          return { success: false, message: "Datos de usuario no válidos del servidor" }
        }

        if (!token) {
          console.warn("[v0] No access token found, using fallback")
          token = "temp_token_" + Date.now()
        }

        console.log("[v0] Backend user data:", backendUser)

        const userForStorage: User = {
          id: backendUser.id || backendUser._id || Date.now(),
          name: backendUser.name || backendUser.nombre || backendUser.firstName || "Usuario",
          email: backendUser.email || email,
          role: (() => {
            const backendRole = backendUser.role || backendUser.rol || backendUser.userType
            console.log("[v0] Backend role value:", backendRole)
            const finalRole = backendRole === "ADMIN" ? "ADMIN" : "USER"
            console.log("[v0] Final assigned role:", finalRole)
            return finalRole
          })(),
          isActive: backendUser.isActive ?? backendUser.active ?? true,
          phone: backendUser.phone || backendUser.telefono || backendUser.phoneNumber,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(backendUser.name || backendUser.nombre || backendUser.firstName || "user")}`,
          createdAt: new Date(),
          lastLogin: new Date(),
        }

        console.log("[v0] Processed user data:", userForStorage)

        // Store token and user data
        apiService.setToken(token)
        setUser(userForStorage)
        localStorage.setItem("user", JSON.stringify(userForStorage))
        localStorage.setItem("token", token)
        setShouldRedirectToDashboard(true)
        setIsLoading(false)

        console.log("[v0] Authentication successful")
        return { success: true }
      } else {
        setIsLoading(false)
        const errorMessage = response.error || response.message || "Error de autenticación"
        console.error("[v0] Authentication failed:", errorMessage)
        console.error("[v0] Full response for debugging:", JSON.stringify(response, null, 2))
        return { success: false, message: errorMessage }
      }
    } catch (error) {
      console.error("[v0] Authentication error:", error)
      setIsLoading(false)

      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        return {
          success: false,
          message: "No se puede conectar al servidor. Verifique su conexión a internet.",
        }
      }

      const errorMessage = error instanceof Error ? error.message : "Error de conexión"
      return { success: false, message: errorMessage }
    }
  }

  const sendVerificationCode = async (email: string, phone?: string): Promise<boolean> => {
    try {
      const response = await apiService.request("/api/auth/send-verification", {
        method: "POST",
        body: JSON.stringify({ email, phone }),
      })

      return response.success
    } catch (error) {
      console.error("Error sending verification code:", error)
      return false
    }
  }

  const verifyCode = async (email: string, code: string): Promise<boolean> => {
    try {
      const response = await apiService.request("/api/auth/verify-code", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      })

      return response.success
    } catch (error) {
      console.error("Error verifying code:", error)
      return false
    }
  }

  const resendCode = async (email: string): Promise<boolean> => {
    return sendVerificationCode(email)
  }

  const logout = () => {
    console.log("[v0] Logging out user")
    clearStoredSession()
  }

  const updateProfile = async (updates: Partial<User>): Promise<boolean> => {
    if (!user) return false

    try {
      const response = await apiService.updateProfile(updates)
      if (!response.success) {
        console.error("Profile update failed:", response.error)
        return false
      }

      // Update local state with backend response
      const updatedUser = { ...user, ...updates }
      setUser(updatedUser)
      localStorage.setItem("user", JSON.stringify(updatedUser))

      return true
    } catch (error) {
      console.error("Error updating profile:", error)
      return false
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isLoading,
        sendVerificationCode,
        verifyCode,
        resendCode,
        updateProfile,
        shouldRedirectToDashboard,
        setShouldRedirectToDashboard,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
