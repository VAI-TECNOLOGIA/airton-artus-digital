import FileUpload from './FileUpload.jsx';

/** Renderiza um campo de formulário a partir de uma especificação (field spec). */
export default function Field({ field, value, onChange, error }) {
  const { name, label, type = 'text', required, placeholder, options = [], hint, rows, full } = field;
  const set = (v) => onChange(name, v);

  return (
    <div className={`field ${full ? 'full' : ''}`}>
      {type !== 'checkbox' && (
        <label>
          {label} {required && <span className="req">*</span>}
        </label>
      )}

      {type === 'select' ? (
        <select className="select" data-field={name} aria-invalid={error ? 'true' : undefined} value={value ?? ''} onChange={(e) => set(e.target.value)}>
          <option value="">Selecione...</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          className="textarea"
          data-field={name}
          aria-invalid={error ? 'true' : undefined}
          rows={rows || 3}
          value={value ?? ''}
          onChange={(e) => set(e.target.value)}
          placeholder={placeholder}
        />
      ) : type === 'checkbox' ? (
        <label className="flex items-center gap-8" style={{ fontWeight: 500 }}>
          <input type="checkbox" checked={!!value} onChange={(e) => set(e.target.checked)} />
          {label}
        </label>
      ) : type === 'upload' ? (
        <FileUpload
          value={value}
          onChange={set}
          accept={field.accept}
          maxSizeMB={field.maxSizeMB}
          previewImages={field.previewImages !== false}
        />
      ) : (
        <input
          className="input"
          data-field={name}
          aria-invalid={error ? 'true' : undefined}
          type={type}
          value={value ?? ''}
          onChange={(e) => set(e.target.value)}
          placeholder={placeholder}
        />
      )}

      {hint && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
