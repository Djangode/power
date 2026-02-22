"use client"

import { useState } from "react"
import Image, { type ImageProps } from "next/image"

export default function ImageWithFallback({ src, alt, ...props }: ImageProps) {
  const [imgError, setImgError] = useState(false)

  return (
    <Image
      {...props}
      src={imgError ? "/placeholder.svg" : (src || "/placeholder.svg")}
      alt={alt}
      onError={() => setImgError(true)}
    />
  )
}
