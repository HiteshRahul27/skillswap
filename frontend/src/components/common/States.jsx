import { AlertTriangle, Inbox } from 'lucide-react';

export function EmptyState({ title, text, action }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <Inbox className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
      <h3 className="mt-3 text-base font-semibold text-ink">{title}</h3>
      {text && <p className="mx-auto mt-1 max-w-md text-sm text-ink-soft">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center" role="alert">
      <AlertTriangle className="mx-auto h-7 w-7 text-red-600" aria-hidden="true" />
      <p className="mt-2 text-sm font-medium text-red-800">{error?.message || 'Something went wrong.'}</p>
      {onRetry && <button onClick={onRetry} className="btn-secondary mt-4">Try again</button>}
    </div>
  );
}
