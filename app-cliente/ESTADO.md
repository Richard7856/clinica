# Estado del proyecto — App cliente L'Ecrobelle (handoff)

Última actualización: 2026-08-02. Rama: `claude/amazing-galileo-yLKWF`.

Documento para retomar rápido en la siguiente sesión. Resume qué hay, cómo se
construye y qué falta.

## Qué es

App móvil **Expo / React Native (SDK 52, RN 0.76.9, TypeScript)** en
`app-cliente/`, para la clínica estética **L'Ecrobelle**. Es un **demo** de
capacidades. Convive con la clínica web (Next.js, raíz del repo, en Vercel).

Backend: **Firebase `clin-bd81e`** (proyecto SIN plan de pago — se migró desde
`euromex-t2o27z` para evitar costos). La app habla directo con Firebase; el
único "servidor" para correos/Stripe es la web en Vercel.

## Roles (la app detecta el rol al entrar por el doc `/staff/{uid}`)

- **admin** → panel admin: KPIs (Inicio), Promociones, Tienda, Citas, Ajustes
  (Usuarios, Aparatos, Recompensas, Clínicas, Config de puntos).
- **collaborator** (cualquier staff no-admin) → Citas de hoy + Escanear QR →
  captura monto → asigna Cisnes (única vía para otorgar puntos).
- **client** (sin doc staff) → Inicio (Cisnes+promos), Recompensas (canje con
  código), Cita (pide cita → QR), Tienda (si el admin se la habilitó), Ubicación.

## Cuentas demo (en clin-bd81e)

| Rol | Correo | Contraseña |
|-----|--------|-----------|
| Admin | rifigue97@gmail.com | Ecrobelle2026! |
| Colaborador | colaborador@ecrobelle.com | Colab2026! |
| Cliente | cliente@ecrobelle.com | Cliente2026! |

*(Son demo. Se pueden resetear con el admin SDK. Cambiar para producción.)*

## Modelo de datos (Firestore, colecciones)

`patients` (points, banned, storeEnabled, qrSlug, email), `staff` (role),
`settings/clinic` (pointsThreshold + cisnesPerThreshold = cada X pesos → Y
Cisnes), `clinics`, `treatments`, `cabins`, `devices` (clinicId + hours),
`appointments` (clientes las piden; QR = id de la cita; pointsAwarded/amountSpent),
`rewards` (ledger), `rewardItems` (catálogo canjeable), `redemptions` (canjes),
`promotions`, `products` (servicios), `storeProducts` (tienda física).

Puntos: **solo** se otorgan cuando el colaborador escanea el QR de la cita y
captura el monto (`lib/collaborator.awardVisitPoints`).

## Cómo se compila el APK EN ESTE ENTORNO (nube, efímero)

El contenedor se reinicia entre sesiones: hay que rehacer setup. Pasos:

1. `cd app-cliente && npm install`
2. Crear `.env` (ver `.env.example`) con la config pública de clin-bd81e y
   `EXPO_PUBLIC_API_URL=https://clinica-gold-omega.vercel.app`.
3. Android SDK+NDK no vienen: descargar cmdline-tools de Google, `sdkmanager`
   instalar `platform-tools`, `platforms;android-35`, `build-tools;35.0.0`,
   `ndk;26.1.10909125`, `cmake;3.22.1`. `ANDROID_HOME=/root/android-sdk`.
4. `npx expo prebuild --platform android --no-install`; `echo "sdk.dir=..." > android/local.properties`.
5. **Gotcha clave:** este entorno inyecta un banner `JAVA_TOOL_OPTIONS` que
   rompe el prefab de Gradle (error CXX1210). **Hay que `unset JAVA_TOOL_OPTIONS`**
   antes de `gradlew`.
6. Firma release + splits arm64 ya están en `android/app/build.gradle`
   (keystore `lecrobelle-release.keystore`, pass `Ecrobelle2026`).
7. Build (minificado, ~23 MB, cabe en el límite de envío de 30 MB):
   ```
   cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a \
     -Pandroid.enableProguardInReleaseBuilds=true \
     -Pandroid.enableShrinkResourcesInReleaseBuilds=true --no-daemon
   ```
   Salida: `android/app/build/outputs/apk/release/app-arm64-v8a-release.apk`.

Tareas de admin/seed en clin-bd81e requieren el **JSON de service account**
(NO está en el repo, es efímero) — pedirlo de nuevo cada sesión. Firestore de
clin-bd81e requiere `preferRest:true` en el admin SDK (por el proxy) y el rol
IAM "Cloud Datastore User" en la cuenta de servicio.

## Pendientes / cosas a saber

- **Vercel env mezclado:** en Vercel solo `NEXT_PUBLIC_FIREBASE_PROJECT_ID` es
  clin-bd81e; las otras 5 públicas + las 3 `FIREBASE_ADMIN_*` siguen en euromex.
  Por eso el **correo con QR** (endpoint `/api/email/appointment-qr`) no entrega
  aún. El envío en la app es best-effort: no rompe el flujo si falla.
