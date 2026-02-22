"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Loader2 } from "lucide-react"
import { getUserPreferences, updateUserPreferences } from "@/app/actions/preferences"
import { toast } from "sonner"

export default function SettingsTab() {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState({
    newsletter: false,
    promotions: false,
    orderUpdates: true,
    smsNotifications: false,
    emailNotifications: true,
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await getUserPreferences()
      if (res.success && res.data) {
        setSettings({
          newsletter: res.data.newsletter,
          promotions: res.data.promotions,
          orderUpdates: res.data.orderUpdates,
          smsNotifications: res.data.smsNotifications,
          emailNotifications: res.data.emailNotifications,
        })
      }
    } catch (error) {
      console.error('Erreur chargement préférences:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSettingChange = async (key: string, value: boolean) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)

    try {
      const res = await updateUserPreferences(newSettings)
      if (res.success) {
        toast.success("Préférence mise à jour")
      } else {
        setSettings(settings)
        toast.error("Erreur lors de la sauvegarde")
      }
    } catch {
      setSettings(settings)
      toast.error("Erreur lors de la sauvegarde")
    }
  }

  const handleDeleteAccount = async () => {
    if (confirm("Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.")) {
      toast.info("Demande de suppression envoyée à l'administrateur.")
    }
  }

  if (loading) {
    return (
      <Card className="glassmorphism bg-zinc-900/40 border-white/5 min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
          <p className="text-zinc-500 uppercase italic font-black text-xs tracking-tighter">Chargement des préférences...</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
      <Card className="glassmorphism bg-zinc-900/40 border-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-white/5">
          <CardTitle className="text-xl font-black uppercase italic tracking-tighter">Notifications <span className="text-orange-500">Power.</span></CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <SettingRow
            id="newsletter"
            label="Newsletter"
            description="Recevez nos actualités et nouveautés"
            checked={settings.newsletter}
            onChange={(checked) => handleSettingChange("newsletter", checked)}
          />
          <SettingRow
            id="promotions"
            label="Promotions"
            description="Recevez nos offres spéciales et réductions"
            checked={settings.promotions}
            onChange={(checked) => handleSettingChange("promotions", checked)}
          />
          <SettingRow
            id="orderUpdates"
            label="Suivi de commandes"
            description="Notifications sur l'état de vos commandes"
            checked={settings.orderUpdates}
            onChange={(checked) => handleSettingChange("orderUpdates", checked)}
          />

          <div className="h-px bg-white/5 my-2" />

          <SettingRow
            id="emailNotifications"
            label="Notifications par email"
            description="Recevoir les notifications par email"
            checked={settings.emailNotifications}
            onChange={(checked) => handleSettingChange("emailNotifications", checked)}
          />
          <SettingRow
            id="smsNotifications"
            label="Notifications par SMS"
            description="Recevoir les notifications par SMS"
            checked={settings.smsNotifications}
            onChange={(checked) => handleSettingChange("smsNotifications", checked)}
          />
        </CardContent>
      </Card>

      <Card className="glassmorphism bg-zinc-900/40 border-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-white/5">
          <CardTitle className="text-xl font-black uppercase italic tracking-tighter">Confidentialité</CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <Button variant="outline" className="w-full rounded-2xl border-white/10 text-white hover:bg-white/5 font-bold uppercase italic text-xs h-12">
            Politique de confidentialité
          </Button>
        </CardContent>
      </Card>

      <Card className="glassmorphism bg-red-500/5 border-red-500/10 overflow-hidden">
        <CardHeader className="border-b border-red-500/10 bg-red-500/5">
          <CardTitle className="text-red-500 flex items-center gap-2 font-black uppercase italic tracking-tighter">
            <AlertTriangle className="h-5 w-5" />
            Zone de danger
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <p className="text-zinc-500 text-sm mb-6">
            Une fois votre compte supprimé, toutes vos données seront définitivement effacées. Cette action ne peut pas être annulée.
          </p>
          <Button
            onClick={handleDeleteAccount}
            className="rounded-2xl bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/20 font-black uppercase italic text-xs h-12 px-8"
          >
            Supprimer mon compte
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function SettingRow({ id, label, description, checked, onChange }: {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5">
      <div>
        <Label htmlFor={id} className="text-white font-bold text-sm">{label}</Label>
        <p className="text-zinc-500 text-xs mt-1">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
      />
    </div>
  )
}
