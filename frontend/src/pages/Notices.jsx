import Layout from '../components/layout/Layout.jsx';
import ResourcePage from '../components/ResourcePage.jsx';
import { notices } from '../config/resources.jsx';

export default function Notices() {
  return (
    <Layout title="Mural de avisos" subtitle="Comunicados, convocações e orientações para a equipe">
      <ResourcePage config={notices} />
    </Layout>
  );
}
