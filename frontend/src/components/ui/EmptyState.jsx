import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'Nada por aqui ainda', message, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={26} />
      </div>
      <h4>{title}</h4>
      {message && <p>{message}</p>}
      {action && <div className="mt-16">{action}</div>}
    </div>
  );
}
