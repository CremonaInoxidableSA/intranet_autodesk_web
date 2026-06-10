"use client"

import Image from "next/image"
import { CircleUserRound } from "lucide-react"

const AVATAR_COLORS = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#9333ea",
  "#0891b2",
  "#d97706",
  "#db2777",
  "#059669",
  "#7c3aed",
  "#0284c7",
  "#c2410c",
  "#b45309",
]

export const getInitials = (
  nombre?: string | null,
  apellido?: string | null
) => {
  const first = nombre?.trim()?.[0]?.toUpperCase() ?? ""
  const last = apellido?.trim()?.[0]?.toUpperCase() ?? ""
  return first + last || null
}

export const getAvatarColor = (
  nombre?: string | null,
  apellido?: string | null
) => {
  const key = `${nombre ?? ""}${apellido ?? ""}`
  if (!key) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) % AVATAR_COLORS.length
  }
  return AVATAR_COLORS[hash]
}

interface UserAvatarProps {
  nombre?: string | null
  apellido?: string | null
  rol?: string | null
  loading?: boolean
  sizeClass?: string
  textClass?: string
  imgPx?: number
}

export const UserAvatar = ({
  nombre,
  apellido,
  rol,
  loading,
  sizeClass = "w-6.25 h-6.25",
  textClass = "text-[11px]",
  imgPx = 25,
}: UserAvatarProps) => {
  if (rol === "superadmin") {
    return (
      <div className={`${sizeClass} shrink-0 overflow-hidden rounded-full`}>
        <Image
          src="/logo/creminox_pfp.webp"
          alt="Superadmin"
          width={imgPx}
          height={imgPx}
          unoptimized
          className="h-full w-full object-cover"
        />
      </div>
    )
  }

  if (!loading && getInitials(nombre, apellido)) {
    return (
      <div
        className={`${sizeClass} flex items-center justify-center rounded-full text-white ${textClass} shrink-0 leading-none font-bold select-none`}
        style={{ backgroundColor: getAvatarColor(nombre, apellido) }}
      >
        {getInitials(nombre, apellido)}
      </div>
    )
  }

  return <CircleUserRound className={sizeClass} />
}
