# Decisiones técnicas — Clínica

Registro de decisiones no triviales tomadas durante la construcción. Se
appendea, no se reescribe.

---

## [2026-04-22] Stack: Next.js 16 + Firestore (en vez de Supabase)

**Contexto:** Proyecto nuevo, cliente con requerimientos de una hoja (ver
`app_clinica_basica_una_hoja_v2.pdf`). El stack por default habría sido
Next.js + Supabase, pero la cuenta de Supabase del proyecto no tenía quota
disponible.

**Decisión:** Frontend Next.js 16 (App Router) + Firebase como backend
(Firestore, Auth, Storage, Hosting). Free tier alcanza para el volumen de
una clínica única.

**Alternativas consideradas:**
- Next.js + Supabase — descartado por falta de quota.
- Next.js + FastAPI + Postgres en VPS — overkill para un MVP con pocos
  usuarios concurrentes; duplica infraestructura.
- Expo / React Native — descartado: el PDF no exige app nativa y PWA
  responsive resuelve el único caso que necesita móvil (escaneo QR).

**Riesgos / limitaciones:**
- Firestore free tier tiene 1 GiB y 50K lecturas/día. Una clínica chica
  entra sobrada, pero si crece o entra multi-tenant hay que migrar.
- Consultas Firestore no soportan dos rangos a la vez → algunas queries
  (detección de solapes de agenda) se filtran en memoria.
- Sin transacciones cross-service: atomicidad limitada a Firestore.

**Oportunidades de mejora:**
- Migrar a Supabase/Postgres o FastAPI cuando el cliente pague la v2.
- La capa `lib/repositories` abstrae el acceso a datos: la migración
  debería ser reemplazar archivos, no reescribir componentes.

---

## [2026-04-22] Repository adapter pattern desde el inicio

**Contexto:** Sabemos que si el MVP prospera, migramos de Firestore a un
backend con más control (Supabase o FastAPI). El costo de migrar con
llamadas a Firestore esparcidas por toda la app sería altísimo.

**Decisión:** Toda lectura/escritura pasa por `lib/repositories/*.ts`.
Los componentes y server actions consumen interfaces tipadas (`Repository<
TInput, T>`), no el SDK de Firebase directamente. La implementación
Firestore queda aislada en `firestore-helpers.ts` + los archivos de repo.

**Alternativas consideradas:**
- Usar `firebase/firestore` directo desde componentes — más corto ahora,
  pero rehacer la app al migrar.
- ORMs más elaborados (Firestore-ORM, Prisma) — agrega peso sin justificarlo
  para un MVP.

**Riesgos / limitaciones:**
- Los repos devuelven `id` + timestamps en ISO, no el tipo nativo de
  Firestore. Conversión en el borde vía `fromSnap` / `toIso`.
- Transacciones complejas (registrar sesión ↔ paquete) viven dentro del
  repo. Al migrar, hay que traducirlas al nuevo motor (Postgres tx, etc.).

**Oportunidades de mejora:**
- Al migrar, escribir una suite de tests de contrato contra la interfaz
  para correr contra ambas implementaciones y validar paridad.

---

## [2026-04-22] Roles con custom claims + doc /staff/{uid}

**Contexto:** Firestore rules necesitan conocer el rol del usuario para
autorizar (`reception` no debe leer `payments` privadas de otros, etc.).
Firebase Auth guarda custom claims en el ID token.

**Decisión:** El rol vive en dos lugares sincronizados:
1. Custom claim del ID token (para reglas Firestore).
2. Doc `/staff/{uid}` (para UI — nombre, activo, etc.).

El `useAuth` prioriza la claim y cae al doc si no existe (para desarrollo
antes de que el admin corra la server action que setea la claim).

**Alternativas consideradas:**
- Solo doc /staff + reglas que lo consulten — requiere `get()` en reglas
  (cuenta como lectura, encarece cada operación).
- Solo custom claims — imposible listar/editar desde UI sin duplicar info.

**Riesgos / limitaciones:**
- Hay que setear la claim server-side (firebase-admin). Pendiente de
  implementar la server action en Sprint 2 (CRUD de staff).
- Los cambios de rol requieren forzar refresh del token.

---

## [2026-04-22] Estado server con React Query + ISO strings

**Contexto:** Firestore Timestamps no serializan bien por la frontera
cliente/server y añaden una dependencia del SDK en toda la app.

**Decisión:** Todas las fechas viajan como ISO 8601 strings desde los
repos hacia adelante. La conversión ocurre en `fromSnap` / `toIso`. React
Query maneja cache con `staleTime: 30s`.

**Riesgos / limitaciones:**
- Queries Firestore que filtran por fecha necesitan convertir ISO → Date →
  Timestamp en el punto de uso. Está centralizado en los repos.
