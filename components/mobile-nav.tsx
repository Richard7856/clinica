"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, QrCode, Users, CalendarDays, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-context";

// Nav inferior visible solo en móvil (md:hidden).
// Muestra las 5 rutas más usadas — el resto accesible desde Settings.
const NAV = [
  { href: "/dashboard", label: "Inicio", icon: Home },
  { href: "/checkin", label: "Check-in", icon: QrCode },
  { href: "/patients", label: "Pacientes", icon: Users },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/settings", label: "Config", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  if (!user) return null;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="flex items-center justify-around h-16 px-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px] font-medium transition-colors min-w-0",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
