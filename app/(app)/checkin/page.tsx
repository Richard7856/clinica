"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ScanLine, CheckCircle2, AlertCircle, Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { checkinsRepo, patientsRepo } from "@/lib/repositories";
import { useAuth } from "@/components/auth-context";
import type { Patient } from "@/lib/schemas/patient";
import type { Checkin } from "@/lib/schemas/checkin";

const SCAN_COOLDOWN_MS = 3000;

type ScanState = "idle" | "scanning" | "success" | "error" | "no_camera";

export default function CheckinPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const lastSlugRef = useRef("");
  const lastScanAtRef = useRef(0);
  const handlerRef = useRef<{ onScan: (slug: string) => void }>({ onScan: () => {} });

  const [scanState, setScanState] = useState<ScanState>("idle");
  const [lastPatient, setLastPatient] = useState<Patient | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const { data: todayCheckins = [] } = useQuery({
    queryKey: ["checkins", today],
    queryFn: () => checkinsRepo.listByDay(today),
  });
  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: () => patientsRepo.list(),
  });
  const patientMap = Object.fromEntries(patients.map((p) => [p.id, p]));

  const { mutate: doCheckin } = useMutation({
    mutationFn: async (patient: Patient) => {
      await checkinsRepo.create({
        patientId: patient.id,
        timestamp: new Date().toISOString(),
        reason: "session",
        attendedBy: user!.uid,
      });
    },
    onSuccess: (_, patient) => {
      setScanState("success");
      toast.success(`Check-in: ${patient.fullName}`);
      qc.invalidateQueries({ queryKey: ["checkins", today] });
      // Reset to scanning after 3 s
      setTimeout(() => setScanState("scanning"), 3000);
    },
    onError: () => {
      toast.error("No se pudo registrar el check-in");
      setScanState("scanning");
    },
  });

  // Keep handler ref fresh so the scanner closure always has latest callbacks
  handlerRef.current.onScan = async (slug: string) => {
    const now = Date.now();
    if (slug === lastSlugRef.current && now - lastScanAtRef.current < SCAN_COOLDOWN_MS) return;
    lastSlugRef.current = slug;
    lastScanAtRef.current = now;

    const patient = await patientsRepo.findByQrSlug(slug);
    if (!patient) {
      toast.error("QR no reconocido");
      return;
    }
    setLastPatient(patient);
    doCheckin(patient);
  };

  useEffect(() => {
    let qrCode: { stop: () => Promise<void> } | null = null;
    let active = true;

    setScanState("scanning");

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (!active) return;

      const instance = new Html5Qrcode("qr-video");

      instance
        .start(
          { facingMode: "environment" }, // rear camera
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decoded) => handlerRef.current.onScan(decoded),
          () => {}, // per-frame errors — intentionally ignored
        )
        .then(() => {
          if (active) qrCode = instance;
        })
        .catch((err) => {
          console.error("Camera error:", err);
          if (active) setScanState("no_camera");
        });
    });

    return () => {
      active = false;
      qrCode?.stop().catch(() => {});
    };
  }, []);

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Check-in QR</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

        {/* Camera area */}
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-square max-w-sm mx-auto md:mx-0">

            {/* Camera feed rendered by Html5Qrcode into this div */}
            <div id="qr-video" className="w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover" />

            {/* Scan overlay */}
            {scanState === "scanning" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative">
                  {/* Corner brackets */}
                  <div className="w-56 h-56 relative">
                    <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-md" />
                    <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-md" />
                    <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-md" />
                    <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-md" />
                    {/* Animated scan line */}
                    <ScanLine className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-5 text-white/70 animate-pulse" />
                  </div>
                </div>
              </div>
            )}

            {/* Success overlay */}
            {scanState === "success" && (
              <div className="absolute inset-0 bg-green-500/40 flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="h-16 w-16 text-white drop-shadow" />
                <p className="text-white font-semibold text-lg drop-shadow">
                  {lastPatient?.fullName}
                </p>
              </div>
            )}

            {/* No camera state */}
            {scanState === "no_camera" && (
              <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center gap-3 p-4 text-center">
                <Camera className="h-10 w-10 text-gray-400" />
                <p className="text-gray-300 text-sm">
                  No se pudo acceder a la cámara.
                </p>
                <p className="text-gray-500 text-xs">
                  Verifica los permisos de cámara en tu navegador y que la app
                  se sirva por HTTPS.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="mt-1 text-white border-white/30"
                >
                  Reintentar
                </Button>
              </div>
            )}
          </div>

          {/* Last scanned patient card */}
          {lastPatient && (
            <Card>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{lastPatient.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {lastPatient.phone ?? lastPatient.email ?? "—"} · {lastPatient.points} pts
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-auto shrink-0">
                    Registrado
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Today's checkins list */}
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
                const patient = patientMap[c.patientId];
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {patient?.fullName ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fmtTime(c.timestamp)}
                      </p>
                    </div>
                    <Badge variant="secondary">{c.reason}</Badge>
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
