"use client"

import { ProductModalProvider } from "./product-modal-context"

export default function ProductModalWrapper({ children }: { children?: React.ReactNode }) {
    return <ProductModalProvider>{children}</ProductModalProvider>
}
