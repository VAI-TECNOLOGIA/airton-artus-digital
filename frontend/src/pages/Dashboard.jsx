import { useEffect, useState } from 'react';
import {
  Users, UserPlus, UserCheck, Clock, Flag, Package, ClipboardList, Footprints,
  ShieldAlert, Ban, Inbox, MessageSquare, Trophy, MapPin, TrendingUp,
} from 'lucide-react';
import Layout from '../components/layout/Layout.jsx';
import { Card, StatCard } from '../components/ui/Card.jsx';
import { LoadingBox } from '../components/ui/Spinner.jsx';
import { BarChartCard, PieChartCard, LineChartCard } from '../components/charts/Charts.jsx';
import api from '../api/client.js';
import { label } from '../config/enums.js';

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/charts'),
      api.get('/dashboard/rankings'),
      api.get('/reports/growth'),
    ])
      .then(([s, c, r, g]) => setData({ stats: s.data, charts: c.data, rankings: r.data, growth: g.data.series }))
      .catch(() => setData({ error: true }));
  }, []);

  if (!data) {
    return (
      <Layout title="Dashboard">
        <LoadingBox label="Carregando indicadores..." />
      </Layout>
    );
  }

  const { stats, charts, rankings, growth } = data;
  const statusData = (charts.byStatus || []).map((s) => ({ name: label('SupporterStatus', s.name), value: s.value }));
  const supportData = (charts.bySupportType || []).map((s) => ({ name: label('SupportType', s.name), value: s.value }));

  return (
    <Layout title="Dashboard" subtitle="Visão geral da campanha em tempo real">
      <div className="grid stats-grid">
        <StatCard label="Voluntários" value={stats.totalVolunteers} icon={Users} tone="red" hint={`${stats.activeVolunteers} ativos`} />
        <StatCard label="Apoiadores" value={stats.totalSupporters} icon={UserPlus} tone="blue" />
        <StatCard label="Voluntários ativos" value={stats.activeVolunteers} icon={UserCheck} tone="green" />
        <StatCard label="Pendentes" value={stats.pendingVolunteers} icon={Clock} tone="amber" />
        <StatCard label="Faixas autorizadas" value={stats.authorizedBanners} icon={Flag} tone="violet" />
        <StatCard label="Materiais entregues" value={stats.deliveredMaterials} icon={Package} tone="green" />
        <StatCard label="Pedidos pendentes" value={stats.pendingRequests} icon={ClipboardList} tone="amber" />
        <StatCard label="Ações realizadas" value={stats.doneActions} icon={Footprints} tone="red" />
      </div>

      <div className="grid stats-grid" style={{ marginTop: 18 }}>
        <StatCard label="Suspeitos" value={stats.suspects} icon={ShieldAlert} tone="amber" />
        <StatCard label="Blacklist" value={stats.blacklisted} icon={Ban} tone="red" />
        <StatCard label="Demandas abertas" value={stats.openDemands} icon={Inbox} tone="blue" />
        <StatCard label="Conversas abertas" value={stats.openConversations} icon={MessageSquare} tone="ink" />
      </div>

      <div className="grid cols-2-1" style={{ marginTop: 18 }}>
        <Card title="Apoiadores por cidade/bairro" icon={MapPin}>
          <BarChartCard data={charts.byCity} />
        </Card>
        <Card title="Por status" icon={Users}>
          <PieChartCard data={statusData} />
        </Card>
      </div>

      <div className="grid cols-2-1" style={{ marginTop: 18 }}>
        <Card title="Crescimento da base" icon={TrendingUp} subtitle="Acumulado de cadastros">
          <LineChartCard data={growth} />
        </Card>
        <Card title="Tipos de apoio" icon={UserPlus}>
          <PieChartCard data={supportData} />
        </Card>
      </div>

      <div className="grid grid-3" style={{ marginTop: 18 }}>
        <Card title="Ranking de voluntários" icon={Trophy}>
          <div className="rank-list">
            {(rankings.volunteers || []).slice(0, 6).map((v) => (
              <div className="rank-row" key={v.id}>
                <div className="rank-num">{v.rank}</div>
                <div className="rank-info">
                  <strong>{v.name}</strong>
                  <span>{v.city || '—'}</span>
                </div>
                <div className="rank-score">{v.score} pts</div>
              </div>
            ))}
            {!rankings.volunteers?.length && <p className="muted">Sem dados ainda.</p>}
          </div>
        </Card>

        <Card title="Ranking de coordenadores" icon={Trophy}>
          <div className="rank-list">
            {(rankings.coordinators || []).slice(0, 6).map((c) => (
              <div className="rank-row" key={c.id}>
                <div className="rank-num">{c.rank}</div>
                <div className="rank-info">
                  <strong>{c.name}</strong>
                  <span>{c.region}</span>
                </div>
                <div className="rank-score">{c.supporters}</div>
              </div>
            ))}
            {!rankings.coordinators?.length && <p className="muted">Sem dados ainda.</p>}
          </div>
        </Card>

        <Card title="Regiões" icon={MapPin} subtitle="Fortes x a descobrir">
          <div className="text-sm" style={{ fontWeight: 700, color: 'var(--green-rs)', marginBottom: 6 }}>Mais fortes</div>
          {(charts.strongRegions || []).map((r) => (
            <div className="rank-row" key={r.name}>
              <span className="legend-dot" style={{ background: r.color || '#003E9D' }} />
              <div className="rank-info"><strong>{r.name}</strong></div>
              <div className="rank-score">{r.value}</div>
            </div>
          ))}
          {charts.weakRegions?.length > 0 && (
            <>
              <div className="text-sm" style={{ fontWeight: 700, color: 'var(--amber)', margin: '12px 0 6px' }}>A descobrir</div>
              {charts.weakRegions.map((r) => (
                <div className="rank-row" key={r.name}>
                  <span className="legend-dot" style={{ background: '#cbb89a' }} />
                  <div className="rank-info"><strong>{r.name}</strong></div>
                  <div className="rank-score" style={{ color: 'var(--muted)' }}>{r.value}</div>
                </div>
              ))}
            </>
          )}
        </Card>
      </div>
    </Layout>
  );
}
