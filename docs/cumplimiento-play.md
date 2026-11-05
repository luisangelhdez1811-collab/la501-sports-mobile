# Cumplimiento y publicación en Google Play

Qué declarar en Play Console, cómo se genera el `.aab` y qué falta antes de publicar.
Actualiza este archivo cada vez que agregues un permiso, un SDK o un dato nuevo: lo que
declares en Play Console debe coincidir con lo que hace la app y con el Aviso de Privacidad.

Última revisión: 5 de noviembre de 2026.

**Estado de la web (5 nov 2026):** la rama `fix/cumplimiento-pagos-y-privacidad` de
la501-sports-web ya trae B-01, B-03, B-06, B-10 a B-17, B-24, B-26, B-29, B-33 y `to_serve`
para el mesero; las promociones ya mandan `end_date`. Todavía no está en `develop` ni en el
servidor. En el API faltan B-25 y B-28 (`alcohol.legend`, `alcohol.sales_open`), las
`conditions` de B-27, B-32 (`legal.*_version`, `legal_update_required`, `/accept-legal`),
B-34 (`invoice`) y `payments.card_enabled`: ahí la app usa sus valores de respaldo. Los
textos de B-18, B-21 y B-22 hay que compararlos a mano con la web.

## Estado de los cambios de la app (M-01 a M-26)

«Hecho en la app» significa programado y con pruebas automáticas. Ninguno cuenta como
terminado hasta probarlo en un teléfono contra el servidor desplegado con su parte del back.

| ID | Cambio | En la app | Depende del back |
|---|---|---|---|
| M-01 | Copia de datos completa como archivo `.json` | Hecho | B-13 `GET /app/account/export` (hoy no existe: la app muestra error) |
| M-02 | Foto de perfil igual a la web y editable | Hecho | B-16 `POST/DELETE /app/account/avatar` (hoy no existe) |
| M-03 | No duplicar pedidos (`client_ref`) | Hecho | B-03 (hoy el servidor ignora el folio) |
| M-04 | Pago con tarjeta: el carrito se queda hasta que se confirma | Hecho | B-01 webhook de Mercado Pago |
| M-05 | Costo del envío: informar y pedir aceptación | Hecho (texto de respaldo) | B-11, B-17 `delivery.fee_note` |
| M-06 | Bebidas con alcohol: mayoría de edad | Hecho (por categoría) | B-11, B-17 `alcoholic` |
| M-07 | Notas: 100 caracteres y consentimiento de salud | Hecho | B-11 |
| M-08 | Ingredientes excluidos por nombre | Hecho | B-06 |
| M-09 | Ejemplo de notas sin extras con costo | Hecho | — |
| M-10 | Seguimiento: cancelar, estados en español, «Confirmado» | Hecho | B-12, B-24 (`can_cancel`, `/cancel`) |
| M-11 | Registro: mayoría de edad y sin pregunta secreta | Hecho | **B-15: hoy el servidor exige la pregunta secreta; salen el mismo día** |
| M-12 | Textos legales iguales a la web | Provisional | B-18: copiar el texto final y la misma fecha |
| M-13 | Dirección real, aviso en Reservar, sin superlativos | Hecho | B-21, B-22 (la web aún usa las frases viejas y la dirección vieja) |
| M-14 | Contraste AA | Hecho: textos con `colors.accent/success/warning/danger`; las etiquetas de estado usan texto normal y el color solo en el borde | — |
| M-15 | `tsc` sin errores por CSS | Hecho | — |
| M-16 | Presentaciones y opciones del menú nuevo | Hecho (rama `feature/menu-nuevo`) | Ya en producción |
| M-17 | Este documento y Play Console | Este documento | URL `/eliminar-cuenta` (B-17) |
| M-18 | Leyenda de alcohol y «Venta solo a mayores de 18 años» | Hecho: ficha, promociones, carrito y checkout; sin recomendar alcohol en el carrito; sin juntar bebidas y deporte en Quiénes somos | B-25 `alcohol.legend`, `alcoholic` en promociones (hoy: leyenda de respaldo) |
| M-19 | Puntos y logros | Hecho: «Por ahora los puntos no se pueden canjear», enlace a las reglas, aviso de que se pierden al eliminar la cuenta; la app no tiene nada de `fan_bar` | B-26 `loyalty` (quitar el logro `fan_bar` es del back) |
| M-20 | Vigencia y condiciones de promociones | Hecho: «Válida hasta…», condiciones antes de «Aprovechar», vencidas ocultas | B-27 `ends_at`, `conditions` |
| M-21 | Datos del proveedor antes de pagar | Hecho: en el checkout y en el seguimiento, con respaldo igual a los Términos | B-29 `provider` (falta el RFC del dueño) |
| M-22 | Aceptar versiones nuevas del Aviso y los Términos | Hecho: pantalla que no se puede saltar, reintento del checkout con `409`, versiones en el registro, `version` en `legal.ts` | B-32 `legal_update_required`, `/account/accept-legal`, `legal.*_version` |
| M-23 | Venta de alcohol cerrada | Hecho: «Agregar» desactivado, aviso y «Quitar bebidas con alcohol» en carrito y checkout, `422 alcohol_sales_closed` | B-28 `alcohol.sales_open` (hoy: abierta) |
| M-24 | Quitar promociones por SMS | Hecho: sin interruptor, sin `promoSms`, sin SMS en el Aviso | B-33 (que el servidor deje de exigir `promos_sms`) |
| M-25 | Cómo pedir factura | Hecho: «¿Necesitas factura?» en pedidos entregados, folio seleccionable y correo prellenado | B-34 (texto y correo; hoy: respaldo) |
| M-26 | Datos guardados en el teléfono | Hecho: al cerrar sesión o eliminar la cuenta se borran perfil, carrito, folio, copias de «Mis datos» y caché de imágenes; sesión en SecureStore; `allowBackup: false`; sin `console` en producción | — |