- **Correos:** Resend en modo prueba solo envía a **oxxo9949@gmail.com**. Para
  enviar a cualquier cliente hay que verificar un dominio en Resend. Se decidió
  NO usar legalmind por ahora. Test emails se disparan con el endpoint
  `/api/admin/preview-email` (Bearer CRON_SECRET) → oxxo.
- **Reglas Firestore de clin-bd81e:** están en MODO PRUEBA (permiten todo,
  ~30 días). Las reglas estrictas están escritas en `firestore.rules` pero NO
  se pudieron desplegar (falta rol "Firebase Rules Admin" en la SA). Desplegar
  antes de producción.
- **Restringir usuarios:** es "suave" (bandera `banned` revisada al login), no
  deshabilita la cuenta en Firebase Auth (eso necesitaría backend).
- **Endpoints temporales aún desplegados** (gated por CRON_SECRET, quitar en
  prod): `/api/admin/seed`, `/api/admin/preview-email`.
- **Pago:** simulado (sin pasarela real). Stripe cableado en `lib/checkout.ts`
  + `/api/checkout` + webhook, pero desactivado a favor de `lib/purchase.simulatePurchase`.
- `src/screens/ShopScreen.tsx` quedó huérfano (servicios) tras rediseñar tabs.

## Cómo probar la demo (flujo estrella)

1. Cliente pide cita en **"Hoy"** → muestra QR (o usar los QR de prueba de
   citas reales generados con `qrcode`).
2. Colaborador → **Citas de hoy** → toca la cita → **Escanear QR** → captura
   monto → **Asignar Cisnes**.
3. Cliente refresca Inicio → Cisnes suben. Admin → Inicio → venta en KPIs.

## Web (para probar en iPhone) — agosto 2026

- Proyecto Vercel **`lecrobelle-app`** (team `richards-projects-b633518f`,
  id `prj_iO3IXPKmUJd2yB2VlPdLtlCqrcn6`), enlazado al repo con
  **rootDirectory `app-cliente`**. Config de build en `app-cliente/vercel.json`
  (`expo export --platform web` → `dist`, con rewrite SPA).
- URL: **https://lecrobelle-app.vercel.app**
- Se despliega en cada push a la rama. `main` NO tiene `app-cliente`.
- Los dominios de Vercel ya están en **Authorized domains** de Firebase Auth
  (sin eso, el login falla con `auth/unauthorized-domain`). Si se agrega un
  dominio nuevo, hay que autorizarlo también.
- `firebase.ts` trae config de respaldo del proyecto demo para que el build de
  Vercel funcione sin `.env` (la config de cliente es pública por diseño).
- **Limitación:** el escáner QR (`expo-camera`) carga jsQR desde CDN y tiene
  soporte parcial en navegador; el panel colaborador conviene probarlo en el APK.

## Ver la app con datos locales (emuladores)

Sirve para trabajar el diseño sin depender del proyecto de Firebase en la nube
y sin tocar datos reales. Requiere Java 21.

```bash
# 1) En la raíz del repo: levanta Auth + Firestore locales
firebase emulators:start --project clin-bd81e --only auth,firestore

# 2) Compila la app apuntando al emulador
cd app-cliente
EXPO_PUBLIC_USE_EMULATORS=1 EXPO_PUBLIC_EMULATOR_HOST=127.0.0.1 \
  npx expo export --platform web
npx serve dist      # o: cd dist && python3 -m http.server 8210
```

`EXPO_PUBLIC_EMULATOR_HOST` existe porque desde un teléfono físico hay que
apuntar a la IP de la máquina; en web y simulador basta `127.0.0.1`. Se usa
`127.0.0.1` y no `localhost` porque el emulador solo escucha en IPv4 y
`localhost` puede resolver a `::1`.

**Cuidado:** el emulador SÍ aplica `firestore.rules`. Hoy esas reglas están
desincronizadas con la app móvil (ver abajo), así que la app se ve vacía. Para
revisar interfaz se pueden abrir las reglas solo en el emulador:

```bash
curl -X PUT "http://127.0.0.1:8080/emulator/v1/projects/clin-bd81e:securityRules" \
  -H "Content-Type: application/json" \
  -d '{"rules":{"files":[{"name":"emu.rules","content":"rules_version = \"2\";\nservice cloud.firestore {\n  match /databases/{db}/documents {\n    match /{document=**} { allow read, write: if true; }\n  }\n}\n"}]}}'
```

### Pendiente: firestore.rules no cubre la app móvil

Las reglas se escribieron para la web de la clínica. Si se despliegan tal cual,
la app del cliente deja de funcionar:

- `treatments` y `appointments`: lectura solo para staff — el cliente no puede
  ver el catálogo, ni sus citas, ni agendar.
- `clinics` y `storeProducts`: sin reglas, caen en el `default deny`.
- Los roles no coinciden: las reglas usan `reception` / `therapist`; la app
  trata a cualquier staff no-admin como `collaborator`.

Hoy no falla porque Firestore está en modo prueba, pero ese modo caduca.
