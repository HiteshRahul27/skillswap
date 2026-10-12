import { useId } from 'react';

export default function Field({ label, error, hint, children, as = 'input', className = '', ...props }) {
  const id = useId();
  const Tag = as;
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      {as === 'custom' ? children : (
        <Tag id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy} className={`input ${error ? 'input-error' : ''}`} {...props}>{children}</Tag>
      )}
      {error ? <p id={`${id}-err`} role="alert" className="mt-1.5 text-sm text-red-600">{error}</p>
        : hint ? <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-mute">{hint}</p> : null}
    </div>
  );
}
