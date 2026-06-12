"use client"

import { ThemeSwitcher } from "@/components/theme/themeSwitcher"
// import UserIcon from "@/components/userIcon/userIcon"

import Link from "next/link"
import { useState } from "react"
import { urlConfig } from "@/lib/config"
import { LogoCreminox as Logo } from "@/components/Logos"

import { Menu, X } from "lucide-react"

export default function HeaderPrincipal() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const HeaderDerecha = [
    {
      label: "Intranet",
      href: urlConfig.intranetUrl,
      className: "text-base opacity-70 transition-opacity hover:opacity-100",
      onClick: () => setDrawerOpen(false),
    },
  ]

  return (
    <>
      <header className="-header flex items-center bg-headerbg p-5">
        {/* Desktop: iconos izquierda */}
        <div className="hidden h-full w-[30%] flex-row items-center justify-start gap-5 xl:flex">
          <X />
          <ThemeSwitcher />
        </div>

        {/* Mobile: hamburger izquierda */}
        <div className="flex items-center xl:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
            className="flex cursor-pointer items-center justify-center"
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Título centrado */}
        <p className="header flex flex-1 justify-center font-bold xl:w-[40%]">
          Registros AutoDesk Cremona Inoxidable S.A.
        </p>

        {/* Desktop: links + logo */}
        <div className="hidden w-[30%] justify-end gap-5 xl:flex">
          {HeaderDerecha.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="text-base opacity-70 transition-opacity hover:opacity-100"
              onClick={() => setDrawerOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={urlConfig.externalUrl}
            rel="noopener noreferrer"
            target="_blank"
            className="h-full"
          >
            <Logo extraClass="h-6" />
          </Link>
        </div>

        {/* Mobile: logo derecha */}
        <div className="flex items-center xl:hidden">
          <Link
            href={urlConfig.externalUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <Logo extraClass="h-6" />
          </Link>
        </div>
      </header>

      {/* Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 xl:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer lateral izquierdo */}
      <div
        className={`-header fixed top-0 left-0 z-50 flex h-full w-64 flex-col bg-headerbg transition-transform duration-300 ease-in-out xl:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Fila superior: perfil + theme + cerrar */}
        <div className="flex items-center justify-between border-b border-current/20 px-4 py-4">
          <div className="flex items-center gap-4">
            <X />
            <ThemeSwitcher />
          </div>
          {HeaderDerecha.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="text-base opacity-70 transition-opacity hover:opacity-100"
              onClick={() => setDrawerOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menú"
            className="flex cursor-pointer items-center justify-center"
          >
            <X size={22} />
          </button>
        </div>

        {/* Links de navegación */}
        <nav className="flex flex-col gap-5 px-4 py-5">
        </nav>
      </div>
    </>
  )
}