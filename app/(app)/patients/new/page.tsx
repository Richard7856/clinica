"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { patientsRepo } from "@/lib/repositories";
import { patientInputSchema, type PatientInput } from "@/lib/schemas/patient";

export default function NewPatientPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PatientInput>({
    resolver: zodResolver(patientInputSchema),
  });

  async function onSubmit(data: PatientInput) {
    try {
      const patient = await patientsRepo.create(data);
      toast.success("Paciente creado");
      router.push(`/patients/${patient.id}`);
    } catch (err) {
      console.error("Error al crear paciente:", err);
      toast.error("No se pudo crear el paciente");
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <Link
        href="/patients"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a pacientes
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="fullName">Nombre completo *</Label>
              <Input id="fullName" {...register("fullName")} />
              {errors.fullName && (
                <p className="text-xs text-destructive">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" type="tel" {...register("phone")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="doc">Documento / ID</Label>
                <Input id="doc" {...register("doc")} />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="birthDate">Fecha de nacimiento</Label>
              <Input
                id="birthDate"
                type="date"
                {...register("birthDate", {
                  // date input returns YYYY-MM-DD; schema expects ISO datetime
                  setValueAs: (v: string) =>
                    v ? `${v}T00:00:00Z` : undefined,
                })}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" rows={3} {...register("notes")} />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Guardando…" : "Crear paciente"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
