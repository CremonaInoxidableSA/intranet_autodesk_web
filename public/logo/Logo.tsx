"use client"

import Image from "next/image"

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Image
        fill
        priority
        alt="Creminox Logo"
        src="./creminox-logo.webp"
        style={{ objectFit: "contain" }}
      />
    </div>
  )
}
