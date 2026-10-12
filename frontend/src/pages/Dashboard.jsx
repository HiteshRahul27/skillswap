import { Link } from 'react-router-dom';
import { Coins, Lock, TrendingUp, Search, GraduationCap, CalendarCheck, Inbox } from 'lucide-react';
import useAsync from '../hooks/useAsync';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/common/Spinner';
import { ErrorState, EmptyState } from '../components/common/States';
import StatusBadge from '../components/common/StatusBadge';
import TransactionTable from '../components/wallet/TransactionTable';
import { fmtDateTime } from '../utils/format';

const Stat = ({ icon: Icon, label, value, to }) => (
  <Link to={to} className="card flex items-center gap-4 p-5 transition-shadow hover:shadow-lift">
    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon className="h-5 w-5" aria-hidden="true" /></span>
    <span><span className="block text-2xl font-bold text-ink">{value}</span><span className="text-sm text-ink-soft">{label}</span></span>
  </Link>
);

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const { data, error, loading, reload } = useAsync(async () => {
    const [wallet, summary, mine, learning, teaching, tx] = await Promise.all([
      api.get('/wallet'), api.get('/wallet/summary'), api.get('/skills/mine'),
      api.get('/bookings', { role: 'learner', limit: 50 }), api.get('/bookings', { role: 'teacher', limit: 50 }),
      api.get('/wallet/transactions', { limit: 5 }),
    ]);
    refresh();
    return { wallet: wallet.data, summary: summary.data, mine: mine.data, learning: learning.data, teaching: teaching.data, tx: tx.data };
  }, []);

  if (loading) return <PageLoader label="Loading your dashboard" />;
  if (error) return <div className="container-page py-10"><ErrorState error={error} onRetry={reload} /></div>;
  const { wallet, summary, mine, learning, teaching, tx } = data;
  const now = new Date();
  const upcoming = [...learning.map((b) => ({ ...b, role: 'learner' })), ...teaching.map((b) => ({ ...b, role: 'teacher' }))]
    .filter((b) => ['pending', 'confirmed'].includes(b.status) && new Date(b.endsAt) > now)
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)).slice(0, 5);

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold">Welcome back, {user.name.split(' ')[0]}.</h1>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link to="/marketplace" className="btn-primary"><Search className="h-4 w-4" />Explore Skills</Link>
        <Link to="/teach/new" className="btn-secondary"><GraduationCap className="h-4 w-4" />Share Your Skills</Link>
        <Link to="/bookings" className="btn-secondary"><CalendarCheck className="h-4 w-4" />Manage bookings</Link>
      </div>

      <section className="mt-8" aria-labelledby="balance">
        <h2 id="balance" className="text-lg font-semibold">Your Learning Balance</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <Stat icon={Coins} label="Available credits" value={wallet.available} to="/wallet" />
          <Stat icon={Lock} label="Reserved for sessions" value={wallet.reserved} to="/wallet" />
          <Stat icon={TrendingUp} label="Earned by teaching" value={wallet.earned} to="/wallet" />
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2" aria-labelledby="upcoming">
          <div className="flex items-center justify-between"><h2 id="upcoming" className="text-lg font-semibold">Upcoming sessions</h2><Link to="/bookings" className="text-sm font-semibold text-brand-700 hover:underline">All bookings</Link></div>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-ink-soft">
            <span>{summary.pendingIncoming} request{summary.pendingIncoming === 1 ? '' : 's'} awaiting you</span>
            <span>{summary.pendingOutgoing} awaiting a teacher</span>
            <span>{summary.completedLearning} learned</span><span>{summary.completedTeaching} taught</span>
          </div>
          {upcoming.length === 0 ? <div className="mt-4"><EmptyState title="Nothing scheduled" text="Book a session or add time slots to your listings." /></div> : (
            <ul className="mt-4 divide-y divide-slate-100">
              {upcoming.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div><p className="font-medium">{b.skillTitle}</p><p className="text-sm text-ink-soft">{fmtDateTime(b.startsAt)} · {b.role === 'teacher' ? `Teaching ${b.learner.name}` : `With ${b.teacher.name}`}</p></div>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className="card p-5" aria-labelledby="offered">
            <div className="flex items-center justify-between"><h2 id="offered" className="text-lg font-semibold">Skills you offer</h2><Link to="/teach" className="text-sm font-semibold text-brand-700 hover:underline">Manage</Link></div>
            {mine.length === 0 ? <p className="mt-3 text-sm text-ink-soft">You haven't listed a skill yet.</p> : (
              <ul className="mt-3 space-y-2">{mine.slice(0, 4).map((s) => <li key={s.id} className="flex items-center justify-between gap-2 text-sm"><Link to={`/skills/${s.id}`} className="truncate font-medium hover:text-brand-700">{s.title}</Link><StatusBadge status={s.status} /></li>)}</ul>
            )}
          </section>
          <section className="card p-5" aria-labelledby="wanted">
            <div className="flex items-center justify-between"><h2 id="wanted" className="text-lg font-semibold">Skills you want</h2><Link to="/profile" className="text-sm font-semibold text-brand-700 hover:underline">Edit</Link></div>
            {user.skillsWanted?.length ? <div className="mt-3 flex flex-wrap gap-2">{user.skillsWanted.map((s) => <Link key={s} to={`/marketplace?q=${encodeURIComponent(s)}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium hover:bg-brand-50 hover:text-brand-700">{s}</Link>)}</div>
              : <p className="mt-3 text-sm text-ink-soft">Add what you'd like to learn on your profile.</p>}
          </section>
        </div>
      </div>

      <section className="card mt-6 p-5" aria-labelledby="recent">
        <div className="flex items-center justify-between"><h2 id="recent" className="text-lg font-semibold">Recent credit activity</h2><Link to="/wallet" className="text-sm font-semibold text-brand-700 hover:underline">Full history</Link></div>
        <div className="mt-3">{tx.length ? <TransactionTable items={tx} /> : <p className="flex items-center gap-2 text-sm text-ink-soft"><Inbox className="h-4 w-4" />No transactions yet.</p>}</div>
      </section>
    </div>
  );
}
