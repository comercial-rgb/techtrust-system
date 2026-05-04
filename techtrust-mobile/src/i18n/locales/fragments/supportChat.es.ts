/**
 * Support chat screen — Spanish copy.
 * Structure must match supportChat.en.ts.
 */
export default {
  screenTitle: "Ayuda y soporte",
  supportHeaderPrefix: "Soporte",
  headerWithTicket: "{{prefix}} • {{ticketNumber}}",
  activeTicketsTitle: "Tickets de soporte activos",
  topicsTitle: "¿En qué podemos ayudarte?",
  topicsSubtitle:
    "Explora los temas para respuestas rápidas o habla con nuestro equipo de soporte.",
  articlesCount: "{{count}} artículos",
  stillNeedHelpTitle: "¿Aún necesitas ayuda?",
  stillNeedHelpSubtitle:
    "Chatea con soporte: por lo general respondemos en pocos minutos.",
  chatWithSupportBtn: "Chatear con soporte",
  didntFindAnswerTitle: "¿No encontraste tu respuesta?",
  liveChatSubjectAgent: "Necesito ayuda de un agente de soporte",
  liveChatSubjectWithTopic: "Ayuda con: {{topicTitle}}",
  liveChatMessageWithTopic: "Necesito ayuda con: {{topicTitle}}",
  helpWithTopicSlug: "Ayuda con {{topic}}",
  needHelpWithTopicSlug: "Necesito ayuda con {{topic}}",
  ticketCreatedBody:
    "Ticket {{ticketNumber}} creado. Un agente responderá en breve.",
  resumeTicketBody: "Ticket {{ticketNumber}} reanudado",
  creatingTicket: "Creando ticket de soporte...",
  agentTyping: "El agente está escribiendo...",
  supportTeamSubtitle: "Equipo de soporte",
  liveBadge: "En vivo",
  leaveChatTitle: "Salir del chat",
  leaveChatBody:
    "Tu ticket seguirá abierto. Puedes reanudarlo en cualquier momento desde esta pantalla de soporte.",
  stay: "Permanecer",
  leave: "Salir",
  faqTopics: [
    {
      id: "payments",
      topic: "payments",
      icon: "card-outline",
      title: "Pagos y facturación",
      items: [
        {
          q: "¿Cómo funciona el pago?",
          a: "Al aceptar una cotización, se hace una preautorización en tu tarjeta por el monto del servicio más comisiones. El cargo se captura solo después de que apruebes el servicio completado.",
        },
        {
          q: "¿Qué comisiones se cobran?",
          a: "Se añade una comisión de plataforma del 10% al total del servicio. También aplican comisiones de procesamiento (2,9% + US$ 0,30). Verás el desglose completo antes de aceptar cualquier cotización.",
        },
        {
          q: "¿Cómo pido un reembolso?",
          a: "Tienes 48 horas después de aprobar el servicio para solicitar reembolso. Ve a Servicios → selecciona el pedido → Solicitar reembolso. También puedes elegir un bono del 10% en crédito de plataforma.",
        },
        {
          q: "Mi pago falló, ¿qué hago?",
          a: "Comprueba que la tarjeta sea válida y tenga fondos. Ve a Perfil → Métodos de pago para actualizarla. Si sigue fallando, contáctanos abajo.",
        },
      ],
    },
    {
      id: "services",
      topic: "services",
      icon: "construct-outline",
      title: "Servicios y cotizaciones",
      items: [
        {
          q: "¿Cómo solicito un servicio?",
          a: "Ve a Inicio → Nueva solicitud. Elige tu vehículo, tipo de servicio, preferencia de ubicación (taller/móvil/carretera), añade una descripción y envía. Los proveedores envían cotizaciones en hasta 48 horas.",
        },
        {
          q: "¿Qué es un servicio móvil?",
          a: "El proveedor va a tu ubicación. Puede aplicarse una tarifa de desplazamiento según la distancia. La verás claramente en el desglose de la cotización.",
        },
        {
          q: "¿Cómo cancelo un servicio?",
          a: "Ve a Servicios → selecciona el pedido → Cancelar. Las penalizaciones dependen de la etapa: 0% antes de iniciar, 10% tras programar, 25% tras comenzar el trabajo.",
        },
        {
          q: "Mi proveedor no ha respondido",
          a: "Los proveedores tienen 48 horas para responder. Si no hay cotizaciones, la solicitud expira y puedes crear una nueva. No se te cobra por solicitudes expiradas.",
        },
      ],
    },
    {
      id: "account",
      topic: "account",
      icon: "person-outline",
      title: "Cuenta y perfil",
      items: [
        {
          q: "¿Cómo actualizo mi información?",
          a: "Ve a Perfil → Datos personales para nombre, correo o teléfono. En Perfil → Direcciones gestionas tus direcciones guardadas.",
        },
        {
          q: "¿Cómo cambio mi contraseña?",
          a: "Ve a Perfil → Datos personales → Cambiar contraseña. Deberás ingresar la contraseña actual y elegir una nueva.",
        },
        {
          q: "¿Cómo elimino mi cuenta?",
          a: "Contacta al equipo de soporte abajo. La eliminación requiere que no haya servicios activos y que los pagos pendientes estén resueltos.",
        },
      ],
    },
    {
      id: "vehicles",
      topic: "vehicles",
      icon: "car-outline",
      title: "Vehículos",
      items: [
        {
          q: "¿Cómo añado un vehículo?",
          a: "En la pestaña Vehículos → Añadir vehículo. Introduce el VIN para autocompletar o ingresa marca, modelo y año manualmente. También puedes escanear la matrícula.",
        },
        {
          q: "¿Puedo transferir un vehículo?",
          a: "¡Sí! Ve a Vehículos → selecciona el vehículo → Transferir. Introduce el correo del nuevo propietario. Recibirá una notificación para aceptar la transferencia.",
        },
      ],
    },
    {
      id: "technical",
      topic: "technical",
      icon: "phone-portrait-outline",
      title: "Problemas técnicos",
      items: [
        {
          q: "La app va lenta",
          a: "Cierra y vuelve a abrir la app. Asegúrate de tener la última versión. Si continúa, borra la caché de la app en los ajustes del dispositivo.",
        },
        {
          q: "No recibo notificaciones",
          a: "Comprueba que las notificaciones estén activadas para TechTrust en los ajustes del dispositivo y que las preferencias en Perfil estén encendidas.",
        },
      ],
    },
  ],
};
