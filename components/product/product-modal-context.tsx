"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import ProductModal from "./product-modal"
import ProductBottomSheet from "./product-bottom-sheet"

interface Product {
  id: string
  name: string
  price: number
  unit: string
  image: string
  description: string
  category: string
  inStock: boolean
  organic: boolean
}

interface ProductModalContextType {
  openProductModal: (product: Product) => void
}

const ProductModalContext = createContext<ProductModalContextType | null>(null)

export function useProductModal() {
  const context = useContext(ProductModalContext)
  if (!context) {
    throw new Error("useProductModal must be used within a ProductModalProvider")
  }
  return context
}

export function ProductModalProvider({ children }: { children: ReactNode }) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const openProductModal = useCallback((product: Product) => {
    setSelectedProduct(product)
    setIsOpen(true)
  }, [])

  return (
    <ProductModalContext.Provider value={{ openProductModal }}>
      {children}
      {selectedProduct && (
        isMobile ? (
          <ProductBottomSheet
            product={selectedProduct}
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
          />
        ) : (
          <ProductModal
            product={selectedProduct}
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
          />
        )
      )}
    </ProductModalContext.Provider>
  )
}
