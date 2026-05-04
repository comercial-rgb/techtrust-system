/**
 * Help Center FAQ list (English). Structure must match pt/es fragments.
 */
export default [
  {
    id: "1",
    question: "How do I request a service quote?",
    answer:
      'To request a quote, go to the Home tab and tap "Need a service?" or the + button. Select your vehicle, describe the service needed, and submit. Local providers will send you quotes within hours.',
    category: "services",
  },
  {
    id: "2",
    question: "How do I add a new vehicle?",
    answer:
      'Go to the Vehicles tab and tap the "Add Vehicle" card. Enter your vehicle\'s make, model, year, and license plate. You can also add optional details like VIN number and current mileage.',
    category: "vehicles",
  },
  {
    id: "3",
    question: "How do I pay for a service?",
    answer:
      "TechTrust uses a pre-authorization (hold) payment model. When you accept a quote, a temporary hold is placed on your card for the quoted amount plus fees. Your card is NOT charged until you review and approve the completed service. You can add or manage payment methods in Profile > Payment Methods.",
    category: "payments",
  },
  {
    id: "4",
    question: "Can I cancel a service request?",
    answer:
      'Yes. Before accepting a quote, you can cancel at no cost. After accepting a quote: cancellations made more than 24 hours after acceptance incur a 10% fee; within 24 hours, a 25% fee applies. Once service has started, cancellation requires provider validation. Use the "Cancel" button on the service details screen — the fee is calculated automatically.',
    category: "services",
  },
  {
    id: "5",
    question: "How do I change my email or phone number?",
    answer:
      "Go to Profile > Personal Information. Tap the edit icon, make your changes, and save. You may need to verify your new email or phone number.",
    category: "account",
  },
  {
    id: "6",
    question: "Is my payment information secure?",
    answer:
      "Yes. All payment information is processed through PCI-DSS compliant payment processors (Stripe and/or Chase Payment Solutions). We never store your full card number on our servers. Data is encrypted using TLS/SSL both in transit and at rest.",
    category: "payments",
  },
  {
    id: "7",
    question: "How do I rate a service provider?",
    answer:
      "After a service is completed, you'll be prompted to rate your experience. You can also rate later by going to Services > View completed service > Leave a Review.",
    category: "services",
  },
  {
    id: "8",
    question: "What if I'm not satisfied with a service?",
    answer:
      'Contact the service provider first to resolve the issue. If you can\'t reach a resolution, contact our support team through the "Contact Us" option. We\'ll help mediate the situation.',
    category: "services",
  },
  {
    id: "9",
    question: "How do I delete my account?",
    answer:
      "Go to Profile > Personal Information > Delete Account. Note that this action is irreversible and will delete all your data, including service history and saved vehicles.",
    category: "account",
  },
  {
    id: "10",
    question: "How do refunds work?",
    answer:
      'Refund requests must be submitted within 48 hours of service approval. Use the "Report Issue" button on the service details screen. Approved refunds are processed to your original payment method within 5-10 business days. Alternatively, you can choose a platform credit and receive a 10% bonus on the refund amount.',
    category: "payments",
  },
];
