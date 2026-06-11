"use client"

import { useState } from "react"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"

const CambioPass = () => {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ current_password: "", new_password: "" })
  const [loading, setLoading] = useState(false)

  const handleChange = (
    key: "current_password" | "new_password",
    value: string
  ) => {
    setForm((s) => ({ ...s, [key]: value }))
  }

  const handleSubmit = async () => {
    if (!form.current_password || !form.new_password) {
      toast.error("Por favor, complete todos los campos.", {
        position: "top-center",
      })
      return
    }

    setLoading(true)

    try {
      const token =
        (typeof window !== "undefined" &&
          (localStorage.getItem("access_token") ||
            localStorage.getItem("token"))) ||
        undefined

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (token) headers["Authorization"] = `Bearer ${token}`

      const res = await fetch(`/api/proxy/auth/cambiar_password`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          current_password: form.current_password,
          new_password: form.new_password,
        }),
        credentials: "include",
      })

      let data: {
        success?: boolean
        detail?: string
        error?: string
        message?: string
      } = {}
      try {
        data = await res.json()
      } catch {
        data = {}
      }

      if (res.ok && (data.success ?? true)) {
        toast.success("Contraseña cambiada exitosamente.", {
          position: "top-center",
        })
        setOpen(false)
        setForm({ current_password: "", new_password: "" })
      } else {
        const message =
          data.detail ??
          data.error ??
          data.message ??
          "Error al cambiar la contraseña."
        toast.error(message, {
          position: "top-center",
        })
      }
    } catch {
      toast.error("Error de conexión.", {
        position: "top-center",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="border-botonblueborder bg-botonblue hover:bg-botonbluehover mt-2 w-full cursor-pointer border">
          <p className="text-botonblueborder font-medium">Cambiar Contraseña</p>
        </Button>
      </DialogTrigger>

      <DialogContent className="z-800 bg-background3 sm:max-w-150">
        <DialogHeader>
          <DialogTitle>Cambiar Contraseña</DialogTitle>
          <DialogDescription>
            Complete los datos para cambiar la contraseña.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          <div className="grid gap-2">
            <Label htmlFor="current_password">Contraseña Actual</Label>
            <Input
              id="current_password"
              type="password"
              value={form.current_password}
              onChange={(e) => handleChange("current_password", e.target.value)}
              placeholder="Ingrese su contraseña actual"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="new_password">Nueva Contraseña</Label>
            <Input
              id="new_password"
              type="password"
              value={form.new_password}
              onChange={(e) => handleChange("new_password", e.target.value)}
              placeholder="Ingrese su nueva contraseña"
              required
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>

          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <div className="flex items-center gap-2">
                <Spinner />
                <span>Cambiando...</span>
              </div>
            ) : (
              "Cambiar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CambioPass
