# Pruebas de caja negra (E2E) y seguimiento de errores

Pruebas funcionales hechas como las haría un usuario, sin ver el código. Las automatizadas
están en [`.maestro/`](../.maestro) y corren en un emulador Android en cada Pull Request
hacia `release` y `main` ([`release-android.yml`](../.github/workflows/release-android.yml)).

## Cómo ejecutarlas

```bash
# Release (como en Google Play): APK ofuscado con R8
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease && cd ..
adb install -r android/app/build/outputs/apk/release/app-release.apk
maestro test .maestro -e MESERO_EMAIL=... -e MESERO_PASSWORD=...

# Debug: con el servidor de desarrollo
npx expo run:android
maestro test .maestro --exclude-tags=mesero
```

Sin cuenta de mesero se agregan `--exclude-tags=mesero`. Ninguna prueba crea pedidos ni cobros.

## Matriz de pruebas

**Tipo:** A = automatizada con Maestro, M = manual.
**Estado:** ✅ pasa · ❌ falla · ⏳ pendiente de ejecutar. Se actualiza en cada versión.

| ID | Caso | Tipo | Pasos | Resultado esperado | Debug | Release |
|---|---|---|---|---|---|---|
| CP-01 | Abrir la app | A | Abrir sin sesión | Aparece «Arma tu pedido» con las categorías | ⏳ | ⏳ |
| CP-02 | Ver y agregar un platillo | A | Hamburguesas → Agregar → «Agregar al pedido» | Ficha con descripción; aparece «Ver tu orden» | ⏳ | ⏳ |
| CP-03 | Validación del inicio de sesión | A | Cuenta → Iniciar sesión → Entrar vacío; luego sin contraseña | «Escribe un correo electrónico válido.» y «Escribe tu contraseña.» | ⏳ | ⏳ |
| CP-04 | Mesero: mesas y cuentas | A | Iniciar sesión de mesero → Mesa 1 → buscar «agua» → Cuentas | Mapa de mesas, pestañas «Tomar pedido» y «Cuentas»; la búsqueda solo muestra bebidas «Agua…» | ⏳ | ⏳ |
| CP-05 | Pedido del mesero sin internet | M | Modo avión → Mesa → agregar platillo → «Guardar pedido» → quitar modo avión | El pedido se guarda en el teléfono y se envía solo al volver la red | ⏳ | ⏳ |
| CP-06 | Cobro sin internet bloqueado | M | Modo avión → Cuentas → Cobrar | «Sin conexión: para cobrar necesitas internet»; botón deshabilitado | ⏳ | ⏳ |
| CP-07 | Cobro por persona | M | Mesa con 2 comensales → Cuentas → «Cobrar a Persona 1» | Solo se cobra esa cuenta; la otra sigue abierta | ⏳ | ⏳ |
| CP-08 | Reabrir la app sin internet (mesero) | M | Cerrar la app → modo avión → abrir | Sigue la sesión y se ven las mesas guardadas | ⏳ | ⏳ |
| CP-09 | Administrador | M | Iniciar sesión de admin | Panel con ventas y desempeño de meseros, sin error 500 | ⏳ | ⏳ |
| CP-10 | Ofuscación del APK | A | `node scripts/analizar-apk.mjs app-release.apk` | Reporte «Aprobado»: clases ofuscadas, bytecode de Hermes y sin secretos | — | ⏳ |

## Bitácora de errores encontrados y corregidos

| ID | Fecha | Dónde | Error | Causa | Corrección | Verificado |
|---|---|---|---|---|---|---|
| ERR-01 | 2026-10-16 | Release (Hostinger) | Admin y mesero: «El servidor tuvo un error (código 500)» | Laravel no encontraba el middleware de rol (`Target class [role.admin] does not exist`) aunque `bootstrap/app.php` ya lo registraba: caché o autoload desactualizados en el servidor | `composer dump-autoload` y `php artisan optimize:clear` en Hostinger | Pendiente: confirmar con CP-09 |
| ERR-02 | 2026-10-17 | Release | Un pedido podía darse por enviado aunque el servidor respondiera una página HTML (filtro de seguridad) | La app aceptaba cualquier respuesta 200 | La app exige `success: true`; la API responde JSON 403 cuando el filtro bloquea | Prueba de integración «una respuesta que no confirma el registro…» |
| ERR-03 | 2026-10-21 | Release | El mesero no podía cobrar ni separar cuentas | El servidor aún no tenía la API de pedidos por comensal y la app bloqueaba el cobro | La app cobra la mesa completa con el servidor anterior; se documentó el despliegue de la API nueva | Prueba «con un servidor sin pedidos por persona, cobra la mesa completa» |
| ERR-04 | 2026-10-21 | Release | Buscar «agua» mostraba burritos | La búsqueda incluía la descripción («aguacate») | Búsqueda por nombre y categoría desde el inicio de cada palabra | `test/modelos/menu-search.test.ts` y CP-04 |
| ERR-05 | 2026-10-21 | Release | Al reabrir la app sin internet, el mesero perdía la sesión y las mesas | Sin «Mantener sesión iniciada» el token no se guardaba | La sesión del mesero siempre se conserva | CP-08 |
| ERR-06 | 2026-10-21 | Release | Cobros guardados sin conexión podían no coincidir con la caja | Se permitía cobrar sin internet | El cobro requiere conexión; los pedidos siguen funcionando sin ella | `test/casos-de-uso/waiter-outbox.test.ts` y CP-06 |
| ERR-07 | 2026-10-21 | Dependencias | npm audit: vulnerabilidad crítica en `shell-quote` | Versión vulnerable en `react-devtools-core` | Actualización a 1.12.0 | Workflow «Seguridad» |

Los errores de Release que lleguen de los usuarios se registran aquí con su ID. Si traen un
stack trace de Java/Kotlin ofuscado, se lee con el `mapping.txt` que guarda el workflow
(artefacto `apk-release`): `retrace mapping.txt stacktrace.txt`.
