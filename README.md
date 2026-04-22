# Clínica — App de control interno

App para control de pacientes, sesiones, cabinas, pagos y agenda de una
clínica estética. Basada en los requerimientos del PDF
`app_clinica_basica_una_hoja_v2.pdf`. MVP pensado para una sola clínica.

Roadmap completo: ver `/Users/richardfigueroa/.claude/plans/es-un-proyeto-nuevo-radiant-stream.md`.
Decisiones técnicas: ver [`DECISIONS.md`](./DECISIONS.md).

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript
- **Firebase**: Firestore (DB), Auth (email/pass + custom claims), Storage,
  Hosting
- **UI**: TailwindCSS v4 + shadcn/ui
- **Estado**: @tanstack/react-query + react-hook-form + zod
- **QR**: html5-qrcode (scan) + qrcode (generate)
- **Agenda**: FullCalendar
- **PWA**: pendiente (Sprint 5)

## Estructura

```
app/
  (auth)/login/        Login público
  (app)/               Shell protegido (requiere sesión)
    dashboard/
    patients/          (Sprint 1)
    checkin/           (Sprint 1)
    agenda/            (Sprint 3)
    payments/          (Sprint 3)
    reports/           (Sprint 4)
    settings/          (Sprint 2)
components/
  ui/                  shadcn primitives
  auth-context.tsx     Contexto global de Auth
  app-nav.tsx          Nav lateral con visibilidad por rol
  providers.tsx        QueryClient + Auth + Toaster
lib/
  firebase/            client.ts (browser) + admin.ts (server)
  schemas/             Zod por entidad
  repositories/        Interfaces + impl Firestore (adapter pattern)
firestore.rules        Reglas por rol (admin / reception / therapist)
firestore.indexes.json Índices compuestos necesarios
storage.rules          Reglas de Storage
firebase.json          Config de proyecto + emuladores
```

## Setup manual (1 vez)

Estos pasos **no los hace Claude** — requieren tu cuenta Google.

### 1. Crear el proyecto Firebase

1. Entrar a <https://console.firebase.google.com> → **Agregar proyecto**.
2. Nombre sugerido: `clinica-mvp` (o lo que prefieras).
3. Desactivar Analytics (no lo usamos).
4. Dentro del proyecto:
   - **Authentication** → habilitar *Email/Password*.
   - **Firestore Database** → crear en modo **Production** (región
     `southamerica-east1` o la que te convenga).
   - **Storage** → crear bucket default.

### 2. Registrar la app web y copiar credenciales

1. En Firebase → ⚙️ → *Project settings* → *Your apps* → **Add app (</>)*.
2. Registrarla como "Clínica Web".
3. Copiar el objeto `firebaseConfig` — de ahí salen los valores de
   `NEXT_PUBLIC_FIREBASE_*`.

### 3. Generar service account (Admin SDK)

1. *Project settings* → *Service accounts* → **Generate new private key**.
2. Del JSON descargado salen `FIREBASE_ADMIN_PROJECT_ID`,
   `FIREBASE_ADMIN_CLIENT_EMAIL` y `FIREBASE_ADMIN_PRIVATE_KEY`.
3. La private key va **con los `\n` literales** en `.env.local` (no
   saltos de línea reales). El wrapper en `lib/firebase/admin.ts` ya los
   convierte en runtime.

### 4. Variables de entorno

```bash
cp .env.example .env.local
# Editar .env.local con los valores del paso 2 y 3.
```

### 5. Instalar Firebase CLI (opcional — solo para deploy y emuladores)

```bash
npm install -g firebase-tools
firebase login
firebase use --add   # elegir el projectId creado
```

### 6. Crear el primer usuario admin

Desde la consola Firebase → *Authentication* → *Users* → crear un
`admin@clinica.com` con password temporal.

> ⚠️ El custom claim `role=admin` se setea vía server action todavía no
> implementada (Sprint 2). Por ahora, para desarrollar, el `useAuth`
> cae al doc `/staff/{uid}` si no hay claim. Crear manualmente el doc
> en Firestore: `staff/{uid del usuario}` con
> `{ fullName, email, role: "admin", active: true, createdAt, updatedAt }`.

## MCP de Firestore (para Claude Code)

El proyecto incluye un servidor MCP que le da a Claude Code acceso de
lectura/escritura a Firestore vía el
[GenAI Toolbox](https://github.com/googleapis/genai-toolbox). Configurado
en `.mcp.json`, binario en `bin/toolbox` (git-ignored).

Para activarlo necesitás 2 cosas:

1. **Completar el PROJECT_ID en `.mcp.json`** — reemplazar
   `REPLACE_WITH_FIREBASE_PROJECT_ID` por el projectId real de Firebase.
2. **Credenciales Application Default Credentials (ADC)**. Cualquiera
   de estas dos opciones:
   - `gcloud auth application-default login` — usa tu usuario Google.
   - Exportar `GOOGLE_APPLICATION_CREDENTIALS=/ruta/service-account.json`
     apuntando al JSON del service account que ya vas a generar para el
     Admin SDK.

Reiniciá Claude Code después de cambiar `.mcp.json` para que tome la
config.

## Desarrollo

```bash
# 1. Emuladores (en una terminal)
firebase emulators:start

# 2. App Next.js (en otra terminal) con emuladores
NEXT_PUBLIC_USE_EMULATORS=1 pnpm dev
```

Abrir <http://localhost:3000>. La Emulator UI queda en
<http://127.0.0.1:4000>.

Para correr sin emuladores (pegándole a Firebase de verdad), dejar
`NEXT_PUBLIC_USE_EMULATORS=0`.

## Scripts

```bash
pnpm dev      # dev server
pnpm build    # build de producción
pnpm lint     # ESLint
pnpm tsc --noEmit  # type-check aislado
```

## Estado actual (Sprint 0 — setup)

- [x] Scaffold Next.js + Tailwind + shadcn/ui
- [x] Firebase SDK (client + admin) + wrappers
- [x] Schemas zod por entidad
- [x] Repositorios Firestore con adapter pattern
- [x] firestore.rules + indexes + storage.rules
- [x] Auth context + login + shell con nav por rol
- [x] Type-check y build limpios
- [ ] Proyecto Firebase creado + `.env.local` poblado (manual)
- [ ] Primer admin creado en Auth + doc /staff/{uid}
- [ ] Deploy reglas: `firebase deploy --only firestore:rules,storage`

Próximo sprint: **Sprint 1 — Pacientes + QR + Check-in**.
