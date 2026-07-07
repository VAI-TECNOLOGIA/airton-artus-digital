import Layout from '../components/layout/Layout.jsx';
import ResourcePage from '../components/ResourcePage.jsx';
import { automations } from '../config/resources.jsx';

export default function Automations() {
  return (
    <Layout title="Relacionamento automático" subtitle="Mensagens de aniversário, datas e gatilhos">
      <div className="warning-box mb-0" style={{ marginBottom: 16 }}>
        <span>
          Arquitetura preparada para envio via API Oficial (WhatsApp Cloud, SMS, Meta). As mensagens são
          registradas e simuladas até a conexão das credenciais.
        </span>
      </div>
      <ResourcePage config={automations} />
    </Layout>
  );
}
