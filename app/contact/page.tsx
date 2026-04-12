"use client"

import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Mail, Phone, MapPin, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { submitContactForm } from "@/app/actions/contact"
import { toast } from "sonner"

export default function ContactPage() {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "Question sur une commande",
        message: "",
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await submitContactForm(formData)
            if (res.success) {
                toast.success("Message envoyé avec succès !", {
                    style: { background: "#f97316", color: "#fff", border: "none" }
                })
                setFormData({ name: "", email: "", subject: "Question sur une commande", message: "" })
            } else {
                toast.error(res.error || "Erreur lors de l'envoi")
            }
        } catch {
            toast.error("Erreur lors de l'envoi du message")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans">
            <Header />
            <main className="max-w-7xl mx-auto px-4 pt-32 pb-20">
                <div className="mb-20 text-center">
                    <h1 className="text-6xl md:text-9xl font-black uppercase italic tracking-tighter leading-none mb-8">
                        Contact<span className="text-orange-500">.</span>
                    </h1>
                    <p className="text-zinc-500 text-xl max-w-2xl mx-auto font-medium">
                        Une question sur une commande ? Besoin de conseils sur nos produits ? Notre équipe est là pour vous 7j/7.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="flex flex-col gap-8">
                        <div className="glassmorphism bg-zinc-900/40 p-10 rounded-[40px] border border-white/10 flex items-start gap-6 group hover:border-orange-500/50 transition-all">
                            <div className="w-16 h-16 rounded-3xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform">
                                <Mail className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black uppercase italic mb-2">Email</h3>
                                <p className="text-zinc-500 font-medium">contact@power.com</p>
                                <p className="text-zinc-600 text-sm mt-1 text-balance">Réponse sous 2 heures pendant les horaires d'ouverture.</p>
                            </div>
                        </div>

                        <div className="glassmorphism bg-zinc-900/40 p-10 rounded-[40px] border border-white/10 flex items-start gap-6 group hover:border-orange-500/50 transition-all">
                            <div className="w-16 h-16 rounded-3xl bg-zinc-800 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                                <Phone className="w-8 h-8 text-orange-500" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black uppercase italic mb-2">Téléphone</h3>
                                <p className="text-zinc-500 font-medium">06 59 84 50 17</p>
                                <p className="text-zinc-600 text-sm mt-1 italic tracking-widest text-balance">LUN - SAM : 08:00 - 20:00</p>
                            </div>
                        </div>

                        <div className="glassmorphism bg-zinc-900/40 p-10 rounded-[40px] border border-white/10 flex items-start gap-6 group hover:border-orange-500/50 transition-all">
                            <div className="w-16 h-16 rounded-3xl bg-zinc-800 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                                <MapPin className="w-8 h-8 text-orange-500" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black uppercase italic mb-2">Boutique</h3>
                                <p className="text-zinc-500 font-medium">114 Rue Paul Vaillant Couturier, 94140 Alfortville</p>
                            </div>
                        </div>
                    </div>

                    <div className="glassmorphism bg-zinc-900/40 p-10 rounded-[40px] border border-white/10">
                        <h3 className="text-3xl font-black uppercase italic mb-8">Envoyer un <span className="text-orange-500">Message</span></h3>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Nom Complet</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="bg-black/40 border border-white/5 rounded-2xl px-6 py-4 focus:border-orange-500/50 outline-none transition-all font-medium"
                                        placeholder="Ex: Jean Dupont"
                                        disabled={loading}
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Email</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        className="bg-black/40 border border-white/5 rounded-2xl px-6 py-4 focus:border-orange-500/50 outline-none transition-all font-medium"
                                        placeholder="Ex: jean@email.com"
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Sujet</label>
                                <select
                                    value={formData.subject}
                                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                                    className="bg-black/40 border border-white/5 rounded-2xl px-6 py-4 focus:border-orange-500/50 outline-none transition-all font-medium appearance-none"
                                    disabled={loading}
                                >
                                    <option>Question sur une commande</option>
                                    <option>Devenir fournisseur</option>
                                    <option>Problème technique</option>
                                    <option>Autre</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4">Message</label>
                                <textarea
                                    required
                                    minLength={10}
                                    value={formData.message}
                                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                                    className="bg-black/40 border border-white/5 rounded-3xl px-6 py-4 focus:border-orange-500/50 outline-none transition-all font-medium min-h-[150px]"
                                    placeholder="Votre message ici..."
                                    disabled={loading}
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black h-16 text-lg gap-4 uppercase italic tracking-tighter mt-4 shadow-xl shadow-orange-500/20"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                {loading ? "Envoi en cours..." : "Envoyer le message"}
                            </Button>
                        </form>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}
