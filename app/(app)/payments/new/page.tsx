"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { paymentsRepo, patientsRepo } from "@/lib/repositories";
import { useAuth } from "@/components/auth-context";

const METHOD_LABEL: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  other: "Otro",
};

const CONCEPT_LABEL: Record<string, string> = {
  package: "Paquete",
  session: "Sesión suelta",
  product: "Producto",
  other: "Otro",
};

const formSchema = z.object({
  patientId: z.string().min(1, "Selecciona un paciente"),
  amount: z.number().positive("El monto debe ser mayor a 0"),
  method: z.enum(["cash", "card", "transfer", "other"]),
  concept: z.enum(["package", "session", "product", "other"]),
  notes: z.string().max(500).optional(),
});
type FormValues = z.infer<typeof formSchema>;

export default function NewPaymentPage() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: () => patientsRepo.list(),
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { method: "cash", concept: "session" },
  });

  const amount = watch("amount");

  const { mutate: save } = useMutation({
    mutationFn: (data: FormValues) =>
      paymentsRepo.create({
        patientId: data.patientId,
        amount: data.amount,
        method: data.method,
        concept: data.concept,
        date: new Date().toISOString(),
        receivedBy: user!.uid,
        notes: data.notes,
      }),
    onSuccess: () => {
      toast.success("Pago registrado");
      router.push("/dashboard");
    },
    onError: (err) => {
      console.error("Error al registrar pago:", err);
      toast.error("No se pudo registrar el pago");
    },
  });

  return (
    <div className="max-w-md space-y-4">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Link>

      <h1 className="text-2xl font-semibold">Cobrar</h1>

      <form onSubmit={handleSubmit((d) => save(d))} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Paciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <Label htmlFor="patientId">Paciente *</Label>
              <select
                id="patientId"
                {...register("patientId")}
                className="flex h-8 w-full rounded-lg border border-border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Seleccionar…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
              {errors.patientId && (
                <p className="text-xs text-destructive">{errors.patientId.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalle del cobro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="concept">Concepto *</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(CONCEPT_LABEL) as [string, string][]).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer has-[:checked]:border-ring has-[:checked]:bg-muted"
                  >
                    <input
                      type="radio"
                      value={value}
                      {...register("concept")}
                      className="accent-primary"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="amount">Monto *</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  $
                </span>
                <Input
                  id="amount"
                  type="number"
                  min={0}
                  step={0.01}
                  className="pl-6"
                  {...register("amount", { valueAsNumber: true })}
                />
              </div>
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <Separator />

            <div className="space-y-1">
              <Label>Método de pago *</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(METHOD_LABEL) as [string, string][]).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer has-[:checked]:border-ring has-[:checked]:bg-muted"
                  >
                    <input
                      type="radio"
                      value={value}
                      {...register("method")}
                      className="accent-primary"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Textarea id="notes" rows={2} {...register("notes")} />
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {amount > 0 && (
          <div className="rounded-lg bg-muted px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total a cobrar</span>
            <span className="text-xl font-semibold">
              ${amount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Registrando…" : "Confirmar cobro"}
        </Button>
      </form>
    </div>
  );
}
