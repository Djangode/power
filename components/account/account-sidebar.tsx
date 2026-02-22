"use client"

import { ShoppingBag, User, Settings, CreditCard, LogOut, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { signOut } from "next-auth/react"

interface AccountSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function AccountSidebar({ activeTab, onTabChange }: AccountSidebarProps) {
  const menuItems = [
    { id: "profile", label: "Profil & Identité", icon: User },
    { id: "orders", label: "Mes Commandes", icon: ShoppingBag },
    { id: "payment", label: "Paiement & Facturation", icon: CreditCard },
    { id: "settings", label: "Préférences", icon: Settings },
  ]

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" })
  }

  return (
    <div className="space-y-4 animate-in slide-in-from-left-4 duration-700">
      <div className="glassmorphism bg-zinc-900/40 border-white/5 rounded-[32px] overflow-hidden p-6">
        <div className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-2xl transition-all group",
                activeTab === item.id
                  ? "bg-orange-500 text-white shadow-xl shadow-orange-500/20"
                  : "text-zinc-500 hover:bg-white/5 hover:text-white"
              )}
            >
              <div className="flex items-center gap-4">
                <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-white" : "text-zinc-600 group-hover:text-orange-500")} />
                <span className="font-black uppercase italic text-xs tracking-widest">{item.label}</span>
              </div>
              <ChevronRight className={cn("w-4 h-4 opacity-0 transition-opacity", activeTab === item.id ? "opacity-100" : "group-hover:opacity-50")} />
            </button>
          ))}

          <Separator className="my-6 bg-white/5" />

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-500/60 hover:text-red-500 hover:bg-red-500/5 transition-all group"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-black uppercase italic text-xs tracking-widest">Déconnexion</span>
          </button>
        </div>
      </div>

    </div>
  )
}

function Separator({ className }: { className?: string }) {
  return <div className={cn("h-px w-full", className)} />
}