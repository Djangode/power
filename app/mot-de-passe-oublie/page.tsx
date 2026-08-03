"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, Lock, ArrowLeft, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { Suspense } from "react"

function ResetContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const uid = searchParams.get("uid")
  const isResetMode = !!token && !!uid

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (res.ok) {
        setSuccess(true)
      } else {
        const data = await res.json()
        setError(data.error || "Erreur lors de l'envoi")
      }
    } catch {
      setError("Erreur de connexion au serveur")
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      return
    }
    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caractères")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, uid, password }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setSuccess(true)
      } else {
        setError(data.error || "Erreur lors de la réinitialisation")
      }
    } catch {
      setError("Erreur de connexion au serveur")
    } finally {
      setLoading(false)
    }
  }

  if (success && !isResetMode) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">Email envoyé !</h2>
          <p className="text-zinc-400 mb-8">
            Si un compte existe avec cette adresse, vous recevrez un lien de réinitialisation.
          </p>
          <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-8 py-6 font-bold">
            <Link href="/connexion">Retour à la connexion</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (success && isResetMode) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">Mot de passe modifié !</h2>
          <p className="text-zinc-400 mb-8">
            Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.
          </p>
          <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-8 py-6 font-bold">
            <Link href="/connexion">Se connecter</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/connexion" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors text-sm">
          <ArrowLeft className="h-4 w-4" /> Retour à la connexion
        </Link>

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
            {isResetMode ? "Créez votre nouveau mot de passe" : "Réinitialiser votre mot de passe"}
          </p>
        </div>

        <Card className="bg-zinc-900/60 border-white/10">
          <CardContent className="p-6">
            <form onSubmit={isResetMode ? handleResetPassword : handleForgotPassword} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {!isResetMode ? (
                <div>
                  <Label htmlFor="email" className="text-zinc-300">Adresse email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(null) }}
                      className="pl-10 bg-black/40 border-white/10 text-white rounded-xl"
                      placeholder="jean@email.com"
                      required
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">Un lien de réinitialisation vous sera envoyé par email.</p>
                </div>
              ) : (
                <>
                  <div>
                    <Label htmlFor="password" className="text-zinc-300">Nouveau mot de passe</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(null) }}
                        className="pl-10 pr-10 bg-black/40 border-white/10 text-white rounded-xl"
                        placeholder="••••••••"
                        required
                        disabled={loading}
                        minLength={8}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword" className="text-zinc-300">Confirmer</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setError(null) }}
                        className="pl-10 bg-black/40 border-white/10 text-white rounded-xl"
                        placeholder="••••••••"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                </>
              )}

              <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 rounded-xl" disabled={loading}>
                {loading && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
                {loading ? "Envoi..." : (isResetMode ? "Réinitialiser" : "Envoyer le lien")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function MotDePasseOubliePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    }>
      <ResetContent />
    </Suspense>
  )
}
