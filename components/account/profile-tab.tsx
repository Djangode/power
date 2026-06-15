"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Loader2, Save, User } from "lucide-react"
import { getUserProfile, updateUserProfile } from "@/app/actions/account"
import { toast } from "sonner"

export default function ProfileTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    clientType: "particulier",
    billingType: "particulier",
    country: "",
    companyName: "",
    siret: "",
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const res = await getUserProfile()
      if (res.success && res.data) {
        setFormData({
          firstName: res.data.firstName || "",
          lastName: res.data.lastName || "",
          email: res.data.email || "",
          phone: res.data.phone || "",
          address: res.data.address || "",
          city: res.data.city || "",
          postalCode: res.data.postalCode || "",
          clientType: res.data.clientType || "particulier",
          billingType: res.data.billingType || "particulier",
          country: res.data.country || "",
          companyName: res.data.companyName || "",
          siret: res.data.siret || "",
        })
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error)
      toast.error("Impossible de charger votre profil")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await updateUserProfile(formData)
      if (res.success) {
        toast.success("Profil mis à jour avec succès !", {
          style: { background: "#000", color: "#f97316", border: "1px solid #f97316" }
        })
      } else {
        toast.error(res.error || "Erreur lors de la sauvegarde")
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      toast.error("Une erreur critique est survenue")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Card className="glassmorphism bg-zinc-900/40 border-white/5">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Chargement de votre profil premium...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
      <Card className="glassmorphism bg-zinc-900/40 border-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-white/5">
          <CardTitle className="text-xl font-black uppercase italic tracking-tighter">Votre Identité <span className="text-orange-500">Power.</span></CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="flex items-center gap-8">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-2 border-orange-500/20 group-hover:border-orange-500 transition-colors shadow-2xl">
                <AvatarFallback className="bg-zinc-800 text-orange-500 font-black text-2xl uppercase italic">
                  {formData.firstName.slice(0, 1)}{formData.lastName.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white p-2 rounded-full shadow-lg border border-black/50 cursor-pointer hover:scale-110 transition-transform">
                <Camera className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase italic text-white">{formData.firstName} {formData.lastName}</h2>
              <p className="text-zinc-500 font-medium">Membre Premium Power</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glassmorphism bg-zinc-900/40 border-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-white/5">
          <CardTitle className="text-xl font-black uppercase italic tracking-tighter">Informations Personnelles</CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-zinc-400 uppercase text-[10px] font-black tracking-widest ml-1">Prénom</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  disabled={saving}
                  className="bg-black/40 border-white/10 rounded-2xl h-14 focus:border-orange-500/50 transition-all font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-zinc-400 uppercase text-[10px] font-black tracking-widest ml-1">Nom</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  disabled={saving}
                  className="bg-black/40 border-white/10 rounded-2xl h-14 focus:border-orange-500/50 transition-all font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-400 uppercase text-[10px] font-black tracking-widest ml-1">Email (Identifiant Power)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-zinc-900/50 border-white/5 rounded-2xl h-14 text-zinc-600 font-bold opacity-50 italic"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-zinc-400 uppercase text-[10px] font-black tracking-widest ml-1">Téléphone de livraison</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                disabled={saving}
                className="bg-black/40 border-white/10 rounded-2xl h-14 focus:border-orange-500/50 transition-all font-bold"
                placeholder="+33 6 ..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-zinc-400 uppercase text-[10px] font-black tracking-widest ml-1">Adresse de résidence</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                rows={3}
                disabled={saving}
                className="bg-black/40 border-white/10 rounded-2xl focus:border-orange-500/50 transition-all font-bold min-h-[120px] pt-4"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-zinc-400 uppercase text-[10px] font-black tracking-widest ml-1">Ville</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  disabled={saving}
                  className="bg-black/40 border-white/10 rounded-2xl h-14 focus:border-orange-500/50 transition-all font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode" className="text-zinc-400 uppercase text-[10px] font-black tracking-widest ml-1">Code Postal / Région</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => handleInputChange("postalCode", e.target.value)}
                  disabled={saving}
                  className="bg-black/40 border-white/10 rounded-2xl h-14 focus:border-orange-500/50 transition-all font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="clientType" className="text-zinc-400 uppercase text-[10px] font-black tracking-widest ml-1">Type de compte</Label>
                <select
                  id="clientType"
                  value={formData.clientType}
                  onChange={(e) => handleInputChange("clientType", e.target.value)}
                  disabled={saving}
                  className="bg-black/40 border border-white/10 rounded-2xl h-14 px-4 w-full focus:border-orange-500/50 transition-all font-bold text-white"
                >
                  <option value="particulier">Particulier</option>
                  <option value="professionnel">Professionnel</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingType" className="text-zinc-400 uppercase text-[10px] font-black tracking-widest ml-1">Facturation</Label>
                <select
                  id="billingType"
                  value={formData.billingType}
                  onChange={(e) => handleInputChange("billingType", e.target.value)}
                  disabled={saving}
                  className="bg-black/40 border border-white/10 rounded-2xl h-14 px-4 w-full focus:border-orange-500/50 transition-all font-bold text-white"
                >
                  <option value="particulier">Particulier</option>
                  <option value="professionnel">Professionnel</option>
                </select>
              </div>
            </div>

            {formData.clientType === "professionnel" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-zinc-400 uppercase text-[10px] font-black tracking-widest ml-1">Raison sociale</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange("companyName", e.target.value)}
                    disabled={saving}
                    className="bg-black/40 border-white/10 rounded-2xl h-14 focus:border-orange-500/50 transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siret" className="text-zinc-400 uppercase text-[10px] font-black tracking-widest ml-1">SIRET</Label>
                  <Input
                    id="siret"
                    value={formData.siret}
                    onChange={(e) => handleInputChange("siret", e.target.value)}
                    disabled={saving}
                    className="bg-black/40 border-white/10 rounded-2xl h-14 focus:border-orange-500/50 transition-all font-bold"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="country" className="text-zinc-400 uppercase text-[10px] font-black tracking-widest ml-1">Pays</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleInputChange("country", e.target.value)}
                    disabled={saving}
                    className="bg-black/40 border-white/10 rounded-2xl h-14 focus:border-orange-500/50 transition-all font-bold"
                    placeholder="France"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full md:w-auto px-12 h-16 rounded-[24px] bg-orange-500 hover:bg-orange-600 text-white font-black uppercase italic tracking-tighter text-lg shadow-2xl shadow-orange-500/20 active:scale-95 transition-all gap-3"
              disabled={saving}
            >
              {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
              {saving ? "Sauvegarde..." : "Sauvegarder mon profil"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}