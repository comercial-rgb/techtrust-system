/**
 * Help Center FAQ list (Spanish). Structure must match helpCenterFaq.en.ts.
 */
export default [
  {
    id: "1",
    question: "¿Cómo solicito un presupuesto de servicio?",
    answer:
      'Para solicitar un presupuesto, ve a la pestaña Inicio y toca "¿Necesitas un servicio?" o el botón +. Selecciona tu vehículo, describe el servicio y envía. Los proveedores locales te enviarán presupuestos en pocas horas.',
    category: "services",
  },
  {
    id: "2",
    question: "¿Cómo agrego un vehículo nuevo?",
    answer:
      'Ve a la pestaña Vehículos y toca la tarjeta "Agregar vehículo". Ingresa marca, modelo, año y matrícula. También puedes añadir datos opcionales como VIN y kilometraje actual.',
    category: "vehicles",
  },
  {
    id: "3",
    question: "¿Cómo pago un servicio?",
    answer:
      "TechTrust usa un modelo de preautorización (retención). Al aceptar un presupuesto, se coloca una retención temporal por el monto cotizado más comisiones. Tu tarjeta NO se cobra hasta que revises y apruebes el servicio completado. Puedes administrar métodos de pago en Perfil → Métodos de pago.",
    category: "payments",
  },
  {
    id: "4",
    question: "¿Puedo cancelar una solicitud de servicio?",
    answer:
      'Sí. Antes de aceptar un presupuesto puedes cancelar sin costo. Después de aceptar: cancelaciones con más de 24 h desde la aceptación tienen una tarifa del 10%; dentro de 24 h, del 25%. Una vez iniciado el servicio, la cancelación requiere validación del proveedor. Usa el botón "Cancelar" en los detalles del servicio: la tarifa se calcula automáticamente.',
    category: "services",
  },
  {
    id: "5",
    question: "¿Cómo cambio mi correo o teléfono?",
    answer:
      "Ve a Perfil → Información personal. Toca el icono de editar, haz los cambios y guarda. Es posible que debas verificar el nuevo correo o teléfono.",
    category: "account",
  },
  {
    id: "6",
    question: "¿Está segura mi información de pago?",
    answer:
      "Sí. Los pagos se procesan a través de procesadores compatibles con PCI-DSS (Stripe y/o Chase Payment Solutions). No almacenamos el número completo de tu tarjeta en nuestros servidores. Los datos se cifran con TLS/SSL en tránsito y en reposo.",
    category: "payments",
  },
  {
    id: "7",
    question: "¿Cómo califico a un proveedor de servicio?",
    answer:
      "Cuando termine el servicio se te pedirá calificar. También puedes hacerlo después en Servicios → Ver servicio completado → Dejar reseña.",
    category: "services",
  },
  {
    id: "8",
    question: "¿Qué pasa si no estoy satisfecho con un servicio?",
    answer:
      'Contacta primero al proveedor para resolverlo. Si no hay acuerdo, comunícate con nuestro equipo mediante "Contáctanos". Ayudaremos a mediar.',
    category: "services",
  },
  {
    id: "9",
    question: "¿Cómo elimino mi cuenta?",
    answer:
      "Ve a Perfil → Información personal → Eliminar cuenta. Esta acción es irreversible y borrará tus datos, historial de servicios y vehículos guardados.",
    category: "account",
  },
  {
    id: "10",
    question: "¿Cómo funcionan los reembolsos?",
    answer:
      'Las solicitudes deben enviarse dentro de las 48 h posteriores a la aprobación del servicio. Usa "Reportar problema" en la pantalla de detalles. Los reembolsos aprobados se procesan a tu método de pago original en 5 a 10 días hábiles. También puedes elegir crédito en la plataforma con un bono del 10% sobre el monto.',
    category: "payments",
  },
];
