import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import AccountPage from "@/components/account/account-page"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function MonComptePage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/connexion")
  }

  return (
    <div className="min-h-screen bg-black font-sans selection:bg-orange-500/30">
      <Header />
      <main className="container mx-auto max-w-6xl px-4 pt-28 pb-12">
        <AccountPage />
      </main>
      <Footer />
    </div>
  )
}
