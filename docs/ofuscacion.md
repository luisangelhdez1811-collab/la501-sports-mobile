# Ofuscación de código (R8 / ProGuard) y anti-descompilación

## Configuración

El proyecto usa Continuous Native Generation de Expo: la carpeta `android/` se genera con
`npx expo prebuild` y no se edita a mano. R8 se activa en [`app.json`](../app.json) con el
plugin `expo-build-properties`:

```json
"android": {
  "enableMinifyInReleaseBuilds": true,
  "enableShrinkResourcesInReleaseBuilds": true,
  "extraProguardRules": "-keepattributes SourceFile,LineNumberTable\n-renamesourcefileattribute SourceFile"
}
```

Al generar el proyecto, eso queda en `android/app/build.gradle` (compilación Release):

```gradle
release {
    shrinkResources enableShrinkResources.toBoolean()   // true
    minifyEnabled enableMinifyInReleaseBuilds            // true
    proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
}
```

- **minifyEnabled**: R8 elimina el código que no se usa y renombra clases, métodos y campos
  (`a`, `b`, `c`…).
- **shrinkResources**: quita imágenes y recursos que no se usan.
- **Reglas propias** (`proguard-rules.pro`): conservan solo el número de línea, sin el
  nombre real del archivo, para poder leer los errores de Release con el `mapping.txt`.
  Las reglas `-keep` de React Native y Expo vienen dentro de cada librería.
- **Código de la app (JavaScript)**: se compila a **bytecode de Hermes**. Dentro del APK no
  queda como JavaScript legible.

El workflow [`release-android.yml`](../.github/workflows/release-android.yml) revisa que
`minifyEnabled` y `shrinkResources` estén activos antes de compilar.

## Prueba de descompilación (JADX)

```bash
node scripts/analizar-apk.mjs android/app/build/outputs/apk/release/app-release.apk reporte.md \
  android/app/build/outputs/mapping/release/mapping.txt
```

Resultado de la primera compilación Release (2026-10-22, APK de 44.8 MB):

| Medida | Resultado |
|---|---|
| Clases renombradas por R8 (`mapping.txt`) | 19 733 de 20 878 (95 %) |
| Clases propias con su nombre original | `MainActivity`, `MainApplication`, `R` (las exige Android) |
| Código de la app | Bytecode de Hermes (3.5 MB), no JavaScript legible |
| Secretos en el APK | Ninguno |
| Resultado | ✅ Aprobado |

Esa compilación usó además `-repackageclasses ''` y `-allowaccessmodification`, que mueven
todas las clases ofuscadas a un solo paquete. Se quitaron de la configuración hasta probar la
app completa en un teléfono con ellas, porque pueden romper librerías que usan reflexión.

[`scripts/analizar-apk.mjs`](../scripts/analizar-apk.mjs) descompila el APK con
[JADX](https://github.com/skylot/jadx) y reporta:

1. Cuántas clases Java/Kotlin quedaron ofuscadas.
2. Si el código de la app es bytecode de Hermes (firma `c61fbc03c103191f`).
3. Si hay llaves privadas, tokens o contraseñas escritas dentro del APK.

En cada Pull Request a `release` o `main`, el reporte se publica en el resumen del workflow
y como artefacto `reporte-descompilacion`. El APK también se puede subir a
[MobSF](https://mobsf.github.io/docs/) para un análisis estático completo.
