import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Trash2, Plus } from 'lucide-react';
import Field from '../components/common/Field';
import { PageLoader, Spinner } from '../components/common/Spinner';
import { ErrorState } from '../components/common/States';
import { ConfirmDialog } from '../components/common/Modal';
import useAsync from '../hooks/useAsync';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { CATEGORIES, LEVELS, fmtDateTime, toLocalInput } from '../utils/format';

const blank = { title: '', category: 'Programming', description: '', level: 'Beginner', outcomes: '', durationMinutes: 30, credits: 3 };

function Slots({ skill }) {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync(() => api.get('/availability', { skill: skill.id }).then((r) => r.data), [skill.id]);
  const [start, setStart] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  async function add(e) {
    e.preventDefault();
    if (!start) return setErr('Choose a start time');
    const s = new Date(start);
    setBusy(true); setErr('');
    try {
      await api.post('/availability', { skill: skill.id, start: s.toISOString(), end: new Date(s.getTime() + skill.durationMinutes * 60000).toISOString() });
      setStart(''); toast.success('Time slot added.'); reload();
    } catch (x) { setErr(x.fields?.start || x.fields?.end || x.message); }
    finally { setBusy(false); }
  }
  async function remove() {
    try { await api.del(`/availability/${del.id}`); toast.success('Time slot removed.'); reload(); } catch (x) { toast.error(x.message); }
    setDel(null);
  }
  const upcoming = (data || []).filter((x) => new Date(x.end) > new Date());

  return (
    <section className="card mt-6 p-6" aria-labelledby="slots-h">
      <h2 id="slots-h" className="text-lg font-semibold">Availability</h2>
      <p className="mt-1 text-sm text-ink-soft">Each slot lasts {skill.durationMinutes} minutes, matching your session length.</p>
      <form onSubmit={add} className="mt-4 flex flex-wrap items-start gap-3">
        <div className="min-w-[14rem] flex-1">
          <label htmlFor="slot-start" className="sr-only">Slot start</label>
          <input id="slot-start" type="datetime-local" className={`input ${err ? 'input-error' : ''}`} min={toLocalInput(new Date())} value={start} onChange={(e) => setStart(e.target.value)} aria-invalid={Boolean(err)} />
          {err && <p role="alert" className="mt-1.5 text-sm text-red-600">{err}</p>}
        </div>
        <button className="btn-primary" disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : <Plus className="h-4 w-4" />}Add slot</button>
      </form>
      <div className="mt-4">
        {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={reload} /> : upcoming.length === 0 ? <p className="text-sm text-ink-soft">No upcoming slots yet. Learners can book only when you add some.</p> : (
          <ul className="divide-y divide-slate-100">{upcoming.map((x) => (
            <li key={x.id} className="flex items-center justify-between py-2.5 text-sm">
              <span>{fmtDateTime(x.start)}</span>
              {x.isBooked ? <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-800">Booked</span>
                : <button className="btn-ghost btn-sm text-red-700" onClick={() => setDel(x)} aria-label={`Remove slot ${fmtDateTime(x.start)}`}><Trash2 className="h-4 w-4" /></button>}
            </li>))}</ul>
        )}
      </div>
      <ConfirmDialog open={Boolean(del)} danger title="Remove this slot?" confirmLabel="Remove slot" onClose={() => setDel(null)} onConfirm={remove} message={<p>{del && fmtDateTime(del.start)} will no longer be bookable.</p>} />
    </section>
  );
}

export default function SkillForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const nav = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const { data, error, loading, reload } = useAsync(() => (editing ? api.get(`/skills/${id}`).then((r) => r.data) : Promise.resolve(null)), [id]);

  useEffect(() => {
    if (data) setForm({ title: data.title, category: data.category, description: data.description, level: data.level, outcomes: data.outcomes.join('\n'), durationMinutes: data.durationMinutes, credits: data.credits });
  }, [data]);

  if (editing && loading) return <PageLoader />;
  if (editing && error) return <div className="container-page py-10"><ErrorState error={error} onRetry={reload} /></div>;
  if (editing && data && !data.isOwner) return <div className="container-page py-10"><ErrorState error={{ message: 'You can only edit your own listings.' }} /></div>;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErrors({}); setFormError('');
    const body = { ...form, durationMinutes: Number(form.durationMinutes), credits: Number(form.credits), outcomes: form.outcomes.split('\n').map((x) => x.trim()).filter(Boolean) };
    try {
      if (editing) { await api.patch(`/skills/${id}`, body); toast.success('Listing updated.'); reload(); }
      else { const { data: created } = await api.post('/skills', body); toast.success('Listing created. Add time slots so learners can book.'); nav(`/teach/${created.id}/edit`, { replace: true }); }
    } catch (err) { Object.keys(err.fields || {}).length ? setErrors(err.fields) : setFormError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="container-page max-w-3xl py-8">
      <Link to="/teach" className="text-sm font-medium text-ink-soft hover:text-ink">← Your listings</Link>
      <h1 className="mt-3 text-2xl font-bold">{editing ? 'Edit listing' : 'Share a skill'}</h1>
      <form onSubmit={submit} className="card mt-5 space-y-5 p-6" noValidate>
        {formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
        <Field label="Title" value={form.title} onChange={set('title')} error={errors.title} maxLength={80} placeholder="e.g. React fundamentals in one session" />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field as="select" label="Category" value={form.category} onChange={set('category')} error={errors.category}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Field>
          <Field as="select" label="Level" value={form.level} onChange={set('level')} error={errors.level}>{LEVELS.map((c) => <option key={c}>{c}</option>)}</Field>
        </div>
        <Field as="textarea" rows={5} label="Description" value={form.description} onChange={set('description')} error={errors.description} maxLength={1500} hint="At least 20 characters. Say what the session covers and who it suits." />
        <Field as="textarea" rows={3} label="Learning outcomes" value={form.outcomes} onChange={set('outcomes')} error={errors.outcomes} hint="One per line, up to 6." />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field type="number" min="15" max="240" step="5" label="Session length (minutes)" value={form.durationMinutes} onChange={set('durationMinutes')} error={errors.durationMinutes} hint="Changing this affects slots you add afterwards." />
          <Field type="number" min="1" max="100" step="1" label="Credits per session" value={form.credits} onChange={set('credits')} error={errors.credits} hint="Whole numbers only. Existing bookings keep their original price." />
        </div>
        <div className="flex justify-end gap-3"><Link to="/teach" className="btn-secondary">Cancel</Link><button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />}{editing ? 'Save changes' : 'Create listing'}</button></div>
      </form>
      {editing && data && <Slots skill={data} />}
    </div>
  );
}
