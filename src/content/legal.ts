/**
 * Aviso de Privacidad and Términos y Condiciones, taken from the website and adapted to
 * the mobile app (how the app stores data, and that ARCO rights can be exercised from
 * "Mis datos y privacidad"). Keep in sync with the website when the restaurant updates them.
 */

export type LegalBlock =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string; strong?: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; rows: [string, string][] };

export type LegalDocument = {
  lead: string;
  accent: string;
  description: string;
  updated: string;
  blocks: LegalBlock[];
};

export const PRIVACY_EMAIL = 'Equipolapapa501@gmail.com';
export const PRIVACY_PHONE = '771 109 7827';

export const PRIVACY_NOTICE: LegalDocument = {
  lead: 'Aviso de',
  accent: 'privacidad',
  description: 'Conoce cómo protegemos y tratamos tus datos personales de manera segura.',
  updated: 'Octubre de 2026',
  blocks: [
    { type: 'h2', text: 'Introducción' },
    {
      type: 'p',
      text: 'Andrés Rivera Jiménez, que opera el restaurante-bar deportivo bajo el nombre comercial “La 501 Sports Restaurant”, es responsable del tratamiento de los datos personales que usted nos proporciona como cliente, visitante, usuario registrado o persona interesada en nuestros servicios, incluidos los que recaba esta aplicación móvil.',
    },
    {
      type: 'p',
      text: 'Este Aviso de Privacidad Integral se pone a su disposición en cumplimiento de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares, publicada en el Diario Oficial de la Federación el 20 de marzo de 2025 y vigente desde el 21 de marzo de 2025, así como de las demás disposiciones reglamentarias y lineamientos aplicables.',
    },
    {
      type: 'p',
      text: 'Le recomendamos leer este documento completo antes de proporcionarnos su información.',
    },

    { type: 'h2', text: '1. Identidad y domicilio del Responsable' },
    {
      type: 'table',
      rows: [
        ['Responsable del tratamiento', 'Andrés Rivera Jiménez'],
        ['Nombre comercial', 'La 501 Sports Restaurant'],
        ['Domicilio', 'Plaza de la Revolución Mexicana #16, Col. Centro, Huejutla de Reyes, Hidalgo, C.P. 43000, México'],
        ['Correo para privacidad y derechos ARCO', PRIVACY_EMAIL],
        ['Teléfono de contacto', PRIVACY_PHONE],
        ['Área que atiende solicitudes', 'Encargado de servicio'],
      ],
    },

    { type: 'h2', text: '2. Fundamento legal y alcance de este aviso' },
    { type: 'p', text: 'Este aviso aplica a los datos personales que recabamos a través de:' },
    {
      type: 'list',
      items: [
        'Esta aplicación móvil La 501 Sports: registro, pedidos a domicilio, reservaciones y promociones.',
        'Nuestro sitio web y sus formularios (registro, reservaciones, pedidos, contacto, facturación, promociones).',
        'Nuestro asistente de voz en Alexa y cualquier asistente conversacional o de inteligencia artificial que habilitemos.',
        'Interacciones directas: llamadas, WhatsApp, redes sociales o trato en el restaurante, cuando impliquen recabar datos personales.',
      ],
    },
    {
      type: 'p',
      text: 'El tratamiento se rige por los principios de licitud, finalidad, lealtad, consentimiento, calidad, proporcionalidad, información y responsabilidad. Solo recabamos los datos necesarios para las finalidades aquí descritas, se lo informamos antes de tratarlos, y usted conserva el control sobre su información en todo momento.',
    },

    { type: 'h2', text: '3. Datos personales que recabamos' },
    {
      type: 'p',
      text: 'Dependiendo de cómo interactúe con nosotros, podemos recabar los siguientes datos, siempre limitados a lo necesario para cada finalidad:',
    },
    {
      type: 'table',
      rows: [
        ['Registro e inicio de sesión', 'Nombre, correo electrónico, teléfono, contraseña, pregunta de seguridad e historial de acceso.'],
        ['Reservaciones', 'Nombre, teléfono, correo electrónico, fecha y hora, número de personas y zona.'],
        ['Pedido a domicilio', 'Nombre, teléfono, correo (opcional), dirección de entrega, productos, ingredientes excluidos e instrucciones.'],
        ['Pagos', 'Referencia o folio de pago. No almacenamos los datos de su tarjeta: el pago se realiza en la página segura de un proveedor de pagos autorizado.'],
        ['Contacto', 'Nombre, teléfono, correo electrónico, asunto y mensaje.'],
        ['Promociones', 'Correo electrónico, únicamente si usted lo autoriza expresamente.'],
        ['Personal del restaurante', 'Nombre, datos de contacto y usuario.'],
        ['Asistente virtual / IA', 'Contenido de la consulta, utilizado únicamente para generar la respuesta o ejecutar la acción.'],
      ],
    },
    { type: 'h3', text: '3.1 Datos personales sensibles y patrimoniales' },
    {
      type: 'p',
      text: 'Como regla general, La 501 Sports no recaba datos personales sensibles (origen étnico, estado de salud, información genética, creencias, afiliación sindical o política, preferencia sexual).',
    },
    {
      type: 'p',
      strong: 'Excepción – alergias y restricciones alimentarias: ',
      text: 'si usted comparte voluntariamente información sobre alergias o restricciones en las notas de un pedido o reservación, ese dato se considera sensible. Lo utilizaremos exclusivamente para la preparación segura de sus alimentos y limitaremos su acceso al personal de cocina y servicio involucrado.',
    },

    { type: 'h2', text: '4. Finalidades del tratamiento' },
    { type: 'h3', text: '4.1 Finalidades necesarias (primarias)' },
    {
      type: 'p',
      text: 'Son indispensables para la relación que usted tiene con nosotros. Si se opone a ellas, no podremos prestarle el servicio solicitado:',
    },
    {
      type: 'list',
      items: [
        'Crear y administrar su cuenta de usuario y su programa de puntos.',
        'Gestionar reservaciones, pedidos, pagos y entregas.',
        'Atender mensajes, quejas, aclaraciones o solicitudes.',
        'Enviar confirmaciones y notificaciones operativas sobre su pedido o reservación.',
        'Prevenir fraude, abuso y accesos no autorizados, y proteger la seguridad del sistema.',
        'Cumplir obligaciones legales, fiscales, administrativas o contractuales.',
        'Administrar las cuentas del personal del restaurante.',
        'Generar estadísticas anonimizadas para mejorar el servicio.',
      ],
    },
    { type: 'h3', text: '4.2 Finalidades secundarias (voluntarias)' },
    {
      type: 'p',
      text: 'No son necesarias para el servicio y usted puede negarse a ellas en cualquier momento, sin que esto afecte su relación con La 501 Sports:',
    },
    { type: 'list', items: ['Enviar promociones, encuestas de satisfacción o comunicaciones comerciales.'] },
    {
      type: 'p',
      text: 'Puede activarlas o desactivarlas en la app desde Mis datos y privacidad → Oposición, escribiendo a ' +
        PRIVACY_EMAIL +
        ', o con el enlace de baja incluido en cada correo.',
    },
    { type: 'h3', text: '4.3 Lo que no hacemos con sus datos' },
    {
      type: 'list',
      items: [
        'No vendemos, rentamos ni compartimos su información con terceros para mercadotecnia ajena a La 501 Sports.',
        'No tomamos decisiones automatizadas que produzcan efectos jurídicos sobre usted sin intervención humana.',
        'No utilizamos datos de salud (alergias) para ningún fin distinto a la preparación segura de sus alimentos.',
      ],
    },

    { type: 'h2', text: '5. Consentimiento' },
    {
      type: 'p',
      strong: 'Cuenta en la app: ',
      text: 'al registrarse se le pide marcar una casilla, nunca premarcada, aceptando este aviso y los Términos y Condiciones.',
    },
    {
      type: 'p',
      strong: 'Finalidades secundarias (promociones): ',
      text: 'consentimiento expreso mediante una casilla separada y opcional, nunca premarcada.',
    },
    {
      type: 'p',
      strong: 'Datos sensibles (alergias): ',
      text: 'consentimiento expreso al proporcionarlos voluntariamente en las notas.',
    },

    { type: 'h2', text: '6. Información guardada en su teléfono' },
    {
      type: 'p',
      text: 'La app no usa publicidad ni herramientas de rastreo. Para funcionar mejor guarda en su teléfono:',
    },
    {
      type: 'list',
      items: [
        'Su sesión, de forma protegida, solo si elige “Mantener sesión iniciada”. Se borra al cerrar sesión.',
        'El menú, las fotos de los platillos y su carrito, para que pueda consultarlos sin conexión.',
      ],
    },

    { type: 'h2', text: '7. Encargados del tratamiento y transferencias' },
    {
      type: 'p',
      text: 'Nos apoyamos en proveedores de servicios tecnológicos y de pagos que tratan datos por nuestra cuenta y bajo nuestras instrucciones. Se obligan a usar los datos solo para la operación del restaurante y a guardar confidencialidad. No vendemos ni transferimos sus datos a terceros para otros fines.',
    },

    { type: 'h2', text: '8. Medios para limitar el uso o divulgación' },
    {
      type: 'list',
      items: [
        'Desactivar las promociones en Mis datos y privacidad → Oposición.',
        'Escribir a ' + PRIVACY_EMAIL + ' solicitando la limitación del uso.',
        'Usar el enlace para darse de baja incluido en cada correo promocional.',
      ],
    },

    { type: 'h2', text: '9. Derechos ARCO' },
    {
      type: 'p',
      text: 'Usted tiene derecho a conocer qué datos suyos tratamos (Acceso), a corregirlos (Rectificación), a solicitar que los eliminemos (Cancelación) y a oponerse a su uso para fines específicos (Oposición).',
    },
    { type: 'h3', text: 'Desde la app (Cuenta → Mis datos y privacidad)' },
    {
      type: 'table',
      rows: [
        ['Acceso', 'Consulte sus datos y descargue una copia.'],
        ['Rectificación', 'Corrija su nombre, correo o teléfono.'],
        ['Cancelación', 'Elimine su cuenta y sus datos personales.'],
        ['Oposición', 'Active o desactive las promociones.'],
      ],
    },
    { type: 'h3', text: 'Por correo' },
    {
      type: 'p',
      text: 'Envíe su solicitud a ' +
        PRIVACY_EMAIL +
        ' con su nombre completo, un documento que acredite su identidad y la descripción clara del derecho a ejercer. Responderemos en un plazo máximo de 20 días hábiles.',
    },

    { type: 'h2', text: '10. Revocación del consentimiento' },
    {
      type: 'p',
      text: 'Puede revocar su consentimiento en cualquier momento y sin efectos retroactivos eliminando su cuenta desde la app o escribiendo a ' +
        PRIVACY_EMAIL +
        '. Para ciertas finalidades necesarias, la revocación podría impedir que sigamos prestándole el servicio.',
    },

    { type: 'h2', text: '11. Medidas de seguridad' },
    {
      type: 'p',
      text: 'Aplicamos medidas de seguridad administrativas, técnicas y físicas para proteger sus datos contra daño, pérdida, alteración o acceso no autorizado, y limitamos el acceso solo al personal que lo necesita. En caso de vulneraciones significativas le notificaremos sin dilación conforme a la Ley.',
    },

    { type: 'h2', text: '12. Plazos de conservación y eliminación' },
    {
      type: 'p',
      text: 'Conservamos los datos solo el tiempo necesario. Los comprobantes fiscales se guardan 5 años conforme al Código Fiscal de la Federación; las cuentas se conservan mientras el usuario no solicite su baja; y los datos de pedidos y reservaciones, el tiempo requerido para el servicio y aclaraciones. Al eliminar su cuenta, sus datos de identificación se borran o anonimizan, salvo los que la ley nos obligue a conservar.',
    },

    { type: 'h2', text: '13. Menores de edad' },
    {
      type: 'p',
      text: 'El registro, los pedidos en línea y los pagos están dirigidos a mayores de 18 años. Los datos de un menor vinculados a una orden (como alergias) deben ser proporcionados por el adulto responsable.',
    },

    { type: 'h2', text: '14. Asistentes de voz e inteligencia artificial' },
    {
      type: 'p',
      text: 'Las consultas mediante asistentes de voz o IA solo se usan para responder o ejecutar la acción solicitada, nunca para elaborar perfiles comerciales.',
    },

    { type: 'h2', text: '15. Cambios a este aviso' },
    {
      type: 'p',
      text: 'Podemos modificar este aviso. Cualquier cambio sustantivo se anunciará en la app, en el sitio web o por correo antes de que surta efectos.',
    },

    { type: 'h2', text: '16. Autoridad competente' },
    {
      type: 'p',
      text: 'Ante cualquier inconformidad, contáctenos primero en ' +
        PRIVACY_EMAIL +
        '. De ser necesario, la Secretaría Anticorrupción y Buen Gobierno (SABG) es la autoridad competente en la materia en México.',
    },

    { type: 'h2', text: '17. Aceptación' },
    {
      type: 'p',
      text: 'Al registrarse y usar la app, usted manifiesta que ha leído, entendido y aceptado el presente Aviso de Privacidad Integral.',
    },
  ],
};

