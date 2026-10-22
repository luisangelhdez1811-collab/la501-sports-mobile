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
release-please calcula la versión y el CHANGELOG a partir de estos mensajes (sección 3).

**git-flow / GitKraken (opcional)**: las ramas `feature/*` también se pueden crear con
[git-flow](https://github.com/petervanderdoes/gitflow-avh) (`git flow init -d`, `git flow feature start mi-funcionalidad`,
`git flow feature publish mi-funcionalidad`) o con **Git Flow → Start Feature** en GitKraken. Solo para features: no usar
*feature finish* ni *release start/finish*, porque intentan empujar directo a `develop`/`main`, que están protegidas.
Todo llega a `develop` y `main` por Pull Request.

---

## 3. Publicar una versión

Automatizado con [**release-please**](https://github.com/googleapis/release-please) (Google), **EAS Build** y
**EAS Submit** (Expo). La versión, el `CHANGELOG.md`, el tag y el Release **no se editan a mano**.

```
develop ──PR──► release ──(release-please abre su PR de versión)──► release ──PR──► main
                                package.json + app.json + CHANGELOG   tag + Release   AAB + Google Play + PR release → develop
```

1. **PR develop → release** con lo que se quiere publicar. Al fusionarlo, EAS compila el **APK de prueba**
   (*Actions → Artifacts*) para instalar en el celular.
2. **release-please abre (o actualiza) el PR "chore: preparar versión X.Y.Z"** hacia `release`: sube la versión en
   `package.json` y `app.json` (`feat` → MENOR, `fix` → PARCHE, `feat!` o `BREAKING CHANGE` → MAYOR; la primera
   versión es la 1.0.0) y agrega la sección al CHANGELOG. Revisarlo y **fusionarlo**: se crean el tag `vX.Y.Z` y el
   Release, y se abre solo el **PR release → main**.
3. **Aprobar el PR release → main** (checks **Pruebas** y **Versión** en verde). Al fusionarlo, EAS compila el
   `.aab` firmado, se adjunta al Release, se envía a Google Play si `PLAY_SUBMIT` está activado, y se abre el
   **PR release → develop**.
4. **Aprobar el PR release → develop**.

El `versionCode` de Android lo incrementa EAS automáticamente (`autoIncrement` en `eas.json`).

**Requisitos**
- Secreto `RELEASE_TOKEN`: token *fine-grained* (Settings personales → Developer settings) con acceso a este
  repositorio y permisos **Contents** y **Pull requests** en lectura y escritura. Según la documentación de
  release-please, lo creado con el token por defecto de Actions no dispara el pipeline ni las pruebas.
- **Envío a Google Play (EAS Submit)**, cuando exista la app en Play Console:
  1. Crear la cuenta de servicio de Google y cargar su llave JSON en [expo.dev](https://expo.dev) → proyecto →
     *Credentials → Android → Google Service Account Key* (así no se guarda en GitHub).
  2. En GitHub: *Settings → Secrets and variables → Actions → Variables* → `PLAY_SUBMIT` = `true`.
  3. Se envía a la **prueba cerrada** (`track: alpha`) en **borrador** (`releaseStatus: draft`), según
     `eas.json`. Cuando la app ya esté publicada, cambiar `releaseStatus` a `completed`.

---

## 4. CI/CD

Archivo: `.github/workflows/ci-cd.yml`

| Evento | Qué hace |
|---|---|
| Push / PR a `develop`, `release`, `main` | `npm ci` → `expo lint` → `tsc --noEmit` → `npm test` (Jest) |
| PR a `main` | Además verifica que release-please haya preparado la versión y que sea nueva para `main` |
| Push / merge a `release` | EAS Build perfil `preview` → **APK** de prueba · **release-please** (`release-please.yml`): PR de versión; al fusionarlo, tag + Release + PR release → main |
| Push / merge a `main` | EAS Build perfil `production` → **AAB** firmado → EAS Submit (opcional) → .aab al Release → PR release → develop |

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
