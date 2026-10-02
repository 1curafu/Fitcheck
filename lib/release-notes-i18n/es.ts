import type { LocalizedNote } from "@/lib/release-notes";

/** Keyed by version; one entry for every RELEASE_NOTES version, same line counts. */
export const ES_NOTES: Record<string, LocalizedNote> = {
  "0.8.0": {
    headline: "Guarda los looks que te encantan y vuelve a llevarlos.",
    added: ["Guarda un look y encuéntralo en Perfil, Conjuntos guardados", "Los viajes llevan un abrigo cálido para el frío y tops ligeros para el calor", "Un aviso te recuerda cuando las noches son frías"],
    fixed: ["Las prendas de punto grueso salen de los looks desde 27°C"],
  },
  "0.7.0": {
    headline: "Tus respuestas sobre colores y corte ahora guían tus looks.",
    added: ["Colores y corte cuentan en cada look y cada viaje", "Los consejos de compra Pro respetan lo que evitas y tus códigos de vestimenta", "Nueva página de Ayuda, en Ajustes y en la pantalla de inicio de sesión"],
    fixed: ["Los viajes eligen primero un conjunto coherente y luego lo ajustan a tu gusto"],
  },
  "0.6.0": {
    headline: "Tus respuestas de estilo ahora dan forma a tus looks.",
    added: ["Lo que quieres evitar queda fuera de todos los looks y viajes", "Cambia tus respuestas de estilo cuando quieras: Ajustes, Perfil de estilo", "Las prendas nuevas se recortan y se ven más grandes en los looks"],
    fixed: ["Al cambiar las ocasiones, los looks de hoy se actualizan al instante"],
  },
  "0.5.1": {
    headline: "Pequeñas correcciones y mejoras.",
    added: [],
    fixed: ["Algunas pequeñas correcciones para que todo funcione bien"],
  },
  "0.5.0": {
    headline: "Fitcheck ahora habla diez idiomas.",
    added: ["Usa Fitcheck en español, inglés, alemán, francés y más", "Elige tu idioma en un pequeño menú en la bienvenida o en Ajustes", "Tus looks, el tiempo y los detalles de las prendas aparecen en tu idioma", "Los looks pasados aparecen en tu idioma; el original se conserva"],
    fixed: ["El texto de bienvenida ya no roza los botones de acceso", "Los nombres de ocasión largos caben en una línea"],
  },
  "0.4.1": {
    headline: "Compartir un look es más fácil, y las prendas quitadas pueden irse del todo.",
    added: ["Crear enlace ahora copia el enlace por ti", "Elimina definitivamente una prenda quitada desde su página"],
    fixed: ["Copiar ahora muestra Copiado en el propio botón", "Mostrar marcas explica cuándo tus prendas aún no tienen marca"],
  },
  "0.4.0": {
    headline: "Comparte tus looks, añade prendas por lotes y recupera prendas.",
    added: [
      "Comparte un look como historia, publicación o enlace",
      "Añade varias prendas a la vez desde tus fotos",
      "Devuelve una prenda quitada desde Prendas quitadas",
      "Borra la foto original de una prenda; su recorte sigue en tus looks",
    ],
    fixed: ["Ahora solo se pueden añadir fotos a tu armario"],
  },
  "0.3.9": {
    headline: "Los reembolsos de Pro ahora se gestionan limpiamente de principio a fin.",
    added: ["Una suscripción Pro reembolsada termina al momento — sin más cargos"],
    fixed: ["Un reembolso ya no deja una suscripción activa"],
  },
  "0.3.8": {
    headline: "Llega Fitcheck Pro — todas las funciones, al mes o al año.",
    added: ["Hazte Pro al mes o al año, y gestiónalo o cancélalo cuando quieras"],
    fixed: ["Los ajustes de tu cuenta están aún mejor protegidos"],
  },
  "0.3.7": {
    headline: "Trabajo discreto entre bastidores para mantener tus datos a salvo.",
    added: ["Cada actualización comprueba ahora que sus cambios en la base de datos llegan"],
    fixed: ["Un cambio en la base de datos ya no puede perderse sin que lo notemos"],
  },
  "0.3.6": {
    headline: "Quitar una prenda ahora te dice exactamente qué pasa.",
    added: ["Quitar una prenda pregunta primero y explica qué se conserva y qué no"],
    fixed: ["El aviso de cookies ya no tapa el botón de volver"],
  },
  "0.3.5": {
    headline: "Eliminar la cuenta es más fiable entre bastidores.",
    added: ["Si alguna vez falla la eliminación de tu cuenta, lo sabemos al momento"],
    fixed: ["Una eliminación fallida ahora nos dice exactamente qué paso arreglar"],
  },
  "0.3.4": {
    headline: "Tus copias de seguridad ahora lo recuperan todo — fotos incluidas.",
    added: ["La recuperación desde una copia de seguridad se prueba ahora de principio a fin"],
    fixed: ["Una copia recuperada vuelve a dar acceso a tus fotos", "Los nuevos registros funcionan justo después de una recuperación"],
  },
  "0.3.3": {
    headline: "Eliminar tu cuenta ya no deja nada atrás.",
    added: ["La eliminación de la cuenta comprueba dos veces que no quede ninguna foto"],
    fixed: [
      "Una foto que se sube desde otro dispositivo mientras eliminas también se borra",
      "Una copia recuperada ya no conserva fotos de una cuenta eliminada",
    ],
  },
  "0.3.2": {
    headline: "Tu cuenta, tu decisión — la eliminación ya está en Ajustes.",
    added: [
      "Elimina tu cuenta y tus datos activos directamente desde Ajustes",
      "Fitcheck guarda ahora copias de seguridad cifradas por si algo falla",
    ],
    fixed: ["Una copia recuperada ya no puede devolver una cuenta eliminada"],
  },
  "0.3.1": {
    headline: "Recortes más limpios, y Girar donde puedes verlo.",
    added: ["El botón Girar está ahora sobre la foto, para que la veas girar"],
    fixed: [
      "Los huecos entre la manga y el cuerpo ya no salen como manchas blancas",
      "Repetir foto ya no parece un botón de girar",
      "Esta tarjeta también aparece tras actualizar la app de la pantalla de inicio",
    ],
  },
  "0.3.0": {
    headline: "Añadir ropa es más rápido, y queda en la posición correcta.",
    added: [
      "Quitar el fondo tarda menos de un segundo — y descarga 5× menos",
      "¿Foto de lado? La enderezamos por ti — y hay un botón Girar",
      "Privacidad y términos en lenguaje claro, enlazados donde importan",
    ],
    fixed: ["La ropa blanca sobre fondos claros ya no pierde los bordes", "Bajos de pantalón y puños conservan su forma en el recorte"],
  },
  "0.2.0": {
    headline: "Tus looks son ahora más listos.",
    added: [
      "Vestidos y monos — una pieza única ya es un look completo",
      "Bolsos, relojes y un segundo accesorio pueden entrar en un look",
      "Los conjuntos sopesan tejido con tejido: lino con lana, seda con piel",
      "Los zapatos se valoran según lo que llevas con ellos, no por sí solos",
    ],
    fixed: [
      "Un vestido ya no recibe zapatillas cuando pedía algo más arreglado",
      "Zapatillas con traje solo donde de verdad funciona",
      "Un bolso o reloj que repite un color por fin se tiene en cuenta",
      "Dos prendas de punto gruesas juntas ya no pasan por buena idea",
    ],
  },
};
