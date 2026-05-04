/**
 * Support chat screen — English copy (FAQ + chrome).
 * Imported by en.ts; structure must match supportChat.pt.ts / supportChat.es.ts.
 */
export default {
  screenTitle: "Help & Support",
  supportHeaderPrefix: "Support",
  headerWithTicket: "{{prefix}} • {{ticketNumber}}",
  activeTicketsTitle: "Active Support Tickets",
  topicsTitle: "How can we help you?",
  topicsSubtitle:
    "Browse topics below to find quick answers, or talk to our support team.",
  articlesCount: "{{count}} articles",
  stillNeedHelpTitle: "Still need help?",
  stillNeedHelpSubtitle:
    "Chat with our support team — we typically respond within minutes.",
  chatWithSupportBtn: "Chat with Support",
  didntFindAnswerTitle: "Didn't find your answer?",
  liveChatSubjectAgent: "I need help from a support agent",
  liveChatSubjectWithTopic: "Help with {{topicTitle}}",
  liveChatMessageWithTopic: "I need help with {{topicTitle}}",
  helpWithTopicSlug: "Help with {{topic}}",
  needHelpWithTopicSlug: "I need help with {{topic}}",
  ticketCreatedBody:
    "Support ticket {{ticketNumber}} created. An agent will respond shortly.",
  resumeTicketBody: "Resumed ticket {{ticketNumber}}",
  creatingTicket: "Creating support ticket...",
  agentTyping: "Agent is typing...",
  supportTeamSubtitle: "Support team",
  liveBadge: "Live",
  leaveChatTitle: "Leave Chat",
  leaveChatBody:
    "Your ticket will remain open. You can resume it anytime from the support screen.",
  stay: "Stay",
  leave: "Leave",
  faqTopics: [
    {
      id: "payments",
      topic: "payments",
      icon: "card-outline",
      title: "Payments & Billing",
      items: [
        {
          q: "How does payment work?",
          a: "When you accept a quote, a pre-authorization hold is placed on your card for the service amount plus fees. The charge is only captured after you approve the completed service.",
        },
        {
          q: "What fees are charged?",
          a: "A 10% platform fee is added to the service total. Payment processing fee (2.9% + $0.30) also applies. You see the full breakdown before accepting any quote.",
        },
        {
          q: "How do I get a refund?",
          a: "You have 48 hours after service approval to request a refund. Go to Services → select the order → Request Refund. You can also choose a 10% bonus platform credit instead.",
        },
        {
          q: "My payment failed, what do I do?",
          a: "Check that your card is valid and has sufficient funds. Go to Profile → Payment Methods to update your card. If the issue persists, contact us below.",
        },
      ],
    },
    {
      id: "services",
      topic: "services",
      icon: "construct-outline",
      title: "Services & Quotes",
      items: [
        {
          q: "How do I request a service?",
          a: "Go to Dashboard → New Request. Select your vehicle, service type, location preference (shop/mobile/roadside), add a description, and submit. Providers will send quotes within 48 hours.",
        },
        {
          q: "What is a mobile service?",
          a: "Mobile service means the provider comes to your location. A travel/displacement fee may apply based on distance. You'll see this fee clearly in the quote breakdown.",
        },
        {
          q: "How do I cancel a service?",
          a: "Go to Services → select the order → Cancel. Cancellation fees depend on the stage: 0% before work starts, 10% after scheduling, 25% after work has begun.",
        },
        {
          q: "My provider hasn't responded",
          a: "Providers have 48 hours to respond to your request. If no quotes are received, the request expires and you can create a new one. You're never charged for expired requests.",
        },
      ],
    },
    {
      id: "account",
      topic: "account",
      icon: "person-outline",
      title: "Account & Profile",
      items: [
        {
          q: "How do I update my information?",
          a: "Go to Profile → Personal Info to update your name, email, or phone. Go to Profile → Addresses to manage your saved addresses.",
        },
        {
          q: "How do I change my password?",
          a: "Go to Profile → Personal Info → Change Password. You'll need to enter your current password and choose a new one.",
        },
        {
          q: "How do I delete my account?",
          a: "Contact our support team below. Account deletion requires all active services to be completed and any outstanding payments settled first.",
        },
      ],
    },
    {
      id: "vehicles",
      topic: "vehicles",
      icon: "car-outline",
      title: "Vehicles",
      items: [
        {
          q: "How do I add a vehicle?",
          a: "Go to Vehicles tab → Add Vehicle. Enter the VIN for automatic detection, or manually enter make, model, and year. You can also scan your license plate.",
        },
        {
          q: "Can I transfer a vehicle?",
          a: "Yes! Go to Vehicles → select vehicle → Transfer. Enter the new owner's email. They'll receive a notification to accept the transfer.",
        },
      ],
    },
    {
      id: "technical",
      topic: "technical",
      icon: "phone-portrait-outline",
      title: "Technical Issues",
      items: [
        {
          q: "The app is running slow",
          a: "Try closing and reopening the app. Make sure you're on the latest version. Clear the app cache in your device settings if the problem persists.",
        },
        {
          q: "I'm not receiving notifications",
          a: "Check that notifications are enabled in your device settings for TechTrust. Also verify in Profile → your notification preferences are turned on.",
        },
      ],
    },
  ],
};
