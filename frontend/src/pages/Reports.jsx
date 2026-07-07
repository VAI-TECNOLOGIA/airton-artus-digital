import { useEffect, useState } from 'react';
import { Download, BarChart3 } from 'lucide-react';
import Layout from '../components/layout/Layout.jsx';
import { Card } from '../components/ui/Card.jsx';
import { LoadingBox } from '../components/ui/Spinner.jsx';
import { BarChartCard, PieChartCard, LineChartCard } from '../components/charts/Charts.jsx';
import api from '../api/client.js';
import { label } from '../config/enums.js';

const tr = (group, arr = []) => arr.map((x) => ({ ...x, name: label(group, x.name) }));

export default function Reports() {
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([api.get('/reports/summary'), api.get('/reports/growth')])
      .then(([s, g]) => setData({ ...s.data, growth: g.data.series }))
      .catch(() => setData({ error: true }));
  }, []);

  function exportCsv() {
    const lines = ['Relatório;Item;Valor'];
    const push = (title, arr) => (arr || []).forEach((x) => lines.push(`${title};${x.name};${x.value}`));
    push('Apoiadores por região', data.supportersByRegion);
    push('Apoiadores por cidade', data.supportersByCity);
    push('Faixas por status', tr('BannerStatus', data.bannersByStatus));
    push('Ações por tipo', tr('StreetActionType', data.actionsByType));
    push('Engajamento por tipo', tr('TaskType', data.engagementByType));
    push('Demandas por categoria', tr('DemandCategory', data.demandsByCategory));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'relatorio-campanha.csv';
    a.click();
  }

  if (!data) {
    return (
      <Layout title="Relatórios">
        <LoadingBox />
      </Layout>
    );
  }

  return (
    <Layout title="Relatórios" subtitle="Consolidado da campanha — exporte e acompanhe a evolução">
      <div className="toolbar">
        <div className="spacer" />
        <button className="btn" onClick={exportCsv}>
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      <div className="grid grid-2">
        <Card title="Apoiadores por região" icon={BarChart3}>
          <BarChartCard data={data.supportersByRegion} color="#003E9D" />
        </Card>
        <Card title="Apoiadores por cidade/bairro" icon={BarChart3}>
          <BarChartCard data={data.supportersByCity} />
        </Card>
      </div>

      <div className="grid grid-2" style={{ marginTop: 18 }}>
        <Card title="Faixas por status">
          <PieChartCard data={tr('BannerStatus', data.bannersByStatus)} />
        </Card>
        <Card title="Demandas por categoria">
          <PieChartCard data={tr('DemandCategory', data.demandsByCategory)} />
        </Card>
      </div>

      <div className="grid grid-2" style={{ marginTop: 18 }}>
        <Card title="Ações de rua por tipo">
          <BarChartCard data={tr('StreetActionType', data.actionsByType)} color="#003E9D" />
        </Card>
        <Card title="Engajamento por tipo">
          <BarChartCard data={tr('TaskType', data.engagementByType)} color="#B45309" />
        </Card>
      </div>

      <div style={{ marginTop: 18 }}>
        <Card title="Crescimento da base">
          <LineChartCard data={data.growth} />
        </Card>
      </div>
    </Layout>
  );
}
