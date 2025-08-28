"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Eye, EyeOff, Mail, Lock, Shield } from "lucide-react"
import Image from "next/image"

export function LoginForm() {
  const { login, sendVerificationCode, verifyCode, resendCode } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Verification states
  const [showVerification, setShowVerification] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [verificationEmail, setVerificationEmail] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationError, setVerificationError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await login(email, password)

      if (result.success) {
        // Login successful - user will be redirected by the auth context
      } else if (result.needsVerification) {
        // User needs verification
        setVerificationEmail(email)
        setShowVerification(true)
        await sendVerificationCode(email)
      } else {
        setError(result.message || "Error de autenticación")
      }
    } catch (error) {
      setError("Error de conexión. Intenta nuevamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsVerifying(true)
    setVerificationError("")

    try {
      const success = await verifyCode(verificationEmail, verificationCode)

      if (success) {
        setShowVerification(false)
        // Try login again
        const result = await login(email, password)
        if (!result.success) {
          setError("Error al iniciar sesión después de la verificación")
        }
      } else {
        setVerificationError("Código de verificación incorrecto")
      }
    } catch (error) {
      setVerificationError("Error al verificar el código")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendCode = async () => {
    try {
      await resendCode(verificationEmail)
      setVerificationError("")
    } catch (error) {
      setVerificationError("Error al reenviar el código")
    }
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-white p-4 rounded-full shadow-lg border border-gray-100">
                <Image
                  src="/images/IrrigiaLogo-Login.png"
                  alt="Irrigia Logo"
                  width={96}
                  height={96}
                  className="w-24 h-24 object-contain"
                  priority
                />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center">Sistema de Riego IoT</CardTitle>
            <CardDescription className="text-center">Ingresa tus credenciales para acceder al sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              <p>
                <strong>Conectado al backend:</strong>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {process.env.NEXT_PUBLIC_API_URL || "http://192.168.0.111:3001"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verification Dialog */}
      <Dialog open={showVerification} onOpenChange={setShowVerification}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Verificación de Usuario
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">Se ha enviado un código de verificación a:</p>
              <p className="font-medium">{verificationEmail}</p>
            </div>

            <form onSubmit={handleVerification} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification-code">Código de Verificación</Label>
                <Input
                  id="verification-code"
                  type="text"
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                  required
                />
              </div>

              {verificationError && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{verificationError}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={isVerifying}>
                  {isVerifying ? "Verificando..." : "Verificar"}
                </Button>
                <Button type="button" variant="outline" onClick={handleResendCode} disabled={isVerifying}>
                  Reenviar
                </Button>
              </div>
            </form>

            <div className="text-center">
              <Button variant="ghost" size="sm" onClick={() => setShowVerification(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
