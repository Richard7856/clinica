import { NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

// Bootstrap del PRIMER usuario admin (problema huevo-y-gallina: el alta de
// staff vive detrás del login y exige ser admin, pero al inicio no hay nadie).
//
// Doble protección:
//   1. Requiere CRON_SECRET (Authorization: Bearer ...).
//   2. Solo funciona si la colección `staff` está vacía. En cuanto existe el
//      primer usuario, el endpoint queda inerte (409) para siempre.
//
// Crea: usuario de Auth (email+password) + custom claim role=admin + doc
// /staff/{uid}. Después de usarlo una vez, no puede volver a crear admins.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "no autorizado" }, { status: 401 });
  }

  const db = getAdminDb();

  // Gate: solo si no hay staff todavía.
  const existing = await db.collection("staff").limit(1).get();
  if (!existing.empty) {
    return Response.json(
      { error: "ya existe al menos un usuario; bootstrap deshabilitado" },
      { status: 409 },
    );
  }

  let body: { email?: string; password?: string; fullName?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "body JSON inválido" }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password;
  const fullName = body.fullName?.trim() || "Administrador";

  if (!email || !email.includes("@"))
    return Response.json({ error: "email inválido" }, { status: 400 });
  if (!password || password.length < 6)
    return Response.json(
      { error: "la contraseña debe tener al menos 6 caracteres" },
      { status: 400 },
    );

  try {
    const adminAuth = getAdminAuth();
    const user = await adminAuth.createUser({
      email,
      password,
      displayName: fullName,
    });
    await adminAuth.setCustomUserClaims(user.uid, { role: "admin" });
    await db.collection("staff").doc(user.uid).set({
      fullName,
      email,
      role: "admin",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return Response.json({ ok: true, uid: user.uid, email, role: "admin" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error desconocido";
    if (msg.includes("email-already-exists")) {
      // El usuario existe en Auth pero no hay doc staff: lo promovemos.
      try {
        const adminAuth = getAdminAuth();
        const u = await adminAuth.getUserByEmail(email);
        await adminAuth.setCustomUserClaims(u.uid, { role: "admin" });
        await db.collection("staff").doc(u.uid).set({
          fullName,
          email,
          role: "admin",
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        return Response.json({ ok: true, uid: u.uid, email, role: "admin", promoted: true });
      } catch (e) {
        return Response.json(
          { error: e instanceof Error ? e.message : "no se pudo promover" },
          { status: 500 },
        );
      }
    }
    return Response.json({ error: msg }, { status: 500 });
  }
}
