"use client";

import { use, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
  ArrowLeft, Download, Star, Plus, Package, ClipboardList,
  Dumbbell, Gift,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  patientsRepo, packagesRepo, sessionsRepo, rewardsRepo,
  treatmentsRepo, cabinsRepo, historyRepo,
} from "@/lib/repositories";
import { useAuth } from "@/components/auth-context";
import type { Package as Pkg } from "@/lib/schemas/package";
import type { Session } from "@/lib/schemas/session";
import type { Reward } from "@/lib/schemas/reward";
import type { HistoryEntry } from "@/lib/schemas/patient";

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => patientsRepo.getById(id),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando…</p>;
  if (!patient) return <p className="text-sm text-muted-foreground">Paciente no encontrado.</p>;

  return (
    <div className="space-y-4 max-w-3xl">
      <Link href="/patients" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />Volver
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{patient.fullName}</h1>
          <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
            <Star className="h-3.5 w-3.5 text-yellow-500" />
            <span>{patient.points} puntos</span>
            <Badge variant="outline" className="font-mono text-xs ml-2">{patient.qrSlug}</Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info"><ClipboardList className="h-3.5 w-3.5 mr-1" />Info</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
          <TabsTrigger value="paquetes"><Package className="h-3.5 w-3.5 mr-1" />Paquetes</TabsTrigger>
          <TabsTrigger value="sesiones"><Dumbbell className="h-3.5 w-3.5 mr-1" />Sesiones</TabsTrigger>
          <TabsTrigger value="puntos"><Gift className="h-3.5 w-3.5 mr-1" />Puntos</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <InfoTab patient={patient} />
        </TabsContent>
        <TabsContent value="historial" className="mt-4">
          <HistorialTab patientId={id} />
        </TabsContent>
        <TabsContent value="paquetes" className="mt-4">
          <PaquetesTab patientId={id} />
        </TabsContent>
        <TabsContent value="sesiones" className="mt-4">
          <SesionesTab patientId={id} />
        </TabsContent>
        <TabsContent value="puntos" className="mt-4">
          <PuntosTab patientId={id} currentPoints={patient.points} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Tab: Información ─────────────────────────────────────────────────────────

function InfoTab({ patient }: { patient: Awaited<ReturnType<typeof patientsRepo.getById>> & object }) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  useEffect(() => {
    if (!patient?.qrSlug) return;
    QRCode.toDataURL(patient.qrSlug, { width: 256, margin: 1 }).then(setQrDataUrl).catch(console.error);
  }, [patient?.qrSlug]);

  if (!patient) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Información</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <InfoRow label="Teléfono" value={patient.phone} />
          <InfoRow label="Email" value={patient.email} />
          <InfoRow label="Documento" value={patient.doc} />
          <InfoRow label="Nacimiento" value={patient.birthDate ? new Date(patient.birthDate).toLocaleDateString("es-MX") : undefined} />
          {patient.notes && <p className="pt-2 border-t text-xs text-muted-foreground">{patient.notes}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Código QR</CardTitle></CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          {qrDataUrl ? (
            <>
              <img src={qrDataUrl} alt="QR" className="rounded border" />
              <a href={qrDataUrl} download={`qr-${patient.qrSlug}.png`}
                className={buttonVariants({ variant: "outline", size: "sm" })}>
                <Download className="h-4 w-4 mr-1" />Descargar
              </a>
            </>
          ) : <p className="text-sm text-muted-foreground">Generando…</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span>{value || "—"}</span>
    </div>
  );
}

// ─── Tab: Historial clínico ───────────────────────────────────────────────────

const historySchema = z.object({
  date: z.string().min(1, "Requerido"),
  type: z.enum(["consulta", "tratamiento", "observacion"]),
  notes: z.string().min(1, "Requerido").max(4000),
  allergies: z.string().max(500).optional(),
  medications: z.string().max(500).optional(),
});
type HistoryForm = z.infer<typeof historySchema>;

function HistorialTab({ patientId }: { patientId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: entries = [] } = useQuery({
    queryKey: ["history", patientId],
    queryFn: () => historyRepo.list(patientId),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<HistoryForm>({
      resolver: zodResolver(historySchema),
      defaultValues: { type: "consulta", date: new Date().toISOString().slice(0, 10) },
    });

  const { mutate: add } = useMutation({
    mutationFn: (data: HistoryForm) =>
      historyRepo.add(patientId, {
        ...data,
        date: `${data.date}T00:00:00Z`,
        attachments: [],
        createdBy: user!.uid,
      }),
    onSuccess: () => {
      toast.success("Entrada agregada");
      qc.invalidateQueries({ queryKey: ["history", patientId] });
      reset();
      setShowForm(false);
    },
    onError: () => toast.error("Error al guardar"),
  });

  const TYPE_LABEL = { consulta: "Consulta", tratamiento: "Tratamiento", observacion: "Observación" };
  const TYPE_COLOR: Record<string, string> = { consulta: "bg-blue-100 text-blue-700", tratamiento: "bg-green-100 text-green-700", observacion: "bg-yellow-100 text-yellow-700" };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{entries.length} entradas</p>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />Nueva entrada
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Nueva entrada clínica</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((d) => add(d))} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Fecha</Label>
                  <Input type="date" {...register("date")} />
                </div>
                <div className="space-y-1">
                  <Label>Tipo</Label>
                  <select {...register("type")} className="flex h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                    {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Notas *</Label>
                <Textarea rows={3} {...register("notes")} />
                {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Alergias</Label>
                  <Input {...register("allergies")} placeholder="Ninguna" />
                </div>
                <div className="space-y-1">
                  <Label>Medicamentos</Label>
                  <Input {...register("medications")} placeholder="Ninguno" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isSubmitting}>Guardar</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin entradas clínicas.</p>
      ) : (
        <div className="space-y-3">
          {entries.map((e: HistoryEntry) => (
            <Card key={e.id}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLOR[e.type]}`}>
                    {TYPE_LABEL[e.type as keyof typeof TYPE_LABEL]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(e.date).toLocaleDateString("es-MX")}
                  </span>
                </div>
                <p className="text-sm">{e.notes}</p>
                {(e.allergies || e.medications) && (
                  <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                    {e.allergies && <span>Alergias: {e.allergies}</span>}
                    {e.medications && <span>Medicamentos: {e.medications}</span>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Paquetes ────────────────────────────────────────────────────────────

const packageSchema = z.object({
  treatmentId: z.string().min(1, "Selecciona un tratamiento"),
  totalSessions: z.number().int().positive(),
  price: z.number().nonnegative(),
  purchasedAt: z.string().min(1),
  expiresAt: z.string().optional(),
  notes: z.string().max(500).optional(),
});
type PackageForm = z.infer<typeof packageSchema>;

const PKG_STATUS_LABEL: Record<string, string> = {
  active: "Activo", completed: "Completado", expired: "Vencido", cancelled: "Cancelado",
};
const PKG_STATUS_COLOR: Record<string, string> = {
  active: "bg-green-100 text-green-700", completed: "bg-gray-100 text-gray-600",
  expired: "bg-red-100 text-red-600", cancelled: "bg-gray-100 text-gray-400",
};

function PaquetesTab({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: packages = [] } = useQuery({
    queryKey: ["packages", patientId],
    queryFn: () => packagesRepo.listByPatient(patientId),
  });
  const { data: treatments = [] } = useQuery({
    queryKey: ["treatments"],
    queryFn: () => treatmentsRepo.list(),
  });
  const treatmentMap = Object.fromEntries(treatments.map((t) => [t.id, t]));

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<PackageForm>({
      resolver: zodResolver(packageSchema),
      defaultValues: { totalSessions: 5, price: 0, purchasedAt: new Date().toISOString().slice(0, 10) },
    });

  const { mutate: buy } = useMutation({
    mutationFn: (data: PackageForm) =>
      packagesRepo.create({
        patientId,
        treatmentId: data.treatmentId,
        totalSessions: data.totalSessions,
        price: data.price,
        purchasedAt: `${data.purchasedAt}T00:00:00Z`,
        expiresAt: data.expiresAt ? `${data.expiresAt}T00:00:00Z` : undefined,
        notes: data.notes,
      }),
    onSuccess: () => {
      toast.success("Paquete creado");
      qc.invalidateQueries({ queryKey: ["packages", patientId] });
      reset();
      setShowForm(false);
    },
    onError: () => toast.error("Error al crear paquete"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{packages.length} paquetes</p>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />Nuevo paquete
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Vender paquete</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((d) => buy(d))} className="space-y-3">
              <div className="space-y-1">
                <Label>Tratamiento *</Label>
                <select {...register("treatmentId")} className="flex h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                  <option value="">Seleccionar…</option>
                  {treatments.filter((t) => t.active).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {errors.treatmentId && <p className="text-xs text-destructive">{errors.treatmentId.message}</p>}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Sesiones</Label>
                  <Input type="number" min={1} {...register("totalSessions", { valueAsNumber: true })} />
                </div>
                <div className="space-y-1">
                  <Label>Precio total ($)</Label>
                  <Input type="number" min={0} {...register("price", { valueAsNumber: true })} />
                </div>
                <div className="space-y-1">
                  <Label>Compra</Label>
                  <Input type="date" {...register("purchasedAt")} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Vence (opcional)</Label>
                <Input type="date" {...register("expiresAt")} />
              </div>
              <div className="space-y-1">
                <Label>Notas</Label>
                <Input {...register("notes")} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isSubmitting}>Crear</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {packages.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin paquetes.</p>
      ) : (
        <div className="space-y-3">
          {packages.map((p: Pkg) => {
            const treatment = treatmentMap[p.treatmentId];
            const pct = Math.round((p.usedSessions / p.totalSessions) * 100);
            return (
              <Card key={p.id}>
                <CardContent className="pt-3 pb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{treatment?.name ?? "Tratamiento"}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.usedSessions}/{p.totalSessions} sesiones · ${p.price.toLocaleString("es-MX")}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PKG_STATUS_COLOR[p.status]}`}>
                      {PKG_STATUS_LABEL[p.status]}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  {p.expiresAt && (
                    <p className="text-xs text-muted-foreground">
                      Vence: {new Date(p.expiresAt).toLocaleDateString("es-MX")}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Sesiones ────────────────────────────────────────────────────────────

const sessionSchema = z.object({
  treatmentId: z.string().min(1, "Requerido"),
  cabinId: z.string().min(1, "Requerido"),
  packageId: z.string().optional(),
  date: z.string().min(1),
  notes: z.string().max(2000).optional(),
});
type SessionForm = z.infer<typeof sessionSchema>;

function SesionesTab({ patientId }: { patientId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions", patientId],
    queryFn: () => sessionsRepo.listByPatient(patientId),
  });
  const { data: packages = [] } = useQuery({
    queryKey: ["packages", patientId],
    queryFn: () => packagesRepo.listByPatient(patientId),
  });
  const { data: treatments = [] } = useQuery({ queryKey: ["treatments"], queryFn: () => treatmentsRepo.list() });
  const { data: cabins = [] } = useQuery({ queryKey: ["cabins"], queryFn: () => cabinsRepo.list() });

  const treatmentMap = Object.fromEntries(treatments.map((t) => [t.id, t]));
  const activePackages = packages.filter((p) => p.status === "active");

  const { register, handleSubmit, reset, formState: { isSubmitting } } =
    useForm<SessionForm>({
      resolver: zodResolver(sessionSchema),
      defaultValues: { date: new Date().toISOString().slice(0, 10) },
    });

  const { mutate: save } = useMutation({
    mutationFn: async (data: SessionForm) => {
      const base = {
        patientId,
        treatmentId: data.treatmentId,
        cabinId: data.cabinId,
        date: `${data.date}T12:00:00Z`,
        performedBy: user!.uid,
        notes: data.notes,
      };
      if (data.packageId) {
        await sessionsRepo.registerFromPackage({ ...base, packageId: data.packageId, sessionNumber: 1 });
      } else {
        await sessionsRepo.create({ ...base, sessionNumber: 1 });
      }
    },
    onSuccess: () => {
      toast.success("Sesión registrada");
      qc.invalidateQueries({ queryKey: ["sessions", patientId] });
      qc.invalidateQueries({ queryKey: ["packages", patientId] });
      qc.invalidateQueries({ queryKey: ["patient", patientId] });
      reset();
      setShowForm(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Error al registrar"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{sessions.length} sesiones</p>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />Registrar sesión
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Nueva sesión</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((d) => save(d))} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Tratamiento *</Label>
                  <select {...register("treatmentId")} className="flex h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                    <option value="">Seleccionar…</option>
                    {treatments.filter((t) => t.active).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Cabina *</Label>
                  <select {...register("cabinId")} className="flex h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                    <option value="">Seleccionar…</option>
                    {cabins.filter((c) => c.status === "active").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              {activePackages.length > 0 && (
                <div className="space-y-1">
                  <Label>Descontar de paquete (opcional)</Label>
                  <select {...register("packageId")} className="flex h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                    <option value="">Sesión suelta</option>
                    {activePackages.map((p) => {
                      const t = treatmentMap[p.treatmentId];
                      return <option key={p.id} value={p.id}>{t?.name} ({p.usedSessions}/{p.totalSessions})</option>;
                    })}
                  </select>
                </div>
              )}
              <div className="space-y-1">
                <Label>Fecha</Label>
                <Input type="date" {...register("date")} />
              </div>
              <div className="space-y-1">
                <Label>Notas clínicas</Label>
                <Textarea rows={2} {...register("notes")} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isSubmitting}>Guardar</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin sesiones registradas.</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {sessions.map((s: Session) => (
            <div key={s.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{treatmentMap[s.treatmentId]?.name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(s.date).toLocaleDateString("es-MX")}
                  {s.packageId && " · desde paquete"}
                </p>
                {s.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{s.notes}</p>}
              </div>
              <Badge variant="outline">#{s.sessionNumber}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Puntos / Rewards ────────────────────────────────────────────────────

function PuntosTab({ patientId, currentPoints }: { patientId: string; currentPoints: number }) {
  const qc = useQueryClient();
  const [redeemAmount, setRedeemAmount] = useState("");
  const [redeemReason, setRedeemReason] = useState("");

  const { data: rewards = [] } = useQuery({
    queryKey: ["rewards", patientId],
    queryFn: () => rewardsRepo.listByPatient(patientId),
  });

  const { mutate: redeem, isPending } = useMutation({
    mutationFn: () => rewardsRepo.redeem(patientId, Number(redeemAmount), redeemReason || "Canje manual"),
    onSuccess: () => {
      toast.success("Puntos canjeados");
      qc.invalidateQueries({ queryKey: ["rewards", patientId] });
      qc.invalidateQueries({ queryKey: ["patient", patientId] });
      setRedeemAmount("");
      setRedeemReason("");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Error al canjear"),
  });

  const isValid = Number(redeemAmount) > 0 && Number(redeemAmount) <= currentPoints;

  return (
    <div className="space-y-4">
      {/* Balance card */}
      <Card>
        <CardContent className="pt-4 pb-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
            <Star className="h-6 w-6 text-yellow-500" />
          </div>
          <div>
            <p className="text-3xl font-bold">{currentPoints}</p>
            <p className="text-sm text-muted-foreground">puntos disponibles</p>
          </div>
        </CardContent>
      </Card>

      {/* Redeem form */}
      {currentPoints > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Canjear puntos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Puntos a canjear</Label>
                <Input type="number" min={1} max={currentPoints} value={redeemAmount}
                  onChange={(e) => setRedeemAmount(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Motivo (opcional)</Label>
                <Input placeholder="ej. Descuento en sesión" value={redeemReason}
                  onChange={(e) => setRedeemReason(e.target.value)} />
              </div>
            </div>
            <Button size="sm" disabled={!isValid || isPending} onClick={() => redeem()}>
              {isPending ? "Canjeando…" : "Confirmar canje"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Rewards ledger */}
      <h3 className="text-sm font-medium">Historial de puntos</h3>
      {rewards.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin movimientos.</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {rewards.map((r: Reward) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <p className="text-sm">{r.reason}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.date).toLocaleDateString("es-MX")}
                </p>
              </div>
              <span className={`font-semibold text-sm ${r.type === "earned" ? "text-green-600" : "text-red-500"}`}>
                {r.type === "earned" ? "+" : "-"}{r.points}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
