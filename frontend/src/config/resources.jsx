import { StatusBadge, Badge } from '../components/ui/Badge.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { label } from './enums.js';
import { formatDate, formatPhone } from '../lib/format.js';

const cut = (s, n = 56) => (s && s.length > n ? `${s.slice(0, n)}…` : s || '');

// ---------------- Apoiadores ----------------
export const supporters = {
  endpoint: '/supporters',
  singular: 'apoiador',
  createLabel: 'Novo cadastro',
  titleField: 'name',
  searchPlaceholder: 'Buscar por nome, telefone, cidade...',
  deleteRoles: ['LIDER', 'MEMBRO'],
  wideForm: true,
  filters: [
    { name: 'status', label: 'Status', enumGroup: 'SupporterStatus' },
    { name: 'supportType', label: 'Tipo de apoio', enumGroup: 'SupportType' },
  ],
  lookups: [
    { key: 'regions', endpoint: '/regions' },
    { key: 'coordinators', endpoint: '/users', params: { role: 'MEMBRO' } },
    { key: 'cities', endpoint: '/supporters/cities', valueKey: 'name', labelKey: 'name' },
  ],
  columns: [
    {
      key: 'name',
      label: 'Nome',
      render: (r) => (
        <div className="cell-person">
          <Avatar name={r.name} src={r.photoUrl} size="avatar-sm" />
          <div>
            <div className="cell-strong">{r.name}</div>
            <div className="cell-muted text-sm">{formatPhone(r.phone)}</div>
          </div>
        </div>
      ),
    },
    { key: 'supportType', label: 'Apoio', render: (r) => <Badge>{label('SupportType', r.supportType)}</Badge> },
    { key: 'local', label: 'Local', render: (r) => [r.neighborhood, r.cityName].filter(Boolean).join(', ') || '—' },
    { key: 'region', label: 'Região', render: (r) => r.region?.name || '—' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge group="SupporterStatus" value={r.status} /> },
  ],
  fields: [
    { name: 'name', label: 'Nome completo', required: true, full: true },
    { name: 'phone', label: 'Telefone', type: 'tel', required: true },
    { name: 'whatsapp', label: 'WhatsApp', type: 'tel' },
    { name: 'email', label: 'E-mail', type: 'email' },
    { name: 'cpf', label: 'CPF (opcional)' },
    { name: 'birthDate', label: 'Data de nascimento', type: 'date' },
    { name: 'cep', label: 'CEP' },
    { name: 'street', label: 'Endereço' },
    { name: 'number', label: 'Número' },
    { name: 'complement', label: 'Complemento' },
    { name: 'neighborhood', label: 'Bairro' },
    { name: 'cityName', label: 'Cidade', type: 'datalist', optionsFrom: 'cities', placeholder: 'Digite e selecione a cidade' },
    { name: 'regionId', label: 'Região', optionsFrom: 'regions' },
    { name: 'coordinatorId', label: 'Coordenador responsável', optionsFrom: 'coordinators' },
    { name: 'supportType', label: 'Tipo de apoio', enumGroup: 'SupportType', required: true },
    { name: 'status', label: 'Status', enumGroup: 'SupporterStatus' },
    { name: 'instagram', label: 'Instagram' },
    { name: 'facebook', label: 'Facebook' },
    { name: 'photoUrl', label: 'Foto do apoiador (opcional)', type: 'upload', accept: 'image/*', full: true },
    { name: 'lat', label: 'Latitude (mapa)', type: 'number' },
    { name: 'lng', label: 'Longitude (mapa)', type: 'number' },
    { name: 'notes', label: 'Observações', type: 'textarea', full: true },
  ],
  onCreated: (data, toast) => {
    if (data?.warning) toast.error(`Atenção: ${data.warning}`);
  },
};

