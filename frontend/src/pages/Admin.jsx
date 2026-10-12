import { useState } from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import useAsync from '../hooks/useAsync';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageLoader } from '../components/common/Spinner';
import { ErrorState, EmptyState } from '../components/common/States';
import Pagination from '../components/common/Pagination';
import StatusBadge from '../components/common/StatusBadge';
import { ConfirmDialog } from '../components/common/Modal';
import { fmtDateTime } from '../utils/format';

const Table = ({ head, children }) => (
  <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
    <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-ink-mute"><tr>{head.map((h) => <th key={h} scope="col" className="py-2 pr-4 font-medium">{h}</th>)}</tr></thead>
    <tbody className="divide-y divide-slate-100">{children}</tbody></table></div>
);

function List({ path, filters, render, head, empty, deps = [] }) {
  const [page, setPage] = useState(1);
  const [f, setF] = useState({});
  const { data, error, loading, reload } = useAsync(() => api.get(path, { ...f, page, limit: 15 }), [page, JSON.stringify(f), ...deps]);
  return (
    <div>
      {filters && <div className="mb-4 flex flex-wrap gap-3">{filters(f, (patch) => { setF({ ...f, ...patch }); setPage(1); })}</div>}
      {loading ? <PageLoader /> : error ? <ErrorState error={error} onRetry={reload} /> : data.data.length === 0 ? <EmptyState title={empty} />
        : <><Table head={head}>{data.data.map((row) => render(row, reload))}</Table><Pagination meta={data.meta} onPage={setPage} /></>}
    </div>
  );
}

function Users() {
  const toast = useToast();
  const [target, setTarget] = useState(null);
  const [version, setVersion] = useState(0);
  async function apply() {
    const next = target.status === 'active' ? 'suspended' : 'active';
    try { await api.patch(`/admin/users/${target.id}/status`, { status: next }); toast.success(next === 'suspended' ? 'Account suspended.' : 'Account reactivated.'); setVersion((v) => v + 1); }
    catch (e) { toast.error(e.message); }
    setTarget(null);
  }
  return (<>
    <List path="/admin/users" deps={[version]} head={['Name', 'Email', 'Role', 'Status', 'Joined', '']} empty="No users found"
      filters={(f, set) => (<>
        <input aria-label="Search users" className="input w-64" placeholder="Search name or email" value={f.q || ''} onChange={(e) => set({ q: e.target.value })} />
        <select aria-label="Status" className="input w-40" value={f.status || ''} onChange={(e) => set({ status: e.target.value })}><option value="">All</option><option value="active">Active</option><option value="suspended">Suspended</option></select></>)}
      render={(u) => (
        <tr key={u.id}><td className="py-3 pr-4 font-medium">{u.name}</td><td className="py-3 pr-4 text-ink-soft">{u.email}</td><td className="py-3 pr-4 capitalize">{u.role}</td>
          <td className="py-3 pr-4"><StatusBadge status={u.status} /></td><td className="py-3 pr-4 text-ink-soft">{fmtDateTime(u.createdAt)}</td>
          <td className="py-3 text-right">{u.role !== 'admin' && <button className="btn-secondary btn-sm" onClick={() => setTarget(u)}>{u.status === 'active' ? 'Suspend' : 'Reactivate'}</button>}</td></tr>)} />
    <ConfirmDialog open={Boolean(target)} danger={target?.status === 'active'} title={target?.status === 'active' ? 'Suspend this account?' : 'Reactivate this account?'} confirmLabel={target?.status === 'active' ? 'Suspend' : 'Reactivate'} onClose={() => setTarget(null)} onConfirm={apply}
      message={<p>{target?.status === 'active' ? `${target?.name} will be signed out of access and their listings will be hidden.` : `${target?.name} will be able to sign in again. Their listings stay hidden until they re-activate them.`}</p>} />
  </>);
}

