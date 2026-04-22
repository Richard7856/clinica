"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type FullCalendarType from "@fullcalendar/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import type { DateSelectArg, EventClickArg } from "@fullcalendar/core";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  appointmentsRepo,
  patientsRepo,
  treatmentsRepo,
  cabinsRepo,
} from "@/lib/repositories";
import { useAuth } from "@/components/auth-context";
import type { Appointment, AppointmentStatus } from "@/lib/schemas/appointment";
import type { Patient } from "@/lib/schemas/patient";
import type { Treatment, Cabin } from "@/lib/schemas/catalog";

// FullCalendar event colors by appointment status
const STATUS_COLOR: Record<string, string> = {
  scheduled: "#3b82f6",
  confirmed: "#22c55e",
  in_progress: "#f97316",
  completed: "#9ca3af",
  no_show: "#ef4444",
  cancelled: "#d1d5db",
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Agendada",
  confirmed: "Confirmada",
  in_progress: "En progreso",
  completed: "Completada",
  no_show: "No asistió",
  cancelled: "Cancelada",
};

// Convert ISO/offset datetime to datetime-local input value (YYYY-MM-DDTHH:MM)
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Form schema for new/edit — uses local datetime strings, converted on submit
const formSchema = z.object({
  patientId: z.string().min(1, "Selecciona un paciente"),
  treatmentId: z.string().min(1, "Selecciona un tratamiento"),
  cabinId: z.string().min(1, "Selecciona una cabina"),
  startAt: z.string().min(1, "Selecciona fecha y hora"),
  endAt: z.string().min(1, "Selecciona fecha y hora"),
  notes: z.string().max(1000).optional(),
});
type FormValues = z.infer<typeof formSchema>;

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AgendaPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const calendarRef = useRef<FullCalendarType>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Appointment | null>(null);
  const [prefill, setPrefill] = useState<{ startAt: string; endAt: string } | null>(null);

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
  const { data: cabins = [] } = useQuery({
    queryKey: ["cabins"],
    queryFn: () => cabinsRepo.list(),
  });

  const patientMap = Object.fromEntries(patients.map((p) => [p.id, p]));
  const treatmentMap = Object.fromEntries(treatments.map((t) => [t.id, t]));

  const events = appointments.map((a) => ({
    id: a.id,
    title: patientMap[a.patientId]?.fullName ?? "Paciente",
    start: a.startAt,
    end: a.endAt,
    backgroundColor: STATUS_COLOR[a.status] ?? STATUS_COLOR.scheduled,
    borderColor: STATUS_COLOR[a.status] ?? STATUS_COLOR.scheduled,
    extendedProps: { appointment: a },
  }));

  const handleDateSelect = useCallback((arg: DateSelectArg) => {
    setEditTarget(null);
    setPrefill({ startAt: arg.startStr, endAt: arg.endStr });
    setSheetOpen(true);
  }, []);

  const handleEventClick = useCallback((arg: EventClickArg) => {
    const apt = arg.event.extendedProps.appointment as Appointment;
    setEditTarget(apt);
    setPrefill(null);
    setSheetOpen(true);
  }, []);

  const handleSaved = () => {
    setSheetOpen(false);
    // Clear any lingering calendar selection that could block clicks
    calendarRef.current?.getApi().unselect();
    qc.invalidateQueries({ queryKey: ["appointments"] });
  };

  const handleSheetChange = (open: boolean) => {
    if (!open) calendarRef.current?.getApi().unselect();
    setSheetOpen(open);
  };

  const openNewAppointment = () => {
    setEditTarget(null);
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    setPrefill({ startAt: now.toISOString(), endAt: end.toISOString() });
    setSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Agenda</h1>
        <Button onClick={openNewAppointment}>
          <Plus className="h-4 w-4 mr-1" />Nueva cita
        </Button>
      </div>

      <div className="rounded-lg border bg-background overflow-hidden">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          locale={esLocale}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          slotMinTime="07:00:00"
          slotMaxTime="21:00:00"
          allDaySlot={false}
          selectable
          selectMirror
          unselectAuto
          selectMinDistance={5}
          events={events}
          select={handleDateSelect}
          eventClick={handleEventClick}
          height="auto"
        />
      </div>

      <AppointmentSheet
        open={sheetOpen}
        onOpenChange={handleSheetChange}
        appointment={editTarget}
        prefill={prefill}
        patients={patients}
        treatments={treatments}
        treatmentMap={treatmentMap}
        cabins={cabins}
        staffId={user?.uid ?? ""}
        onSaved={handleSaved}
      />
    </div>
  );
}

// ─── Appointment sheet ────────────────────────────────────────────────────────

type SheetProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  appointment: Appointment | null;
  prefill: { startAt: string; endAt: string } | null;
  patients: Patient[];
  treatments: Treatment[];
  treatmentMap: Record<string, Treatment>;
  cabins: Cabin[];
  staffId: string;
  onSaved: () => void;
};