### Campos que la app ya lee y no están en el contrato

Hay que agregarlos al documento del back y al de la app (o cambiar el nombre aquí):

- `payments.card_enabled` en `/public/info`: apaga la tarjeta sin publicar otra versión.
- `invoice.instructions` e `invoice.email` en `/public/info`: cómo pedir factura (M-25). El
  contrato solo dice «el texto y el correo que defina el back».


## Cómo se genera el `.aab` (disparador de GitHub)

Ya está en [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml). En cada push a
`main` (después de pasar `develop` → `release` → `main`):

1. Corre lint, `tsc` y Jest.
2. Compila el `.aab` en EAS con el perfil `production` (el `versionCode` lo sube EAS solo).
3. Lo adjunta al Release `vX.Y.Z` que creó release-please.
4. Si existe la variable `PLAY_SUBMIT = true`, lo envía a Play Console como borrador en la
   prueba cerrada (`eas.json` → `submit.production`).

Para que funcione falta, una sola vez:

- [ ] Secreto `EXPO_TOKEN` en GitHub (expo.dev → Access tokens). Sin él, el workflow avisa
      y no compila.
- [ ] Secreto `RELEASE_TOKEN` (para release-please).
- [ ] Llave de firma de Android en EAS: correr `npx eas-cli@latest credentials` (o un
      primer `eas build -p android --profile production` interactivo) para que EAS genere
      y guarde la llave. Con `--non-interactive`, el workflow falla si no existe.
- [ ] **El primer `.aab` se sube a mano** en Play Console (Prueba cerrada → Crear versión):
      Google no deja que la API cree la primera versión de una app.
- [ ] Para los envíos automáticos: cuenta de servicio de Google con acceso a la app,
      su llave cargada en EAS (expo.dev → Credentials → Google Service Account) y la
      variable `PLAY_SUBMIT = true` en GitHub.

## Prueba de cobro de $1 con tarjeta

Antes de publicar se hace un cobro **real** de $1 con Mercado Pago en producción:

1. El back crea un producto temporal de $1, oculto en la carta (o una promoción de $1),
   y confirma que el webhook (B-01) está configurado.
2. Desde la app instalada (versión release) se pide ese producto con tarjeta real.
3. Debe pasar: la página de Mercado Pago se abre en el navegador del sistema → pago
   aprobado → el seguimiento cambia a «Confirmado» → el carrito se vacía → el pedido
   aparece en el panel. Después se cancela desde el seguimiento y se revisa que la
   devolución llegue (`refund_status`).
