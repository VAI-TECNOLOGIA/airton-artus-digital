// Navegação lateral + regras de visibilidade por perfil.
// `roles: '*'` = todos os perfis autenticados.

// Hierarquia de 3 níveis:
//   LIDER    = acesso total (estratégia, administração, disparos)
//   MEMBRO   = equipe interna (base, comunicação, mobilização, materiais)
//   PARCEIRO = apoiador externo (painel próprio) — itens com roles '*'
const INTERNO = ['LIDER', 'MEMBRO']; // líder + membro
const LIDER = ['LIDER']; // só líder

export const NAV = [
  { section: 'Visão geral' },
  { to: '/', label: 'Dashboard', icon: 'LayoutDashboard', roles: '*' },
  { to: '/mapa', label: 'Mapa político', icon: 'MapPinned', roles: INTERNO },
  { to: '/relatorios', label: 'Relatórios', icon: 'BarChart3', roles: INTERNO },

  { section: 'Base' },
  { to: '/apoiadores', label: 'Apoiadores', icon: 'UserPlus', roles: INTERNO },
  { to: '/voluntarios', label: 'Voluntários', icon: 'Users', roles: INTERNO },
  { to: '/suspeitos', label: 'Suspeitos', icon: 'ShieldAlert', roles: LIDER },
  { to: '/blacklist', label: 'Blacklist', icon: 'Ban', roles: LIDER },

  { section: 'Mobilização' },
  { to: '/mural', label: 'Mural de avisos', icon: 'Megaphone', roles: '*' },
  { to: '/midia-kit', label: 'Mídia Kit', icon: 'Image', roles: '*' },
  { to: '/tarefas', label: 'Engajamento', icon: 'Trophy', roles: '*' },
  { to: '/acoes', label: 'Ações de rua', icon: 'Footprints', roles: INTERNO },
  { to: '/agenda', label: 'Agenda', icon: 'CalendarDays', roles: '*' },

  { section: 'Materiais' },
  { to: '/materiais', label: 'Pedidos de material', icon: 'Package', roles: '*' },
  { to: '/faixas', label: 'Faixas', icon: 'Flag', roles: INTERNO },

  { section: 'Comunicação' },
  { to: '/conversas', label: 'Conversas (CRM)', icon: 'MessageSquare', roles: INTERNO },
  { to: '/demandas', label: 'Demandas', icon: 'Inbox', roles: INTERNO },
  { to: '/disparos', label: 'Disparos', icon: 'Send', roles: INTERNO },
  { to: '/automacoes', label: 'Automações', icon: 'Bot', roles: LIDER },

  { section: 'Administração' },
  { to: '/usuarios', label: 'Usuários', icon: 'UserCog', roles: LIDER },
  { to: '/configuracoes', label: 'Configurações', icon: 'Settings', roles: LIDER },
  { to: '/painel-tv', label: 'Painel TV', icon: 'Tv', roles: INTERNO },
];

export function can(user, roles) {
  if (roles === '*' || !roles) return true;
  return !!user && roles.includes(user.role);
}
