"use client";

// QR check-in flow:
// 1. Scan QR → find patient
// 2. Find today's appointment for that patient
// 3. Show status card with action buttons:
//    scheduled  → "Confirmar llegada"  → confirmed
//    confirmed  → "Iniciar sesión"     → in_progress  (+ pick device)
//    in_progress → "Completar sesión"  → completed    (auto-register session)
// 4. Create checkin record linked to appointment

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ScanLine, CheckCircle2, Camera, ChevronRight, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  checkinsRepo,
  patientsRepo,
  appointmentsRepo,
  sessionsRepo,
  devicesRepo,
  treatmentsRepo,
} from "@/lib/repositories";
import { useAuth } from "@/components/auth-context";
import type { Patient } from "@/lib/schemas/patient";
import type { Appointment, AppointmentStatus } from "@/lib/schemas/appointment";
import type { Device } from "@/lib/schemas/catalog";
import type { Checkin } from "@/lib/schemas/checkin";

const SCAN_COOLDOWN_MS = 4000;

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendada",
  confirmed: "Confirmada",
  in_progress: "En progreso",
  completed: "Completada",
  no_show: "No asistió",
  cancelled: "Cancelada",
};
const STATUS_COLOR: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  in_progress: "bg-orange-100 text-orange-700",
  completed: "bg-gray-100 text-gray-500",
  no_show: "bg-red-100 text-red-600",
  cancelled: "bg-gray-100 text-gray-400",
};

// Next action for each status
const NEXT_ACTION: Partial<Record<AppointmentStatus, { label: string; next: AppointmentStatus }>> = {
  scheduled: { label: "Confirmar llegada", next: "confirmed" },
  confirmed: { label: "Iniciar sesión", next: "in_progress" },
  in_progress: { label: "Completar sesión", next: "completed" },
};

type ScanState = "scanning" | "found" | "no_camera";