// ---------------- Mural de avisos ----------------
export const notices = {
  endpoint: '/notices',
  singular: 'aviso',
  createLabel: 'Novo aviso',
  titleField: 'title',
  writeRoles: ['LIDER', 'MEMBRO'],
  filters: [
    { name: 'type', label: 'Tipo', enumGroup: 'NoticeType' },
    { name: 'priority', label: 'Prioridade', enumGroup: 'Priority' },
  ],
  lookups: [{ key: 'regions', endpoint: '/regions' }],
  columns: [
    {
      key: 'title',
      label: 'Título',
      render: (r) => (
        <div>
          <div className="cell-strong">{r.title}</div>
          <div className="cell-muted text-sm">{cut(r.description)}</div>
        </div>
      ),
    },
    { key: 'type', label: 'Tipo', render: (r) => <Badge>{label('NoticeType', r.type)}</Badge> },
    { key: 'priority', label: 'Prioridade', render: (r) => <StatusBadge group="Priority" value={r.priority} /> },
    { key: 'region', label: 'Região', render: (r) => r.region?.name || 'Todas' },
    { key: 'date', label: 'Publicado', render: (r) => formatDate(r.publishDate || r.createdAt) },
  ],
  fields: [
    { name: 'title', label: 'Título', required: true, full: true },
    { name: 'description', label: 'Descrição', type: 'textarea', full: true },
    { name: 'type', label: 'Tipo', enumGroup: 'NoticeType' },
    { name: 'priority', label: 'Prioridade', enumGroup: 'Priority' },
    { name: 'regionId', label: 'Região (vazio = todas)', optionsFrom: 'regions' },
    { name: 'status', label: 'Status', enumGroup: 'PublishStatus' },
    { name: 'attachmentUrl', label: 'Anexo (imagem, vídeo, áudio ou PDF)', type: 'upload', full: true },
    { name: 'externalLink', label: 'Link externo (opcional)', full: true },
    { name: 'publishDate', label: 'Data de publicação', type: 'date' },
  ],
};

// ---------------- Faixas ----------------
export const banners = {
  endpoint: '/banners',
  singular: 'faixa',
  createLabel: 'Nova faixa',
  titleField: 'responsibleName',
  writeRoles: ['LIDER', 'MEMBRO', 'MEMBRO'],
  filters: [{ name: 'status', label: 'Status', enumGroup: 'BannerStatus' }],
  columns: [
    { key: 'responsibleName', label: 'Responsável', render: (r) => <div className="cell-strong">{r.responsibleName}</div> },
    { key: 'local', label: 'Endereço', render: (r) => <span className="cell-muted">{[r.address, r.neighborhood].filter(Boolean).join(' · ') || '—'}</span> },
    { key: 'phone', label: 'Telefone', render: (r) => formatPhone(r.phone) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge group="BannerStatus" value={r.status} /> },
  ],
  fields: [
    { name: 'responsibleName', label: 'Nome do responsável', required: true, full: true },
    { name: 'phone', label: 'Telefone', type: 'tel' },
    { name: 'address', label: 'Endereço', full: true },
    { name: 'cityName', label: 'Cidade' },
    { name: 'neighborhood', label: 'Bairro' },
    { name: 'lat', label: 'Latitude', type: 'number' },
    { name: 'lng', label: 'Longitude', type: 'number' },
    { name: 'status', label: 'Status', enumGroup: 'BannerStatus' },
    { name: 'authorized', label: 'Autorização registrada', type: 'checkbox' },
    { name: 'bannerPhotoUrl', label: 'Foto da faixa instalada', type: 'upload', accept: 'image/*', full: true },
    { name: 'housePhotoUrl', label: 'Foto da casa / local (opcional)', type: 'upload', accept: 'image/*', full: true },
    { name: 'notes', label: 'Observações', type: 'textarea', full: true },
  ],
};

// ---------------- Ações de rua ----------------
export const streetActions = {
  endpoint: '/street-actions',
  singular: 'ação',
  createLabel: 'Nova ação',
  titleField: 'title',
  writeRoles: ['LIDER', 'MEMBRO', 'MEMBRO'],
  filters: [
    { name: 'type', label: 'Tipo', enumGroup: 'StreetActionType' },
    { name: 'status', label: 'Status', enumGroup: 'ActionStatus' },
  ],
  lookups: [{ key: 'regions', endpoint: '/regions' }],
  columns: [
    {
      key: 'title',
      label: 'Ação',
      render: (r) => (
        <div>
          <div className="cell-strong">{r.title}</div>
          <div className="cell-muted text-sm">{label('StreetActionType', r.type)}</div>
        </div>
      ),
    },
    { key: 'local', label: 'Local', render: (r) => [r.neighborhood, r.cityName].filter(Boolean).join(', ') || '—' },
    { key: 'date', label: 'Data', render: (r) => formatDate(r.date) },
    { key: 'people', label: 'Pessoas', render: (r) => r.peopleReached || 0 },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge group="ActionStatus" value={r.status} /> },
  ],
  fields: [
    { name: 'title', label: 'Título', required: true, full: true },
    { name: 'type', label: 'Tipo', enumGroup: 'StreetActionType', required: true },
    { name: 'date', label: 'Data', type: 'date', required: true },
    { name: 'cityName', label: 'Cidade' },
    { name: 'neighborhood', label: 'Bairro' },
    { name: 'address', label: 'Endereço', full: true },
    { name: 'regionId', label: 'Região', optionsFrom: 'regions' },
    { name: 'peopleReached', label: 'Pessoas impactadas', type: 'number' },
    { name: 'lat', label: 'Latitude', type: 'number' },
    { name: 'lng', label: 'Longitude', type: 'number' },
    { name: 'status', label: 'Status', enumGroup: 'ActionStatus' },
    { name: 'team', label: 'Equipe participante', full: true },
    { name: 'description', label: 'Descrição', type: 'textarea', full: true },
  ],
};

