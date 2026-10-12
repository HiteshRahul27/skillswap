import { useState } from 'react';
import { Link } from 'react-router-dom';
import useAsync from '../hooks/useAsync';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PageLoader } from '../components/common/Spinner';
import { EmptyState, ErrorState } from '../components/common/States';
import Pagination from '../components/common/Pagination';
import { ConfirmDialog } from '../components/common/Modal';
import BookingCard from '../components/bookings/BookingCard';
import ReviewModal from '../components/bookings/ReviewModal';

const CONFIRM = {
  confirm: { title: 'Confirm this session?', label: 'Confirm session', msg: 'The learner will be notified. Their credits stay reserved until you mark the session completed.', toast: 'Session confirmed.' },
  reject: { title: 'Decline this request?', label: 'Decline request', danger: true, msg: 'The learner is refunded in full and the time slot opens up again.', toast: 'Request declined. The learner was refunded.' },
  cancel: { title: 'Cancel this booking?', label: 'Cancel booking', danger: true, msg: 'Reserved credits are refunded to the learner and the slot becomes available again.', toast: 'Booking cancelled. Credits were refunded.' },
  complete: { title: 'Mark as completed?', label: 'Mark completed', msg: 'The learner’s reserved credits are paid to you. This cannot be undone.', toast: 'Session completed. Your credits have been updated.' },
};
const STATUSES = ['', 'pending', 'confirmed', 'completed', 'cancelled', 'rejected'];

export default function Bookings() {
  const [role, setRole] = useState('learner');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(null);
  const { refresh } = useAuth();
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.get('/bookings', { role, status, page, limit: 10 }), [role, status, page]);

  async function run() {
    setBusy(true);
    try {
      await api.post(`/bookings/${pending.booking.id}/${pending.action}`);
      toast.success(CONFIRM[pending.action].toast);
      setPending(null); refresh(); reload();
    } catch (e) { toast.error(e.message); setPending(null); reload(); }
    finally { setBusy(false); }
  }
  const tab = (r, label) => (
    <button role="tab" aria-selected={role === r} onClick={() => { setRole(r); setPage(1); }}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${role === r ? 'bg-brand-600 text-white' : 'text-ink-soft hover:bg-slate-100'}`}>{label}</button>
  );

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold">Bookings</h1>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Booking role" className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">{tab('learner', 'I’m learning')}{tab('teacher', 'I’m teaching')}</div>
        <select aria-label="Filter by status" className="input w-44" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          {STATUSES.map((s) => <option key={s} value={s}>{s ? s[0].toUpperCase() + s.slice(1) : 'All statuses'}</option>)}
        </select>
      </div>
      <div className="mt-6 space-y-4" aria-live="polite">
        {loading ? <PageLoader /> : error ? <ErrorState error={error} onRetry={reload} /> : data.data.length === 0 ? (
          <EmptyState title={role === 'learner' ? 'No learning sessions yet' : 'No incoming requests yet'}
            text={role === 'learner' ? 'Find a skill and book your first session.' : 'Add time slots to your listings so learners can request sessions.'}
            action={role === 'learner' ? <Link to="/marketplace" className="btn-primary">Explore Skills</Link> : <Link to="/teach" className="btn-primary">Manage listings</Link>} />
        ) : data.data.map((b) => <BookingCard key={b.id} booking={b} role={role} onAction={(action, booking) => setPending({ action, booking })} onReview={setReview} />)}
        <Pagination meta={data?.meta} onPage={setPage} />
      </div>
      {pending && <ConfirmDialog open danger={CONFIRM[pending.action].danger} busy={busy} title={CONFIRM[pending.action].title} confirmLabel={CONFIRM[pending.action].label}
        message={<p><strong className="text-ink">{pending.booking.skillTitle}</strong>. {CONFIRM[pending.action].msg}</p>} onClose={() => setPending(null)} onConfirm={run} />}
      {review && <ReviewModal booking={review} onClose={() => setReview(null)} onDone={() => { setReview(null); reload(); }} />}
    </div>
  );
}
