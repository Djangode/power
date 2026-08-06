"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { User, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react"
import { signIn } from "next-auth/react"

export default function ConnexionPage() {
  const router = useRouter()
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
        router.push("/")
        router.refresh()
      }
    } catch {
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

      if (formData.password.length < 8) {
        setError("Le mot de passe doit faire au moins 8 caractères")
        return
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      // Inscription OK → connexion auto
      const loginRes = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
      })

      if (loginRes?.ok) {
        router.push("/")
        router.refresh()
      } else {
        setError("Compte créé mais erreur de connexion. Essayez de vous connecter.")
        setMode("login")
      }
    } catch {
      setError("Une erreur inattendue s'est produite")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === "login") handleLogin()
    else handleRegister()
  }

  const switchMode = (newMode: "login" | "register") => {
    setMode(newMode)
    setFormData({ email: "", password: "", firstName: "", lastName: "", confirmPassword: "" })
    setError(null)
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Retour */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au site
        </Link>

        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/logo-power-mark.png"
            alt=""
            width={72}
            height={72}
            priority
            className="mx-auto h-16 w-16"
          />
          <h1 className="mt-3 text-3xl font-extrabold text-white tracking-tight">
            Power<span className="text-orange-500">.</span>
          </h1>
          <p className="text-zinc-400 mt-2">
            {mode === "login" ? "Connectez-vous à votre compte" : "Créez votre compte"}
          </p>
        </div>

        <Card className="bg-zinc-900/60 border-white/10">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {mode === "register" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="firstName" className="text-zinc-300">Prénom</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        className="pl-10 bg-black/40 border-white/10 text-white rounded-xl"
                        placeholder="Jean"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-zinc-300">Nom</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        className="pl-10 bg-black/40 border-white/10 text-white rounded-xl"
                        placeholder="Dupont"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="email" className="text-zinc-300">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="pl-10 bg-black/40 border-white/10 text-white rounded-xl"
                    placeholder="jean@email.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="text-zinc-300">Mot de passe</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="pl-10 pr-10 bg-black/40 border-white/10 text-white rounded-xl"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {mode === "login" && (
                <div className="flex justify-end -mt-1">
                  <Link href="/mot-de-passe-oublie" className="text-xs text-orange-500 hover:text-orange-400">
                    Mot de passe oublié ?
                  </Link>
                </div>
              )}

              {mode === "register" && (
                <div>
                  <Label htmlFor="confirmPassword" className="text-zinc-300">Confirmer le mot de passe</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      className="pl-10 bg-black/40 border-white/10 text-white rounded-xl"
                      placeholder="••••••••"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 rounded-xl"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : null}
                {loading
                  ? (mode === "login" ? "Connexion..." : "Création...")
                  : (mode === "login" ? "Se connecter" : "Créer mon compte")
                }
              </Button>
            </form>

            {/* Connexion Google retirée de l'UI en attendant les accès OAuth du client ;
                le provider reste configuré côté serveur (auth.config.ts). */}

            {/* Switch mode */}
            <div className="text-center mt-6">
              <p className="text-sm text-zinc-500">
                {mode === "login" ? "Pas encore de compte ?" : "Déjà un compte ?"}
              </p>
              <button
                onClick={() => switchMode(mode === "login" ? "register" : "login")}
                className="text-orange-500 hover:text-orange-400 font-medium text-sm mt-1"
                disabled={loading}
              >
                {mode === "login" ? "Créer un compte" : "Se connecter"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
