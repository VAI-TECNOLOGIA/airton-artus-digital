import Layout from '../components/layout/Layout.jsx';
import ResourcePage from '../components/ResourcePage.jsx';
import { blacklist } from '../config/resources.jsx';

export default function Blacklist() {
  return (
    <Layout title="Blacklist" subtitle="Contatos bloqueados e impedidos de cadastro">
      <ResourcePage config={blacklist} />
    </Layout>
  );
}
