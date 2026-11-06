# Changelog

## 1.0.0 (2026-11-06)


### Añadido

* cobros sin conexión y cobros por revisar en el desempeño de meseros ([c5a1196](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/c5a11967e11c6101ac3d61e3c0584b2e9f32f52e))
* compilación Release ofuscada con R8 y pruebas de caja negra con Maestro ([428f561](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/428f56154547de242e3218f8eeb111eb5f9574e2))
* **cumplimiento:** checkout, seguimiento, ARCO y permisos para publicar en Google Play ([dd3e917](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/dd3e917b04b6b2dcd04da66291058003cb1c77f4))
* **cumplimiento:** segunda revisión legal (M-18 a M-26) y contraste AA ([642219c](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/642219c2f1459c25bcfe2983e77f3cea80880520))
* derechos ARCO en /profile y switches de Oposición ([d7e1912](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/d7e191289a9dc3f084dc7639c6e7e4f058b41983))
* detalle del platillo al agregar, cuentas por persona y buscador por nombre ([1e7807d](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/1e7807d61f648f4da87b4f6c7dc006ba241b4f5f))
* flujo del mesero por comensal, cobro junto o por separado y modo sin conexión ([19d2465](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/19d246530dc667d6bfd8e30bf793c1ce303c1fbd))
* **menu:** presentaciones y opciones del menú nuevo; mesero con el diseño de la web ([d3dbd18](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/d3dbd18c7000601e0eeb112b43f9e6c99f216d8c))
* **notificaciones:** avisos en el teléfono al mesero y al cliente ([ed30ab0](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/ed30ab09da2dd042b56a670e6efa04d4f239e328))
* **pedido:** ticket igual al de la web y aviso de horario de servicio ([69766bb](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/69766bb343e67348760c78621ee8d81f3adcbf0c))
* primera versión de la app para el servidor v1.2.0 ([d4e3055](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/d4e3055fc31ed16e22ae67825ca9af150fab29f0))
* sesión con JWT Bearer, refresco por 401 y certificate pinning ([2d8d12d](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/2d8d12d48e1a1915d25bed0bfc50f451da0616b1))


### Corregido

* ajustes de la prueba en el teléfono ([55acc8c](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/55acc8cef5be86b5487eebe8216cd782b929a1f6))
* **api:** leer el horario de quejas y status_label como los manda la web; cancelar no borra el total ([b11afb8](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/b11afb8b61e57b5dd671d098262b3ae8329c9fae))
* **checkout:** reintentar el pago con tarjeta abre el enlace que manda el servidor ([52b6483](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/52b648319c0e73336d646ad7be1e1e203c4f5763))
* **deps:** actualizar Expo 57 y corregir shell-quote (vulnerabilidad crítica) ([7c90b25](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/7c90b25f39041d6df8a8ae57e8ea5542d739cdfa))
* el cobro del mesero requiere internet; los pedidos siguen funcionando sin conexión ([4167298](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/4167298ead5c630e1fbe09323fcc958f7f3dbfe8))
* **navegacion:** una sola copia de cada pantalla; iniciar sesión lleva al menú ([d59b9e1](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/d59b9e1dc3a2a64fea20b265e72abbf2d552aa92))
* **notificaciones:** un solo aviso al cliente, «Tu pedido va en camino», al salir de cocina ([c55ceac](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/c55ceac727ed9db3d54491c38a6b0b0ffb57b9ce))
* **pedido:** cargar la impresión al tocar el botón ([0660193](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/0660193a257053ecfe6ee4f4737210662e7a0426))
* **perfil:** achicar la foto antes de subirla ([59fd73c](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/59fd73c2dc798628eca4c86066f96cd33f3d6c17))
* **perfil:** achicar la foto antes de subirla ([74e7737](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/74e7737632721317131f1a824cd6472271a3d1d1))
* **perfil:** foto en cuadro de 512 px y mensaje más corto ([a72b5df](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/a72b5dfde17226a5144923cfb10ffac27d6644b7))
* **permisos:** bloquear permisos que agregan las librerías y la app no usa ([26eb422](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/26eb42235b1e6867856166126c3a093e7609670d))
* primera versión solo en efectivo; el aviso del pedido es con la app abierta ([c55fab1](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/c55fab1a2a168b70d424a54ee352043ac8310664))
* **red:** usar el fetch de React Native para que la foto suba y el pinning se aplique ([eabbbc5](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/eabbbc503d00ffbeeb518d46baf6a5f76d8d8641))
* subir la foto de perfil y mostrar el mapa en la app ([a209a82](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/a209a82da78d58566f7dab58a2e5deca5467dd41))
* **ubicacion:** abrir Apple Maps por https ([91bd0de](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/91bd0dec7244b9fea74826ea10dbb39e3b4dd5d6))
* **ubicacion:** mostrar el mapa dentro de la app y abrir la app de mapas ([e52c109](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/e52c10985a2c53865ead33d33e2831da4a382c8a))


### Rendimiento

* **menu:** fotos sin fundido si vienen en la app y listas más ligeras ([c16a3c1](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/c16a3c1dc67e37b4d62079195a10d5ef461a6183))


### Cambios internos

* Clean Architecture con capa de dominio, fronteras en ESLint y pruebas por patrón ([b57b764](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/b57b764798a5edc10cf2c531b2aea3c00f0918ff))
* Clean Architecture con capa de dominio, fronteras en ESLint y pruebas por patrón ([fb2cb3f](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/fb2cb3f414000e0d02b0c51997a3be185c6164d5))
* lógica de la mesa y del cobro en hooks; capas más estrictas ([dd4920f](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/dd4920f1a1045fd2efea6e5928507f6ae362571b))
* **mvvm:** las vistas ya no llaman a la API ni a los datos ([5eabee6](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/5eabee6db3788dd35002d9c4515a22279eb4d32a))
* quitar secciones de cliente del menú de administrador y mesero ([1f13043](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/1f13043eb71fc2410265a4404b1d84cb2b8a8a47))


### Pruebas

* agregar pruebas unitarias y de integración con Jest ([b6b250a](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/b6b250ab20998b970952c7b9197d6d9c54bafc1a))
* **e2e:** ajustar los flujos de Maestro a las pantallas actuales ([de36896](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/de36896e6032c3014adc6ed79530028a78c2d382))
* **e2e:** ajustar los flujos de Maestro a las pantallas actuales ([4dbbf40](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/4dbbf4035408680bdc0abccfa2b16e549d28f9de))
* pruebas del mesero sin conexión (mesas, cuentas y cola de envío) ([f5d0d85](https://github.com/luisangelhdez1811-collab/la501-sports-mobile/commit/f5d0d857d32d372911dc7900982b34916e699f1a))

## Changelog

Todos los cambios importantes de la app móvil La 501 Sports se registran aquí.
Formato basado en [Mantenga un changelog](https://keepachangelog.com/es-ES/1.1.0/) y [Versionado Semántico](https://semver.org/lang/es/).
Las secciones de cada versión las genera [release-please](https://github.com/googleapis/release-please) a partir de los commits; no se editan a mano.

## Base del proyecto (antes de la primera versión)
### Añadido
- App móvil La 501 Sports (Expo / React Native): menú, carrito, pedidos, reservaciones, cuenta, modo offline, módulos de mesero y administrador.
- Recuperación de contraseña por SMS.
- Pruebas unitarias y de integración con Jest.
- Flujo GitFlow (main, release, develop, feature/*) y pipeline CI/CD con GitHub Actions + EAS Build.