function Listings() {
  const toast = useToast();
  const [version, setVersion] = useState(0);
  async function set(s, status) {
    try { await api.patch(`/admin/skills/${s.id}/moderation`, { status }); toast.success(status === 'removed' ? 'Listing removed from the marketplace.' : 'Listing restored.'); setVersion((v) => v + 1); }
    catch (e) { toast.error(e.message); }
  }
  return <List path="/admin/skills" deps={[version]} head={['Title', 'Teacher', 'Category', 'Credits', 'Status', '']} empty="No listings found"
    filters={(f, setf) => <select aria-label="Status" className="input w-40" value={f.status || ''} onChange={(e) => setf({ status: e.target.value })}><option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="removed">Removed</option></select>}
    render={(s) => (<tr key={s.id}><td className="py-3 pr-4 font-medium">{s.title}</td><td className="py-3 pr-4 text-ink-soft">{s.teacher?.name}</td><td className="py-3 pr-4">{s.category}</td><td className="py-3 pr-4">{s.credits}</td><td className="py-3 pr-4"><StatusBadge status={s.status} /></td>
      <td className="py-3 text-right">{s.status === 'removed' ? <button className="btn-secondary btn-sm" onClick={() => set(s, 'active')}>Restore</button> : <button className="btn-secondary btn-sm text-red-700" onClick={() => set(s, 'removed')}>Remove</button>}</td></tr>)} />;
}

const Bookings = () => <List path="/admin/bookings" head={['Session', 'Learner', 'Teacher', 'When', 'Credits', 'Status']} empty="No bookings yet"
  filters={(f, set) => <select aria-label="Status" className="input w-40" value={f.status || ''} onChange={(e) => set({ status: e.target.value })}><option value="">All</option>{['pending', 'confirmed', 'completed', 'cancelled', 'rejected'].map((s) => <option key={s}>{s}</option>)}</select>}
  render={(b) => <tr key={b.id}><td className="py-3 pr-4 font-medium">{b.skillTitle}</td><td className="py-3 pr-4">{b.learner?.name}</td><td className="py-3 pr-4">{b.teacher?.name}</td><td className="py-3 pr-4 text-ink-soft">{fmtDateTime(b.startsAt)}</td><td className="py-3 pr-4">{b.credits}</td><td className="py-3"><StatusBadge status={b.status} /></td></tr>} />;

function Ledger() {
  const audit = useAsync(() => api.get('/admin/ledger/audit').then((r) => r.data), []);
  return (<div>
    <div className={`mb-4 flex items-center gap-3 rounded-lg border p-3 text-sm ${audit.data?.consistent === false ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`} role="status">
      {audit.loading ? 'Checking wallets against the ledger…' : audit.error ? audit.error.message : audit.data.consistent
        ? <><ShieldCheck className="h-5 w-5" />All {audit.data.walletsChecked} wallets match the ledger.</>
        : <><ShieldAlert className="h-5 w-5" />{audit.data.issues.length} mismatch(es) found between wallets and the ledger. Investigate before further changes.</>}
    </div>
    <List path="/admin/ledger" head={['When', 'User', 'Type', 'Credits', 'Description']} empty="No ledger entries"
      filters={(f, set) => <select aria-label="Type" className="input w-44" value={f.type || ''} onChange={(e) => set({ type: e.target.value })}><option value="">All types</option>{['welcome', 'reservation', 'refund', 'settlement', 'reward'].map((s) => <option key={s}>{s}</option>)}</select>}
      render={(t) => <tr key={t.id}><td className="whitespace-nowrap py-3 pr-4 text-ink-soft">{fmtDateTime(t.createdAt)}</td><td className="py-3 pr-4">{t.user?.name}</td><td className="py-3 pr-4 capitalize">{t.type}</td><td className="py-3 pr-4 font-semibold">{t.amount}</td><td className="py-3 text-ink-soft">{t.description}</td></tr>} />
  </div>);
}

const TABS = [['users', 'Users', Users], ['listings', 'Listings', Listings], ['bookings', 'Bookings', Bookings], ['ledger', 'Ledger', Ledger]];

export default function Admin() {
  const [tab, setTab] = useState('users');
  const Active = TABS.find((t) => t[0] === tab)[2];
  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold">Administration</h1>
      <div role="tablist" aria-label="Admin sections" className="mt-5 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:inline-flex">
        {TABS.map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === k ? 'bg-brand-600 text-white' : 'text-ink-soft hover:bg-slate-100'}`}>{label}</button>)}
      </div>
      <div className="card mt-6 p-5"><Active /></div>
    </div>
  );
}
