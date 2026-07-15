import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './ui/Modal.jsx';
import api, { apiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

/**
 * Exclusão da própria conta (LGPD / exigência das lojas de app).
 * Pede a senha, avisa da irreversibilidade e desloga ao concluir.
 */
export default function DeleteAccountModal({ onClose }) {
  const { logout } = useAuth();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function confirm(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.delete('/auth/me', { data: { password } });
      toast.success('Conta excluída permanentemente.');
      logout();
    } catch (err) {
      toast.error(apiError(err, 'Não foi possível excluir a conta.'));
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Excluir minha conta" onClose={onClose}>
      <form onSubmit={confirm}>
        <div
          style={{
            display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16,
            padding: '12px 14px', borderRadius: 10, fontSize: 13.5, lineHeight: 1.5,
            background: 'rgba(189,46,47,.08)', border: '1px solid rgba(189,46,47,.35)', color: 'var(--red)',
          }}
        >
          <AlertTriangle size={18} style={{ flex: 'none', marginTop: 2 }} />
          <div>
            <strong>Esta ação é permanente.</strong> Seu acesso, perfil e vínculos de equipe serão
            excluídos e não poderão ser recuperados. Registros exigidos por lei (logs de acesso,
            auditoria) são mantidos de forma anonimizada — veja a{' '}
            <a href="/legal/politica-de-privacidade.html" target="_blank" rel="noopener noreferrer">
              Política de Privacidade
            </a>.
          </div>
        </div>

        <div className="field">
          <label htmlFor="delete-password">Confirme sua senha para continuar</label>
          <input
            id="delete-password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="modal-foot" style={{ padding: 0, marginTop: 16 }}>
          <button type="button" className="btn" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-danger" disabled={submitting || !password}>
            {submitting ? 'Excluindo...' : 'Excluir permanentemente'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
