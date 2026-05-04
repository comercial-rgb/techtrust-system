/**
 * Support chat screen — Portuguese (Brazil) copy.
 * Structure must match supportChat.en.ts.
 */
export default {
  screenTitle: "Ajuda e suporte",
  supportHeaderPrefix: "Suporte",
  headerWithTicket: "{{prefix}} • {{ticketNumber}}",
  activeTicketsTitle: "Chamados de suporte ativos",
  topicsTitle: "Como podemos ajudar?",
  topicsSubtitle:
    "Veja os tópicos abaixo para respostas rápidas ou fale com nossa equipe de suporte.",
  articlesCount: "{{count}} artigos",
  stillNeedHelpTitle: "Ainda precisa de ajuda?",
  stillNeedHelpSubtitle:
    "Converse com o suporte — em geral respondemos em poucos minutos.",
  chatWithSupportBtn: "Falar com o suporte",
  didntFindAnswerTitle: "Não encontrou sua resposta?",
  liveChatSubjectAgent: "Preciso de ajuda de um agente de suporte",
  liveChatSubjectWithTopic: "Ajuda com: {{topicTitle}}",
  liveChatMessageWithTopic: "Preciso de ajuda com: {{topicTitle}}",
  helpWithTopicSlug: "Ajuda com {{topic}}",
  needHelpWithTopicSlug: "Preciso de ajuda com {{topic}}",
  ticketCreatedBody:
    "Chamado {{ticketNumber}} criado. Um agente responderá em breve.",
  resumeTicketBody: "Chamado {{ticketNumber}} retomado",
  creatingTicket: "Criando chamado de suporte...",
  agentTyping: "O agente está digitando...",
  supportTeamSubtitle: "Equipe de suporte",
  liveBadge: "Ao vivo",
  leaveChatTitle: "Sair do chat",
  leaveChatBody:
    "Seu chamado permanece aberto. Você pode retomá-lo a qualquer momento nesta tela de suporte.",
  stay: "Ficar",
  leave: "Sair",
  faqTopics: [
    {
      id: "payments",
      topic: "payments",
      icon: "card-outline",
      title: "Pagamentos e faturamento",
      items: [
        {
          q: "Como funciona o pagamento?",
          a: "Ao aceitar um orçamento, é feita uma pré-autorização no cartão pelo valor do serviço mais taxas. A cobrança só é confirmada depois que você aprovar o serviço concluído.",
        },
        {
          q: "Quais taxas são cobradas?",
          a: "É adicionada uma taxa de plataforma de 10% sobre o total do serviço. Também incidem taxas de processamento (2,9% + US$ 0,30). Você vê o detalhamento completo antes de aceitar qualquer orçamento.",
        },
        {
          q: "Como peço reembolso?",
          a: "Você tem até 48 horas após aprovar o serviço para solicitar reembolso. Vá em Serviços → selecione o pedido → Solicitar reembolso. Também é possível optar por 10% de bônus em crédito na plataforma.",
        },
        {
          q: "Meu pagamento falhou. O que faço?",
          a: "Verifique se o cartão é válido e se há limite. Vá em Perfil → Formas de pagamento para atualizar o cartão. Se continuar falhando, fale conosco abaixo.",
        },
      ],
    },
    {
      id: "services",
      topic: "services",
      icon: "construct-outline",
      title: "Serviços e orçamentos",
      items: [
        {
          q: "Como solicito um serviço?",
          a: "Vá em Início → Nova solicitação. Selecione o veículo, tipo de serviço, preferência de local (oficina/móvel/assistência), descreva o problema e envie. Os prestadores enviam orçamentos em até 48 horas.",
        },
        {
          q: "O que é serviço móvel?",
          a: "O prestador vai até você. Pode haver taxa de deslocamento conforme a distância. O valor aparece claramente no detalhamento do orçamento.",
        },
        {
          q: "Como cancelo um serviço?",
          a: "Vá em Serviços → selecione o pedido → Cancelar. As taxas de cancelamento variam conforme a etapa: 0% antes de iniciar o trabalho, 10% após agendamento, 25% após o início do serviço.",
        },
        {
          q: "O prestador não respondeu",
          a: "Os prestadores têm até 48 horas para responder. Se não houver orçamentos, a solicitação expira e você pode criar outra. Você não é cobrado por solicitações expiradas.",
        },
      ],
    },
    {
      id: "account",
      topic: "account",
      icon: "person-outline",
      title: "Conta e perfil",
      items: [
        {
          q: "Como atualizo meus dados?",
          a: "Vá em Perfil → Dados pessoais para nome, e-mail ou telefone. Em Perfil → Endereços você gerencia endereços salvos.",
        },
        {
          q: "Como altero minha senha?",
          a: "Vá em Perfil → Dados pessoais → Alterar senha. Será necessário informar a senha atual e definir uma nova.",
        },
        {
          q: "Como excluo minha conta?",
          a: "Fale com o suporte abaixo. A exclusão exige que não haja serviços ativos e que pagamentos pendentes estejam quitados.",
        },
      ],
    },
    {
      id: "vehicles",
      topic: "vehicles",
      icon: "car-outline",
      title: "Veículos",
      items: [
        {
          q: "Como adiciono um veículo?",
          a: "Na aba Veículos → Adicionar veículo. Informe o VIN para preenchimento automático ou preencha marca, modelo e ano manualmente. Também é possível escanear a placa.",
        },
        {
          q: "Posso transferir um veículo?",
          a: "Sim! Veículos → selecione o veículo → Transferir. Informe o e-mail do novo proprietário. Ele receberá um aviso para aceitar a transferência.",
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
          q: "O app está lento",
          a: "Feche e abra o app novamente. Confirme se está na versão mais recente. Se persistir, limpe o cache do app nas configurações do aparelho.",
        },
        {
          q: "Não estou recebendo notificações",
          a: "Verifique se as notificações estão ativadas para a TechTrust nas configurações do aparelho e se as preferências de notificação no Perfil estão ligadas.",
        },
      ],
    },
  ],
};