// ---------------- Agenda / eventos ----------------
export const events = {
  endpoint: '/events',
  singular: 'evento',
  createLabel: 'Novo evento',
  titleField: 'title',
  writeRoles: ['LIDER', 'MEMBRO'],
  filters: [{ name: 'status', label: 'Status', enumGroup: 'EventStatus' }],
  lookups: [{ key: 'regions', endpoint: '/regions' }],
  columns: [
    { key: 'title', label: 'Evento', render: (r) => <div className="cell-strong">{r.title}</div> },
    { key: 'date', label: 'Quando', render: (r) => `${formatDate(r.date)} ${r.time || ''}` },
    { key: 'local', label: 'Local', render: (r) => [r.location, r.neighborhood].filter(Boolean).join(' · ') || '—' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge group="EventStatus" value={r.status} /> },
  ],
  fields: [
    { name: 'title', label: 'Título', required: true, full: true },
    { name: 'date', label: 'Data', type: 'date', required: true },
    { name: 'time', label: 'Hora', placeholder: '19:30' },
    { name: 'location', label: 'Local' },
    { name: 'cityName', label: 'Cidade' },
    { name: 'neighborhood', label: 'Bairro' },
    { name: 'regionId', label: 'Região', optionsFrom: 'regions' },
    { name: 'status', label: 'Status', enumGroup: 'EventStatus' },
    { name: 'description', label: 'Descrição', type: 'textarea', full: true },
    { name: 'participants', label: 'Participantes', type: 'textarea', full: true },
  ],
};

// ---------------- Automações ----------------
export const automations = {
  endpoint: '/automations',
  singular: 'automação',
  createLabel: 'Nova automação',
  titleField: 'name',
  writeRoles: ['LIDER', 'MEMBRO'],
  filters: [
    { name: 'type', label: 'Tipo', enumGroup: 'AutomationType' },
    { name: 'status', label: 'Status', enumGroup: 'AutomationStatus' },
  ],
  columns: [
    { key: 'name', label: 'Nome', render: (r) => <div className="cell-strong">{r.name}</div> },
    { key: 'type', label: 'Tipo', render: (r) => <Badge>{label('AutomationType', r.type)}</Badge> },
    { key: 'message', label: 'Mensagem', render: (r) => <span className="cell-muted">{cut(r.message, 48)}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge group="AutomationStatus" value={r.status} /> },
  ],
  fields: [
    { name: 'name', label: 'Nome da automação', required: true, full: true },
    { name: 'type', label: 'Tipo', enumGroup: 'AutomationType', required: true },
    { name: 'status', label: 'Status', enumGroup: 'AutomationStatus' },
    { name: 'triggerDate', label: 'Data / gatilho', type: 'date' },
    { name: 'audience', label: 'Público', full: true },
    { name: 'message', label: 'Mensagem', type: 'textarea', full: true, hint: 'Variáveis: {{nome}}, {{cidade}}, {{bairro}}, {{responsavel}}' },
  ],
};

