import Layout from '../components/layout/Layout.jsx';
import ResourcePage from '../components/ResourcePage.jsx';
import { users } from '../config/resources.jsx';

export default function Users() {
  return (
    <Layout title="Usuários" subtitle="Equipe da campanha e seus perfis de acesso">
      <ResourcePage config={users} />
    </Layout>
  );
}
