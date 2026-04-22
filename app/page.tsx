"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";

// Ruta raíz: despacha al dashboard si está autenticado, a /login si no.
export default function RootRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [user, loading, router]);

  return (
    <div className="flex-1 grid place-items-center text-sm text-muted-foreground">
      Cargando…
    </div>
  );
}
