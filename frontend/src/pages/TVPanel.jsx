import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from 'react-leaflet';
import { Trophy, CalendarDays, Target, ArrowLeft, MapPin, Users, UserPlus, Flag, Footprints } from 'lucide-react';
import api from '../api/client.js';
import { formatDate } from '../lib/format.js';

// Coordenadas reais das cidades de Santa Catarina (os totais vêm do banco).
const RS_COORDS = {
  'Florianópolis': [-27.5954, -48.5480], 'Joinville': [-26.3045, -48.8487],
  'Blumenau': [-26.9194, -49.0661], 'São José': [-27.5969, -48.6394],
  'Chapecó': [-27.1004, -52.6152], 'Itajaí': [-26.9078, -48.6619],
  'Criciúma': [-28.6775, -49.3695], 'Jaraguá do Sul': [-26.4851, -49.0667],
  'Lages': [-27.8161, -50.3259], 'Palhoça': [-27.6386, -48.6703],
  'Balneário Camboriú': [-26.9926, -48.6349], 'Brusque': [-27.0980, -48.9177],
  'Tubarão': [-28.4666, -49.0069], 'Camboriú': [-27.0246, -48.6586],
  'Navegantes': [-26.8990, -48.6544], 'Concórdia': [-27.2338, -52.0278],
  'Rio do Sul': [-27.2148, -49.6431], 'Araranguá': [-28.9350, -49.4916],
  'Gaspar': [-26.9317, -48.9585], 'Indaial': [-26.8978, -49.2318],
  'Itapema': [-27.0902, -48.6114], 'Biguaçu': [-27.4939, -48.6558],
  'São Bento do Sul': [-26.2503, -49.3783], 'Caçador': [-26.7753, -51.0148],
};

