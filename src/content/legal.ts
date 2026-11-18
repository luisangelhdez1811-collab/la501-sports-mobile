import { WEB_URLS } from '@/config/api';

/**
 * Aviso de Privacidad and Términos y Condiciones: the same text and version the website
 * publishes (la501-sports-web, resources/legal/<doc>/<version>.php), so what a customer
 * accepts in the app is exactly the version the server records. The only addition is the
 * "En la aplicación móvil" part of the privacy notice, which the website must carry too.
 * When the website publishes a new version, copy it here with the same version.
 */

export type LegalBlock =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  /** `link`: a web page the paragraph points to (e.g. deleting the account without the app). */
  | { type: 'p'; text: string; strong?: string; link?: { label: string; url: string } }
  | { type: 'list'; items: string[] }
  | { type: 'table'; rows: [string, string][] };

export type LegalDocument = {
  lead: string;
  accent: string;
  description: string;
  updated: string;
  /**
   * Must match the version the server publishes (/public/info → legal.terms_version and
   * legal.privacy_version) the day the web publishes the same text (M-12, M-22).
   */
  version: string;
  /** What changed from the previous version, shown when the customer is asked to accept it. */
  changes: string[];
  blocks: LegalBlock[];
};

export const PRIVACY_EMAIL = 'Equipolapapa501@gmail.com';
export const PRIVACY_PHONE = '771 109 7827';

/** Goes with every drink with alcohol the app shows or sells (M-18). */
export const ADULTS_ONLY = 'Venta solo a mayores de 18 años.';

