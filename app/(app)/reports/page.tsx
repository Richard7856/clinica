"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { appointmentsRepo, paymentsRepo, patientsRepo } from "@/lib/repositories";

type Period = "week" | "month" | "last_month";

const PERIOD_LABEL: Record<Period, string> = {
  week: "Esta semana",
  month: "Este mes",
  last_month: "Mes anterior",
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendada",
  confirmed: "Confirmada",
  in_progress: "En progreso",
  completed: "Completada",
  no_show: "No asistió",
  cancelled: "Cancelada",
};

const METHOD_LABEL: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  other: "Otro",
};

function getPeriodRange(period: Period): { from: Date; to: Date } {
  const now = new Date();
  if (period === "week") {
    const day = now.getDay();
    const from = new Date(now);
    from.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(from.getDate() + 6);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { from, to };
  }
  // last_month
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  return { from, to };
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>("month");
  const { from, to } = getPeriodRange(period);

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => appointmentsRepo.list(),
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

  const filteredPayments = useMemo(
    () => payments.filter((p) => {
      const d = new Date(p.date);
      return d >= from && d <= to;
    }),
    [payments, from, to],
  );

  const filteredApts = useMemo(
    () => appointments.filter((a) => {
      const d = new Date(a.startAt);
      return d >= from && d <= to;
    }),
    [appointments, from, to],
  );

  const totalRevenue = filteredPayments.reduce((s, p) => s + p.amount, 0);

  // Appointments by status
  const byStatus = filteredApts.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});
  const maxStatus = Math.max(1, ...Object.values(byStatus));

  // Revenue by method
  const byMethod = filteredPayments.reduce<Record<string, number>>((acc, p) => {
    acc[p.method] = (acc[p.method] ?? 0) + p.amount;
    return acc;
  }, {});
  const maxMethod = Math.max(1, ...Object.values(byMethod));

  // Top 5 patients by appointment count in period
  const patientVisits = filteredApts.reduce<Record<string, number>>((acc, a) => {
    acc[a.patientId] = (acc[a.patientId] ?? 0) + 1;
    return acc;
  }, {});
  const topPatients = Object.entries(patientVisits)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const maxVisits = Math.max(1, ...topPatients.map(([, v]) => v));

  const fmtMXN = (n: number) =>
    n.toLocaleString("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reportes</h1>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                period === p
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Ingresos</p>
            <p className="text-2xl font-semibold">{fmtMXN(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredPayments.length} cobros
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Citas</p>
            <p className="text-2xl font-semibold">{filteredApts.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {byStatus["completed"] ?? 0} completadas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Ticket promedio</p>
            <p className="text-2xl font-semibold">
              {filteredPayments.length
                ? fmtMXN(totalRevenue / filteredPayments.length)
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Appointments by status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Citas por estado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(STATUS_LABEL).map((status) => {
              const count = byStatus[status] ?? 0;
              const pct = Math.round((count / maxStatus) * 100);
              return (
                <div key={status}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{STATUS_LABEL[status]}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Revenue by method */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingresos por método</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(METHOD_LABEL).map((method) => {
              const amount = byMethod[method] ?? 0;
              const pct = Math.round((amount / maxMethod) * 100);
              return (
                <div key={method}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{METHOD_LABEL[method]}</span>
                    <span className="font-medium">{fmtMXN(amount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-orange-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Top patients */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Top pacientes por visitas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topPatients.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos en este período.</p>
            ) : (
              topPatients.map(([patientId, visits]) => {
                const patient = patientMap[patientId];
                const pct = Math.round((visits / maxVisits) * 100);
                return (
                  <div key={patientId}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">
                        {patient?.fullName ?? patientId}
                      </span>
                      <span className="text-muted-foreground">
                        {visits} {visits === 1 ? "visita" : "visitas"}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-purple-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
