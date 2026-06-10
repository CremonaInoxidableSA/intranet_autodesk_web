"use client"

import { useThemeToggle } from "./themeToggleLogic"
import { Moon, SunMedium } from "lucide-react"

export const ThemeSwitcher = () => {
  const { theme, toggleTheme } = useThemeToggle()

  const isLight = theme === "light"

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="group relative flex h-6 w-6 cursor-pointer items-center justify-center ease-in-out"
    >
      {isLight ? (
        <div className="group relative flex h-6 w-6 items-center justify-center ease-in-out">
          <div className="pointer-events-none absolute inset-0 rounded bg-gray-400/0 ease-in-out group-hover:scale-150" />
          <Moon className="h-6 w-6 transition-transform ease-in-out group-hover:scale-110" />
        </div>
      ) : (
        <div className="group relative flex h-6 w-6 items-center justify-center ease-in-out">
          <div className="pointer-events-none absolute inset-0 rounded bg-gray-400/0 ease-in-out group-hover:scale-150" />
          <SunMedium className="h-6 w-6 transition-transform ease-in-out group-hover:scale-110" />
        </div>
      )}
    </button>
  )
}
