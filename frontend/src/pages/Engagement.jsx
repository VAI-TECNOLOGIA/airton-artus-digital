import { useEffect, useState } from 'react';
import { Trophy, Plus, CheckCircle2 } from 'lucide-react';
import Layout from '../components/layout/Layout.jsx';
import { Card } from '../components/ui/Card.jsx';
import Modal from '../components/ui/Modal.jsx';
import Field from '../components/ui/Field.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { LoadingBox } from '../components/ui/Spinner.jsx';
import api, { apiError } from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { label, options } from '../config/enums.js';
import { formatDateTime } from '../lib/format.js';

export default function Engagement() {
  const toast = useToast();
  const { user } = useAuth();
  const canLog = ['LIDER', 'MEMBRO', 'MEMBRO'].includes(user?.role);
  const [ranking, setRanking] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [recent, setRecent] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});

  async function load() {
    setLoading(true);
    try {
      const [r, t, e, v] = await Promise.all([
        api.get('/volunteers/ranking', { params: { limit: 12 } }),
        api.get('/tasks'),
        api.get('/engagements'),
        api.get('/volunteers', { params: { pageSize: 500 } }),
      ]);
      setRanking(r.data.data);
      setTasks(t.data.data);
      setRecent(e.data.data.slice(0, 12));
      setVolunteers(v.data.data.map((x) => ({ value: x.id, label: x.supporter?.name || 'Voluntário' })));
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    try {
      await api.post('/engagements', form);
      toast.success('Engajamento registrado! Pontos creditados.');
      setOpen(false);
      setForm({});
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  }

  if (loading) {
    return (
      <Layout title="Engajamento">
        <LoadingBox />
      </Layout>
    );
  }

  return (
    <Layout title="Checklist de engajamento" subtitle="Tarefas, pontuação e ranking da militância digital">
      <div className="toolbar">
        <div className="spacer" />
        {canLog && (
          <button className="btn btn-primary" onClick={() => { setForm({ type: 'POST_INSTAGRAM' }); setOpen(true); }}>
            <Plus size={16} /> Registrar engajamento
          </button>
        )}
      </div>

      <div className="grid cols-2-1">
        <Card title="Tarefas e pontuação" icon={CheckCircle2}>
          <div className="grid grid-2">
            {tasks.map((t) => (
              <div key={t.id} className="card" style={{ padding: 14 }}>
                <div className="flex items-center justify-between">
                  <strong>{t.title}</strong>
                  <span className="rank-score">{t.points} pts</span>
                </div>
                <div className="text-sm muted">{label('TaskType', t.type)}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Ranking" icon={Trophy}>
          <div className="rank-list">
            {ranking.map((v) => (
              <div className="rank-row" key={v.id}>
                <div className="rank-num">{v.rank}</div>
                <div className="rank-info">
                  <strong>{v.supporter?.name || 'Voluntário'}</strong>
                  <span>{v.supporter?.cityName || '—'}</span>
                </div>
                <div className="rank-score">{v.totalScore} pts</div>
              </div>
            ))}
            {!ranking.length && <p className="muted">Sem pontuação ainda.</p>}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 18 }}>
        <Card title="Engajamentos recentes">
          <div className="rank-list">
            {recent.map((e) => (
              <div className="rank-row" key={e.id}>
                <CheckCircle2 size={16} style={{ color: 'var(--green-rs)' }} />
                <div className="rank-info">
                  <strong>{e.volunteer?.supporter?.name || 'Voluntário'}</strong>
                  <span>{label('TaskType', e.type)} · {formatDateTime(e.createdAt)}</span>
                </div>
                <div className="flex items-center gap-8">
                  <span className="rank-score">+{e.points}</span>
                  {e.validated ? <Badge tone="green">Validado</Badge> : <Badge tone="amber">Pendente</Badge>}
                </div>
              </div>
            ))}
            {!recent.length && <p className="muted">Nenhum engajamento registrado ainda.</p>}
          </div>
        </Card>
      </div>

      {open && (
        <Modal
          title="Registrar engajamento"
          onClose={() => setOpen(false)}
          footer={
            <>
              <button className="btn" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={submit}>Registrar</button>
            </>
          }
        >
          <Field field={{ name: 'volunteerId', label: 'Voluntário', type: 'select', options: volunteers, required: true }} value={form.volunteerId} onChange={(n, v) => setForm((s) => ({ ...s, [n]: v }))} />
          <Field field={{ name: 'type', label: 'Tarefa realizada', type: 'select', options: options('TaskType'), required: true }} value={form.type} onChange={(n, v) => setForm((s) => ({ ...s, [n]: v }))} />
          <Field field={{ name: 'note', label: 'Observação', type: 'textarea' }} value={form.note} onChange={(n, v) => setForm((s) => ({ ...s, [n]: v }))} />
        </Modal>
      )}
    </Layout>
  );
}
