# Assets de la app

Faltan los archivos de imagen definitivos. Antes de `npm run prebuild` /
build, coloca aquí:

| Archivo | Tamaño | Uso |
|---|---|---|
| `icon.png` | 1024×1024 | Ícono de la app (todas las plataformas) |
| `adaptive-icon.png` | 1024×1024 | Ícono adaptable Android (el cisne centrado, fondo transparente; el fondo #0d0d0f lo pone `app.json`) |
| `splash.png` | ~1284×2778 | Pantalla de carga (cisne centrado sobre #0d0d0f) |

**Diseño sugerido (según la propuesta de Cloudancy):**
- Ícono **Opción 1**: cisne blanco/crema sobre fondo negro (#0d0d0f).
- Ícono **Opción 2**: cisne negro sobre fondo claro.

El logo del cisne ya está vectorizado en `src/components/Swan.tsx` — se puede
exportar a PNG en los tamaños de arriba, o usar el arte oficial de la marca.

Mientras no existan, `expo prebuild` fallará; para solo hacer `typecheck` no
hacen falta.
