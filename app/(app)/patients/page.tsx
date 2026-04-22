"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { patientsRepo } from "@/lib/repositories";

export default function PatientsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: () => patientsRepo.list(),
  });

  const filtered = patients.filter(
    (p) =>
      p.fullName.toLowerCase().includes(search.toLowerCase()) ||
      p.phone?.includes(search) ||
      p.email?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pacientes</h1>
        <Link href="/patients/new" className={buttonVariants()}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo paciente
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar nombre, teléfono o email…"
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {search ? "Sin resultados." : "Aún no hay pacientes registrados."}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Puntos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => (
              <TableRow
                key={p.id}
                className="cursor-pointer"
                onClick={() => router.push(`/patients/${p.id}`)}
              >
                <TableCell className="font-medium">{p.fullName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {p.phone ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.email || "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary">{p.points}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
