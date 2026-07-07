import Layout from '../components/layout/Layout.jsx';
import ResourcePage from '../components/ResourcePage.jsx';
import { banners } from '../config/resources.jsx';

export default function Banners() {
  return (
    <Layout title="Faixas em casas" subtitle="Controle de autorizações e instalação de faixas">
      <ResourcePage config={banners} />
    </Layout>
  );
}
