"use client"

import { useState } from "react"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import AccountSidebar from "./account-sidebar"
import ProfileTab from "./profile-tab"
import OrdersTab from "./orders-tab"
import PaymentTab from "./payment-tab"
import SettingsTab from "./settings-tab"

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState("profile")

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight">Mon Compte</h1>
        <p className="text-zinc-400 mt-1">Gérez vos informations personnelles et vos commandes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <AccountSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="profile">
              <ProfileTab />
            </TabsContent>
            <TabsContent value="orders">
              <OrdersTab />
            </TabsContent>
            <TabsContent value="payment">
              <PaymentTab />
            </TabsContent>
            <TabsContent value="settings">
              <SettingsTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
