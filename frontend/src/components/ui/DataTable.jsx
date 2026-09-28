import EmptyState from './EmptyState.jsx';

function getPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

export default function DataTable({ columns, rows, actions, empty }) {
  if (!rows?.length) return empty || <EmptyState />;

  return (
    <div className="table-wrap">
      <table className="table table--cards">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={c.thStyle}>
                {c.label}
              </th>
            ))}
            {actions && <th className="text-right">Ações</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((c, i) => (
                <td key={c.key} data-label={c.label} className={i === 0 ? 'td-primary' : undefined}>
                  {c.render ? c.render(row) : getPath(row, c.key) ?? '—'}
                </td>
              ))}
              {actions && <td className="table-actions" data-label="Ações">{actions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
