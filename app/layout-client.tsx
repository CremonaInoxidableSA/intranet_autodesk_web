"use client";
import { usePathname } from "next/navigation";

import Header from "@/components/headerPrincipal";

import { Toaster } from "@/components/ui/sonner";

export default function LayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideHeader = [
    "/signup",
    "/login",
    "/login/recuperacion",
    "/login/recuperacion/reset_pass",
  ].includes(pathname);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 left-0 w-full z-551">
        {!hideHeader && <Header />}
      </div>
      <main
        className={`grow flex w-full min-w-0 ${
          pathname === "/login" ||
          pathname === "/login/recuperacion" ||
          pathname === "/login/recuperacion/reset_pass"
            ? "flex justify-center items-center"
            : ""
        }`}
      >
        {children}
      </main>
      <Toaster />
    </div>
  );
}
