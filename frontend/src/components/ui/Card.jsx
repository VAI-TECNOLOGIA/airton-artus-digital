export function Card({ title, subtitle, actions, icon: Icon, children, noBody = false, bodyClass = 'card-body' }) {
  return (
    <div className="card">
      {(title || actions) && (
        <div className="card-head">
          <div>
            <div className="card-title">
              {Icon && <Icon size={17} />}
              {title}
            </div>
            {subtitle && <div className="card-subtitle">{subtitle}</div>}
          </div>
          {actions}
        </div>
      )}
      {noBody ? children : <div className={bodyClass}>{children}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'red' }) {
  return (
    <div className="stat-card">
      <div className="stat-meta">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
      {Icon && (
        <div className={`stat-icon ${tone}`}>
          <Icon size={22} />
        </div>
      )}
    </div>
  );
}
