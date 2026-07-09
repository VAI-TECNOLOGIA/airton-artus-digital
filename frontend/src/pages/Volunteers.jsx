import { useEffect, useState } from 'react';
import { Power, Trophy, Search } from 'lucide-react';
import Layout from '../components/layout/Layout.jsx';
import { Card } from '../components/ui/Card.jsx';
import DataTable from '../components/ui/DataTable.jsx';
import { LoadingBox } from '../components/ui/Spinner.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import WhatsAppMessageModal, { WaIcon } from '../components/WhatsAppMessageModal.jsx';
import api, { apiError } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';

export default function Volunteers() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [waSupporter, setWaSupporter] = useState(null);
  const [candidate, setCandidate] = useState('Airton Artus');

  useEffect(() => {
    api.get('/settings')
      .then((r) => { const c = r.data?.campaign?.candidate; if (c) setCandidate(c); })
      .catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filter) params[filter] = 'true';
      const { data } = await api.get('/volunteers', { params });
      setRows(data.data);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filter]);

  async function toggle(row) {
    try {
      await api.put(`/volunteers/${row.id}`, { active: !row.active });
      toast.success(row.active ? 'Voluntário desativado.' : 'Voluntário ativado.');
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'Voluntário',
      render: (r) => (
        <div className="cell-person">
          <Avatar name={r.supporter?.name} src={r.supporter?.photoUrl} size="avatar-sm" />
          <div>
            <div className="cell-strong">{r.supporter?.name || '—'}</div>
            <div className="cell-muted text-sm">{r.supporter?.cityName || ''} {r.supporter?.neighborhood ? `· ${r.supporter.neighborhood}` : ''}</div>
          </div>
        </div>
      ),
    },
    { key: 'score', label: 'Pontos', render: (r) => <span className="rank-score">{r.totalScore} pts</span> },
    { key: 'confirmed', label: 'Confirmação', render: (r) => <StatusBadge group="SupporterStatus" value={r.confirmed ? 'CONFIRMADO' : 'PENDENTE'} /> },
    { key: 'help', label: 'Prefere ajudar', render: (r) => r.helpPreference || '—' },
    { key: 'active', label: 'Situação', render: (r) => <StatusBadge group="SupporterStatus" value={r.active ? 'ATIVO' : 'INATIVO'} /> },
  ];

  return (
    <Layout title="Voluntários" subtitle="Engajamento, pontuação e situação da equipe de base">
      <div className="toolbar">
        <div className="search">
          <Search size={16} />
          <input className="input" placeholder="Buscar voluntário..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select" style={{ width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Todos</option>
          <option value="active">Somente ativos</option>
          <option value="confirmed">Somente confirmados</option>
        </select>
      </div>
      <Card noBody>
        {loading ? (
          <LoadingBox />
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            empty={<EmptyState icon={Trophy} title="Nenhum voluntário" message="Cadastros do tipo 'Quero ser voluntário' aparecem aqui." />}
            actions={(row) => (
              <>
                <button
                  className="btn btn-ghost btn-sm"
                  title="Enviar acesso por WhatsApp"
                  onClick={() => setWaSupporter({ ...(row.supporter || {}), confirmed: row.confirmed })}
                >
                  <WaIcon size={15} />
                </button>
                <button className="btn btn-ghost btn-sm" title={row.active ? 'Desativar' : 'Ativar'} onClick={() => toggle(row)}>
                  <Power size={15} />
                </button>
              </>
            )}
          />
        )}
      </Card>
      {waSupporter && (
        <WhatsAppMessageModal
          supporter={waSupporter}
          candidate={candidate}
          onClose={() => setWaSupporter(null)}
        />
      )}
    </Layout>
  );
}
