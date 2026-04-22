"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { settingsRepo, treatmentsRepo, cabinsRepo, staffRepo } from "@/lib/repositories";
import type { Treatment, Cabin } from "@/lib/schemas/catalog";
import type { Staff } from "@/lib/schemas/staff";

// ─── Clinic config ────────────────────────────────────────────────────────────

const clinicSchema = z.object({
  name: z.string().min(1).max(120),
  address: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
  timezone: z.string().min(1),
  pointsRate: z.number().nonnegative(),
});
type ClinicForm = z.infer<typeof clinicSchema>;

const TIMEZONES = [
  "America/Mexico_City", "America/Monterrey", "America/Cancun",
  "America/Bogota", "America/Lima", "America/Santiago",
  "America/Argentina/Buenos_Aires", "America/New_York",
  "America/Los_Angeles", "Europe/Madrid",
];

function ClinicTab() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => settingsRepo.get(),
    staleTime: 5 * 60 * 1000,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } =
    useForm<ClinicForm>({
      resolver: zodResolver(clinicSchema),
      defaultValues: { name: "", timezone: "America/Mexico_City", pointsRate: 0 },
    });

  useEffect(() => {
    if (settings) {
      reset({
        name: settings.name,
        address: settings.address ?? "",
        phone: settings.phone ?? "",
        timezone: settings.timezone,
        pointsRate: settings.pointsRate,
      });
    }
  }, [settings, reset]);

  const { mutate: save } = useMutation({
    mutationFn: (data: ClinicForm) => settingsRepo.save(data),
    onSuccess: () => { toast.success("Guardado"); qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: () => toast.error("No se pudo guardar"),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  return (
    <form onSubmit={handleSubmit((d) => save(d))} className="space-y-6 max-w-lg">
      <Card>
        <CardHeader><CardTitle className="text-base">Datos de la clínica</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" type="tel" {...register("phone")} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" {...register("address")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Regional y puntos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="timezone">Zona horaria</Label>
            <select id="timezone" {...register("timezone")}
              className="flex h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <Separator />
          <div className="space-y-1">
            <Label htmlFor="pointsRate">Puntos por $1 cobrado</Label>
            <Input id="pointsRate" type="number" min={0} step={0.1}
              {...register("pointsRate", { valueAsNumber: true })} />
            <p className="text-xs text-muted-foreground">0 = programa desactivado</p>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isSubmitting || !isDirty}>
        {isSubmitting ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}

// ─── Treatments tab ───────────────────────────────────────────────────────────

const treatmentSchema = z.object({
  name: z.string().min(2).max(80),
  category: z.string().max(40).optional(),
  basePrice: z.number().nonnegative(),
  durationMin: z.number().int().positive(),
});
type TreatmentForm = z.infer<typeof treatmentSchema>;

function TreatmentsTab() {
  const qc = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data: treatments = [], isLoading } = useQuery({
    queryKey: ["treatments"],
    queryFn: () => treatmentsRepo.list(),
  });

  const { mutate: toggleActive } = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      treatmentsRepo.update(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["treatments"] }),
    onError: () => toast.error("Error al actualizar"),
  });

  const { mutate: add } = useMutation({
    mutationFn: (data: TreatmentForm) =>
      treatmentsRepo.create({ ...data, deviceIds: [], requiresCabin: true, active: true }),
    onSuccess: () => {
      toast.success("Tratamiento agregado");
      qc.invalidateQueries({ queryKey: ["treatments"] });
      setShowAdd(false);
    },
    onError: () => toast.error("Error al guardar"),
  });

  const { mutate: editSave } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TreatmentForm }) =>
      treatmentsRepo.update(id, data),
    onSuccess: () => {
      toast.success("Tratamiento actualizado");
      qc.invalidateQueries({ queryKey: ["treatments"] });
      setEditId(null);
    },
    onError: () => toast.error("Error al guardar"),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{treatments.length} tratamientos</p>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" />Agregar
        </Button>
      </div>

      <div className="divide-y rounded-lg border">
        {treatments.map((t) =>
          editId === t.id ? (
            <TreatmentEditRow
              key={t.id}
              treatment={t}
              onSave={(data) => editSave({ id: t.id, data })}
              onCancel={() => setEditId(null)}
            />
          ) : (
            <div key={t.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.category && `${t.category} · `}{t.durationMin} min · ${t.basePrice.toLocaleString("es-MX")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={t.active ? "secondary" : "outline"}>
                  {t.active ? "Activo" : "Inactivo"}
                </Badge>
                <button
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setEditId(t.id)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                  onClick={() => toggleActive({ id: t.id, active: !t.active })}
                >
                  {t.active ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {showAdd && (
        <TreatmentAddForm
          onSave={(data) => add(data)}
          onCancel={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

function TreatmentEditRow({ treatment, onSave, onCancel }: {
  treatment: Treatment;
  onSave: (data: TreatmentForm) => void;
  onCancel: () => void;
}) {
  const { register, handleSubmit } = useForm<TreatmentForm>({
    resolver: zodResolver(treatmentSchema),
    defaultValues: {
      name: treatment.name,
      category: treatment.category ?? "",
      basePrice: treatment.basePrice,
      durationMin: treatment.durationMin,
    },
  });
  return (
    <form onSubmit={handleSubmit(onSave)} className="px-4 py-3 grid grid-cols-4 gap-2 items-end">
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">Nombre</Label>
        <Input {...register("name")} className="h-7 text-xs" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Precio</Label>
        <Input type="number" {...register("basePrice", { valueAsNumber: true })} className="h-7 text-xs" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Min</Label>
        <Input type="number" {...register("durationMin", { valueAsNumber: true })} className="h-7 text-xs" />
      </div>
      <div className="col-span-4 flex gap-2">
        <Button size="sm" type="submit"><Check className="h-3.5 w-3.5 mr-1" />Guardar</Button>
        <Button size="sm" variant="ghost" type="button" onClick={onCancel}><X className="h-3.5 w-3.5 mr-1" />Cancelar</Button>
      </div>
    </form>
  );
}

function TreatmentAddForm({ onSave, onCancel }: {
  onSave: (data: TreatmentForm) => void;
  onCancel: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<TreatmentForm>({
    resolver: zodResolver(treatmentSchema),
    defaultValues: { basePrice: 0, durationMin: 60 },
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Nuevo tratamiento</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSave)} className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label>Nombre *</Label>
            <Input {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1">
            <Label>Categoría</Label>
            <Input {...register("category")} placeholder="ej. Facial" />
          </div>
          <div className="space-y-1">
            <Label>Precio base ($) *</Label>
            <Input type="number" {...register("basePrice", { valueAsNumber: true })} />
          </div>
          <div className="space-y-1">
            <Label>Duración (min) *</Label>
            <Input type="number" {...register("durationMin", { valueAsNumber: true })} />
          </div>
          <div className="col-span-2 flex gap-2">
            <Button type="submit">Agregar</Button>
            <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Cabins tab ───────────────────────────────────────────────────────────────

const STATUS_CABIN = ["active", "maintenance", "disabled"] as const;
const CABIN_STATUS_LABEL: Record<string, string> = {
  active: "Activa",
  maintenance: "Mantenimiento",
  disabled: "Deshabilitada",
};

function CabinsTab() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data: cabins = [], isLoading } = useQuery({
    queryKey: ["cabins"],
    queryFn: () => cabinsRepo.list(),
  });

  const { mutate: changeStatus } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "maintenance" | "disabled" }) =>
      cabinsRepo.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cabins"] }),
    onError: () => toast.error("Error al actualizar"),
  });

  const { mutate: add } = useMutation({
    mutationFn: (name: string) =>
      cabinsRepo.create({ name, status: "active" }),
    onSuccess: () => {
      toast.success("Cabina agregada");
      qc.invalidateQueries({ queryKey: ["cabins"] });
      setShowAdd(false);
    },
    onError: () => toast.error("Error al guardar"),
  });

  const [newName, setNewName] = useState("");

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{cabins.length} cabinas</p>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" />Agregar
        </Button>
      </div>

      <div className="divide-y rounded-lg border">
        {cabins.map((c: Cabin) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">{c.name}</p>
              {c.notes && <p className="text-xs text-muted-foreground">{c.notes}</p>}
            </div>
            <select
              value={c.status}
              onChange={(e) => changeStatus({ id: c.id, status: e.target.value as "active" | "maintenance" | "disabled" })}
              className="h-7 rounded-md border border-border bg-background px-2 text-xs outline-none focus-visible:border-ring"
            >
              {STATUS_CABIN.map((s) => (
                <option key={s} value={s}>{CABIN_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <Label>Nombre de la cabina</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ej. Cabina 3"
            />
          </div>
          <Button onClick={() => { if (newName.trim()) { add(newName.trim()); setNewName(""); } }}>
            Agregar
          </Button>
          <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Button>
        </div>
      )}
    </div>
  );
}

// ─── Staff tab ────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = { admin: "Admin", reception: "Recepción", therapist: "Terapeuta" };

function StaffTab() {
  const qc = useQueryClient();
  const [newUid, setNewUid] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: () => staffRepo.list(),
  });

  const { mutate: toggleActive } = useMutation({
    mutationFn: ({ uid, active }: { uid: string; active: boolean }) =>
      staffRepo.update(uid, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
    onError: () => toast.error("Error al actualizar"),
  });

  const { mutate: changeRole } = useMutation({
    mutationFn: ({ uid, role }: { uid: string; role: "admin" | "reception" | "therapist" }) =>
      staffRepo.update(uid, { role }),
    onSuccess: () => {
      toast.success("Rol actualizado — el usuario debe volver a iniciar sesión");
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: () => toast.error("Error al actualizar"),
  });

  const { mutate: addStaff, isPending: isAdding } = useMutation({
    mutationFn: () =>
      staffRepo.upsert(newUid.trim(), {
        fullName: "Nuevo usuario",
        email: "",
        role: "reception",
        active: true,
      }),
    onSuccess: () => {
      toast.success("Usuario agregado — edita nombre y email en Firestore Console");
      qc.invalidateQueries({ queryKey: ["staff"] });
      setNewUid("");
      setShowAdd(false);
    },
    onError: () => toast.error("UID no válido o ya existe"),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{staffList.length} usuarios</p>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4 mr-1" />Agregar por UID
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Crea el usuario en{" "}
              <strong>Firebase Console → Authentication</strong>, copia el UID
              generado y pégalo aquí.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="UID de Firebase Auth"
                value={newUid}
                onChange={(e) => setNewUid(e.target.value)}
                className="font-mono text-xs"
              />
              <Button size="sm" disabled={!newUid.trim() || isAdding} onClick={() => addStaff()}>
                Agregar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="divide-y rounded-lg border">
        {staffList.map((s: Staff) => (
          <div key={s.id} className="flex items-center justify-between px-4 py-3 gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{s.fullName}</p>
              <p className="text-xs text-muted-foreground truncate">{s.email || "—"}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={s.role}
                onChange={(e) => changeRole({ uid: s.id, role: e.target.value as "admin" | "reception" | "therapist" })}
                className="h-7 rounded-md border border-border bg-background px-2 text-xs outline-none focus-visible:border-ring"
              >
                {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <Badge variant={s.active ? "secondary" : "outline"}>
                {s.active ? "Activo" : "Inactivo"}
              </Badge>
              <button
                className="text-xs text-muted-foreground hover:text-foreground underline"
                onClick={() => toggleActive({ uid: s.id, active: !s.active })}
              >
                {s.active ? "Desactivar" : "Activar"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Configuración</h1>
      <Tabs defaultValue="clinic">
        <TabsList>
          <TabsTrigger value="clinic">Clínica</TabsTrigger>
          <TabsTrigger value="treatments">Tratamientos</TabsTrigger>
          <TabsTrigger value="cabins">Cabinas</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
        </TabsList>
        <TabsContent value="clinic" className="mt-4"><ClinicTab /></TabsContent>
        <TabsContent value="treatments" className="mt-4"><TreatmentsTab /></TabsContent>
        <TabsContent value="cabins" className="mt-4"><CabinsTab /></TabsContent>
        <TabsContent value="staff" className="mt-4"><StaffTab /></TabsContent>
      </Tabs>
    </div>
  );
}
