"use client"

import Image from "next/image"

interface BrandLogoProps {
  height?: number
  className?: string
  priority?: boolean
}

export function BrandLogo({ height = 32, className = "" }: BrandLogoProps) {
  const width = Math.round(height * 3.5)

  return (
    <Image
      src="/timepulse-logo.png"
      alt="NXT TIME PULSE"
      width={width}
      height={height}
      className={`object-contain rounded-sm ${className}`}
      priority
    />
  )
}
