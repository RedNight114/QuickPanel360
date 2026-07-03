export type HelpSection = {
  title: string;
  intro: string;
  items: Array<{
    question: string;
    answer: string;
  }>;
  tips?: string[];
};

export const helpSections: Record<string, HelpSection> = {
  '/dashboard': {
    title: 'Dashboard',
    intro: 'Resumen en tiempo real de la actividad del club. Muestra las métricas clave del día.',
    items: [
      {
        question: '¿Qué significa "Caja esperada"?',
        answer: 'Es la suma del efectivo de apertura más todas las aportaciones en efectivo registradas durante la sesión actual.',
      },
      {
        question: '¿Qué son las alertas de "Atención requerida"?',
        answer: 'Son avisos automáticos sobre situaciones que requieren acción: inventario bajo, cuentas pendientes vencidas, emergencias activas, etc.',
      },
      {
        question: '¿Con qué frecuencia se actualizan los datos?',
        answer: 'Los datos se actualizan cada vez que entras al dashboard. Usa el botón "Actualizar" para refrescar manualmente.',
      },
    ],
    tips: [
      'Pulsa en las alertas para ir directamente a la sección correspondiente.',
      'Las acciones rápidas te llevan a las funciones más usadas.',
      'La gráfica de dispensaciones puede verse a 7 o 30 días.',
    ],
  },

  '/pos': {
    title: 'Punto de dispensación',
    intro: 'Aquí registras las dispensaciones a los socios del club. Es el flujo principal de trabajo diario.',
    items: [
      {
        question: '¿Cómo empiezo una dispensación?',
        answer: '1. Abre la caja si no está abierta. 2. Selecciona un socio activo. 3. Añade productos al carrito. 4. Ajusta la bonificación si aplica. 5. Indica la aportación en efectivo. 6. Pulsa "Registrar aportación".',
      },
      {
        question: '¿Qué es la bonificación?',
        answer: 'Es un descuento que se aplica al total. Puede ser sugerida automáticamente según la clase del socio (VIP, Preferente) o su cumpleaños.',
      },
      {
        question: '¿Qué pasa si el socio no aporta el total?',
        answer: 'Se registra como pendiente de aportación. Debes indicar un motivo y opcionalmente una fecha límite. El socio puede aportar la cantidad pendiente más adelante.',
      },
      {
        question: '¿Cómo funciona la verificación de báscula?',
        answer: 'Para productos a peso (gramos), el sistema puede pedir que introduzcas el peso real medido en la báscula. Si la diferencia supera la tolerancia configurada, se registra como incidencia.',
      },
      {
        question: '¿Qué son los botones rápidos (+1g, +5g, +5 CR)?',
        answer: 'Añaden cantidades predefinidas al carrito. Los botones en gramos añaden por peso, los botones en CR añaden por importe (el sistema calcula los gramos según el precio).',
      },
    ],
    tips: [
      'Usa "Manual" para indicar una cantidad exacta en gramos.',
      'Los productos con borde verde ya están en el carrito.',
      'El badge en la esquina del producto muestra la cantidad actual en carrito.',
      'El sistema emite un sonido al completar una dispensación.',
    ],
  },

  '/dispensations': {
    title: 'Historial de dispensaciones',
    intro: 'Consulta todas las dispensaciones realizadas, con filtros, detalle completo y exportación.',
    items: [
      {
        question: '¿Cómo busco una dispensación concreta?',
        answer: 'Usa el buscador para filtrar por nombre del socio, número de socio, nombre del colaborador o nombre del producto. Combínalo con los filtros de estado, tipo y fecha.',
      },
      {
        question: '¿Qué significa cada estado?',
        answer: 'Completada: dispensación registrada correctamente. Anulada: fue cancelada después de registrarse. Devuelta: se realizó una devolución.',
      },
      {
        question: '¿Cómo exporto los datos?',
        answer: 'Pulsa "Exportar CSV". Se descargan todas las dispensaciones que coinciden con los filtros activos en ese momento. El archivo se abre con Excel.',
      },
    ],
    tips: [
      'Haz clic en cualquier fila para ver el detalle completo.',
      'Los filtros de fecha te permiten ver un rango específico.',
      'La exportación respeta los filtros activos.',
    ],
  },

  '/members': {
    title: 'Socios',
    intro: 'Gestión del padrón de socios del club. Alta, edición, estado y seguimiento.',
    items: [
      {
        question: '¿Qué estados puede tener un socio?',
        answer: 'Pendiente (recién registrado), Activo (puede recibir dispensaciones), Suspendido (temporalmente sin servicio), Baja (no puede operar), Inactivo (sin actividad prolongada).',
      },
      {
        question: '¿Qué clases de socio hay?',
        answer: 'Estándar (sin beneficios especiales), Preferente (bonificación sugerida configurable), VIP (mayor bonificación). Las bonificaciones se configuran en Ajustes.',
      },
      {
        question: '¿Se puede dispensar a un socio no activo?',
        answer: 'No. Solo los socios en estado Activo pueden recibir dispensaciones. El punto de dispensación bloquea la operación si el socio no está activo.',
      },
    ],
    tips: [
      'El buscador filtra por nombre, número de socio y teléfono.',
      'Haz clic en un socio para ver su ficha completa con historial.',
    ],
  },

  '/products': {
    title: 'Inventario',
    intro: 'Catálogo de productos y gestión del stock disponible.',
    items: [
      {
        question: '¿Cómo añado stock?',
        answer: 'Desde la ficha del producto, usa el botón de "Entrada de stock". Indica la cantidad y opcionalmente el código de lote y coste unitario.',
      },
      {
        question: '¿Qué es el stock mínimo?',
        answer: 'Es la cantidad por debajo de la cual el sistema genera una alerta de "Inventario bajo". Se configura en cada producto.',
      },
      {
        question: '¿Qué tipos de unidad hay?',
        answer: 'GRAM (productos a peso, se dispensan en gramos), UNIT (unidades enteras), ML, PACK, KG.',
      },
    ],
    tips: [
      'Los productos sin stock aparecen marcados en rojo.',
      'Usa las categorías para organizar el catálogo.',
      'El stock se actualiza automáticamente con cada dispensación.',
    ],
  },

  '/cash': {
    title: 'Caja',
    intro: 'Control de sesiones de caja: apertura, cierre, movimientos y arqueo.',
    items: [
      {
        question: '¿Cómo funciona el ciclo de caja?',
        answer: '1. Se abre la caja indicando el efectivo inicial. 2. Se registran dispensaciones y movimientos durante el turno. 3. Se cierra la caja indicando el efectivo real en caja. El sistema calcula la diferencia.',
      },
      {
        question: '¿Qué es la diferencia de caja?',
        answer: 'Es la resta entre el efectivo real contado al cerrar y el esperado por el sistema. Una diferencia positiva significa que hay más efectivo del esperado. Una negativa, que falta.',
      },
      {
        question: '¿Qué tipos de movimientos hay?',
        answer: 'Entrada de efectivo, salida de efectivo, correcciones, gastos, retiros, aportaciones de socios, pagos a terceros.',
      },
    ],
    tips: [
      'Las diferencias de caja quedan registradas en auditoría.',
      'Puedes ver el detalle de cada sesión cerrada con todos sus movimientos.',
    ],
  },

  '/chat': {
    title: 'Chat interno',
    intro: 'Comunicación en tiempo real entre colaboradores del club.',
    items: [
      {
        question: '¿Cómo funciona el cifrado?',
        answer: 'Los mensajes se cifran en el servidor. Si registras un dispositivo (Más opciones → Mis dispositivos), se activa cifrado extremo a extremo (E2E) donde solo los dispositivos registrados pueden leer los mensajes.',
      },
      {
        question: '¿Cómo menciono a alguien?',
        answer: 'Escribe @ seguido del nombre del participante. Aparecerá un autocompletado. El mencionado recibirá una notificación especial.',
      },
      {
        question: '¿Cómo respondo a un mensaje?',
        answer: 'Pasa el ratón sobre el mensaje y pulsa el icono de respuesta (flecha). Se mostrará una vista previa del mensaje citado sobre el compositor.',
      },
      {
        question: '¿Cómo busco mensajes?',
        answer: 'Pulsa el icono de lupa en la cabecera de la conversación. Escribe el texto a buscar y los resultados aparecerán resaltados.',
      },
    ],
    tips: [
      'Las reacciones rápidas aparecen al pasar el ratón sobre un mensaje.',
      'Puedes archivar conversaciones desde el menú contextual (clic derecho).',
      'El indicador de escritura muestra quién está escribiendo en tiempo real.',
    ],
  },

  '/notifications': {
    title: 'Centro de avisos',
    intro: 'Avisos automáticos del sistema sobre inventario, caja, socios y seguridad.',
    items: [
      {
        question: '¿De dónde vienen los avisos?',
        answer: 'Se generan automáticamente: inventario bajo/agotado, diferencias de caja, tolerancias de báscula superadas, cumpleaños de socios, cuentas pendientes, emergencias activas.',
      },
      {
        question: '¿Qué significan los estados?',
        answer: 'Sin leer (nueva), Leída (vista pero no gestionada), En revisión (alguien la está gestionando), Resuelta (problema solucionado), Archivada (descartada).',
      },
      {
        question: '¿Qué es "Abrir contexto"?',
        answer: 'Te lleva directamente a la sección relacionada con el aviso. Por ejemplo, un aviso de inventario bajo te lleva a la página de inventario.',
      },
    ],
  },

  '/settings': {
    title: 'Configuración',
    intro: 'Ajustes generales del club, punto de dispensación, inventario, caja y seguridad.',
    items: [
      {
        question: '¿Qué es la tolerancia de báscula?',
        answer: 'Es la diferencia máxima permitida entre el peso solicitado y el real. Si se supera, el sistema puede bloquear la operación, pedir confirmación del manager, o solo avisar.',
      },
      {
        question: '¿Qué es la bonificación sugerida por clase?',
        answer: 'Cada clase de socio (Estándar, Preferente, VIP) puede tener una bonificación por defecto que se sugiere automáticamente al seleccionar un socio en el punto de dispensación.',
      },
    ],
  },

  '/analytics': {
    title: 'Analítica',
    intro: 'Informes y métricas de rendimiento del club por período.',
    items: [
      {
        question: '¿Qué métricas incluye?',
        answer: 'Dispensaciones por día, rendimiento por colaborador, productos más dispensados, ticket medio, tendencias de aportaciones.',
      },
    ],
  },

  '/security': {
    title: 'Seguridad',
    intro: 'Gestión de enlaces de acceso, modo emergencia y sesiones activas.',
    items: [
      {
        question: '¿Qué es el modo emergencia?',
        answer: 'Bloquea todos los accesos públicos al club de forma inmediata. Solo los administradores pueden activarlo y desactivarlo.',
      },
    ],
  },

  '/receivables': {
    title: 'Cuentas pendientes',
    intro: 'Seguimiento de aportaciones pendientes de los socios.',
    items: [
      {
        question: '¿Cómo se genera una cuenta pendiente?',
        answer: 'Cuando un socio recibe una dispensación y no aporta el total en efectivo, la diferencia se registra como cuenta pendiente.',
      },
      {
        question: '¿Cómo se cobra una cuenta pendiente?',
        answer: 'Desde esta sección o desde el punto de dispensación (si el socio tiene pendientes, se muestra un aviso con opción de gestionar).',
      },
    ],
  },

  '/profile': {
    title: 'Mi perfil',
    intro: 'Tu información personal, sesiones activas y preferencias.',
    items: [
      {
        question: '¿Puedo cambiar mi contraseña?',
        answer: 'Sí, desde la sección de seguridad en tu perfil.',
      },
    ],
  },

  '/audit': {
    title: 'Auditoría',
    intro: 'Registro de todas las acciones realizadas en el sistema.',
    items: [
      {
        question: '¿Qué se registra?',
        answer: 'Todas las operaciones: dispensaciones, movimientos de caja, cambios de stock, gestión de socios, cambios de configuración, accesos de seguridad.',
      },
    ],
  },
};

export function getHelpForPath(pathname: string): HelpSection | null {
  if (helpSections[pathname]) return helpSections[pathname];

  const base = '/' + pathname.split('/').filter(Boolean)[0];
  return helpSections[base] ?? null;
}