export const TERMS: LegalDocument = {
  lead: 'Términos y',
  accent: 'condiciones',
  description: 'Reglas de uso de la app, pedidos, reservaciones y servicios digitales.',
  updated: 'Octubre de 2026',
  blocks: [
    { type: 'h2', text: '1. Identidad del proveedor' },
    {
      type: 'p',
      text: 'Estos Términos regulan el uso de la aplicación móvil, el sitio web, los pedidos y reservaciones en línea y los demás servicios digitales de “La 501 Sports Restaurant”, operado por:',
    },
    {
      type: 'table',
      rows: [
        ['Nombre comercial', 'La 501 Sports Restaurant'],
        ['Responsable / titular', 'Andrés Rivera Jiménez'],
        ['Domicilio', 'Plaza de la Revolución Mexicana #16, Col. Centro, Huejutla de Reyes, Hidalgo, C.P. 43000, México'],
        ['Correo de contacto', PRIVACY_EMAIL],
        ['Teléfono / WhatsApp', PRIVACY_PHONE],
      ],
    },

    { type: 'h2', text: '2. Aceptación y alcance' },
    {
      type: 'p',
      text: 'Al usar la app, crear una cuenta, realizar un pedido o una reservación, usted acepta estos Términos en su totalidad. Si no está de acuerdo, le pedimos no utilizar nuestros servicios digitales.',
    },
    {
      type: 'p',
      text: 'El menú puede consultarse sin cuenta; la creación de cuentas, los pedidos en línea y los pagos están dirigidos a mayores de 18 años con capacidad legal para contratar.',
    },
    {
      type: 'p',
      text: 'El tratamiento de sus datos personales se rige por nuestro Aviso de Privacidad, que forma parte integral de estos Términos.',
    },

    { type: 'h2', text: '3. Cuentas de usuario' },
    {
      type: 'list',
      items: [
        'Debe ser mayor de 18 años y proporcionar información veraz, exacta y actualizada.',
        'Es responsable de la confidencialidad de su contraseña y de la actividad de su cuenta. Si detecta un uso no autorizado, notifíquelo a ' +
          PRIVACY_EMAIL +
          '.',
        'Podemos suspender o cancelar cuentas que incumplan estos Términos, presenten actividad fraudulenta o abusen del sistema (por ejemplo, pedidos o reservaciones falsas reiteradas).',
        'Puede eliminar su cuenta en cualquier momento desde Cuenta → Mis datos y privacidad, o escribiendo al correo de contacto.',
      ],
    },

    { type: 'h2', text: '4. Menú y disponibilidad' },
    {
      type: 'p',
      strong: 'El menú, sus precios y presentaciones pueden cambiar sin previo aviso; ',
      text: 'el precio aplicable es el vigente al confirmar su pedido. La copia del menú guardada para uso sin conexión puede no reflejar cambios recientes.',
    },
    {
      type: 'p',
      text: 'Los productos están sujetos a disponibilidad. Si uno se agota después de confirmado su pedido, le ofreceremos una sustitución equivalente o la cancelación de ese producto con el ajuste o reembolso correspondiente. Las fotografías son ilustrativas.',
    },

    { type: 'h2', text: '5. Precios e impuestos' },
    {
      type: 'p',
      text: 'Los precios se expresan en pesos mexicanos (MXN) e incluyen IVA, salvo indicación contraria. Ante un error evidente de precio, podremos cancelar el pedido afectado antes de su preparación, reembolsando cualquier cargo.',
    },

    { type: 'h2', text: '6. Confirmación de pedidos' },
    {
      type: 'p',
      text: 'Un pedido se considera confirmado cuando la app le muestra la confirmación y, en su caso, se acredita el pago. Podemos rechazar o cancelar pedidos por causas justificadas: indisponibilidad, errores evidentes de precio, sospecha razonable de fraude, datos de contacto incorrectos o imposibilidad de validar el pago.',
    },

    { type: 'h2', text: '7. Formas de pago' },
    {
      type: 'p',
      text: 'Aceptamos efectivo al recibir y pago en línea con tarjeta de crédito o débito. El pago con tarjeta se realiza en la página segura de un proveedor de pagos autorizado; La 501 Sports no ve ni almacena los datos de su tarjeta.',
    },

    { type: 'h2', text: '8. Propinas' },
    {
      type: 'p',
      strong: 'Las propinas son voluntarias y no están incluidas en los precios ni en la cuenta. ',
      text: 'Ningún cargo por propina puede exigirse ni agregarse sin su consentimiento.',
    },

    { type: 'h2', text: '9. Envío a domicilio' },
    {
      type: 'p',
      text: 'El total mostrado en la app corresponde a los productos. El costo del envío lo cobra el repartidor por separado al entregar. Los tiempos de preparación y entrega son estimados y pueden variar según la demanda.',
    },

    { type: 'h2', text: '10. Cancelaciones de pedidos' },
    {
      type: 'p',
      text: 'Puede cancelar un pedido sin costo mientras no haya entrado a preparación en cocina. Una vez iniciada la preparación no podrá cancelarse, por tratarse de alimentos perecederos elaborados al momento.',
    },

    { type: 'h2', text: '11. Cambios, devoluciones y reembolsos' },
    {
      type: 'p',
      text: 'Si recibe un producto incorrecto, incompleto o en mal estado, repórtelo de inmediato. En casos procedentes ofreceremos, a su elección, la reposición del platillo, un ajuste en la cuenta o la devolución de lo pagado. No aplica la devolución por cambio de opinión de alimentos entregados en buen estado.',
    },

    { type: 'h2', text: '12. Reservaciones' },
    {
      type: 'list',
      items: [
        'Las reservaciones hechas en la app son solicitudes sujetas a disponibilidad y a la confirmación del personal.',
        'Tolerancia: la mesa se mantiene reservada 20 minutos después de la hora reservada; después podrá cancelarse automáticamente.',
        'Grupos de más de 10 personas o eventos especiales se coordinan por WhatsApp y podrían requerir confirmación previa o depósito.',
      ],
    },

    { type: 'h2', text: '13. Promociones y puntos' },
    {
      type: 'p',
      text: 'Las promociones aplican solo durante su vigencia y hasta agotar existencias, no son acumulables entre sí ni canjeables por efectivo. Algunas promociones solo son válidas en el restaurante.',
    },

    { type: 'h2', text: '14. Alergias y preferencias alimentarias' },
    {
      type: 'p',
      text: 'Nuestra cocina maneja múltiples ingredientes (gluten, lácteos, huevo, mariscos, frutos secos y picantes) en un mismo espacio, por lo que no podemos garantizar la ausencia total de trazas por contacto cruzado, aunque usted excluya ingredientes al pedir.',
    },

    { type: 'h2', text: '15. Facturación' },
    {
      type: 'p',
      text: 'La factura (CFDI) debe solicitarse con sus datos fiscales completos dentro del mismo mes calendario del consumo.',
    },

    { type: 'h2', text: '16. Uso permitido y conductas prohibidas' },
    {
      type: 'p',
      text: 'Queda prohibido realizar pedidos o reservaciones falsas, intentar vulnerar la seguridad de la app o del sitio, modificar la app con fines ilícitos, o usar los servicios para actividades ilegales. El incumplimiento derivará en la suspensión de la cuenta y las acciones legales pertinentes.',
    },

    { type: 'h2', text: '17. Propiedad intelectual' },
    {
      type: 'p',
      text: 'El logotipo, el nombre comercial “La 501 Sports Restaurant”, los textos, fotografías y el menú son propiedad del Proveedor y están protegidos por las leyes de propiedad intelectual en México.',
    },

    { type: 'h2', text: '18. Atención de quejas y aclaraciones' },
    {
      type: 'table',
      rows: [
        ['Teléfono / WhatsApp', PRIVACY_PHONE],
        ['Correo', PRIVACY_EMAIL],
        ['Horario', 'Todos los días de 1:00 p.m. a 10:00 p.m.'],
      ],
    },

    { type: 'h2', text: '19. Legislación aplicable' },
    {
      type: 'p',
      text: 'Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos, en particular la Ley Federal de Protección al Consumidor y el Código de Comercio. Para controversias, las partes se someten a los tribunales competentes de Huejutla de Reyes, Hidalgo.',
    },

    { type: 'h2', text: '20. Aceptación' },
    {
      type: 'p',
      text: 'Al usar la app, realizar un pedido o una reservación, usted declara haber leído, entendido y aceptado estos Términos y Condiciones.',
    },
  ],
};
