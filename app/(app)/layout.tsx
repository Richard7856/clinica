"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { AppNav } from "@/components/app-nav";

// Protected shell: gatekeeper simple del lado cliente. Las reglas Firestore
// son la fuente de verdad; este check solo evita mostrar UI vacía a usuarios
// no autenticados.
export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex-1 grid place-items-center text-sm text-muted-foreground">
        Verificando sesión…
      </div>
    );
  }

  return (
    <div className="flex-1 flex">
      <AppNav />
      <main className="flex-1 min-w-0 overflow-x-auto">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