export const PRIVACY_NOTICE: LegalDocument = {
  lead: 'Aviso de',
  accent: 'Privacidad',
  description: 'Cómo tratamos y protegemos tus datos personales.',
  updated: '17 de noviembre de 2026',
  version: '2026-11-17',
  changes: [
    'Lista completa de proveedores que tratan sus datos, incluidos los que están fuera de México.',
    'Plazos concretos de conservación y borrado automático.',
    'Las recomendaciones según sus pedidos son voluntarias y puede desactivarlas.',
    'Cookies: las técnicas siempre; las de analítica (Google Analytics) solo si usted las acepta, y puede retirar ese permiso.',
    'Plazos para responder sus derechos ARCO y aviso si hay una vulneración.',
  ],
  blocks: [
    { type: 'h2', text: 'Introducción' },
    {
      type: 'p',
      text: 'Andrés Rivera Jiménez, que opera el restaurante-bar deportivo bajo el nombre comercial «La 501 Sports Restaurant», es responsable del tratamiento de los datos personales que usted nos proporciona como cliente, visitante, usuario registrado o persona interesada en nuestros servicios, en el sitio web y en la aplicación móvil.',
    },
    {
      type: 'p',
      text: 'Este Aviso de Privacidad Integral se pone a su disposición en cumplimiento de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares, publicada en el Diario Oficial de la Federación el 20 de marzo de 2025, y de las demás disposiciones aplicables. Mientras no se publique su nuevo reglamento, aplicamos el de 2011 en lo que no contradiga a la Ley. Al final encontrará la versión simplificada.',
    },

    { type: 'h2', text: '1. Identidad y domicilio del Responsable' },
    {
      type: 'table',
      rows: [
        ['Responsable del tratamiento', 'Andrés Rivera Jiménez'],
        ['Nombre comercial', 'La 501 Sports Restaurant'],
        ['Domicilio', 'Plaza de la Revolución Mexicana #16, Col. Centro, Huejutla de Reyes, Hidalgo, C.P. 43000, México'],
        ['Correo para privacidad y derechos ARCO', PRIVACY_EMAIL],
        ['Teléfono', PRIVACY_PHONE],
        ['Área que atiende solicitudes', 'Encargado de servicio'],
      ],
    },

    { type: 'h2', text: '2. Alcance de este aviso' },
    {
      type: 'p',
      text: 'Este aviso aplica a los datos personales que recabamos a través de:',
    },
    {
      type: 'list',
      items: [
        'Este sitio web: registro, pedidos a domicilio, reservaciones, contacto y promociones.',
        'La aplicación móvil La 501 Sports.',
        'Nuestra skill de Alexa, que solo responde consultas sobre el menú, promociones y datos del restaurante.',
        'Interacciones directas (llamadas, WhatsApp, redes sociales o en el restaurante) cuando impliquen recabar datos personales.',
      ],
    },
    {
      type: 'p',
      text: 'Los datos del personal del restaurante se rigen por un aviso aparte, el Aviso de Privacidad para Personal.',
    },

    { type: 'h2', text: '3. Datos personales que recabamos' },
    {
      type: 'p',
      text: 'Solo recabamos lo necesario para cada finalidad:',
    },
    {
      type: 'table',
      rows: [
        ['Registro e inicio de sesión', 'Nombre, correo electrónico, teléfono, contraseña (guardada cifrada), confirmación de mayoría de edad, versión del aviso y de los términos que aceptó y fecha de aceptación.'],
        ['Foto de perfil (opcional)', 'La imagen que usted elija subir.'],
        ['Pedido a domicilio', 'Nombre, teléfono, correo (opcional), dirección de entrega, ubicación GPS solo si usted decide compartirla, productos con sus opciones, ingredientes excluidos, notas, y la fecha en que aceptó el cobro del envío, confirmó su mayoría de edad (si pidió alcohol) y autorizó el uso de sus notas.'],
        ['Pagos', 'Forma de pago y número de operación de Mercado Pago. Nunca recibimos ni guardamos los datos de su tarjeta: el pago se hace en la página segura de Mercado Pago.'],
        ['Cancelaciones y devoluciones', 'Fecha, motivo (si lo indica) y estado de la devolución.'],
        ['Reservaciones', 'Nombre, teléfono, correo electrónico, fecha y hora, número de personas y zona.'],
        ['Contacto', 'Nombre, teléfono, correo electrónico, tipo de mensaje, asunto y mensaje.'],
        ['Promociones', 'Correo electrónico, solo si usted lo autoriza.'],
        ['Factura', 'RFC, nombre o razón social, régimen fiscal, código postal y uso del CFDI, solo si nos los envía para pedir factura.'],
        ['Uso del sitio', 'Dirección IP y registros técnicos del servidor (fecha, página visitada, errores), necesarios para la seguridad del sitio.'],
      ],
    },
    { type: 'h3', text: '3.1 Datos sensibles' },
    {
      type: 'p',
      strong: 'Alergias y restricciones alimentarias. ',
      text: 'No pedimos datos sensibles. Si usted escribe alergias u otros datos de salud en las notas de un pedido o reservación, le pedimos autorizarlo de forma expresa con una casilla. Los usamos solo para preparar sus alimentos de forma segura y solo los ve el personal de cocina y servicio que atiende su pedido.',
    },
    {
      type: 'p',
      text: 'No recabamos datos patrimoniales ni financieros: el pago con tarjeta lo procesa Mercado Pago.',
    },

    { type: 'h2', text: '4. Finalidades del tratamiento' },
    { type: 'h3', text: '4.1 Finalidades necesarias' },
    {
      type: 'p',
      text: 'Son indispensables para darle el servicio. Si se opone a ellas, no podremos atender su pedido, reservación o cuenta:',
    },
    {
      type: 'list',
      items: [
        'Crear y administrar su cuenta y sus puntos.',
        'Recibir, preparar, cobrar y entregar sus pedidos, y atender cancelaciones y devoluciones.',
        'Gestionar sus reservaciones.',
        'Enviarle avisos sobre su pedido o reservación y códigos de verificación.',
        'Atender mensajes, quejas, aclaraciones y solicitudes de derechos ARCO.',
        'Emitir su factura cuando la solicite.',
        'Prevenir fraude, abuso y accesos no autorizados.',
        'Cumplir obligaciones legales, fiscales y administrativas.',
      ],
    },
    { type: 'h3', text: '4.2 Finalidades voluntarias' },
    {
      type: 'p',
      text: 'No son necesarias para el servicio. Puede negarse a ellas en cualquier momento sin que esto afecte su relación con nosotros:',
    },
    {
      type: 'list',
      items: [
        'Enviarle promociones y novedades por correo.',
        'Recomendarle productos según sus pedidos anteriores. El cálculo se hace en nuestro propio servidor; sin este permiso, ve las mismas sugerencias que cualquier visitante.',
      ],
    },
    {
      type: 'p',
      text: `Para negarse: en el sitio web, en Configuración → Privacidad; en la app, en Mis datos y privacidad → Oposición; con el enlace de baja de cada correo de promociones; o escribiendo a ${PRIVACY_EMAIL}.`,
    },
    { type: 'h3', text: '4.3 Lo que no hacemos' },
    {
      type: 'list',
      items: [
        'No vendemos, rentamos ni compartimos sus datos para publicidad de terceros.',
        'No tomamos decisiones que le produzcan efectos jurídicos de forma automatizada, sin intervención humana.',
        'No usamos datos de salud para nada distinto a preparar sus alimentos.',
        'No enviamos promociones por SMS.',
      ],
    },

    { type: 'h2', text: '5. Consentimiento' },
    {
      type: 'list',
      items: [
        'Cuenta: al registrarse marca una casilla, nunca premarcada, aceptando este aviso y los Términos y Condiciones. Guardamos la fecha y la versión que aceptó.',
        'Pedidos: antes de pagar marca una casilla aceptando los Términos y Condiciones de compra y este aviso. Guardamos la fecha y la versión.',
        'Contacto y reservaciones: marca una casilla autorizando el uso de sus datos para responderle o gestionar su reservación. Guardamos la fecha y la versión.',
        'Promociones: casilla separada y opcional, nunca premarcada. Si se inscribe sin iniciar sesión, le mandamos un correo y solo recibe promociones si confirma con el enlace.',
        'Notas con datos de salud: casilla expresa en cada pedido que lleve notas.',
        'Mayoría de edad: se confirma al crear la cuenta y, de nuevo, al pedir bebidas con alcohol.',
        'Si cambiamos este aviso de fondo, le pediremos aceptar la versión nueva antes de seguir usando su cuenta.',
      ],
    },

    { type: 'h2', text: '6. Cookies y servicios de terceros en el sitio' },
    {
      type: 'p',
      strong: 'Cookies técnicas (siempre activas). ',
      text: 'Son indispensables para que el sitio funcione: la de su sesión (para mantenerlo identificado y guardar su carrito) y la de protección contra falsificación de solicitudes (XSRF-TOKEN). No requieren su permiso.',
    },
    {
      type: 'p',
      strong: 'Cookies de analítica (opcionales). ',
      text: 'Usamos Google Analytics para saber cuántas personas visitan el sitio, qué páginas ven y desde qué tipo de dispositivo llegan, y así mejorarlo. Solo se activa si usted pulsa «Aceptar» en el aviso de cookies; si pulsa «Rechazar» no se carga. No enviamos a Google su nombre, correo, teléfono ni sus pedidos, y no se usa en el panel ni en las páginas de su cuenta. Puede cambiar su decisión cuando quiera con el enlace «Preferencias de cookies» al pie de cada página. No usamos cookies de publicidad ni píxeles de rastreo.',
    },
    {
      type: 'p',
      text: 'Su navegador guarda localmente algunas preferencias, como el tema claro u oscuro. Esa información no se envía a nuestro servidor.',
    },
    {
      type: 'p',
      text: 'Al cargar el sitio, estos servicios reciben su dirección IP y datos técnicos de su navegador para entregar su contenido:',
    },
    {
      type: 'list',
      items: [
        'Google Fonts, que entrega las tipografías.',
        'Google Maps, solo si usted elige mostrar el mapa en la página de Ubicación; Google puede guardar sus propias cookies.',
        'Cloudinary, que entrega las imágenes del menú y de las promociones.',
        'Las redes de distribución unpkg y Tailwind, que entregan parte del código del sitio.',
        'Pusher, que actualiza el menú en tiempo real.',
        'Mercado Pago, solo cuando usted elige pagar con tarjeta.',
      ],
    },
    {
      type: 'p',
      text: 'Si algún día agregamos herramientas de publicidad, primero le pediremos su permiso y actualizaremos este aviso.',
    },
    { type: 'h3', text: 'En la aplicación móvil' },
    {
      type: 'list',
      items: [
        'No usa cookies, publicidad, analítica ni herramientas de rastreo.',
        'No pide su ubicación ni acceso a la cámara, el micrófono o sus contactos.',
        'La foto de perfil se elige con el selector de fotos del sistema y solo se envía la que usted elige.',
        'Si usted lo permite, muestra notificaciones sobre su pedido (cuando se entrega al repartidor y va en camino). Las genera el propio teléfono: no se envía ningún identificador del dispositivo ni se usan para promociones.',
        'La pantalla Ubicación muestra un mapa de Google Maps; al abrirla, Google recibe la dirección IP de su teléfono.',
      ],
    },
    {
      type: 'p',
      text: 'Para funcionar mejor guarda en su teléfono:',
    },
    {
      type: 'list',
      items: [
        'Su sesión, de forma protegida, solo si elige «Mantener sesión iniciada». Se borra al cerrar sesión.',
        'El menú, las fotos de los platillos y su carrito, para que pueda consultarlos sin conexión.',
      ],
    },

    { type: 'h2', text: '7. Encargados y transferencias' },
    {
      type: 'p',
      text: 'Estos proveedores tratan datos por nuestra cuenta, solo para operar el restaurante y bajo obligación de confidencialidad. Algunos guardan o procesan la información fuera de México (principalmente en Estados Unidos).',
    },
    {
      type: 'table',
      rows: [
        ['Hostinger', 'Servidor donde se guardan cuentas, pedidos, reservaciones y mensajes.'],
        ['Mercado Pago', 'Cobro con tarjeta y devoluciones.'],
        ['Twilio', 'Envío de códigos de verificación por SMS.'],
        ['Google', 'Envío de correos, mapas, tipografías y, solo si usted lo acepta, estadísticas de visitas (Google Analytics).'],
        ['Pusher', 'Avisos en tiempo real del menú y para el personal.'],
        ['Cloudinary', 'Almacenamiento de imágenes (menú, promociones y fotos de perfil).'],
        ['Amazon (Alexa)', 'Skill de voz que consulta el menú y las promociones; no recaba datos personales.'],
      ],
    },
    {
      type: 'p',
      text: 'No transferimos sus datos a terceros, salvo a las autoridades cuando una ley o una orden lo exija.',
    },

    { type: 'h2', text: '8. Cómo limitar el uso o divulgación de sus datos' },
    {
      type: 'list',
      items: [
        'Desactive promociones y recomendaciones en Configuración (web) o en Mis datos y privacidad (app).',
        'Use el enlace de baja de cualquier correo de promociones; funciona sin iniciar sesión y se aplica de inmediato.',
        `Escriba a ${PRIVACY_EMAIL} pidiendo la limitación.`,
      ],
    },

    { type: 'h2', text: '9. Derechos ARCO' },
    {
      type: 'p',
      text: 'Usted puede conocer qué datos suyos tratamos (Acceso), corregirlos (Rectificación), pedir que los eliminemos (Cancelación) y oponerse a su uso para fines específicos, incluidas las decisiones automatizadas (Oposición).',
    },
    { type: 'h3', text: 'Por su cuenta, en cualquier momento' },
    {
      type: 'table',
      rows: [
        ['Acceso', 'Descargue una copia completa de sus datos en Configuración (web) o Mis datos y privacidad (app).'],
        ['Rectificación', 'Corrija su nombre, correo, teléfono o foto de perfil en las mismas pantallas.'],
        ['Cancelación', 'Elimine su cuenta desde Configuración, desde la app o en la página «Eliminar mi cuenta».'],
        ['Oposición', 'Active o desactive promociones y recomendaciones.'],
      ],
    },
    { type: 'h3', text: 'Por correo' },
    {
      type: 'p',
      text: `Envíe su solicitud a ${PRIVACY_EMAIL} con: su nombre y un medio para responderle; un documento que acredite su identidad (o la de su representante y el poder correspondiente); el derecho que quiere ejercer y los datos a los que se refiere; y, si pide una corrección, el dato correcto y su respaldo.`,
    },
    {
      type: 'p',
      text: 'Le responderemos en un máximo de 20 días hábiles y, si procede, lo haremos efectivo en los 15 días hábiles siguientes. El trámite es gratuito; solo podríamos cobrar el costo de reproducción o envío si pide copias en un medio físico.',
    },

    { type: 'h2', text: '10. Revocación del consentimiento' },
    {
      type: 'p',
      text: `Puede revocar su consentimiento en cualquier momento, sin efectos retroactivos, eliminando su cuenta o escribiendo a ${PRIVACY_EMAIL}. Si revoca el consentimiento de una finalidad necesaria, ya no podremos darle ese servicio.`,
    },

    { type: 'h2', text: '11. Medidas de seguridad y vulneraciones' },
    {
      type: 'p',
      text: 'Aplicamos medidas administrativas, técnicas y físicas: conexión cifrada (HTTPS), contraseñas cifradas, acceso restringido por rol, límites de intentos, respaldos protegidos y borrado automático de datos al cumplir su plazo.',
    },
    {
      type: 'p',
      text: 'Si ocurre una vulneración que afecte de forma significativa sus derechos, le avisaremos sin demora por correo o en la app, con lo que pasó, los datos afectados, lo que hicimos y lo que usted puede hacer para protegerse.',
    },

    { type: 'h2', text: '12. Plazos de conservación' },
    {
      type: 'p',
      text: 'Conservamos cada dato solo el tiempo necesario. Al cumplirse el plazo, lo borramos de forma automática:',
    },
    {
      type: 'table',
      rows: [
        ['Cuenta', 'Mientras esté activa. Al eliminarla se borran sus datos de identificación y sus pedidos quedan sin nombre, teléfono, correo, dirección ni notas.'],
        ['Pedidos y comprobantes', '10 años, por las obligaciones de conservación del Código de Comercio (art. 49) y del Código Fiscal de la Federación (art. 30).'],
        ['Ubicación GPS de la entrega', '30 días después de entregado o cancelado el pedido.'],
        ['Notas del pedido', '90 días.'],
        ['Reservaciones', '1 año.'],
        ['Mensajes de contacto', '1 año.'],
        ['Códigos de verificación', 'Hasta que vencen o se usan.'],
        ['Registros técnicos del servidor', '14 días.'],
        ['Respaldos de la base de datos', '30 días.'],
      ],
    },
    {
      type: 'p',
      text: 'Mientras un dato se conserva solo para cumplir una obligación legal, queda bloqueado: no se usa para ninguna otra finalidad.',
    },

    { type: 'h2', text: '13. Menores de edad' },
    {
      type: 'p',
      text: 'El registro, los pedidos en línea y los pagos son solo para mayores de 18 años. Las bebidas con alcohol solo se venden a mayores de edad y al entregarlas se pide una identificación oficial. Si un dato de un menor va ligado a un pedido (por ejemplo, una alergia), debe proporcionarlo el adulto responsable.',
    },

    { type: 'h2', text: '14. Cambios a este aviso' },
    {
      type: 'p',
      text: 'Si cambiamos este aviso de fondo, publicaremos la versión nueva con su fecha en el sitio y en la app, se lo avisaremos y le pediremos aceptarla al iniciar sesión. Conservamos cada versión publicada.',
    },

    { type: 'h2', text: '15. Autoridad competente' },
    {
      type: 'p',
      text: `Si tiene una inconformidad, escríbanos primero a ${PRIVACY_EMAIL}. La autoridad en materia de protección de datos personales en México es la Secretaría Anticorrupción y Buen Gobierno.`,
    },

    { type: 'h2', text: 'Aviso de Privacidad Simplificado' },
    {
      type: 'p',
      text: `La 501 Sports Restaurant (Andrés Rivera Jiménez), con domicilio en Plaza de la Revolución Mexicana #16, Col. Centro, Huejutla de Reyes, Hidalgo, usará sus datos para atender sus pedidos, reservaciones, cuenta y mensajes, y, solo si usted lo autoriza, para enviarle promociones y recomendaciones. Puede negarse a estas últimas en Configuración o escribiendo a ${PRIVACY_EMAIL}. Consulte el aviso completo en esta misma página.`,
    },
  ],
};

