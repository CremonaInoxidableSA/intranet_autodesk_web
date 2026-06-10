"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Button } from "@/components/ui/button";
import CambioPass from "@/components/userIcon/cambioPass";
import { UserAvatar } from "@/components/userIcon/userAvatar";

import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";

import { useAuth } from "@/context/AuthProvider";
import { useState } from "react";

const UserIcon = () => {
  const router = useRouter();
  const { logout, nombre, apellido, rol, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName =
    `${nombre ?? ""}${nombre || apellido ? " " : ""}${apellido ?? ""}`.trim() ||
    "Usuario";

  const closeSession = async () => {
    try {
      setLoggingOut(true);
      await logout();
      setOpen(false);
    } catch {
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="cursor-pointer">
        <div className="group relative flex items-center justify-center w-6.25 h-6.25 ease-in-out">
          <div className="absolute inset-0 rounded-full bg-gray-400/0 group-hover:bg-gray-400/20 ease-in-out group-hover:scale-150" />
          <div className="transition-transform ease-in-out group-hover:scale-110">
            <UserAvatar
              nombre={nombre}
              apellido={apellido}
              rol={rol}
              loading={loading}
            />
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="z-901">
        {loading ? (
          <div className="flex items-center gap-2">
            <Spinner />
            <span>Verificando...</span>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-1">
            <p className="text-lg">{displayName}</p>
            <p className="text-xs">{rol}</p>

            {rol === "admin" || rol === "superadmin" ? (
              <Button
                className="mt-2 w-full border border-bluecremona bg-bluecremona/10 hover:bg-bluecremonahover  cursor-pointer"
                onClick={() => {
                  router.push("/config_user");
                  setOpen(false);
                }}
              >
                <p className="text-bluecremona font-medium">
                  Configurar usuarios
                </p>
              </Button>
            ) : (
              <CambioPass />
            )}
            <Button
              className="mt-2 w-full bg-redcremona hover:bg-redcremona  cursor-pointer"
              onClick={closeSession}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <div className="flex items-center gap-2">
                  <Spinner />
                  <span>Cargando...</span>
                </div>
              ) : (
                <p className="font-medium text-white">Cerrar sesión</p>
              )}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default UserIcon;
