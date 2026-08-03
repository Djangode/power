"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { compositionTitle } from "@/lib/composition-pricing"
import CompositionConfigurator, {
    type ConfigurableComposition,
} from "@/components/product/composition-configurator"

interface Props {
    composition: ConfigurableComposition
    isOpen: boolean
    onClose: () => void
    isMobile: boolean
}

/**
 * Enveloppe d'affichage du configurateur : boîte de dialogue sur grand écran,
 * panneau glissant sur mobile. Un seul configurateur derrière les deux, pour que le
 * calcul du prix ne puisse pas diverger d'une plateforme à l'autre — c'était le cas
 * avant, où le mobile appliquait un surcoût que le serveur ignorait.
 */
export default function CompositionSheet({ composition, isOpen, onClose, isMobile }: Props) {
    const title = compositionTitle(composition.name)

    if (isMobile) {
        return (
            <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DrawerContent className="bg-gradient-to-b from-[#f5f0e8] to-[#e8e0d4] text-zinc-900 border-zinc-300 max-h-[92vh]">
                    <DrawerHeader className="pb-2">
                        <DrawerTitle className="text-xl font-bold text-zinc-900">{title}</DrawerTitle>
                    </DrawerHeader>
                    <div className="overflow-y-auto px-4 pb-6">
                        <CompositionConfigurator composition={composition} onDone={onClose} />
                    </div>
                </DrawerContent>
            </Drawer>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-[#f5f0e8] to-[#e8e0d4] text-zinc-900 border-zinc-300">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-zinc-900">{title}</DialogTitle>
                </DialogHeader>
                <CompositionConfigurator composition={composition} onDone={onClose} />
            </DialogContent>
        </Dialog>
    )
}
