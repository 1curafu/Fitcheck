import { OPERATOR, PRIVACY_UPDATED, TERMS_UPDATED, type LegalDocument } from "../types";

export const PRIVACY_ES: LegalDocument = {
  title: "Política de privacidad",
  updated: PRIVACY_UPDATED,
  intro:
    "Si esta traducción difiere de la versión inglesa, prevalece la versión inglesa. Fitcheck fotografía tu armario y te sugiere conjuntos a partir de él. Por eso guarda fotos de tu ropa y un poco de información sobre ti. Esta página explica exactamente qué, por qué, quién más la toca y cómo pedirnos que la borremos.",
  sections: [
    {
      id: "who-is-responsible",
      heading: "Quién es responsable",
      paragraphs: [
        `${OPERATOR.name}, que opera desde Suiza, es el responsable del tratamiento de tus datos. Para cualquier asunto de esta página, escribe a ${OPERATOR.email}.`,
        "Se aplica la ley suiza de protección de datos (LPD). Si estás en la UE o el EEE, también se te aplica el RGPD, y cada derecho de la lista de abajo es tuyo según ambas.",
      ],
    },
    {
      id: "what-we-collect",
      heading: "Qué recogemos",
      paragraphs: ["Solo lo que la app necesita para hacer su trabajo. No se recoge nada para publicidad y no se vende nada."],
      bullets: [
        "Tu cuenta: tu dirección de correo y, si inicias sesión con Google, el nombre y la foto de perfil que comparte Google.",
        "Tus respuestas al breve cuestionario de estilo: cómo te gusta vestir y qué prefieres no ponerte.",
        "Tu armario: las fotos que subes, las versiones recortadas que hacemos de ellas y las etiquetas que describen cada prenda — color, tejido, formalidad, etc. Puedes editar cada etiqueta.",
        "Si una foto que subes te muestra llevando la prenda, guardamos esa foto tal como la hiciste. Conservamos el original solo para poder rehacer el recorte con mejores herramientas más adelante; nunca se envía a la IA, nunca se usa para identificarte y nunca se muestra a nadie más que a ti. Puedes borrar la foto original de cualquier prenda que tenga recorte, desde su página. El recorte se queda en tus looks, y un original borrado no puede usarse para rehacer un recorte mejor. Para otras prendas, escribe a legal@fitcheck.space y la eliminaremos. También puedes eliminar definitivamente una prenda quitada desde su página en Prendas quitadas: sus fotos y detalles se eliminan, y los looks pasados conservan sus otras prendas.",
        "Tus looks: los conjuntos que sugiere la app, los que marcas como favoritos y los días en que indicas que te pusiste uno.",
        "Tu ubicación, solo si la das: una ciudad o unas coordenadas y una zona horaria, para que el tiempo de tus looks sea el tuyo. Puedes borrarla en Ajustes.",
        "Si te suscribes a Pro: tu ID de cliente de Stripe, el estado y la fecha de renovación de tu suscripción y cuándo confirmaste que Pro empezara de inmediato. Los datos de la tarjeta van a Stripe y Link y nunca nos llegan.",
        "Detalles técnicos cuando algo falla: el error, la página y el navegador. Ni tu nombre ni lo que escribiste.",
      ],
    },
    {
      id: "sharing-a-look",
      heading: "Compartir un look",
      paragraphs: [
        "Compartir es siempre decisión tuya. Compartir imagen crea una imagen en tu móvil; no guardamos nada de ella. Crear enlace publica una instantánea de un look: sus imágenes, su nombre, la frase del estilista y los nombres de sus prendas (y sus marcas, solo si lo eliges). Cualquiera con el enlace puede verlo durante 30 días, o hasta que dejes de compartirlo, desde el look o desde Ajustes. No lleva nombre, cuenta ni nada más tuyo, y los buscadores no lo indexan. Eliminar tu cuenta retira al instante tus looks compartidos. Una imagen que publiques en Instagram, TikTok o cualquier otro sitio es una copia que no podemos borrar. Tras una restauración de emergencia de nuestros sistemas, los enlaces compartidos se desactivan y hay que volver a compartirlos.",
      ],
    },
    {
      id: "contacting-support",
      heading: "Contactar con soporte",
      paragraphs: [
        "Si contactas con support@fitcheck.space, usamos tu dirección de respuesta, el tema elegido y el mensaje para ayudarte. El formulario no adjunta tu armario, cuenta o ubicación. La dirección indicada sirve para responder y no demuestra la titularidad de la cuenta.",
        "Resend entrega los mensajes en nuestro buzón de soporte: Namecheap reenvía el correo para support@fitcheck.space a un buzón de Gmail gestionado por Google. Cloudflare Turnstile comprueba señales del navegador para detectar spam; no le enviamos el mensaje ni la dirección de respuesta. La aplicación no añade tu dirección IP a la verificación del servidor, pero el widget puede tratarla. Cloudflare es encargado del tratamiento para la seguridad del sitio y responsable cuando mejora la detección de bots.",
        "Eliminamos la correspondencia cerrada y la papelera del buzón dentro de los 90 días posteriores a la última respuesta. Eliminar la cuenta no borra automáticamente los correos de soporte. Escribe a legal@fitcheck.space para solicitar su eliminación. Los registros de entrega de los proveedores siguen sus propias reglas de conservación.",
      ],
    },
    {
      id: "why-we-use-it",
      heading: "Para qué los usamos",
      paragraphs: [
        "Para responder a solicitudes de soporte y proteger el formulario del spam. Según el RGPD, es nuestro interés legítimo ayudar a las personas y mantener seguro el servicio.",
        "Para prestar el servicio en el que te registraste — etiquetar tu ropa, crear looks, recordar lo que te pusiste. Según el RGPD, es la ejecución de un contrato.",
        "Para mantener la app funcionando y encontrar errores. Según el RGPD, es nuestro interés legítimo, y se limita a los informes de errores.",
        "Para venderte Pro y mantenerlo activo mientras pagues. De nuevo un contrato, más la contabilidad que exige la ley.",
        "Nada más. Ninguna elaboración de perfiles más allá de estilizar tu propio armario, nada de publicidad, nada de compartir con intermediarios de datos.",
      ],
    },
    {
      id: "who-else-sees-it",
      heading: "Quién más los ve",
      paragraphs: [
        "Usamos un pequeño número de empresas para que Fitcheck funcione. Cada una recibe solo lo que su tarea necesita y está obligada por un acuerdo de tratamiento de datos.",
      ],
      bullets: [
        "Supabase (UE, Fráncfort) — guarda tu cuenta, tus fotos y todo lo anterior. Tus datos están en la UE.",
        "Anthropic (EE. UU.) — la IA que etiqueta tu ropa. Recibe la foto recortada de una prenda para describirla, y descripciones breves en texto de las prendas — nunca fotos — para razonar sobre los conjuntos. Anthropic no entrena sus modelos con los datos enviados a través de su API.",
        "OpenWeather — recibe tus coordenadas para devolver una previsión. Nada más.",
        "Google — el inicio de sesión con Google, si lo eliges, y Gmail, que aloja nuestro buzón de soporte y guarda los mensajes que nos envías.",
        "Resend (EE. UU.) — envía correos de acceso y entrega en nuestro buzón los mensajes de soporte con tu dirección de respuesta, el tema y el mensaje.",
        "Namecheap (EE. UU.) — reenvía los correos enviados a support@fitcheck.space, incluidos tu dirección de respuesta y tu mensaje, a ese buzón de Gmail.",
        "Cloudflare Turnstile — recibe señales de seguridad del navegador en la página de soporte para comprobar el spam; no le enviamos el mensaje ni la dirección de respuesta.",
        "Stripe — gestiona el pago de Pro; junto con Link, los únicos que ven los datos de la tarjeta.",
        "Link (Stripe) — te vende Fitcheck Pro como vendedor oficial (merchant of record): cobra el pago, aplica el IVA y envía los recibos, según sus propias condiciones y su propia política de privacidad. Eliminar tu cuenta de Fitcheck cancela tu suscripción; Link y Stripe conservan los registros de pago que exige la ley.",
        "Sentry (UE) — recibe informes de errores para que podamos arreglar lo que se rompió.",
        "Vercel — aloja la app y cuenta las visitas a las páginas sin cookies ni ningún identificador guardado en tu dispositivo. Como cualquier alojamiento, también ve las solicitudes de tu navegador.",
      ],
    },
    {
      id: "data-leaving-europe",
      heading: "Datos que salen de Europa",
      paragraphs: [
        "Anthropic, Resend, Cloudflare, Namecheap, Google y Stripe tienen su sede en Estados Unidos o tratan datos allí. Las transferencias a ellos se basan en el Marco de Privacidad de Datos UE-EE. UU. cuando el proveedor está certificado y, en caso contrario, en las cláusulas contractuales tipo de la Comisión Europea, que Suiza reconoce con su propio anexo. Cuando lo ofrecen, Google y Stripe atienden a los usuarios de Suiza y la UE a través de sus sociedades europeas.",
      ],
    },
    {
      id: "how-long-we-keep-it",
      heading: "Cuánto tiempo los guardamos",
      paragraphs: [
        "Mientras tengas una cuenta. Elimina tu cuenta en Ajustes; una eliminación correcta borra de inmediato tus datos activos. Para borrar solo la foto original de una prenda, o eliminar definitivamente una prenda quitada, usa las opciones de la página de esa prenda. También puedes escribir a legal@fitcheck.space si necesitas ayuda para eliminar algo.",
        "Las copias de seguridad cifradas pueden conservar datos eliminados durante 30 días como máximo antes de caducar. Los informes de errores se guardan 90 días. Los registros de pago que exige la ley los guardan Link y Stripe durante el tiempo que marque la normativa fiscal; nuestra copia de tu estado de facturación desaparece con tu cuenta.",
      ],
    },
    {
      id: "your-rights",
      heading: "Tus derechos",
      paragraphs: [
        `Elimina tu cuenta en Ajustes, o escribe a ${OPERATOR.email} si necesitas ayuda. Respondemos a otras solicitudes de derechos en un plazo de 30 días. Puedes:`,
      ],
      bullets: [
        "Ver todo lo que tenemos sobre ti y obtener una copia en un formato legible por máquina.",
        "Corregir lo que esté mal — casi todo se puede corregir directamente en la app.",
        "Hacer que se elimine tu cuenta y todo lo que contiene.",
        "Oponerte a cualquier tratamiento basado en el interés legítimo, o pedirnos que lo limitemos.",
        "Reclamar ante una autoridad de control: el Comisionado Federal de Protección de Datos e Información de Suiza, o la autoridad de tu país de la UE.",
      ],
    },
    {
      id: "cookies-and-storage-on-your-device",
      heading: "Cookies y almacenamiento en tu dispositivo",
      paragraphs: [
        "Fitcheck solo usa las cookies que necesita para mantener tu sesión iniciada y recordar tu idioma. No hay cookies publicitarias ni de rastreo, por eso ves un aviso en lugar de una petición de consentimiento.",
        "La app también guarda algunas preferencias pequeñas en el almacenamiento de tu navegador — por ejemplo, qué notas de versión ya has cerrado. Nunca salen de tu dispositivo.",
      ],
    },
    {
      id: "age",
      heading: "Edad",
      paragraphs: ["Fitcheck es para personas de 16 años o más. Si eres menor, no crees una cuenta, por favor."],
    },
    {
      id: "changes",
      heading: "Cambios",
      paragraphs: [
        "Cuando esta página cambie de forma relevante, la fecha de arriba se actualizará y la app te avisará en tu próxima visita. La versión vigente está siempre en fitcheck.space/privacy.",
      ],
    },
  ],
};

