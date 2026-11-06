# Protección de datos personales y derechos ARCO

Cómo cumple la app la Ley Federal de Protección de Datos Personales (LFPDPPP) y la política
de eliminación de cuentas de Google Play.

| Derecho / requisito | Pantalla en la app | Endpoint (API v1) | Pruebas |
|---|---|---|---|
| Consentimiento explícito | Registro: casillas **sin marcar** «Acepto los Términos y el Aviso de privacidad» (obligatoria) y «Quiero recibir promociones» (opcional) | `POST /app/auth/register` guarda la fecha de aceptación (`aviso_privacidad_aceptado_at`) | — |
| Aviso de privacidad | «Aviso de privacidad» (registro, Mis datos, Configuración) | Página web `/aviso-de-privacidad` | Prueba web «aviso de privacidad» |
| **A**cceso | Mis datos → **A**: datos del titular y «Descargar una copia» (JSON) | `GET /app/profile` | `cuenta-privacidad.test.ts`, `ArcoPrivacidadTest` |
| **R**ectificación | Mis datos → **R**: nombre y correo; teléfono con código SMS | `PUT /app/profile` · `PUT /app/account/phone` | `cuenta-privacidad.test.ts`, `ArcoPrivacidadTest` |
| **C**ancelación | Mis datos → **C**: «Eliminar mi cuenta» (pide contraseña y escribir ELIMINAR) | `DELETE /app/account` | `ArcoPrivacidadTest` |
| **O**posición | Mis datos → **O**: switches de opt-out (abajo) | `GET/PUT /app/profile/privacy` | `cuenta-privacidad.test.ts`, `ArcoPrivacidadTest` |
| Eliminación fuera de la app (Google Play) | Sitio web → Configuración → Eliminar cuenta | `DELETE /configuracion` | — |

## Switches de Oposición

| Switch | Por defecto | Qué cambia al apagarlo |
|---|---|---|
| Promociones y ofertas por correo | Lo que eligió al registrarse | Se borra de la lista de correos de promociones |
| Promociones por SMS | **Apagado** (solo se envían si lo enciende) | No recibe ofertas por SMS. Los códigos de verificación y los avisos de pedidos siempre llegan |
| Recomendaciones según mis pedidos | Encendido | El servidor ya no usa su historial de pedidos: el carrito muestra «Popular entre nuestros visitantes» |

Cada cambio queda fechado en `users.preferencias_privacidad_at` y en el log del servidor
como evidencia.

## Datos que se guardan en el teléfono

- **Sesión:** el token se guarda cifrado en el Keystore de Android / Keychain de iOS
  (`expo-secure-store`), nunca en texto plano.
- **Perfil básico y caché sin conexión:** menú, carrito y, para meseros, mesas y pedidos sin
  enviar. Se guardan en la carpeta privada de la app y el perfil se borra al cerrar sesión.
- **Datos de pago:** la app no guarda ninguno.

Para la sección **Seguridad de los datos** de Google Play Console:

- URL de eliminación de cuenta: `https://<dominio>/configuracion`
- Política de privacidad: `https://<dominio>/aviso-de-privacidad`