// ---------------- Usuários ----------------
export const users = {
  endpoint: '/users',
  singular: 'usuário',
  createLabel: 'Novo usuário',
  titleField: 'name',
  writeRoles: ['LIDER'],
  filters: [{ name: 'role', label: 'Perfil', enumGroup: 'UserRole' }],
  lookups: [{ key: 'regions', endpoint: '/regions' }],
  columns: [
    {
      key: 'name',
      label: 'Usuário',
      render: (r) => (
        <div className="cell-person">
          <Avatar name={r.name} src={r.avatarUrl} size="avatar-sm" />
          <div>
            <div className="cell-strong">{r.name}</div>
            <div className="cell-muted text-sm">{r.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'role', label: 'Perfil', render: (r) => <Badge>{label('UserRole', r.role)}</Badge> },
    { key: 'region', label: 'Região', render: (r) => r.region?.name || '—' },
    { key: 'active', label: 'Status', render: (r) => <StatusBadge group="SupporterStatus" value={r.active ? 'ATIVO' : 'INATIVO'} /> },
  ],
  fields: [
    { name: 'name', label: 'Nome', required: true },
    { name: 'email', label: 'E-mail', type: 'email', required: true },
    { name: 'password', label: 'Senha', type: 'password', hint: 'Opcional: em branco, a pessoa cria a própria senha pelo link enviado no WhatsApp. Ao editar, em branco mantém a atual.' },
    { name: 'role', label: 'Perfil', enumGroup: 'UserRole', required: true },
    { name: 'phone', label: 'Telefone', type: 'tel' },
    { name: 'regionId', label: 'Região', optionsFrom: 'regions' },
  ],
};

// ---------------- Blacklist ----------------
export const blacklist = {
  endpoint: '/blacklist',
  singular: 'bloqueio',
  createLabel: 'Adicionar à blacklist',
  titleField: 'name',
  writeRoles: ['LIDER', 'MEMBRO'],
  columns: [
    { key: 'name', label: 'Nome', render: (r) => r.name || '—' },
    { key: 'phone', label: 'Telefone', render: (r) => formatPhone(r.phone) },
    { key: 'reason', label: 'Motivo', render: (r) => <span className="cell-muted">{r.reason}</span> },
    { key: 'createdAt', label: 'Data', render: (r) => formatDate(r.createdAt) },
  ],
  fields: [
    { name: 'name', label: 'Nome' },
    { name: 'phone', label: 'Telefone', type: 'tel' },
    { name: 'cpf', label: 'CPF' },
    { name: 'reason', label: 'Motivo', type: 'textarea', full: true, required: true },
  ],
};

// ---------------- Catálogos (Configurações) ----------------
export const tasks = {
  endpoint: '/tasks',
  singular: 'tarefa',
  createLabel: 'Nova tarefa',
  titleField: 'title',
  writeRoles: ['LIDER'],
  searchable: false,
  columns: [
    { key: 'title', label: 'Tarefa', render: (r) => <div className="cell-strong">{r.title}</div> },
    { key: 'type', label: 'Tipo', render: (r) => <Badge>{label('TaskType', r.type)}</Badge> },
    { key: 'points', label: 'Pontos', render: (r) => <span className="rank-score">{r.points} pts</span> },
    { key: 'active', label: 'Ativa', render: (r) => <StatusBadge group="SupporterStatus" value={r.active ? 'ATIVO' : 'INATIVO'} /> },
  ],
  fields: [
    { name: 'title', label: 'Título', required: true, full: true },
    { name: 'type', label: 'Tipo', enumGroup: 'TaskType', required: true },
    { name: 'points', label: 'Pontos', type: 'number', required: true },
    { name: 'description', label: 'Descrição', type: 'textarea', full: true },
    { name: 'active', label: 'Ativa', type: 'checkbox' },
  ],
};

export const materials = {
  endpoint: '/materials',
  singular: 'material',
  createLabel: 'Novo material',
  titleField: 'name',
  writeRoles: ['LIDER', 'MEMBRO'],
  searchable: false,
  columns: [
    { key: 'name', label: 'Material', render: (r) => <div className="cell-strong">{r.name}</div> },
    { key: 'category', label: 'Categoria', render: (r) => <Badge>{r.category}</Badge> },
    { key: 'stock', label: 'Estoque', render: (r) => `${r.stock} ${r.unit}` },
    { key: 'active', label: 'Ativo', render: (r) => <StatusBadge group="SupporterStatus" value={r.active ? 'ATIVO' : 'INATIVO'} /> },
  ],
  fields: [
    { name: 'name', label: 'Nome', required: true },
    { name: 'category', label: 'Categoria', required: true },
    { name: 'unit', label: 'Unidade', placeholder: 'un' },
    { name: 'stock', label: 'Estoque', type: 'number' },
    { name: 'active', label: 'Ativo', type: 'checkbox' },
  ],
};
