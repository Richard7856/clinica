# L'Ecrobelle — App Cliente

App móvil (Expo / React Native + TypeScript) para los clientes de la clínica
L'Ecrobelle. Reusa el **mismo backend Firebase** que la clínica web, así que
los Cisnes (puntos), recompensas y fichas de paciente son los mismos datos.

## Qué hace (v1)

- **Login / registro** del cliente (Firebase Auth), ligado a su ficha por correo.
- **Inicio** — saldo de Cisnes, progreso a la próxima recompensa, actividad.
- **Recompensas** — catálogo canjeable (colección `rewardItems`).
- **Comprar** — servicios/paquetes (colección `products`), pago con Stripe *(pendiente)*.
- **Ubicación** — dirección, teléfono, horarios de la clínica.

## Requisitos para compilar en tu máquina

- **Node 18+** y **npm** (o pnpm).
- **Android Studio** con el Android SDK (Build-Tools + platform-tools).
- **JDK 17** (lo pide Gradle de React Native 0.76).
- Variables `ANDROID_HOME` / `JAVA_HOME` bien configuradas.

## Puesta en marcha (una vez)

```bash
cd app-cliente
npm install                 # instala dependencias
cp .env.example .env        # pega tus credenciales Firebase (las mismas de la web)
```

`.env` — copia los valores de `NEXT_PUBLIC_FIREBASE_*` (los de Vercel), con el
prefijo `EXPO_PUBLIC_`. Ver `.env.example`.

## Probar en desarrollo (opcional)

```bash
npm start                   # abre Expo; escanea el QR con Expo Go, o:
npm run android             # corre en emulador / teléfono conectado por USB
```

## Generar el .aab firmado para Google Play Console

### 1. Generar el proyecto nativo `android/`

```bash
npm run prebuild            # = expo prebuild --platform android
```

Esto crea la carpeta `android/`. Solo hace falta re-correrlo si cambias
`app.json` (ícono, versión, permisos).

### 2. Crear tu keystore de firma (una sola vez)

⚠️ **Guarda este archivo y sus contraseñas en un lugar seguro.** Si lo pierdes,
no podrás publicar actualizaciones de la app en Play.

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore lecrobelle-release.keystore \
  -alias lecrobelle \
  -keyalg RSA -keysize 2048 -validity 10000
```

Coloca `lecrobelle-release.keystore` en `app-cliente/android/app/`.

Luego crea `android/gradle.properties` (o edítalo) con:

```properties
LECROBELLE_UPLOAD_STORE_FILE=lecrobelle-release.keystore
LECROBELLE_UPLOAD_KEY_ALIAS=lecrobelle
LECROBELLE_UPLOAD_STORE_PASSWORD=TU_PASSWORD
LECROBELLE_UPLOAD_KEY_PASSWORD=TU_PASSWORD
```

Y en `android/app/build.gradle`, dentro de `android { ... }`, agrega el
`signingConfigs.release` apuntando a esas propiedades y úsalo en
`buildTypes.release`. *(Ver sección "Firma" abajo — te dejo el snippet exacto.)*

### 3. Compilar el bundle

```bash
npm run build:aab           # = cd android && ./gradlew bundleRelease
```

El archivo sale en:

```
android/app/build/outputs/bundle/release/app-release.aab
```

Ese `.aab` es el que **subes a Google Play Console** → tu app → Producción (o
Testing interno) → Crear versión → subir bundle.

### (Alternativa) APK para instalar directo, sin Play

```bash
npm run build:apk           # → android/app/build/outputs/apk/release/app-release.apk
```

**APK ligero (solo arm64-v8a, ~25 MB)** — para repartir/probar rápido. En
`android/app/build.gradle`, dentro de `android { }`, se agregó:

```gradle
splits {
    abi { enable true; reset(); include "arm64-v8a"; universalApk false }
}
```

Luego:
```bash
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
# → android/app/build/outputs/apk/release/app-arm64-v8a-release.apk
```

> El APK **de release** empaqueta el JS adentro y corre solo (sin Metro). El de
> **debug** necesita `npx expo start` corriendo. Para la demo, usa el release.

> Requiere `expo-asset` instalado (`npx expo install expo-asset`) para que el
> bundle de release funcione.

## Firma — snippet para `android/app/build.gradle`

Después del `prebuild`, dentro del bloque `android { ... }`:

```gradle
signingConfigs {
    release {
        storeFile file(LECROBELLE_UPLOAD_STORE_FILE)
        storePassword LECROBELLE_UPLOAD_STORE_PASSWORD
        keyAlias LECROBELLE_UPLOAD_KEY_ALIAS
        keyPassword LECROBELLE_UPLOAD_KEY_PASSWORD
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        // ...resto igual
    }
}
```

## Versionado (cada release a Play)

En `app.json`:
- `expo.version` — versión visible (ej. `1.0.1`).
- `expo.android.versionCode` — **entero que DEBE subir** en cada release (1 → 2 → 3…).

Luego `npm run prebuild` y `npm run build:aab` de nuevo.

## Pendientes conocidos (v1 → v2)

- **Stripe** para el pago real en "Comprar".
- **react-native-maps** con coordenadas reales en "Ubicación".
- Reglas Firestore: dar acceso de lectura a `rewardItems` / `products` para
  clientes, y limitar cada cliente a su propia ficha.
- Notificaciones push (expo-notifications).
- Íconos e imágenes definitivos en `src/assets/`.
