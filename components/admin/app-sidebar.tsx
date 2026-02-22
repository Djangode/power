"use client"

import * as React from "react"
import {
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileDescription,
  IconFileWord,
  IconInnerShadowTop,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { NavDocuments } from "@/components/admin/nav-documents"
import { NavSecondary } from "@/components/admin/nav-secondary"
import { NavUser } from "@/components/admin/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/admin/ui/sidebar"

const navMain = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: IconDashboard,
  },
  {
    title: "Produits",
    url: "/admin/products",
    icon: IconListDetails,
  },
  {
    title: "Commandes",
    url: "/admin/orders",
    icon: IconFileDescription,
  },
  {
    title: "Clients",
    url: "/admin/customers",
    icon: IconUsers,
  },
  {
    title: "Analytics",
    url: "/admin/Analytics",
    icon: IconChartBar,
  },
]

const navSecondary = [
  {
    title: "Paramètres",
    url: "/admin/settings",
    icon: IconSettings,
  },
  {
    title: "Recherche",
    url: "/admin/products",
    icon: IconSearch,
  },
]

const documents = [
  {
    name: "Stock",
    url: "/admin/stock",
    icon: IconDatabase,
  },
  {
    name: "Comptabilité",
    url: "/admin/accounting",
    icon: IconReport,
  },
  {
    name: "Équipe",
    url: "/admin/team",
    icon: IconFileWord,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()

  const user = {
    name: session?.user?.name || "Admin",
    email: session?.user?.email || "admin@power.com",
    avatar: session?.user?.image || "/avatars/admin.jpg",
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <Link href="/admin">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Power Admin</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon className="!size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <NavDocuments items={documents} />

        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
