import Layout from '../components/layout/Layout.jsx';
import ResourcePage from '../components/ResourcePage.jsx';
import { streetActions } from '../config/resources.jsx';

export default function StreetActions() {
  return (
    <Layout title="Ações de rua" subtitle="Caminhadas, carreatas, visitas e bandeiraços">
      <ResourcePage config={streetActions} />
    </Layout>
  );
}
