import Layout from '../components/layout/Layout.jsx';
import ResourcePage from '../components/ResourcePage.jsx';
import { events } from '../config/resources.jsx';

export default function Agenda() {
  return (
    <Layout title="Agenda da campanha" subtitle="Eventos, reuniões, caminhadas e prazos">
      <ResourcePage config={events} />
    </Layout>
  );
}
