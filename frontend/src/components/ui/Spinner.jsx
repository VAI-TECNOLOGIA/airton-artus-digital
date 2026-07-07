export function Spinner() {
  return <div className="spinner" />;
}

export function LoadingBox({ label = 'Carregando...' }) {
  return (
    <div className="center-box">
      <div className="spinner" />
      <span className="muted">{label}</span>
    </div>
  );
}
