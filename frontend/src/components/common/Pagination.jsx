import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ meta, onPage }) {
  if (!meta || meta.pages <= 1) return null;
  return (
    <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
      <button className="btn-secondary btn-sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}><ChevronLeft className="h-4 w-4" />Previous</button>
      <span className="text-sm text-ink-soft">Page {meta.page} of {meta.pages}</span>
      <button className="btn-secondary btn-sm" disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)}>Next<ChevronRight className="h-4 w-4" /></button>
    </nav>
  );
}
