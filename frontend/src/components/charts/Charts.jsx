import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';

// Paleta VAI — laranja + ink (design system)
export const PALETTE = ['#003E9D', '#2BB153', '#FEC330', '#F3083E', '#0A326B', '#7C3AED', '#0891B2', '#8A9099'];

// Cores neutras que funcionam no tema claro e escuro (cinza médio + grid translúcido).
const AXIS = '#8b93a3';
const GRID = 'rgba(130,140,160,0.18)';

function tooltipStyle() {
  const dark = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark';
  return {
    borderRadius: 10,
    border: `1px solid ${dark ? '#2a313d' : '#e6e9ef'}`,
    background: dark ? '#161b22' : '#ffffff',
    color: dark ? '#e6e9ef' : '#1f2733',
    boxShadow: '0 8px 24px rgba(15,23,40,0.16)',
    fontSize: 13,
  };
}

const truncate = (s, n = 18) => (typeof s === 'string' && s.length > n ? s.slice(0, n - 1) + '…' : s);

// Barras HORIZONTAIS: rótulos de categoria ficam retos e legíveis (sem rotação).
export function BarChartCard({ data, height = 300, color = '#003E9D' }) {
  if (!data?.length) return <Empty />;
  const h = Math.max(height, data.length * 38 + 24);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 18, left: 6, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
        <XAxis type="number" tick={{ fontSize: 11, fill: AXIS }} allowDecimals={false} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12.5, fill: AXIS }}
          tickFormatter={(v) => truncate(v)}
          width={132}
          interval={0}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={tooltipStyle()} cursor={{ fill: GRID }} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} fill={color} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PieChartCard({ data, height = 300 }) {
  if (!data?.length) return <Empty />;
  return (
    // wrapper com altura fixa garante dimensão no 1º paint (Recharts não renderiza com height 0)
    <div style={{ width: '100%', height, minHeight: height }}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={94} paddingAngle={2} stroke="none">
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color || PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle()} />
        <Legend wrapperStyle={{ fontSize: 12.5, color: AXIS }} iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
    </div>
  );
}

export function LineChartCard({ data, dataKey = 'total', height = 300, color = '#003E9D' }) {
  if (!data?.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.32} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: AXIS }} allowDecimals={false} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle()} />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill="url(#grad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function Empty() {
  return <div className="muted" style={{ padding: 40, textAlign: 'center' }}>Sem dados para exibir.</div>;
}
