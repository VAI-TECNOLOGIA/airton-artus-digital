import { TONE, label } from '../../config/enums.js';

export function Badge({ tone = 'gray', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

/** Badge que traduz um valor de enum e aplica o tom correto. */
export function StatusBadge({ group, value }) {
  if (!value) return <span className="cell-muted">—</span>;
  const tone = TONE[value] || 'gray';
  return (
    <span className={`badge badge-${tone}`}>
      <i className="dot" />
      {label(group, value)}
    </span>
  );
}