export const TERMS: LegalDocument = {
  lead: 'Términos y',
  accent: 'Condiciones',
  description: 'Reglas de uso del sitio web, la app, los pedidos y las reservaciones.',
  updated: '17 de noviembre de 2026',
  version: '2026-11-17',
  changes: [
    'Reglas del programa de puntos.',
    'Cómo pedir factura de un pedido en línea.',
    'Venta de alcohol solo cuando la licencia lo permite y nunca en ley seca.',
    'Plazo para resolver cambios y devoluciones, y sin depósito en reservaciones en línea.',
    'Teléfonos de la PROFECO.',
  ],
  blocks: [
    { type: 'h2', text: '1. Identidad del proveedor' },
    {
      type: 'p',
      text: 'Estos Términos regulan el uso del sitio web, la aplicación móvil, los pedidos y reservaciones en línea y los demás servicios digitales de «La 501 Sports Restaurant», operado por:',
    },
    {
      type: 'table',
      rows: [
        ['Nombre comercial', 'La 501 Sports Restaurant'],
        ['Titular', 'Andrés Rivera Jiménez'],
        ['Domicilio', 'Plaza de la Revolución Mexicana #16, Col. Centro, Huejutla de Reyes, Hidalgo, C.P. 43000, México'],
        ['Correo', PRIVACY_EMAIL],
        ['Teléfono / WhatsApp', PRIVACY_PHONE],
      ],
    },

    { type: 'h2', text: '2. Aceptación y alcance' },
    {
      type: 'p',
      text: 'Al crear una cuenta, hacer un pedido o una reservación, usted acepta estos Términos. Si no está de acuerdo, le pedimos no usar nuestros servicios digitales. El menú puede consultarse sin cuenta.',
    },
    {
      type: 'p',
      text: 'Las cuentas, los pedidos en línea y los pagos son solo para mayores de 18 años con capacidad legal para contratar. El tratamiento de sus datos se rige por nuestro Aviso de Privacidad.',
    },

    { type: 'h2', text: '3. Cuentas de usuario' },
    {
      type: 'list',
      items: [
        'Debe proporcionar información verdadera y mantenerla actualizada.',
        `Usted cuida la confidencialidad de su contraseña. Si detecta un uso no autorizado, avísenos a ${PRIVACY_EMAIL}.`,
        'Podemos suspender cuentas que hagan pedidos o reservaciones falsas reiteradas, intenten fraude o abusen del sistema, y le diremos el motivo.',
        'Puede eliminar su cuenta en cualquier momento desde Configuración, desde la app o en la página «Eliminar mi cuenta».',
      ],
    },
    {
      type: 'p',
      text: 'Cómo eliminar su cuenta, aunque no tenga la app instalada: ',
      link: { label: 'Eliminar mi cuenta', url: WEB_URLS.deleteAccount },
    },

    { type: 'h2', text: '4. Menú y disponibilidad' },
    {
      type: 'p',
      text: 'El menú, sus precios y presentaciones pueden cambiar. Respetamos el precio que aparecía al confirmar su pedido. Las fotografías son ilustrativas: algunas son de bancos de imágenes con licencia y el platillo puede verse distinto.',
    },
    {
      type: 'p',
      text: 'Si un producto se agota después de confirmado su pedido, le ofreceremos un cambio por uno equivalente o quitarlo de su pedido con el ajuste o la devolución correspondiente.',
    },

    { type: 'h2', text: '5. Precios e impuestos' },
    {
      type: 'p',
      text: 'Los precios están en pesos mexicanos e incluyen IVA. El total que ve antes de confirmar es lo que se cobra por los productos; el envío se informa aparte (sección 9). Si hubiera un error evidente de precio, se lo diremos antes de preparar su pedido y podrá cancelarlo sin costo.',
    },

    { type: 'h2', text: '6. Confirmación de pedidos' },
    {
      type: 'p',
      text: 'Un pedido queda confirmado cuando el sitio o la app le muestran su folio y, si pagó con tarjeta, cuando Mercado Pago confirma el pago. Podemos rechazar un pedido por falta de existencias, error evidente de precio, sospecha razonable de fraude o datos de contacto incorrectos; si ya pagó, le devolvemos el total.',
    },

    { type: 'h2', text: '7. Formas de pago' },
    {
      type: 'p',
      text: 'Aceptamos efectivo al recibir y tarjeta de crédito o débito en una sola exhibición, sin comisión. El pago con tarjeta se hace en la página segura de Mercado Pago; no vemos ni guardamos los datos de su tarjeta. Un pedido con tarjeta se prepara solo cuando el pago se confirma.',
    },

    { type: 'h2', text: '8. Propinas y cargos' },
    {
      type: 'p',
      text: 'Las propinas son voluntarias y no se incluyen en los precios ni en la cuenta. No cobramos ningún cargo que usted no haya aceptado antes de confirmar.',
    },

    { type: 'h2', text: '9. Envío a domicilio' },
    {
      type: 'p',
      text: 'El total del pedido no incluye el envío. Lo realiza un repartidor y se le paga directamente al recibir. Antes de confirmar cada pedido le mostramos cómo se cobra y cuánto cuesta, y le pedimos aceptarlo. Los tiempos de preparación y entrega son estimados.',
    },

    { type: 'h2', text: '10. Cancelación de pedidos' },
    {
      type: 'p',
      text: 'Puede cancelar sin costo en cualquier momento desde la pantalla de seguimiento, mientras su pedido no haya entrado a cocina. Un pedido entra a cocina cuando aparece en la pantalla de preparación de la cocina o de la barra; desde ese momento el ticket le muestra «Tu pedido ya entró a cocina» y ya no se puede cancelar ni devolver el pago, porque son alimentos preparados al momento. Si pagó con tarjeta y canceló a tiempo, la devolución a la misma tarjeta se hace en automático; según su banco puede tardar de 5 a 10 días hábiles en verse.',
    },

    { type: 'h2', text: '11. Bebidas con alcohol' },
    {
      type: 'list',
      items: [
        'Solo se venden a mayores de 18 años. Al pedirlas lo confirma y al recibirlas debe mostrar una identificación oficial; sin ella, el repartidor no las entrega y le devolvemos su importe.',
        'Solo se venden en línea cuando la licencia del restaurante lo permite y en el horario autorizado. Durante una ley seca decretada por la autoridad no se venden.',
        'El abuso en el consumo de este producto es nocivo para la salud.',
      ],
    },

    { type: 'h2', text: '12. Cambios, devoluciones y reembolsos' },
    {
      type: 'p',
      text: 'Si recibe un producto equivocado, incompleto o en mal estado, avísenos el mismo día por teléfono, WhatsApp o correo. Usted elige entre la reposición del producto, un ajuste en su cuenta o la devolución de lo que pagó por él. Resolvemos su reporte en un máximo de 5 días hábiles.',
    },
    {
      type: 'p',
      text: 'Si se le cobró dos veces o algo que no pidió, se le devuelve completo. No hay devolución por cambio de opinión en alimentos entregados en buen estado.',
    },

    { type: 'h2', text: '13. Reservaciones' },
    {
      type: 'list',
      items: [
        'Las reservaciones en línea son solicitudes sujetas a disponibilidad y a la confirmación del personal.',
        'La mesa se guarda 20 minutos después de la hora reservada.',
        'No cobramos depósito por reservaciones en línea. Para grupos de más de 10 personas o eventos, las condiciones se acuerdan por WhatsApp y se le confirman por escrito antes de cualquier pago.',
      ],
    },

    { type: 'h2', text: '14. Promociones' },
    {
      type: 'p',
      text: 'Cada promoción muestra su vigencia y sus condiciones antes de agregarla a su pedido, y se respeta tal como se anunció durante esa vigencia. Salvo que la promoción diga otra cosa, no son acumulables entre sí ni canjeables por efectivo. Algunas solo son válidas en el restaurante.',
    },

    { type: 'h2', text: '15. Programa de puntos y logros' },
    {
      type: 'list',
      items: [
        'Las cuentas registradas ganan 1 punto por cada $10 de cada pedido pagado.',
        'Por ahora los puntos no se pueden canjear ni tienen valor en dinero. Si se habilita el canje, publicaremos sus reglas antes en el sitio y en la app.',
        'Si un pedido se cancela o se devuelve, se descuentan los puntos que dio.',
        'Los puntos y logros se pierden al eliminar la cuenta.',
        'Ningún punto ni logro se gana por pedir bebidas con alcohol.',
        'Podemos terminar el programa avisando con al menos 30 días de anticipación.',
      ],
    },

    { type: 'h2', text: '16. Alergias' },
    {
      type: 'p',
      text: 'En nuestra cocina se manejan gluten, lácteos, huevo, mariscos, frutos secos y chiles en el mismo espacio. Aunque quite ingredientes al pedir, no podemos garantizar que no haya trazas por contacto cruzado.',
    },

    { type: 'h2', text: '17. Facturación' },
    {
      type: 'p',
      text: `Si necesita factura (CFDI) de un pedido en línea, escríbanos a ${PRIVACY_EMAIL} dentro del mismo mes del consumo con su folio, RFC, nombre o razón social, régimen fiscal, código postal y uso del CFDI. Se la enviaremos al mismo correo.`,
    },

    { type: 'h2', text: '18. Uso permitido' },
    {
      type: 'p',
      text: 'Está prohibido hacer pedidos o reservaciones falsas, intentar vulnerar la seguridad del sitio o de la app, o usarlos para actividades ilícitas.',
    },

    { type: 'h2', text: '19. Propiedad intelectual' },
    {
      type: 'p',
      text: 'El nombre comercial, el logotipo, los textos y el menú son del proveedor. Las fotografías propias también; las de bancos de imágenes se usan con su licencia. Las marcas de terceros que aparecen (por ejemplo, de bebidas) solo identifican lo que se vende y no implican patrocinio.',
    },

    { type: 'h2', text: '20. Quejas y aclaraciones' },
    {
      type: 'table',
      rows: [
        ['Teléfono / WhatsApp', PRIVACY_PHONE],
        ['Correo', PRIVACY_EMAIL],
        ['Horario de atención', 'Todos los días de 1:00 p.m. a 10:00 p.m.'],
      ],
    },
    {
      type: 'p',
      text: 'Si no resolvemos su queja, puede acudir a la Procuraduría Federal del Consumidor (PROFECO): Teléfono del Consumidor 55 5568 8722 o 800 468 8722, y en profeco.gob.mx.',
    },

    { type: 'h2', text: '21. Cambios a estos Términos' },
    {
      type: 'p',
      text: 'Si cambiamos estos Términos de fondo, publicaremos la versión nueva con su fecha y le pediremos aceptarla al iniciar sesión. Los pedidos ya confirmados se rigen por la versión que aceptó al hacerlos.',
    },

    { type: 'h2', text: '22. Legislación aplicable' },
    {
      type: 'p',
      text: 'Estos Términos se rigen por las leyes de México, en particular la Ley Federal de Protección al Consumidor y el Código de Comercio. Para cualquier controversia, las partes se someten a los tribunales de Huejutla de Reyes, Hidalgo, sin perjuicio de su derecho a acudir a la PROFECO.',
    },
  ],
};
