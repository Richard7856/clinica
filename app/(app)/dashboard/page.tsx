"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CalendarDays, QrCode, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-context";
import {
  appointmentsRepo,
  checkinsRepo,
  paymentsRepo,
  patientsRepo,
} from "@/lib/repositories";
import type { Appointment } from "@/lib/schemas/appointment";

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendada",
  confirmed: "Confirmada",
  in_progress: "En progreso",
  completed: "Completada",
  no_show: "No asistió",
  cancelled: "Cancelada",
};
const STATUS_COLOR: Record<string, string> = {
  scheduled: "bg-blue-500",
  confirmed: "bg-green-500",
  in_progress: "bg-orange-500",
  completed: "bg-gray-400",
  no_show: "bg-red-500",
  cancelled: "bg-gray-200",
};

function isToday(iso: string) {
  const today = new Date().toISOString().slice(0, 10);
  return iso.slice(0, 10) === today;
}

export default function DashboardPage() {
  const { staff } = useAuth();
  const router = useRouter();
  const todayStr = new Date().toISOString().slice(0, 10);

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => appointmentsRepo.list(),
  });
  const { data: checkins = [] } = useQuery({
    queryKey: ["checkins", todayStr],
    queryFn: () => checkinsRepo.listByDay(todayStr),
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => paymentsRepo.list(),
  });
  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: () => patientsRepo.list(),
  });

  const patientMap = Object.fromEntries(patients.map((p) => [p.id, p]));

  const todayApts = appointments.filter((a) => isToday(a.startAt));
  const todayRevenue = payments
    .filter((p) => isToday(p.date))
    .reduce((sum, p) => sum + p.amount, 0);

  // Upcoming: not done, ordered by startAt
  const upcoming = todayApts
    .filter((a) => !["completed", "cancelled", "no_show"].includes(a.status))
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Hola, {staff?.fullName ?? "—"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("es-MX", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<CalendarDays className="h-4 w-4 text-blue-500" />}
          label="Citas hoy"
          value={todayApts.length}
          sub={`${upcoming.length} pendientes`}
        />
        <KpiCard
          icon={<QrCode className="h-4 w-4 text-green-500" />}
          label="Check-ins hoy"
          value={checkins.length}
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4 text-orange-500" />}
          label="Ingresos hoy"
          value={`$${todayRevenue.toLocaleString("es-MX")}`}
        />
        <KpiCard
          icon={<Users className="h-4 w-4 text-purple-500" />}
          label="Pacientes"
          value={patients.length}
        />
      </div>

      {/* Upcoming appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Citas pendientes hoy</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin citas pendientes por hoy.
            </p>
          ) : (
            <div className="divide-y">
              {upcoming.map((a: Appointment) => {
                const patient = patientMap[a.patientId];
                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between py-2.5 cursor-pointer hover:bg-muted/50 -mx-2 px-2 rounded"
                    onClick={() => router.push("/agenda")}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${STATUS_COLOR[a.status] ?? "bg-gray-400"}`}
                      />
                      <div>
                        <p className="text-sm font-medium">
                          {patient?.fullName ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {fmtTime(a.startAt)} → {fmtTime(a.endAt)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {STATUS_LABEL[a.status]}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-semibold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}
