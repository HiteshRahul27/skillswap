import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import useAsync from '../hooks/useAsync';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageLoader } from '../components/common/Spinner';
import { EmptyState, ErrorState } from '../components/common/States';
import StatusBadge from '../components/common/StatusBadge';
import { ConfirmDialog } from '../components/common/Modal';

export default function MySkills() {
  const { data, error, loading, reload } = useAsync(() => api.get('/skills/mine').then((r) => r.data), []);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function toggle(s) {
    try { await api.patch(`/skills/${s.id}`, { status: s.status === 'active' ? 'inactive' : 'active' }); toast.success(s.status === 'active' ? 'Listing hidden from the marketplace.' : 'Listing is live again.'); reload(); }
    catch (e) { toast.error(e.message); }
  }
  async function remove() {
    setBusy(true);
    try { await api.del(`/skills/${del.id}`); toast.success('Listing deleted.'); setDel(null); reload(); }
    catch (e) { toast.error(e.message); setDel(null); }
    finally { setBusy(false); }
  }

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Your listings</h1><p className="mt-1 text-ink-soft">Skills you offer to other students.</p></div>
        <Link to="/teach/new" className="btn-primary"><Plus className="h-4 w-4" />New listing</Link>
      </div>
      <div className="mt-6">
        {loading ? <PageLoader /> : error ? <ErrorState error={error} onRetry={reload} /> : data.length === 0 ? (
          <EmptyState title="Share your first skill" text="Create a listing, add a few time slots and start earning credits." action={<Link to="/teach/new" className="btn-primary">Share Your Skills</Link>} />
        ) : (
          <ul className="space-y-3">
            {data.map((s) => (
              <li key={s.id} className="card flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><Link to={`/skills/${s.id}`} className="font-semibold hover:text-brand-700">{s.title}</Link><StatusBadge status={s.status} /></div>
                  <p className="mt-1 text-sm text-ink-soft">{s.category} · {s.level} · {s.durationMinutes} min · {s.credits} credit{s.credits > 1 ? 's' : ''} · {s.availability.openSlots} open slot{s.availability.openSlots === 1 ? '' : 's'}</p>
                  {s.status === 'removed' && <p className="mt-1 text-xs text-red-700">Removed by a moderator.</p>}
                </div>
                <div className="flex gap-2">
                  {s.status !== 'removed' && <button className="btn-secondary btn-sm" onClick={() => toggle(s)}>{s.status === 'active' ? <><EyeOff className="h-4 w-4" />Deactivate</> : <><Eye className="h-4 w-4" />Activate</>}</button>}
                  <Link to={`/teach/${s.id}/edit`} className="btn-secondary btn-sm"><Pencil className="h-4 w-4" />Edit</Link>
                  <button className="btn-secondary btn-sm text-red-700" onClick={() => setDel(s)} aria-label={`Delete ${s.title}`}><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ConfirmDialog open={Boolean(del)} danger busy={busy} title="Delete this listing?" confirmLabel="Delete listing" onClose={() => setDel(null)} onConfirm={remove}
        message={<p>“{del?.title}” and its time slots will be permanently removed. Listings with upcoming bookings cannot be deleted.</p>} />
    </div>
  );
}
