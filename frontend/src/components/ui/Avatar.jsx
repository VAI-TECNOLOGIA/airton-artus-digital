import { initials } from '../../lib/format.js';

export default function Avatar({ name, src, size = '' }) {
  return (
    <div className={`avatar ${size}`}>
      {src ? <img src={src} alt={name} /> : initials(name || '?')}
    </div>
  );
}
