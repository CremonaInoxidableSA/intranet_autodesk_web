"use client"

export function LogoCreminox({ extraClass }: { extraClass?: string }) {
  return (
    <img
      className={`aspect-auto w-auto ${extraClass || ""}`}
      alt="Creminox Logo"
      src="/creminox.png"
    />
  )
}

export function LogoCx({ extraClass }: { extraClass?: string }) {
  return (
    <img
      className={`aspect-auto w-auto ${extraClass || ""}`}
      alt="Cx"
      src="/logoMetalizado.png"
    />
  )
}

export function LogoCreminoxInnovate({ extraClass }: { extraClass?: string }) {
  console.log("LogoCreminoxInnovate renderizando, extraClass:", extraClass)
  return (
    <img
      className={`aspect-auto w-auto ${extraClass || ""}`}
      alt="Creminox Logo"
      src="/creminox_innovate.png"
      onError={(e) => console.log("ERROR imagen:", e)}
      onLoad={() => console.log("OK imagen cargada")}
    />
  )
}
