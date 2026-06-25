"use server";

import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { staffRole, type StaffRole } from "@/lib/schemas/staff";

// Server actions de gestión de staff que requieren privilegios (admin SDK):
//   - setear el custom claim `role` (lo consume firestore.rules)
//   - crear el usuario de Auth (email+contraseña) sin pasar por la consola
//
// Seguridad: cada acción recibe el ID token del que llama y lo verifica con el
// admin SDK. Solo un usuario con rol admin (claim o doc /staff) puede ejecutar.
// Nunca confiamos en un "soy admin" que venga del cliente.

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin(idToken: string): Promise<
  { ok: true; uid: string } | { ok: false; error: string }
> {
  if (!idToken) return { ok: false, error: "Sesión no válida" };
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    // 1) claim directo
    if (decoded.role === "admin") return { ok: true, uid: decoded.uid };
    // 2) fallback al doc /staff (por si el primer admin aún no tiene claim)
    const snap = await getAdminDb().collection("staff").doc(decoded.uid).get();
    if (snap.exists && snap.data()?.role === "admin")
      return { ok: true, uid: decoded.uid };
    return { ok: false, error: "Requiere permisos de administrador" };
  } catch {
    return { ok: false, error: "Sesión no válida o expirada" };
  }
}

// Asigna rol: setea el custom claim Y actualiza el doc /staff, manteniéndolos
// sincronizados. El usuario debe refrescar su token (re-login) para que el
// claim surta efecto en las reglas.
export async function setStaffRole(args: {
  idToken: string;
  targetUid: string;
  role: StaffRole;
}): Promise<ActionResult> {
  const role = staffRole.safeParse(args.role);
  if (!role.success) return { ok: false, error: "Rol inválido" };

  const auth = await requireAdmin(args.idToken);
  if (!auth.ok) return auth;

  try {
    const adminAuth = getAdminAuth();
    // Preservar otros claims que pudiera tener el usuario.
    const userRec = await adminAuth.getUser(args.targetUid);
    await adminAuth.setCustomUserClaims(args.targetUid, {
      ...(userRec.customClaims ?? {}),
      role: role.data,
    });
    await getAdminDb()
      .collection("staff")
      .doc(args.targetUid)
      .set({ role: role.data, updatedAt: new Date() }, { merge: true });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al asignar rol",
    };
  }
}

// Crea un usuario de Auth (email+contraseña), su doc /staff y su claim de rol,
// todo en un paso — reemplaza el flujo manual de copiar UID desde la consola.
export async function createStaffUser(args: {
  idToken: string;
  email: string;
  password: string;
  fullName: string;
  role: StaffRole;
}): Promise<{ ok: true; uid: string } | { ok: false; error: string }> {
  const role = staffRole.safeParse(args.role);
  if (!role.success) return { ok: false, error: "Rol inválido" };

  const auth = await requireAdmin(args.idToken);
  if (!auth.ok) return auth;

  try {
    const adminAuth = getAdminAuth();
    const user = await adminAuth.createUser({
      email: args.email,
      password: args.password,
      displayName: args.fullName,
    });
    await adminAuth.setCustomUserClaims(user.uid, { role: role.data });
    await getAdminDb()
      .collection("staff")
      .doc(user.uid)
      .set({
        fullName: args.fullName,
        email: args.email,
        role: role.data,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    return { ok: true, uid: user.uid };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al crear usuario";
    // Mensajes comunes de Firebase Admin en español.
    if (msg.includes("email-already-exists"))
      return { ok: false, error: "Ese email ya está registrado" };
    if (msg.includes("invalid-password"))
      return { ok: false, error: "La contraseña debe tener al menos 6 caracteres" };
    return { ok: false, error: msg };
  }
}
