"use client";
import Header from "@/components/headerPrincipal";

import { Toaster } from "@/components/ui/sonner";

export default function LayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 left-0 w-full z-551">
        <Header />
      </div>
      <main
        className="grow flex w-full min-w-0"
      >
        {children}
      </main>
      <Toaster />
    </div>
  );
}
