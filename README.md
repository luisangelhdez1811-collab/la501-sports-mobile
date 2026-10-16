# La 501 Sports — App Móvil

App móvil (Expo / React Native) del **Sistema Integral Multiplataforma para el Restaurante La 501 Sports**.
La plataforma web vive en [la501-sports-web](https://github.com/luisangelhdez1811-collab/la501-sports-web).

[![CI/CD](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/actions/workflows/ci-cd.yml/badge.svg?branch=develop)](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/actions/workflows/ci-cd.yml)

---

## 1. Ramas (GitFlow)

| Rama | Propósito | ¿Push directo? |
|---|---|---|
| `main` | Producción estable. Cada cambio genera un tag `vX.Y.Z` y el `.aab` para Play Store. | ❌ Solo PR desde `release` |
| `release` | Preparación: pruebas de regresión con el APK y ajuste de versión. | ✅ Solo ajuste de versión / correcciones menores |
| `develop` | Integración de funcionalidades. Rama por defecto. | ❌ Solo PR desde `feature/*` |
| `feature/*` | Una funcionalidad (`feature/login`, `feature/pagos`). | ✅ Tu rama de trabajo |

Todo PR a `develop` o `main` necesita **1 aprobación del compañero** y el check **Pruebas** en verde (en `main` también **Versión**).

```
feature/x ──PR──► develop ──PR──► release (APK de prueba) ──PR──► main (tag + .aab)
```

---

## 2. Flujo diario

**Terminal**

```bash
git switch develop && git pull origin develop
git switch -c feature/mi-funcionalidad
# ... trabajar ...
git add .
git commit -m "feat: descripción del cambio"
git push -u origin feature/mi-funcionalidad
```

**VS Code**

1. Clic en el nombre de la rama (abajo a la izquierda) → `develop` → **⋯ → Pull**.
2. Clic otra vez en la rama → **+ Create new branch...** → `feature/mi-funcionalidad`.
3. Panel **Source Control** (`Ctrl+Shift+G`): escribir el mensaje → **Commit** (si pregunta, *Yes* para preparar todos los cambios).
4. **Publish Branch**.
5. Con la extensión **GitHub Pull Requests**: **Create Pull Request** → base `develop`.

Después: el compañero revisa y aprueba → con el check en verde → **Merge pull request** → borrar la rama.

Formato de commits: `feat`, `fix`, `refactor`, `style`, `test`, `docs`, `chore`, `ci` + `: descripción en minúsculas`.

---

## 3. Publicar una versión

1. PR **develop → release** y fusionar → el pipeline compila un **APK de prueba** (*Actions → Artifacts*) para instalar en el celular.
2. En `release`, subir `expo.version` en `app.json` (ej. `1.1.0`) y actualizar `CHANGELOG.md`:
   ```bash
   git switch release && git pull origin release
   git commit -am "chore: preparar versión 1.1.0"
   git push origin release
   ```
3. PR **release → main** (el check **Versión** valida que el número sea nuevo).
4. Al fusionar, el pipeline crea el tag `v1.1.0` y el **Release** con el `.aab` firmado, listo para Google Play Console.
5. PR **release → develop** para sincronizar.

El `versionCode` de Android lo incrementa EAS automáticamente (`autoIncrement` en `eas.json`).

---

## 4. CI/CD

Archivo: `.github/workflows/ci-cd.yml`

| Evento | Qué hace |
|---|---|
| Push / PR a `develop`, `release`, `main` | `npm ci` → `expo lint` → `tsc --noEmit` → `npm test` (Jest) |
| PR a `main` | Además verifica que la versión sea nueva |
| Push / merge a `release` | EAS Build perfil `preview` → **APK** de prueba |
| Push / merge a `main` | EAS Build perfil `production` → **AAB** firmado + tag + Release |

Pruebas: `__tests__/unit` (validaciones, parseo, horarios) y `__tests__/integration` (cliente de API, inicio de sesión y almacenamiento seguro con `fetch` simulado).

### Configuración única (dueño del repositorio)

1. **Credenciales de firma**: la primera compilación se hace una vez desde la computadora, de forma interactiva, para que EAS genere y guarde el keystore:
   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest build --platform android --profile production
   ```
   (Responder **Yes** a *Generate a new Android Keystore?*).
2. **EXPO_TOKEN**: en [expo.dev](https://expo.dev) → *Account settings → Access tokens* → crear token.
   En GitHub: *Settings → Secrets and variables → Actions → New repository secret* → nombre `EXPO_TOKEN`.

Sin `EXPO_TOKEN` las pruebas siguen funcionando; solo se omite la compilación del APK/AAB.

---

## 5. Instalación local

```bash
git clone https://github.com/luisangelhdez1811-collab/la501-sports-mobile.git
cd la501-sports-mobile
git switch develop
npm install
npx expo start
```

Comandos útiles: `npm test`, `npx expo lint`, `npx tsc --noEmit`.

---

**Equipo:** Luis Angel Hernández Hernández (@luisangelhdez1811-collab) · @AlanGomez0605