export default function CheckinPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const lastSlugRef = useRef("");
  const lastScanAtRef = useRef(0);
  const handlerRef = useRef<(slug: string) => void>(() => {});

  const [scanState, setScanState] = useState<ScanState>("scanning");
  const [foundPatient, setFoundPatient] = useState<Patient | null>(null);
  const [foundAppointment, setFoundAppointment] = useState<Appointment | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string>("");

  // ── Data queries ──────────────────────────────────────────────────────────

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => appointmentsRepo.list(),
  });
  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: () => patientsRepo.list(),
  });
  const { data: treatments = [] } = useQuery({
    queryKey: ["treatments"],
    queryFn: () => treatmentsRepo.list(),
  });
  const { data: devices = [] } = useQuery({
    queryKey: ["devices"],
    queryFn: () => devicesRepo.list(),
  });
  const { data: todayCheckins = [] } = useQuery({
    queryKey: ["checkins", today],
    queryFn: () => checkinsRepo.listByDay(today),
  });

  const patientMap = Object.fromEntries(patients.map((p) => [p.id, p]));
  const treatmentMap = Object.fromEntries(treatments.map((t) => [t.id, t]));

  // ── Mutations ─────────────────────────────────────────────────────────────

  const { mutate: advanceStatus, isPending } = useMutation({
    mutationFn: async ({
      appointment,
      nextStatus,
      deviceId,
    }: {
      appointment: Appointment;
      nextStatus: AppointmentStatus;
      deviceId?: string;
    }) => {
      // 1. Update appointment status
      await appointmentsRepo.update(appointment.id, { status: nextStatus });

      // 2. Create checkin record (only on first advance: scheduled→confirmed)
      if (appointment.status === "scheduled") {
        await checkinsRepo.create({
          patientId: appointment.patientId,
          timestamp: new Date().toISOString(),
          reason: "session",
          attendedBy: user!.uid,
          appointmentId: appointment.id,
        });
      }

      // 3. When completing, auto-register the session
      if (nextStatus === "completed") {
        await sessionsRepo.create({
          patientId: appointment.patientId,
          treatmentId: appointment.treatmentId,
          cabinId: appointment.cabinId,
          deviceId: deviceId || undefined,
          date: new Date().toISOString(),
          sessionNumber: 1,
          performedBy: user!.uid,
        });
      }
    },
    onSuccess: (_, { appointment, nextStatus }) => {
      toast.success(
        nextStatus === "completed"
          ? "Sesión completada y registrada"
          : `Estado actualizado: ${STATUS_LABEL[nextStatus]}`,
      );
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["checkins", today] });
      qc.invalidateQueries({ queryKey: ["sessions", appointment.patientId] });

      // Update local state so the card reflects new status immediately
      setFoundAppointment((prev) =>
        prev ? { ...prev, status: nextStatus } : prev,
      );
      setSelectedDevice("");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Error al actualizar"),
  });

  // ── QR scan handler ───────────────────────────────────────────────────────

  const handleScan = useCallback(
    async (slug: string) => {
      const now = Date.now();
      if (
        slug === lastSlugRef.current &&
        now - lastScanAtRef.current < SCAN_COOLDOWN_MS
      )
        return;
      lastSlugRef.current = slug;
      lastScanAtRef.current = now;

      const patient = await patientsRepo.findByQrSlug(slug);
      if (!patient) {
        toast.error("QR no reconocido");
        return;
      }

      // Find today's most relevant appointment for this patient
      const todayApts = appointments
        .filter(
          (a) =>
            a.patientId === patient.id &&
            a.startAt.slice(0, 10) === today &&
            !["completed", "cancelled", "no_show"].includes(a.status),
        )
        .sort(
          (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
        );

      setFoundPatient(patient);
      setFoundAppointment(todayApts[0] ?? null);
      setSelectedDevice("");
      setScanState("found");
    },
    [appointments, today],
  );

  // Keep handler ref fresh
  handlerRef.current = handleScan;

  // ── Camera lifecycle ──────────────────────────────────────────────────────

  useEffect(() => {
    if (scanState !== "scanning") return;

    let instance: { stop: () => Promise<void> } | null = null;
    let active = true;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (!active) return;
      const qr = new Html5Qrcode("qr-video");
      qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded) => handlerRef.current(decoded),
        () => {},
      )
        .then(() => { if (active) instance = qr; })
        .catch(() => { if (active) setScanState("no_camera"); });
    });

    return () => {
      active = false;
      instance?.stop().catch(() => {});
    };
  }, [scanState]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  // Devices available for the appointment's cabin + portable devices
  const availableDevices =
    foundAppointment
      ? devices.filter(
          (d: Device) =>
            d.status === "active" &&
            (!d.cabinId || d.cabinId === foundAppointment.cabinId),
        )
      : [];

  const action = foundAppointment
    ? NEXT_ACTION[foundAppointment.status as AppointmentStatus]
    : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Check-in QR</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

        {/* Left: Camera or appointment card */}
        <div className="space-y-4">

          {scanState === "scanning" && (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-square max-w-sm mx-auto md:mx-0">
              <div id="qr-video" className="w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-56 relative">
                  <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-md" />
                  <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-md" />
                  <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-md" />
                  <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-md" />
                  <ScanLine className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-5 text-white/70 animate-pulse" />
                </div>
              </div>
            </div>
          )}

          {scanState === "no_camera" && (
            <div className="rounded-xl bg-gray-900 aspect-square max-w-sm mx-auto md:mx-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <Camera className="h-10 w-10 text-gray-400" />
              <p className="text-gray-300 text-sm">No se pudo acceder a la cámara.</p>
              <p className="text-gray-500 text-xs">Verifica permisos y que uses HTTPS.</p>
              <Button size="sm" variant="outline" onClick={() => setScanState("scanning")}
                className="text-white border-white/30">
                Reintentar
              </Button>
            </div>
          )}

          {scanState === "found" && foundPatient && (
            <div className="space-y-3">
              {/* Patient card */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{foundPatient.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {foundPatient.phone ?? foundPatient.email ?? "—"} · {foundPatient.points} pts
                      </p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Appointment card */}
              {foundAppointment ? (
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Cita de hoy</CardTitle>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[foundAppointment.status]}`}>
                        {STATUS_LABEL[foundAppointment.status]}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm space-y-1">
                      <p className="font-medium">
                        {treatmentMap[foundAppointment.treatmentId]?.name ?? "Tratamiento"}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {fmtTime(foundAppointment.startAt)} → {fmtTime(foundAppointment.endAt)}
                      </p>
                    </div>

                    {/* Device picker — shown when about to start or complete */}
                    {(foundAppointment.status === "confirmed" ||
                      foundAppointment.status === "in_progress") &&
                      availableDevices.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium flex items-center gap-1">
                            <Zap className="h-3.5 w-3.5" />
                            Máquina / Equipo
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              className={`rounded-full px-3 py-1 text-xs border transition-colors ${!selectedDevice ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                              onClick={() => setSelectedDevice("")}
                            >
                              Sin equipo
                            </button>
                            {availableDevices.map((d: Device) => (
                              <button
                                key={d.id}
                                className={`rounded-full px-3 py-1 text-xs border transition-colors ${selectedDevice === d.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                                onClick={() => setSelectedDevice(d.id)}
                              >
                                {d.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Action button */}
                    {action && (
                      <Button
                        className="w-full"
                        disabled={isPending}
                        onClick={() =>
                          advanceStatus({
                            appointment: foundAppointment,
                            nextStatus: action.next,
                            deviceId: selectedDevice || undefined,
                          })
                        }
                      >
                        {isPending ? "Guardando…" : (
                          <span className="flex items-center gap-2">
                            {action.label}
                            <ChevronRight className="h-4 w-4" />
                          </span>
                        )}
                      </Button>
                    )}

                    {foundAppointment.status === "completed" && (
                      <p className="text-sm text-center text-muted-foreground">
                        ✓ Sesión completada
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-4 pb-4 text-sm text-muted-foreground text-center">
                    Sin cita agendada para hoy.
                  </CardContent>
                </Card>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setFoundPatient(null);
                  setFoundAppointment(null);
                  setScanState("scanning");
                }}
              >
                Escanear otro QR
              </Button>
            </div>
          )}
        </div>

        {/* Right: today's check-ins */}
        <div>
          <h2 className="font-medium mb-3 text-sm">
            Check-ins de hoy{" "}
            <span className="text-muted-foreground font-normal">
              ({todayCheckins.length})
            </span>
          </h2>
          {todayCheckins.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin registros todavía.</p>
          ) : (
            <div className="space-y-2">
              {todayCheckins.map((c: Checkin) => {
                const p = patientMap[c.patientId];
                const apt = c.appointmentId
                  ? appointments.find((a) => a.id === c.appointmentId)
                  : null;
                return (
                  <div key={c.id} className="rounded-lg border px-3 py-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{p?.fullName ?? "—"}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.timestamp).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {apt && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        {treatmentMap[apt.treatmentId]?.name ?? "—"}
                        <span className={`ml-1 rounded-full px-2 py-0.5 ${STATUS_COLOR[apt.status]}`}>
                          {STATUS_LABEL[apt.status]}
                        </span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
