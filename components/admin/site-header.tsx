import Link from "next/link"
import { Button } from "@/components/admin/ui/button"
import { Separator } from "@/components/admin/ui/separator"
import { SidebarTrigger } from "@/components/admin/ui/sidebar"

export function SiteHeader() {
  return (
    <header className="flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">Administration</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" asChild size="sm">
            <Link href="/">Retour au site</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