export const TERMS_ES: LegalDocument = {
  title: "Términos del servicio",
  updated: TERMS_UPDATED,
  intro:
    "Si esta traducción difiere de la versión inglesa, prevalece la versión inglesa. Estos son los términos para usar Fitcheck. Son breves porque el trato es sencillo: tú traes tu armario, nosotros te sugerimos qué ponerte, y tú sigues al mando de tu ropa y de tus datos.",
  sections: [
    {
      id: "who-you-are-dealing-with",
      heading: "Con quién tratas",
      paragraphs: [
        `Fitcheck lo gestiona ${OPERATOR.name}, ${OPERATOR.address}. Preguntas, avisos y reclamaciones a ${OPERATOR.email}.`,
      ],
    },
    {
      id: "your-account",
      heading: "Tu cuenta",
      paragraphs: [
        "Necesitas tener al menos 16 años para usar Fitcheck. Mantén bajo tu control el correo con el que inicias sesión; respondes de todo lo que se haga desde tu cuenta. Una cuenta por persona.",
      ],
    },
    {
      id: "your-clothes-your-photos",
      heading: "Tu ropa, tus fotos",
      paragraphs: [
        "Todo lo que subes sigue siendo tuyo. Nos das permiso para guardarlo, quitarle el fondo, describirlo con etiquetas, enviarlo a la IA que hace la descripción y mostrártelo en conjuntos — y para nada más. Ese permiso termina cuando eliminas la prenda o tu cuenta.",
        "Sube solo fotos que tengas derecho a usar. La gracia es tu propio armario; las fotos de otras personas, y otras personas, no.",
        "Eres responsable de lo que compartes. Un look compartido se puede denunciar desde su página, y Fitcheck puede retirar un look compartido que incumpla estos términos.",
      ],
    },
    {
      id: "what-the-suggestions-are",
      heading: "Qué son las sugerencias",
      paragraphs: [
        "Los looks de Fitcheck son sugerencias que hace un software a partir de las etiquetas de tu ropa y del tiempo. Suelen ser buenas y a veces fallan. No son una promesa de que un conjunto encaje con una ocasión, un código de vestimenta o contigo. Mírate al espejo antes de salir de casa.",
        "Las etiquetas que la IA escribe para una prenda son un primer borrador. Puedes corregir cualquiera de ellas, y la app mejora cuando lo haces.",
      ],
    },
    {
      id: "free-and-paid",
      heading: "Gratis y de pago",
      paragraphs: [
        "El plan gratuito pretende ser útil de verdad y seguirá siendo gratuito. El plan de pago, Fitcheck Pro, añade funciones y elimina límites; lo que incluye y lo que cuesta se muestran antes de comprar, y el precio incluye el IVA aplicable.",
        "Fitcheck Pro se vende a través de Link, el servicio de vendedor oficial (merchant of record) de Stripe: Link es el vendedor de la suscripción, cobra el pago, aplica el IVA y te envía los recibos y facturas. Pro cuesta CHF 5 al mes o CHF 50 al año; la app muestra el equivalente en euros o dólares cuando corresponde, y las demás monedas se convierten al pagar. Todos los precios incluyen IVA.",
        "Pro se renueva automáticamente hasta que canceles. Puedes cancelar cuando quieras en la app (Perfil → Gestionar suscripción); Pro sigue hasta el final del periodo pagado y no se renueva. Cambiar entre mensual y anual surte efecto de inmediato, y la parte no usada del periodo actual se abona en el nuevo. Si falla un pago de renovación, se reintenta durante unas dos semanas mientras Pro sigue funcionando; si sigue fallando, Pro termina. Una suscripción por cuenta.",
        "Eliminar tu cuenta en Ajustes cancela tu suscripción de inmediato — antes de eliminar ninguno de tus datos — y no se renueva. Los reembolsos siguen las normas de Link y la ley; escríbenos a la dirección de arriba si algo ha ido mal.",
        "Si eres consumidor en la UE, normalmente tienes un derecho de desistimiento de 14 días sobre una compra. Como Pro empieza a funcionar en el momento en que te suscribes, te pedimos que confirmes expresamente al pagar que quieres que empiece de inmediato y que aceptes perder ese derecho una vez empezado. Sin esa confirmación, tu derecho de 14 días no se ve afectado. La confirmación es la casilla de la pantalla para hacerte Pro, y registramos cuándo la diste.",
        "Podemos cambiar el precio de Pro con al menos 30 días de preaviso por correo. Si no quieres el nuevo precio, cancela antes de que entre en vigor.",
      ],
    },
    {
      id: "fair-use",
      heading: "Uso justo",
      paragraphs: [
        "No intentes entrar en cuentas ajenas, sobrecargar el servicio, copiarlo ni usarlo para crear uno de la competencia. No subas nada ilegal. Podemos suspender o cerrar una cuenta que haga estas cosas, y te diremos por qué.",
      ],
    },
    {
      id: "ending-things",
      heading: "Poner fin",
      paragraphs: [
        `Puedes eliminar tu cuenta cuando quieras en Ajustes. Una eliminación correcta borra de inmediato tus datos activos, mientras que las copias de seguridad cifradas caducan en 30 días; ${OPERATOR.email} sigue disponible si necesitas ayuda. Podemos poner fin al servicio o a tu acceso con 30 días de preaviso, y de inmediato si incumples estos términos.`,
      ],
    },
    {
      id: "what-we-are-and-are-not-responsible-for",
      heading: "De qué respondemos y de qué no",
      paragraphs: [
        "Trabajamos para que Fitcheck esté disponible, sea preciso y seguro, pero lo ofrecemos tal cual. En la medida en que la ley lo permita, no respondemos de pérdidas derivadas de confiar en una sugerencia de conjunto, de que el servicio no esté disponible o de cualquier cosa fuera de nuestro control. Nada de esto limita la responsabilidad por dolo, negligencia grave o cualquier cosa que la ley no nos permita limitar.",
        "Si eres consumidor, nada de estos términos te quita los derechos que te da la ley de tu país y a los que no puedes renunciar.",
      ],
    },
    {
      id: "law-and-disputes",
      heading: "Ley y conflictos",
      paragraphs: [
        "Se aplica la ley suiza, y los conflictos corresponden a los tribunales del domicilio del operador en Suiza. Si eres consumidor en la UE, conservas la protección de la ley de tu país y puedes presentar una demanda ante los tribunales de tu país.",
      ],
    },
    {
      id: "changes",
      heading: "Cambios",
      paragraphs: [
        "Si cambiamos estos términos de forma relevante, la fecha de arriba se actualizará y la app te avisará en tu próxima visita. Seguir usando Fitcheck después significa que aceptas el cambio. Si eres suscriptor de pago de Pro y un cambio es claramente peor para ti, te pediremos que lo confirmes activamente antes de que se aplique, y en su lugar podrás cancelar sin coste. Si no aceptas un cambio, elimina tu cuenta y no te obligaremos a cumplirlo.",
      ],
    },
  ],
};