4. **Si algo falla**, se apaga la tarjeta sin publicar otra versión: el back responde
   `payments.card_enabled: false` en `/public/info` y la app solo ofrece efectivo
   («No disponible por ahora»). Si el back aún no tiene ese campo, se cambia
   `CARD_PAYMENTS_ENABLED` a `false` en [`src/config/api.ts`](../src/config/api.ts) y se
   compila otra versión.

`payments.card_enabled` es un campo nuevo que no está en el contrato de la API: hay que
agregarlo al documento del back y al de la app antes de usarlo.

## Prueba cerrada: 12 testers durante 14 días

Las cuentas personales de Play Console deben tener una prueba cerrada con **al menos 12
testers que la acepten y la mantengan instalada 14 días seguidos** antes de pedir el acceso
a producción.

1. Play Console → Pruebas → Prueba cerrada → crear el track (EAS envía al track `alpha`).
2. Testers: una lista de correos de Gmail (mínimo 12; conviene 15 por si alguno no la acepta).
3. Compartir el enlace de suscripción; cada tester lo acepta e instala la app desde Play.
4. Los 14 días cuentan con al menos 12 testers suscritos todo ese tiempo: pídeles que no
   se salgan de la prueba ni desinstalen la app. Subir versiones nuevas durante la prueba
   está permitido.
5. Al terminar, Play Console → Panel → «Solicitar acceso a producción» y responder el
   cuestionario sobre la prueba.

Los testers instalan la versión con el servidor de producción: usen pedidos en efectivo y
cancélenlos, o avisen al restaurante.

## Nivel de API de destino

Desde el 31 de agosto de 2026 las apps nuevas y las actualizaciones deben apuntar a
Android 16 (API 36). Expo SDK 57 compila con `targetSdk = 36` (se ve en el log de
compilación); no lo bajes con `expo-build-properties`. Confírmalo en Play Console →
Explorador de app bundle.

## Permisos

El `.aab` no debe pedir cámara, micrófono, almacenamiento ni ubicación. En
[`app.json`](../app.json):

- `expo-image-picker` con `cameraPermission: false` y `microphonePermission: false`: la
  foto de perfil se elige con el selector de fotos de Android (Photo Picker), que no pide
  permisos.
- `android.blockedPermissions` quita del manifiesto: `CAMERA`, `RECORD_AUDIO`,
  `READ/WRITE_EXTERNAL_STORAGE`, `READ_MEDIA_IMAGES/VIDEO/AUDIO`,
  `READ_MEDIA_VISUAL_USER_SELECTED`, `ACCESS_FINE/COARSE_LOCATION`, `SYSTEM_ALERT_WINDOW`
  (solo lo usa el menú de desarrollo; la build de desarrollo lo conserva) y
  `RECEIVE_BOOT_COMPLETED` (la app no programa avisos a futuro).
- También quita los que agregan las librerías y la app no usa: `USE_BIOMETRIC` y
  `USE_FINGERPRINT` (`expo-secure-store`; la sesión no se protege con huella),
  `com.google.android.c2dm.permission.RECEIVE` y `WAKE_LOCK` (Firebase push; los avisos son
  locales), `BIND_GET_INSTALL_REFERRER_SERVICE` (`expo-application`), `ACCESS_WIFI_STATE`
  y los permisos de contador en el ícono de cada fabricante (Samsung, Huawei, Sony, Oppo,
  HTC…).
- `expo-notifications` agrega `POST_NOTIFICATIONS`: Android 13+ pregunta al usuario. La app
  lo pide al confirmar un pedido (cliente) y al abrir las mesas (mesero).

Permisos que quedan (comprobado el 4 de noviembre de 2026 en la app instalada, con
`adb shell dumpsys package com.la501.sports`): `INTERNET`, `ACCESS_NETWORK_STATE` (saber si
hay conexión), `VIBRATE`, `POST_NOTIFICATIONS` y `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`
(interno de Android, no se le pide al usuario). La build de desarrollo además trae
`SYSTEM_ALERT_WINDOW`, que la de producción no lleva.

`npx expo config --type introspect` **no** muestra los permisos que agregan las librerías
al compilar: revísalos siempre en la app instalada o en el Explorador de app bundle.

### Notificaciones

Son **locales**: el teléfono revisa el pedido (cliente, cada 30 s) o las mesas (mesero,
cada 20 s) y crea el aviso. No hay servidor de push, no se pide un token del dispositivo y
no salen datos del teléfono, así que en «Seguridad de los datos» **no cambia nada**
(identificadores: No). Funcionan con la app abierta o recién minimizada; con la app
cerrada no llegan.

