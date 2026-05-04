/**
 * Help Center FAQ list (Portuguese). Structure must match helpCenterFaq.en.ts.
 */
export default [
  {
    id: "1",
    question: "Como solicito um orçamento de serviço?",
    answer:
      'Para solicitar um orçamento, vá à aba Início e toque em "Precisa de um serviço?" ou no botão +. Selecione o veículo, descreva o serviço e envie. Prestadores locais enviarão orçamentos em poucas horas.',
    category: "services",
  },
  {
    id: "2",
    question: "Como adiciono um veículo novo?",
    answer:
      'Vá à aba Veículos e toque no cartão "Adicionar veículo". Informe marca, modelo, ano e placa. Você também pode incluir dados opcionais como VIN e quilometragem atual.',
    category: "vehicles",
  },
  {
    id: "3",
    question: "Como pago por um serviço?",
    answer:
      "A TechTrust usa pré-autorização (bloqueio) no cartão. Ao aceitar um orçamento, é feita uma reserva temporária pelo valor cotado mais taxas. O cartão só é debitado depois que você revisar e aprovar o serviço concluído. Gerencie formas de pagamento em Perfil → Métodos de pagamento.",
    category: "payments",
  },
  {
    id: "4",
    question: "Posso cancelar uma solicitação de serviço?",
    answer:
      'Sim. Antes de aceitar um orçamento, o cancelamento é sem custo. Depois de aceitar: cancelamentos com mais de 24 h após a aceitação têm taxa de 10%; em até 24 h, taxa de 25%. Com o serviço já iniciado, o cancelamento depende da validação do prestador. Use o botão "Cancelar" nos detalhes do serviço — a taxa é calculada automaticamente.',
    category: "services",
  },
  {
    id: "5",
    question: "Como altero meu e-mail ou telefone?",
    answer:
      "Vá em Perfil → Informações pessoais. Toque no ícone de edição, faça as alterações e salve. Pode ser necessário confirmar o novo e-mail ou telefone.",
    category: "account",
  },
  {
    id: "6",
    question: "Meus dados de pagamento estão seguros?",
    answer:
      "Sim. Os pagamentos são processados por provedores compatíveis com PCI-DSS (Stripe e/ou Chase Payment Solutions). Não armazenamos o número completo do cartão em nossos servidores. Os dados são criptografados com TLS/SSL em trânsito e em repouso.",
    category: "payments",
  },
  {
    id: "7",
    question: "Como avalio um prestador de serviço?",
    answer:
      "Após a conclusão, você será convidado a avaliar. Também pode avaliar depois em Serviços → Ver serviço concluído → Deixar avaliação.",
    category: "services",
  },
  {
    id: "8",
    question: "E se eu não ficar satisfeito com o serviço?",
    answer:
      'Fale primeiro com o prestador para resolver. Se não houver acordo, entre em contato pelo "Fale conosco". Ajudaremos a mediar a situação.',
    category: "services",
  },
  {
    id: "9",
    question: "Como excluo minha conta?",
    answer:
      "Vá em Perfil → Informações pessoais → Excluir conta. Essa ação é irreversível e apaga seus dados, histórico de serviços e veículos salvos.",
    category: "account",
  },
  {
    id: "10",
    question: "Como funcionam os reembolsos?",
    answer:
      'Os pedidos de reembolso devem ser feitos em até 48 h após a aprovação do serviço. Use "Reportar problema" na tela de detalhes. Reembolsos aprovados voltam ao método de pagamento original em 5 a 10 dias úteis. Você também pode optar por crédito na plataforma com bônus de 10% sobre o valor.',
    category: "payments",
  },
];