function RSMap({ byCity }) {
  const cities = (byCity || [])
    .map((c) => ({ name: c.name, total: c.value, coord: RS_COORDS[c.name] }))
    .filter((c) => c.coord && c.total > 0);
  if (!cities.length) return <p style={{ color: '#cbd5e1', padding: 12 }}>Sem dados de localização ainda.</p>;
  const max = Math.max(...cities.map((c) => c.total));
  return (
    <div className="tv-map">
      <MapContainer
        center={[-27.5, -50.3]}
        zoom={7}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        style={{ height: '100%', width: '100%', background: '#0a1f15' }}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        {cities.map((c) => {
          const r = 8 + (c.total / max) * 28;
          const big = c.total / max >= 0.25;
          return (
            <CircleMarker
              key={c.name}
              center={c.coord}
              radius={r}
              pathOptions={{ color: '#FEC330', fillColor: '#FEC330', fillOpacity: 0.5, weight: 2 }}
            >
              <LeafletTooltip permanent={big} direction="top" className="tv-tip" offset={[0, -2]}>
                <b>{c.name}</b> · {c.total.toLocaleString('pt-BR')}
              </LeafletTooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <div className="tv-map-legend">● Apoiadores por cidade · <span>dados reais</span></div>
    </div>
  );
}

export default function TVPanel() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [now, setNow] = useState(new Date());

  async function load() {
    try {
      const [stats, rankings, events, settings, charts] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/rankings'),
        api.get('/events', { params: { status: 'AGENDADO' } }),
        api.get('/settings'),
        api.get('/dashboard/charts'),
      ]);
      setData({
        stats: stats.data,
        rankings: rankings.data,
        events: (events.data.data || []).slice(0, 5),
        goals: settings.data?.goals || {},
        campaign: settings.data?.campaign || {},
        byCity: charts.data?.byCity || [],
      });
    } catch {
      setData({ error: true });
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!data) return <div className="tv"><h1>Carregando painel...</h1></div>;
  const { stats, rankings, events, goals, campaign, byCity } = data;
  const goal = (current, target) => (target ? Math.min(100, Math.round((current / target) * 100)) : 0);

  return (
    <div className="tv">
      <div className="tv-flag-banner"><i className="g" /><i className="y" /><i className="r" /></div>

      <div className="tv-head">
        <div className="flex items-center gap-12">
          <RSFlag size={64} />
          <div>
            <h1>{campaign.name || 'Candidato Teste'}</h1>
            <div style={{ color: '#FEC330', fontWeight: 600 }}>{campaign.slogan || 'Juntos por você, pela sua cidade'}</div>
          </div>
        </div>
        <div className="flex items-center gap-12">
          <div className="tv-live"><span className="dot" /> AO VIVO · {now.toLocaleTimeString('pt-BR')}</div>
          <button className="btn btn-dark" onClick={() => nav('/')}><ArrowLeft size={16} /> Voltar</button>
        </div>
      </div>

      <div className="tv-grid">
        <TvStat icon={UserPlus} value={stats.totalSupporters} label="Apoiadores" />
        <TvStat icon={Users} value={stats.totalVolunteers} label="Voluntários" />
        <TvStat icon={Flag} value={stats.authorizedBanners} label="Faixas nas casas" />
        <TvStat icon={Footprints} value={stats.doneActions} label="Ações realizadas" />
      </div>

      <div className="tv-card" style={{ marginBottom: 20 }}>
        <h3><MapPin size={20} style={{ verticalAlign: '-3px', color: '#FEC330' }} /> Apoio por Santa Catarina</h3>
        <RSMap byCity={byCity} />
      </div>

      <div className="tv-cols">
        <div className="tv-card">
          <h3><Trophy size={20} style={{ verticalAlign: '-3px', color: '#FEC330' }} /> Top voluntários</h3>
          {(rankings.volunteers || []).slice(0, 6).map((v) => (
            <div className="tv-rank-row" key={v.id}>
              <strong style={{ color: '#FEC330', width: 32 }}>{v.rank}º</strong>
              <span style={{ flex: 1 }}>{v.name}</span>
              <strong>{v.score} pts</strong>
            </div>
          ))}
        </div>

        <div className="tv-card">
          <h3><Target size={20} style={{ verticalAlign: '-3px', color: '#FEC330' }} /> Metas da campanha</h3>
          <GoalBar label="Apoiadores" current={stats.totalSupporters} target={goals.supporters} pct={goal(stats.totalSupporters, goals.supporters)} />
          <GoalBar label="Voluntários" current={stats.totalVolunteers} target={goals.volunteers} pct={goal(stats.totalVolunteers, goals.volunteers)} />
          <GoalBar label="Faixas" current={stats.authorizedBanners} target={goals.banners} pct={goal(stats.authorizedBanners, goals.banners)} />
          <GoalBar label="Ações" current={stats.doneActions} target={goals.actions} pct={goal(stats.doneActions, goals.actions)} />
        </div>
      </div>

      <div className="tv-card" style={{ marginTop: 20 }}>
        <h3><CalendarDays size={20} style={{ verticalAlign: '-3px', color: '#FEC330' }} /> Próximos eventos</h3>
        {events.length === 0 && <p style={{ color: '#cbd5e1' }}>Sem eventos agendados.</p>}
        {events.map((e) => (
          <div className="tv-rank-row" key={e.id}>
            <span style={{ flex: 1 }}>{e.title}</span>
            <strong>{formatDate(e.date)} {e.time || ''}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function RSFlag({ size = 60 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="Bandeira do RS">
      <defs><clipPath id="tvflag"><rect width="64" height="64" rx="13" /></clipPath></defs>
      <g clipPath="url(#tvflag)">
        <rect width="64" height="64" fill="#1A1D21" />
        <polygon points="64,0 64,64 0,64" fill="#003E9D" />
        <line x1="-3" y1="67" x2="67" y2="-3" stroke="#FEC330" strokeWidth="15" />
      </g>
    </svg>
  );
}

function TvStat({ icon: Icon, value, label }) {
  return (
    <div className="tv-stat">
      <div className="tv-stat-ico"><Icon size={22} /></div>
      <div className="v">{value ?? '—'}</div>
      <div className="l">{label}</div>
    </div>
  );
}

function GoalBar({ label, current, target, pct }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="flex justify-between" style={{ marginBottom: 6 }}>
        <span>{label}</span>
        <strong>{current} / {target || '—'}</strong>
      </div>
      <div style={{ height: 12, background: 'rgba(255,255,255,0.12)', borderRadius: 999 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#003E9D,#FEC330)', borderRadius: 999, transition: 'width .6s ease' }} />
      </div>
    </div>
  );
}
