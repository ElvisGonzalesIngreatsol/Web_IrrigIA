"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, Shield, Check, X } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface ProfileEditDialogProps {
  isOpen: boolean
  onClose: () => void
  field: "name" | "email"
  currentValue: string
}

export function ProfileEditDialog({ isOpen, onClose, field, currentValue }: ProfileEditDialogProps) {
  const { user, sendVerificationCode, verifyCode, updateProfile } = useAuth()
  const [newValue, setNewValue] = useState(currentValue)
  const [step, setStep] = useState<"edit" | "verify">("edit")
  const [verificationCode, setVerificationCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const fieldLabels = {
    name: "Nombre Completo",
    email: "Correo Electrónico",
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)
    setError("")

    try {
      // Send verification code to current email
      const success = await sendVerificationCode(user.email)

      if (success) {
        setStep("verify")
        toast({
          title: "Código enviado",
          description: `Se ha enviado un código de verificación a ${user.email}`,
        })
      } else {
        setError("Error al enviar el código de verificación")
      }
    } catch (error) {
      setError("Error de conexión. Intenta nuevamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)
    setError("")

    try {
      const isValid = await verifyCode(user.email, verificationCode)

      if (isValid) {
        // Update profile with new value
        const updates = { [field]: newValue }
        const success = await updateProfile(updates)

        if (success) {
          toast({
            title: "Perfil actualizado",
            description: `${fieldLabels[field]} actualizado correctamente`,
          })
          onClose()
          setStep("edit")
          setVerificationCode("")
          setNewValue(currentValue)
        } else {
          setError("Error al actualizar el perfil")
        }
      } else {
        setError("Código de verificación incorrecto")
      }
    } catch (error) {
      setError("Error al verificar el código")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    onClose()
    setStep("edit")
    setVerificationCode("")
    setNewValue(currentValue)
    setError("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "edit" ? (
              <>
                <Mail className="h-5 w-5" />
                Editar {fieldLabels[field]}
              </>
            ) : (
              <>
                <Shield className="h-5 w-5" />
                Verificar Identidad
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === "edit"
              ? `Ingresa el nuevo ${fieldLabels[field].toLowerCase()} que deseas usar`
              : "Ingresa el código de verificación enviado a tu correo electrónico"}
          </DialogDescription>
        </DialogHeader>

        {step === "edit" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newValue">{fieldLabels[field]}</Label>
              <Input
                id="newValue"
                type={field === "email" ? "email" : "text"}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={`Nuevo ${fieldLabels[field].toLowerCase()}`}
                required
              />
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <Shield className="h-4 w-4 inline mr-1" />
                Para tu seguridad, se enviará un código de verificación a tu correo electrónico actual.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading || newValue === currentValue}>
                {isLoading ? "Enviando..." : "Continuar"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleVerification} className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">Se ha enviado un código de verificación a:</p>
              <p className="font-medium">{user?.email}</p>
            </div>

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

            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Cambio a realizar:</strong>
                <br />
                {fieldLabels[field]}: {currentValue} → {newValue}
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                <Check className="h-4 w-4 mr-2" />
                {isLoading ? "Verificando..." : "Confirmar Cambio"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