- **Mesero** (solo con sesión de mesero): «Mesa 5: listo para entregar» cuando cocina o
  barra terminan algo de una de sus mesas.
- **Cliente** (con cuenta o sin ella): un solo aviso, «Tu pedido va en camino», la primera
  vez que el pedido aparece fuera de cocina (estado `ready` o `delivering`).

Para avisos con la app cerrada hace falta push (Firebase Cloud Messaging
y que el back mande el aviso), y entonces sí hay que declarar «ID del dispositivo».

Después de cada build, revisa los permisos en el Explorador de app bundle. Si aparece uno
de estos, revisa `blockedPermissions` antes de subir.

## Seguridad de los datos

- ¿Recopila datos? **Sí**. ¿Los comparte? **No**: Hostinger, Mercado Pago, Twilio, Pusher
  y Cloudinary son proveedores que actúan por cuenta del restaurante; Google no lo cuenta
  como compartir.
- ¿Cifrado en tránsito? **Sí**: solo HTTPS (el cliente rechaza `http://`) y certificate
  pinning ([`docs/seguridad-sesion.md`](seguridad-sesion.md)).
- ¿El usuario puede pedir que se borren sus datos? **Sí**: desde la app (Mis datos →
  Cancelación) y en `https://<dominio>/eliminar-cuenta`.

| Tipo de dato | ¿Se recopila? | Obligatorio | Para qué |
|---|---|---|---|
| Nombre | Sí | Sí | Funcionalidad, administración de la cuenta |
| Correo electrónico | Sí | Cuenta: sí · Pedido: opcional | Cuenta, avisos del pedido, promociones (si autoriza) |
| Número de teléfono | Sí | Sí | Pedido y verificación por SMS |
| Dirección | Sí | Sí en pedidos a domicilio | Entrega |
| Fotos | Sí | No | Foto de perfil |
| Historial de compras | Sí | Sí | Funcionalidad, puntos y recomendaciones (se pueden apagar) |
| Información de salud | Solo si la escriben en notas | No | Preparar el pedido de forma segura |
| Otro contenido (notas) | Sí | No | Funcionalidad |
| Información de pago | **No** (la captura Mercado Pago en su página) | — | — |
| Ubicación | **No** en la app | — | — |
| Identificadores, analítica, publicidad | **No** | — | — |

## Clasificación, público y acceso

- **Cuestionario de clasificación (IARC):** di la verdad: la app vende y muestra bebidas
  alcohólicas.
- **Público objetivo:** solo 18 años o más. No marques rangos de menores.
- **Acceso a la app:** la app tiene pantallas de personal (mesero, administrador) y de
  cliente con sesión. Da a Google un usuario de cliente de prueba (lo crea el back) y
  explica que las pantallas de personal son de uso interno.
- **Política de privacidad:** URL pública del Aviso en la web
  (`https://<dominio>/aviso-de-privacidad`).
- **Ficha de la tienda:** sin imágenes que inviten a beber en exceso ni con menores y
  alcohol. Agrega: «Venta de bebidas alcohólicas solo a mayores de 18 años. Se solicita
  identificación al entregar». Sin superlativos que no puedas probar («la mejor app»,
  «el mejor restaurante»).
- **Pagos:** la comida y la bebida son bienes físicos, por eso se cobran con Mercado Pago
  y no con la facturación de Google Play. Está permitido; no lo cambies.

## Lista final antes de subir a Play Console

- [ ] El back terminó sus P0 y desplegó el contrato de la API.
- [ ] M-01 a M-26 terminados y probados en un teléfono real contra ese servidor.
- [ ] `npx jest`, `npx tsc --noEmit` y `npx expo lint` limpios.
- [ ] El `.aab` apunta a API 36 y no pide permisos de cámara, micrófono, almacenamiento ni ubicación.
- [ ] Cobro real de $1 aprobado y devuelto (o la tarjeta apagada).
- [ ] Seguridad de los datos, clasificación IARC, público 18+, acceso a la app y URL de eliminación llenos.
- [ ] Textos legales iguales a la web y con la misma fecha.
- [ ] Este documento actualizado.
