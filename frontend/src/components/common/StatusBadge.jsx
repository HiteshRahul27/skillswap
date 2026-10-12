const STYLES = {
  pending: 'bg-amber-50 text-amber-800 ring-amber-200',
  confirmed: 'bg-sky-50 text-sky-800 ring-sky-200',
  completed: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  cancelled: 'bg-slate-100 text-slate-700 ring-slate-200',
  rejected: 'bg-red-50 text-red-800 ring-red-200',
  active: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  inactive: 'bg-slate-100 text-slate-700 ring-slate-200',
  removed: 'bg-red-50 text-red-800 ring-red-200',
  suspended: 'bg-red-50 text-red-800 ring-red-200',
};
export default function StatusBadge({ status }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${STYLES[status] || STYLES.inactive}`}>{status}</span>;
}
