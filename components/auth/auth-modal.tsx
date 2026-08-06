"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { User, Mail, Lock, Eye, EyeOff } from "lucide-react"
import { signIn } from "next-auth/react"

interface UserData {
  firstName: string
  lastName: string
  email: string
}

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onLoginSuccess?: (userData: UserData) => void
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    confirmPassword: "",
  })



  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (error) setError(null)
  }

  const handleLogin = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
      })

      if (res?.error) {
        setError("Email ou mot de passe incorrect")
        return
      }

      if (res?.ok) {
        const userData: UserData = {
          firstName: "",
          lastName: "",
          email: formData.email,
        }
        onLoginSuccess?.(userData)
        onClose()
      }
    } catch (err) {
      setError("Une erreur inattendue s'est produite")
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    try {
      setLoading(true)
      setError(null)

      if (formData.password !== formData.confirmPassword) {
        setError("Les mots de passe ne correspondent pas")
        return
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'inscription")
        return
      }

      // Si l'inscription réussit, on connecte l'utilisateur
      await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
      })

      const userData: UserData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
      }

      onLoginSuccess?.(userData)
      onClose()
    } catch (err) {
      setError("Une erreur inattendue s'est produite")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (mode === "login") {
      handleLogin()
    } else {
      handleRegister()
    }
  }

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      confirmPassword: "",
    })
    setError(null)
  }

  const switchMode = (newMode: "login" | "register") => {
    setMode(newMode)
    resetForm()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            {mode === "login" ? "Connexion" : "Créer un compte"}
          </DialogTitle>
        </DialogHeader>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {mode === "register" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Prénom</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        className="pl-10"
                        placeholder="Jean"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="lastName">Nom</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        className="pl-10"
                        placeholder="Dupont"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="pl-10"
                    placeholder="jean.dupont@email.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="pl-10 pr-10"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {mode === "register" && (
                <div>
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      className="pl-10"
                      placeholder="••••••••"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full btn-primary" disabled={loading}>
                {loading
                  ? (mode === "login" ? "Connexion..." : "Création...")
                  : (mode === "login" ? "Se connecter" : "Créer mon compte")
                }
              </Button>
            </form>

            {/* Connexion Google retirée de l'UI en attendant les accès OAuth du client ;
                le provider reste configuré côté serveur (auth.config.ts). */}

            <Separator className="my-6" />

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {mode === "login" ? "Pas encore de compte ?" : "Déjà un compte ?"}
              </p>
              <Button
                variant="ghost"
                onClick={() => switchMode(mode === "login" ? "register" : "login")}
                className="text-brand hover:text-brand/80"
                disabled={loading}
              >
                {mode === "login" ? "Créer un compte" : "Se connecter"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}