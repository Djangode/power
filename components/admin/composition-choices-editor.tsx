"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/admin/ui/dialog"
import { Button } from "@/components/admin/ui/button"
import { Input } from "@/components/admin/ui/input"
import { Label } from "@/components/admin/ui/label"
import { Plus, Trash2, Loader2, GripVertical } from "lucide-react"
import { toast } from "sonner"

type SizeRow = {
    id?: string
    name: string
    price: string
    description: string
    isDefault: boolean
    /** Nombre d'ingrédients compris, choisis par le client. Vide ou 0 = formule fixe. */
    includedChoices: string
}

type OptionRow = {
    id?: string
    name: string
    extraPrice: string
    includedByDefault: boolean
    isRemovable: boolean
}

interface Props {
    compositionId: string | null
    compositionName: string
    onClose: () => void
}

/**
 * Édition des formats de vente et des ingrédients d'une composition.
 *
 * C'est ici que le commerçant fixe ses tarifs : un plateau n'est pas vendu au poids,
 * chaque format a son prix, et les ingrédients sont soit compris dans la formule,
 * soit facturés en supplément.
 */
export default function CompositionChoicesEditor({ compositionId, compositionName, onClose }: Props) {
    const [sizes, setSizes] = useState<SizeRow[]>([])
    const [options, setOptions] = useState<OptionRow[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    const load = useCallback(async () => {
        if (!compositionId) return
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/compositions/${compositionId}/choices`)
            if (!res.ok) throw new Error("Chargement impossible")
            const data = await res.json()
            setSizes(
                (data.sizes ?? []).map((s: any) => ({
                    id: s.id,
                    name: s.name,
                    price: String(s.price),
                    description: s.description ?? "",
                    isDefault: Boolean(s.isDefault),
                    includedChoices: String(s.includedChoices ?? 0),
                })),
            )
            setOptions(
                (data.options ?? []).map((o: any) => ({
                    id: o.id,
                    name: o.name,
                    extraPrice: String(o.extraPrice),
                    includedByDefault: Boolean(o.includedByDefault),
                    isRemovable: o.isRemovable !== false,
                })),
            )
        } catch {
            toast.error("Impossible de charger les formats et ingrédients")
        } finally {
            setLoading(false)
        }
    }, [compositionId])

    useEffect(() => {
        load()
    }, [load])

    const save = async () => {
        if (!compositionId) return

        const emptySize = sizes.find((s) => !s.name.trim())
        if (emptySize) return toast.error("Chaque format doit avoir un nom")
        const emptyOption = options.find((o) => !o.name.trim())
        if (emptyOption) return toast.error("Chaque ingrédient doit avoir un nom")

        setSaving(true)
        try {
            const res = await fetch(`/api/admin/compositions/${compositionId}/choices`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sizes: sizes.map((s) => ({
                        id: s.id,
                        name: s.name,
                        price: Number(s.price) || 0,
                        description: s.description || null,
                        isDefault: s.isDefault,
                        includedChoices: Math.max(0, Math.floor(Number(s.includedChoices) || 0)),
                    })),
                    options: options.map((o) => ({
                        id: o.id,
                        name: o.name,
                        extraPrice: Number(o.extraPrice) || 0,
                        includedByDefault: o.includedByDefault,
                        isRemovable: o.isRemovable,
                    })),
                }),
            })

            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || "Erreur lors de l'enregistrement")
                return
            }
            toast.success("Formats et ingrédients enregistrés")
            onClose()
        } catch {
            toast.error("Erreur réseau")
        } finally {
            setSaving(false)
        }
    }

    const addSize = () =>
        setSizes((prev) => [
            ...prev,
            { name: "", price: "", description: "", isDefault: prev.length === 0, includedChoices: "0" },
        ])

    const addOption = (included: boolean) =>
        setOptions((prev) => [
            ...prev,
            { name: "", extraPrice: included ? "0" : "", includedByDefault: included, isRemovable: true },
        ])

    const included = options.filter((o) => o.includedByDefault)
    const extras = options.filter((o) => !o.includedByDefault)

    const updateOption = (target: OptionRow, patch: Partial<OptionRow>) =>
        setOptions((prev) => prev.map((o) => (o === target ? { ...o, ...patch } : o)))

    const removeOption = (target: OptionRow) =>
        setOptions((prev) => prev.filter((o) => o !== target))

    return (
        <Dialog open={!!compositionId} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Formats et ingrédients — {compositionName}</DialogTitle>
                    <DialogDescription>
                        Le prix payé par le client est le prix du format choisi, augmenté des
                        suppléments cochés. Les ingrédients de la formule de base sont compris.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="py-10 text-center text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                        Chargement…
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Formats */}
                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold">Formats de vente</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Ex. Petit 15 € · Moyen 22 € · Grand 30 €. « Ingr. au choix » = nombre
                                        d&apos;ingrédients compris dans le prix, choisis par le client
                                        (2 pour « 2 fruits au choix »). Laisser 0 pour une formule fixe.
                                    </p>
                                </div>
                                <Button size="sm" variant="outline" onClick={addSize}>
                                    <Plus className="h-4 w-4 mr-1" /> Ajouter un format
                                </Button>
                            </div>

                            {sizes.length === 0 ? (
                                <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center">
                                    Aucun format. Sans format, la composition est vendue au prix de base.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {sizes.map((size, index) => (
                                        <div key={index} className="flex items-end gap-2 rounded-lg border p-3">
                                            <GripVertical className="h-4 w-4 text-muted-foreground mb-2.5 shrink-0" />
                                            <div className="flex-1">
                                                <Label className="text-xs">Nom</Label>
                                                <Input
                                                    value={size.name}
                                                    onChange={(e) =>
                                                        setSizes((prev) => prev.map((s, i) => (i === index ? { ...s, name: e.target.value } : s)))
                                                    }
                                                    placeholder="Moyen"
                                                />
                                            </div>
                                            <div className="w-28">
                                                <Label className="text-xs">Prix (€)</Label>
                                                <Input
                                                    type="number"
                                                    step="0.5"
                                                    min="0"
                                                    value={size.price}
                                                    onChange={(e) =>
                                                        setSizes((prev) => prev.map((s, i) => (i === index ? { ...s, price: e.target.value } : s)))
                                                    }
                                                    placeholder="22"
                                                />
                                            </div>
                                            <div className="w-32">
                                                <Label className="text-xs">Ingr. au choix</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    value={size.includedChoices}
                                                    onChange={(e) =>
                                                        setSizes((prev) => prev.map((s, i) => (i === index ? { ...s, includedChoices: e.target.value } : s)))
                                                    }
                                                    placeholder="2"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <Label className="text-xs">Précision (facultatif)</Label>
                                                <Input
                                                    value={size.description}
                                                    onChange={(e) =>
                                                        setSizes((prev) => prev.map((s, i) => (i === index ? { ...s, description: e.target.value } : s)))
                                                    }
                                                    placeholder="2 à 3 personnes"
                                                />
                                            </div>
                                            <label className="flex items-center gap-1.5 text-xs mb-2.5 whitespace-nowrap">
                                                <input
                                                    type="radio"
                                                    name="default-size"
                                                    checked={size.isDefault}
                                                    onChange={() =>
                                                        setSizes((prev) => prev.map((s, i) => ({ ...s, isDefault: i === index })))
                                                    }
                                                />
                                                Par défaut
                                            </label>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="mb-1"
                                                aria-label={`Supprimer le format ${size.name || index + 1}`}
                                                onClick={() => setSizes((prev) => prev.filter((_, i) => i !== index))}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Formule de base */}
                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold">Formule de base</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Compris dans le prix du format. Le client peut les décocher.
                                    </p>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => addOption(true)}>
                                    <Plus className="h-4 w-4 mr-1" /> Ajouter
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {included.map((option, index) => (
                                    <div key={`inc-${index}`} className="flex items-end gap-2 rounded-lg border p-3">
                                        <div className="flex-1">
                                            <Label className="text-xs">Ingrédient</Label>
                                            <Input
                                                value={option.name}
                                                onChange={(e) => updateOption(option, { name: e.target.value })}
                                                placeholder="Fraise"
                                            />
                                        </div>
                                        <label className="flex items-center gap-1.5 text-xs mb-2.5 whitespace-nowrap">
                                            <input
                                                type="checkbox"
                                                checked={!option.isRemovable}
                                                onChange={(e) => updateOption(option, { isRemovable: !e.target.checked })}
                                            />
                                            Non retirable
                                        </label>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="mb-1"
                                            aria-label={`Supprimer ${option.name || "l'ingrédient"}`}
                                            onClick={() => removeOption(option)}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                ))}
                                {included.length === 0 && (
                                    <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center">
                                        Aucun ingrédient de base.
                                    </p>
                                )}
                            </div>
                        </section>

                        {/* Suppléments */}
                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold">Suppléments payants</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Ajoutés au prix du format quand le client les coche.
                                    </p>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => addOption(false)}>
                                    <Plus className="h-4 w-4 mr-1" /> Ajouter
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {extras.map((option, index) => (
                                    <div key={`ext-${index}`} className="flex items-end gap-2 rounded-lg border p-3">
                                        <div className="flex-1">
                                            <Label className="text-xs">Ingrédient</Label>
                                            <Input
                                                value={option.name}
                                                onChange={(e) => updateOption(option, { name: e.target.value })}
                                                placeholder="Mangue"
                                            />
                                        </div>
                                        <div className="w-32">
                                            <Label className="text-xs">Supplément (€)</Label>
                                            <Input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                value={option.extraPrice}
                                                onChange={(e) => updateOption(option, { extraPrice: e.target.value })}
                                                placeholder="2"
                                            />
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="mb-1"
                                            aria-label={`Supprimer ${option.name || "le supplément"}`}
                                            onClick={() => removeOption(option)}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                ))}
                                {extras.length === 0 && (
                                    <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center">
                                        Aucun supplément.
                                    </p>
                                )}
                            </div>
                        </section>

                        <div className="flex justify-end gap-2 border-t pt-4">
                            <Button variant="outline" onClick={onClose} disabled={saving}>
                                Annuler
                            </Button>
                            <Button onClick={save} disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                {saving ? "Enregistrement…" : "Enregistrer"}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
