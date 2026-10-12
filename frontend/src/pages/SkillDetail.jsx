import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Clock, Coins, Target, Pencil } from 'lucide-react';
import useAsync from '../hooks/useAsync';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PageLoader, Spinner } from '../components/common/Spinner';
import { ErrorState } from '../components/common/States';
import { Rating } from '../components/common/Stars';
import { ConfirmDialog } from '../components/common/Modal';
import { fmtDate, fmtDateTime, fmtTime, fmtFull } from '../utils/format';

export default function SkillDetail() {
  const { id } = useParams();
  const { user, wallet, refresh } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const { data: s, error, loading, reload } = useAsync(() => api.get(`/skills/${id}`).then((r) => r.data), [id, user?.id]);
  const [slotId, setSlotId] = useState('');
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bookError, setBookError] = useState('');

  if (loading) return <PageLoader />;
  if (error) return <div className="container-page py-10"><ErrorState error={error} onRetry={reload} /></div>;

  const slot = s.slots.find((x) => x.id === slotId);
  const free = s.slots.filter((x) => !x.isBooked);
  const days = free.reduce((acc, x) => { const k = fmtDate(x.start); (acc[k] = acc[k] || []).push(x); return acc; }, {});
  const short = wallet && wallet.available < s.credits;

  async function book() {
    setBusy(true); setBookError('');
    try {
      await api.post('/bookings', { slot: slotId, note: note || undefined });
      await refresh();
      toast.success('Your session is booked.');
      nav('/bookings');
    } catch (e) {
      setConfirming(false); setBookError(e.message);
      if (e.code === 'SLOT_TAKEN') { setSlotId(''); reload(); }
    } finally { setBusy(false); }
  }

  return (
    <div className="container-page py-8">
      <Link to="/marketplace" className="text-sm font-medium text-ink-soft hover:text-ink">← Back to Explore</Link>
      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-6">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-medium text-brand-700">{s.category}</span>
              <span className="font-medium text-ink-mute">{s.level}</span>
              {s.status !== 'active' && <span className="rounded-full bg-amber-50 px-2.5 py-0.5 font-medium text-amber-800">Hidden: {s.status}</span>}
            </div>
            <h1 className="mt-3 text-2xl font-bold">{s.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-ink-soft">
              <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" aria-hidden="true" />{s.durationMinutes} minutes</span>
              <span className="inline-flex items-center gap-1.5"><Coins className="h-4 w-4 text-brand-600" aria-hidden="true" />{s.credits} credit{s.credits > 1 ? 's' : ''}</span>
              <Rating rating={s.rating} />
            </div>
            <p className="mt-5 whitespace-pre-line text-ink-soft">{s.description}</p>
            {s.outcomes.length > 0 && (
              <div className="mt-6">
                <h2 className="flex items-center gap-2 text-base font-semibold"><Target className="h-4 w-4 text-brand-600" aria-hidden="true" />What you'll learn</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">{s.outcomes.map((o) => <li key={o}>{o}</li>)}</ul>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h2 className="text-base font-semibold">About the teacher</h2>
            <p className="mt-2"><Link to={`/u/${s.teacher.id}`} className="font-semibold text-brand-700 hover:underline">{s.teacher.name}</Link></p>
            {s.teacher.bio && <p className="mt-1 text-sm text-ink-soft">{s.teacher.bio}</p>}
            <div className="mt-2"><Rating rating={s.teacher.rating} /></div>
          </div>

          <div className="card p-6">
            <h2 className="text-base font-semibold">Reviews</h2>
            {s.reviews.length === 0 ? <p className="mt-2 text-sm text-ink-soft">No reviews yet. Reviews appear after completed sessions.</p> : (
              <ul className="mt-3 divide-y divide-slate-100">{s.reviews.map((r) => (
                <li key={r.id} className="py-3"><div className="flex items-center justify-between text-sm"><span className="font-medium">{r.reviewer?.name || 'Student'}</span><span className="text-xs text-ink-mute">{fmtFull(r.createdAt)}</span></div>
                  <Rating rating={{ avg: r.rating, count: 1 }} />{r.comment && <p className="mt-1 text-sm text-ink-soft">{r.comment}</p>}</li>
              ))}</ul>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            {s.isOwner ? (
              <div><p className="text-sm text-ink-soft">This is your listing. You cannot book it.</p><Link to={`/teach/${s.id}/edit`} className="btn-primary mt-4 w-full"><Pencil className="h-4 w-4" />Manage listing & slots</Link></div>
            ) : s.status !== 'active' ? <p className="text-sm text-ink-soft">This listing is not available for booking.</p> : (
              <>
                <h2 className="text-base font-semibold">Book a session</h2>
                {free.length === 0 ? <p className="mt-3 text-sm text-ink-soft">No open time slots right now. Check back soon.</p> : (
                  <fieldset className="mt-3 space-y-4">
                    <legend className="sr-only">Choose a time slot</legend>
                    {Object.entries(days).map(([day, list]) => (
                      <div key={day}><p className="text-xs font-semibold uppercase tracking-wide text-ink-mute">{day}</p>
                        <div className="mt-2 flex flex-wrap gap-2">{list.map((x) => (
                          <label key={x.id} className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-brand-600 ${slotId === x.id ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 hover:bg-slate-50'}`}>
                            <input type="radio" name="slot" className="sr-only" checked={slotId === x.id} onChange={() => setSlotId(x.id)} />{fmtTime(x.start)}
                          </label>))}</div></div>
                    ))}
                  </fieldset>
                )}
                {free.length > 0 && (<>
                  <label htmlFor="note" className="label mt-4">Note to teacher (optional)</label>
                  <textarea id="note" rows={3} maxLength={300} className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What would you like to focus on?" />
                  <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm"><span className="text-ink-soft">Cost</span><span className="font-semibold">{s.credits} credit{s.credits > 1 ? 's' : ''}</span></div>
                  {user && wallet && <p className={`mt-2 text-xs ${short ? 'text-red-600' : 'text-ink-mute'}`}>{short ? `You have ${wallet.available} available. You need ${s.credits - wallet.available} more.` : `Your available balance: ${wallet.available}`}</p>}
                  {bookError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{bookError}</p>}
                  {user ? <button className="btn-primary mt-4 w-full" disabled={!slotId || short} onClick={() => setConfirming(true)}>Request booking</button>
                    : <Link to="/login" state={{ from: `/skills/${s.id}` }} className="btn-primary mt-4 w-full">Log in to book</Link>}
                </>)}
              </>
            )}
          </div>
        </aside>
      </div>

      <ConfirmDialog open={confirming} busy={busy} title="Confirm your booking" confirmLabel={`Reserve ${s.credits} credit${s.credits > 1 ? 's' : ''}`} onClose={() => setConfirming(false)} onConfirm={book}
        message={slot && <p><strong className="text-ink">{s.title}</strong> on <strong className="text-ink">{fmtDateTime(slot.start)}</strong>. {s.credits} credit{s.credits > 1 ? 's are' : ' is'} reserved now and paid to the teacher only after the session is completed. Declined or cancelled sessions are refunded.</p>} />
      {busy && <span className="sr-only"><Spinner /></span>}
    </div>
  );
}
