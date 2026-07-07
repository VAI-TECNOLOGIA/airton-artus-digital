// Rótulos PT-BR e opções para os enums do backend.

export const LABELS = {
  UserRole: {
    LIDER: 'Líder de Campanha',
    MEMBRO: 'Membro da Equipe',
    PARCEIRO: 'Parceiro',
  },
  SupportType: {
    VOLUNTARIO: 'Quero ser voluntário',
    FAIXA_CASA: 'Faixa na minha casa',
    ADESIVO_CARRO: 'Adesivo para carro',
    MATERIAL_DIGITAL: 'Material digital',
    CAMINHADA: 'Participar de caminhada',
    EVENTOS: 'Ajudar em eventos',
    INDICAR: 'Indicar pessoas',
    NOTICIAS: 'Receber notícias',
  },
  SupporterStatus: {
    NOVO: 'Novo',
    CONFIRMADO: 'Confirmado',
    ATIVO: 'Ativo',
    PENDENTE: 'Pendente',
    SUSPEITO: 'Suspeito',
    INATIVO: 'Inativo',
    BLACKLIST: 'Blacklist',
  },
  Channel: {
    WHATSAPP: 'WhatsApp',
    INSTAGRAM: 'Instagram',
    MESSENGER: 'Messenger',
    SMS: 'SMS',
    CHAT_INTERNO: 'Chat interno',
  },
  ConversationStatus: {
    ABERTA: 'Aberta',
    EM_ATENDIMENTO: 'Em atendimento',
    AGUARDANDO: 'Aguardando',
    ENCAMINHADA: 'Encaminhada',
    RESOLVIDA: 'Resolvida',
    FECHADA: 'Fechada',
  },
  NoticeType: {
    AVISO: 'Aviso', CONVOCACAO: 'Convocação', AGENDA: 'Agenda', ORIENTACAO: 'Orientação',
    VIDEO: 'Vídeo', LINK: 'Link', PRIORIDADE: 'Prioridade', URGENTE: 'Urgente',
  },
  Priority: { BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', URGENTE: 'Urgente' },
  PublishStatus: { RASCUNHO: 'Rascunho', PUBLICADO: 'Publicado', ARQUIVADO: 'Arquivado' },
  MediaType: {
    VIDEO: 'Vídeo', REELS: 'Reels', STORY: 'Story', ARTE: 'Arte', JINGLE: 'Jingle',
    CAPA_FACEBOOK: 'Capa Facebook', CARD_WHATSAPP: 'Card WhatsApp', LEGENDA: 'Legenda',
  },
  SocialNetwork: {
    INSTAGRAM: 'Instagram', FACEBOOK: 'Facebook', WHATSAPP: 'WhatsApp',
    TIKTOK: 'TikTok', YOUTUBE: 'YouTube', TODAS: 'Todas as redes',
  },
  TaskType: {
    POST_INSTAGRAM: 'Publicar no Instagram', POST_FACEBOOK: 'Publicar no Facebook',
    SHARE_WHATSAPP: 'Compartilhar no WhatsApp', CAMINHADA: 'Participar de caminhada',
    FAIXA: 'Colocar faixa', ADESIVOS: 'Entregar adesivos', CONVIDAR: 'Convidar pessoas',
    EVENTO: 'Comparecer a evento',
  },
  MaterialRequestStatus: {
    SOLICITADO: 'Solicitado', EM_ANALISE: 'Em análise', APROVADO: 'Aprovado',
    SEPARADO: 'Separado', ENTREGUE: 'Entregue', RECUSADO: 'Recusado', CANCELADO: 'Cancelado',
  },
  BannerStatus: {
    AUTORIZADO: 'Autorizado', AGUARDANDO_INSTALACAO: 'Aguardando instalação',
    INSTALADO: 'Instalado', RECUSADO: 'Recusado', REMOVIDO: 'Removido', SUSPEITO: 'Suspeito',
  },
  StreetActionType: {
    CAMINHADA: 'Caminhada', REUNIAO: 'Reunião', VISITA: 'Visita', EVENTO: 'Evento',
    ENTREGA_MATERIAL: 'Entrega de material', INSTALACAO_FAIXA: 'Instalação de faixa',
    CARREATA: 'Carreata', BANDEIRACO: 'Bandeiraço',
  },
  ActionStatus: { PLANEJADA: 'Planejada', EM_ANDAMENTO: 'Em andamento', REALIZADA: 'Realizada', CANCELADA: 'Cancelada' },
  EventStatus: { AGENDADO: 'Agendado', CONFIRMADO: 'Confirmado', REALIZADO: 'Realizado', CANCELADO: 'Cancelado' },
  DemandCategory: {
    SAUDE: 'Saúde', EDUCACAO: 'Educação', INFRAESTRUTURA: 'Infraestrutura',
    SEGURANCA: 'Segurança', EMPREGO: 'Emprego', TRANSPORTE: 'Transporte', OUTROS: 'Outros',
  },
  DemandStatus: { NOVA: 'Nova', EM_ANALISE: 'Em análise', EM_ANDAMENTO: 'Em andamento', RESOLVIDA: 'Resolvida', ARQUIVADA: 'Arquivada' },
  BroadcastStatus: { RASCUNHO: 'Rascunho', AGENDADA: 'Agendada', ENVIANDO: 'Enviando', CONCLUIDA: 'Concluída', PAUSADA: 'Pausada', CANCELADA: 'Cancelada' },
  BroadcastContactStatus: { PENDENTE: 'Pendente', ENVIADO: 'Enviado', ENTREGUE: 'Entregue', FALHA: 'Falha' },
  AutomationType: {
    ANIVERSARIO: 'Aniversário', NATAL: 'Natal', DIA_AMIGO: 'Dia do amigo',
    AGRADECIMENTO_VOLUNTARIO: 'Agradecimento voluntário', LEMBRETE_EVENTO: 'Lembrete de evento',
    CONVOCACAO: 'Convocação', CONFIRMACAO: 'Confirmação',
  },
  AutomationStatus: { ATIVA: 'Ativa', PAUSADA: 'Pausada', RASCUNHO: 'Rascunho' },
};

// Tom (cor) de cada status para os badges.
export const TONE = {
  NOVO: 'blue', CONFIRMADO: 'green', ATIVO: 'green', PENDENTE: 'amber', SUSPEITO: 'red', INATIVO: 'gray', BLACKLIST: 'red',
  SOLICITADO: 'blue', EM_ANALISE: 'amber', APROVADO: 'green', SEPARADO: 'violet', ENTREGUE: 'green', RECUSADO: 'red', CANCELADO: 'gray',
  AUTORIZADO: 'green', AGUARDANDO_INSTALACAO: 'amber', INSTALADO: 'green', REMOVIDO: 'gray',
  PLANEJADA: 'blue', EM_ANDAMENTO: 'amber', REALIZADA: 'green', CANCELADA: 'gray',
  AGENDADO: 'blue', REALIZADO: 'green',
  NOVA: 'blue', RESOLVIDA: 'green', ARQUIVADA: 'gray',
  BAIXA: 'gray', MEDIA: 'blue', ALTA: 'amber', URGENTE: 'red',
  RASCUNHO: 'gray', PUBLICADO: 'green', ARQUIVADO: 'gray',
  ABERTA: 'blue', EM_ATENDIMENTO: 'amber', ENCAMINHADA: 'violet', FECHADA: 'gray',
  ATIVA: 'green', PAUSADA: 'amber', CONCLUIDA: 'green', ENVIANDO: 'amber', ENVIADO: 'green', FALHA: 'red',
};

export function label(group, key) {
  if (key == null) return '—';
  return LABELS[group]?.[key] ?? key;
}

export function options(group) {
  return Object.entries(LABELS[group] || {}).map(([value, lbl]) => ({ value, label: lbl }));
}
