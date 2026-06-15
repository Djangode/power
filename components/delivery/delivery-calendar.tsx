"use client"

import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Calendar as CalendarIcon, CheckCircle2, Loader2 } from "lucide-react"
import { getAvailableDeliverySlots } from "@/app/actions/delivery"
import { formatLocalDate } from "@/lib/utils"

interface DeliverySlot {
  id: string
  date: string
  startTime: string
  endTime: string
  remainingSlots: number
}

interface DeliveryCalendarProps {
  onSelectDelivery: (delivery: { date: string; time: string; dateISO: string; slotId?: string }) => void
  selectedDelivery: { date: string; time: string } | null
}

export default function DeliveryCalendar({ onSelectDelivery, selectedDelivery }: DeliveryCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [slots, setSlots] = useState<DeliverySlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  useEffect(() => {
    if (selectedDate) {
      loadSlots(selectedDate)
    }
  }, [selectedDate])

  const loadSlots = async (date: Date) => {
    setLoadingSlots(true)
    try {
      const dateStr = formatLocalDate(date)
      const res = await getAvailableDeliverySlots(dateStr, dateStr)
      if (res.success && res.data.length > 0) {
        setSlots(res.data)
      } else {
        setSlots([])
      }
    } catch {
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
    setSelectedTime("")
  }

  const handleSlotSelect = (slot: { id: string; time: string }) => {
    setSelectedTime(slot.time)
    if (selectedDate) {
      onSelectDelivery({
        date: selectedDate.toLocaleDateString("fr-FR"),
        time: slot.time,
        dateISO: formatLocalDate(selectedDate),
        slotId: slot.id,
      })
    }
  }

  const isDateDisabled = (date: Date) => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    return date < tomorrow
  }

  // Uniquement les vrais créneaux configurés en base (plus aucun créneau fictif)
  const displaySlots = slots.map(s => ({
    id: s.id,
    time: `${s.startTime} - ${s.endTime}`,
    available: s.remainingSlots > 0,
    remaining: s.remainingSlots,
  }))

  return (
    <Card className="glassmorphism bg-zinc-900/40 border-white/5 overflow-hidden rounded-[32px]">
      <CardHeader className="border-b border-white/5 pb-8">
        <CardTitle className="flex items-center gap-3 text-2xl font-black uppercase italic tracking-tighter">
          <CalendarIcon className="h-6 w-6 text-orange-500" />
          Planifier la <span className="text-orange-500">Livraison</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-10 pt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4 mb-4">Choisir une Date</h4>
            <div className="p-4 bg-black/40 rounded-3xl border border-white/5">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={isDateDisabled}
                className="rounded-2xl border-0 !bg-transparent text-white"
              />
            </div>
          </div>

          <div className="space-y-4 flex flex-col">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-4 mb-4">Choisir un Créneau</h4>
            {loadingSlots ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              </div>
            ) : selectedDate ? (
              displaySlots.length === 0 ? (
                <div className="flex-1 flex items-center justify-center border border-dashed border-white/5 rounded-3xl text-zinc-600 font-bold italic text-center px-6 py-8">
                  Aucun créneau de livraison disponible pour cette date. Veuillez en choisir une autre.
                </div>
              ) : (
              <div className="grid grid-cols-1 gap-3 flex-1">
                {displaySlots.map((slot) => (
                  <Button
                    key={slot.id}
                    variant={selectedTime === slot.time ? "default" : "outline"}
                    className={`h-14 rounded-2xl justify-between px-6 font-bold uppercase italic transition-all ${selectedTime === slot.time
                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20 border-0"
                        : "bg-black/40 border-white/5 text-zinc-400 hover:text-white hover:border-orange-500/50"
                      }`}
                    disabled={!slot.available}
                    onClick={() => handleSlotSelect(slot)}
                  >
                    <div className="flex items-center gap-3">
                      <Clock className={`w-4 h-4 ${selectedTime === slot.time ? "text-white" : "text-orange-500"}`} />
                      <span>{slot.time}</span>
                    </div>
                    {!slot.available ? (
                      <Badge variant="secondary" className="bg-zinc-800 text-zinc-600 border-0 text-[8px] font-black uppercase tracking-widest">
                        Complet
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-zinc-600">{slot.remaining} places</span>
                    )}
                  </Button>
                ))}
              </div>
              )
            ) : (
              <div className="flex-1 flex items-center justify-center border border-dashed border-white/5 rounded-3xl text-zinc-600 font-bold italic">
                Sélectionnez une date d'abord
              </div>
            )}
          </div>
        </div>

        {selectedDelivery && (
          <div className="p-6 bg-orange-500/10 border border-orange-500/20 rounded-[24px] animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-center gap-4 text-orange-500">
              <CheckCircle2 className="w-6 h-6 shrink-0" />
              <p className="font-black uppercase italic text-sm tracking-tight leading-none pt-1">
                Livraison programmée le {selectedDelivery.date} - {selectedDelivery.time}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