function AppointmentSheet({
  open,
  onOpenChange,
  appointment,
  prefill,
  patients,
  treatments,
  treatmentMap,
  cabins,
  staffId,
  onSaved,
}: SheetProps) {
  const isEdit = !!appointment;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { patientId: "", treatmentId: "", cabinId: "", startAt: "", endAt: "", notes: "" },
  });

  // Sync form with open state and prefill/appointment data
  useEffect(() => {
    if (!open) return;
    if (appointment) {
      reset({
        patientId: appointment.patientId,
        treatmentId: appointment.treatmentId,
        cabinId: appointment.cabinId,
        startAt: toDatetimeLocal(appointment.startAt),
        endAt: toDatetimeLocal(appointment.endAt),
        notes: appointment.notes ?? "",
      });
    } else if (prefill) {
      reset({
        patientId: "",
        treatmentId: "",
        cabinId: "",
        startAt: toDatetimeLocal(prefill.startAt),
        endAt: toDatetimeLocal(prefill.endAt),
        notes: "",
      });
    }
  }, [open, appointment, prefill, reset]);

  // Auto-update endAt when treatment changes (uses its durationMin)
  const treatmentId = watch("treatmentId");
  const startAt = watch("startAt");
  useEffect(() => {
    const treatment = treatmentMap[treatmentId];
    if (!treatment || !startAt) return;
    const start = new Date(startAt);
    if (isNaN(start.getTime())) return;
    const end = new Date(start.getTime() + treatment.durationMin * 60 * 1000);
    setValue("endAt", toDatetimeLocal(end.toISOString()));
  }, [treatmentId, startAt, treatmentMap, setValue]);

  const { mutate: save } = useMutation({
    mutationFn: async (data: FormValues) => {
      const payload = {
        patientId: data.patientId,
        treatmentId: data.treatmentId,
        cabinId: data.cabinId,
        staffId,
        startAt: new Date(data.startAt).toISOString(),
        endAt: new Date(data.endAt).toISOString(),
        status: "scheduled" as const,
        notes: data.notes,
      };

      // Check cabin overlap before creating
      const overlaps = await appointmentsRepo.findOverlapsInCabin(
        payload.cabinId,
        payload.startAt,
        payload.endAt,
      );
      const conflicts = overlaps.filter((o) => o.id !== appointment?.id);
      if (conflicts.length > 0) {
        throw new Error("La cabina ya tiene una cita en ese horario");
      }

      if (appointment) {
        await appointmentsRepo.update(appointment.id, payload);
      } else {
        await appointmentsRepo.create(payload);
      }
    },
    onSuccess: () => {
      toast.success(appointment ? "Cita actualizada" : "Cita creada");
      onSaved();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    },
  });

  const { mutate: updateStatus } = useMutation({
    mutationFn: (status: AppointmentStatus) =>
      appointmentsRepo.update(appointment!.id, { status }),
    onSuccess: () => {
      toast.success("Estado actualizado");
      onSaved();
    },
    onError: () => toast.error("Error al actualizar estado"),
  });

  const { mutate: cancel } = useMutation({
    mutationFn: () => appointmentsRepo.update(appointment!.id, { status: "cancelled" }),
    onSuccess: () => {
      toast.success("Cita cancelada");
      onSaved();
    },
    onError: () => toast.error("Error al cancelar"),
  });

  const activeCabins = cabins.filter((c) => c.status === "active");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar cita" : "Nueva cita"}</SheetTitle>
          {isEdit && (
            <div className="flex items-center gap-2 mt-1">
              <Badge style={{ backgroundColor: STATUS_COLOR[appointment.status] }}>
                {STATUS_LABEL[appointment.status]}
              </Badge>
            </div>
          )}
        </SheetHeader>

        <form
          onSubmit={handleSubmit((d) => save(d))}
          className="flex flex-col gap-4 px-4"
        >
          <div className="space-y-1">
            <Label htmlFor="patientId">Paciente *</Label>
            <select
              id="patientId"
              {...register("patientId")}
              className="flex h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Seleccionar…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.fullName}</option>
              ))}
            </select>
            {errors.patientId && <p className="text-xs text-destructive">{errors.patientId.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="treatmentId">Tratamiento *</Label>
            <select
              id="treatmentId"
              {...register("treatmentId")}
              className="flex h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Seleccionar…</option>
              {treatments.filter((t) => t.active).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.durationMin} min)
                </option>
              ))}
            </select>
            {errors.treatmentId && <p className="text-xs text-destructive">{errors.treatmentId.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="cabinId">Cabina *</Label>
            <select
              id="cabinId"
              {...register("cabinId")}
              className="flex h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Seleccionar…</option>
              {activeCabins.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.cabinId && <p className="text-xs text-destructive">{errors.cabinId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="startAt">Inicio *</Label>
              <Input id="startAt" type="datetime-local" {...register("startAt")} />
              {errors.startAt && <p className="text-xs text-destructive">{errors.startAt.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="endAt">Fin *</Label>
              <Input id="endAt" type="datetime-local" {...register("endAt")} />
              {errors.endAt && <p className="text-xs text-destructive">{errors.endAt.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" rows={2} {...register("notes")} />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear cita"}
          </Button>
        </form>

        {isEdit && (
          <>
            <Separator className="my-2" />
            <div className="px-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Cambiar estado
              </p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(STATUS_LABEL) as AppointmentStatus[])
                  .filter((s) => s !== appointment.status && s !== "cancelled")
                  .map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateStatus(s)}
                      className="rounded-full px-3 py-1 text-xs text-white font-medium transition-opacity hover:opacity-80"
                      style={{ backgroundColor: STATUS_COLOR[s] }}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
              </div>

              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => cancel()}
              >
                Cancelar cita
              </Button>
            </div>
          </>
        )}

        <SheetFooter />
      </SheetContent>
    </Sheet>
  );
}
