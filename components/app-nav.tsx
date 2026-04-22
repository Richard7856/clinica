"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  CreditCard,
  Home,
  QrCode,
  Settings,
  Users,
  BarChart3,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-context";
import type { StaffRole } from "@/lib/schemas/staff";

// Items de navegación con visibilidad por rol. Keep it honest: si el rol
// no puede leerlo según firestore.rules, acá tampoco lo mostramos.
type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: StaffRole[];
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Inicio", icon: Home, roles: ["admin", "reception", "therapist"] },
  { href: "/checkin", label: "Check-in QR", icon: QrCode, roles: ["admin", "reception"] },
  { href: "/patients", label: "Pacientes", icon: Users, roles: ["admin", "reception", "therapist"] },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, roles: ["admin", "reception", "therapist"] },
  { href: "/payments/new", label: "Cobrar", icon: CreditCard, roles: ["admin", "reception"] },
  { href: "/reports", label: "Reportes", icon: BarChart3, roles: ["admin"] },
  { href: "/settings", label: "Configuración", icon: Settings, roles: ["admin"] },
];

export function AppNav() {
  const pathname = usePathname();
  const { role, staff, signOut } = useAuth();
  const items = NAV.filter((i) => (role ? i.roles.includes(role) : false));

  return (
    <aside className="w-60 shrink-0 border-r bg-sidebar text-sidebar-foreground hidden md:flex md:flex-col">
      <div className="px-4 py-5 border-b">
        <div className="font-semibold leading-tight">Clínica</div>
        <div className="text-xs text-muted-foreground truncate">
          {staff?.fullName ?? "—"}
        </div>
        {role ? (
          <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            {role}
          </div>
        ) : null}
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/60",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-2 border-t">
        <Button variant="ghost" className="w-full justify-start" onClick={() => signOut()}>
          <LogOut className="h-4 w-4 mr-2" />
          Salir
        </Button>
      </div>
    </aside>
  );
}
