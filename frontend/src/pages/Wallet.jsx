import { useState } from 'react';
import { Coins, Lock, TrendingUp, ArrowUpRight } from 'lucide-react';
import useAsync from '../hooks/useAsync';
import { api } from '../services/api';
import { PageLoader } from '../components/common/Spinner';
import { EmptyState, ErrorState } from '../components/common/States';
import Pagination from '../components/common/Pagination';
import TransactionTable, { TX_TYPES } from '../components/wallet/TransactionTable';

const Tile = ({ icon: Icon, label, value, help }) => (
  <div className="card p-5">
    <div className="flex items-center gap-2 text-sm text-ink-soft"><Icon className="h-4 w-4 text-brand-600" aria-hidden="true" />{label}</div>
    <p className="mt-2 text-3xl font-bold">{value}</p><p className="mt-1 text-xs text-ink-mute">{help}</p>
  </div>
);

export default function Wallet() {
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const w = useAsync(() => api.get('/wallet').then((r) => r.data), []);
  const tx = useAsync(() => api.get('/wallet/transactions', { type, page, limit: 10 }), [type, page]);

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold">Your Learning Balance</h1>
      <p className="mt-1 text-ink-soft">Credits are earned by teaching and spent by learning. They have no cash value.</p>
      {w.loading ? <PageLoader /> : w.error ? <div className="mt-6"><ErrorState error={w.error} onRetry={w.reload} /></div> : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile icon={Coins} label="Available" value={w.data.available} help="Ready to spend" />
          <Tile icon={Lock} label="Reserved" value={w.data.reserved} help="Held for upcoming sessions" />
          <Tile icon={TrendingUp} label="Earned" value={w.data.earned} help="From completed teaching" />
          <Tile icon={ArrowUpRight} label="Spent" value={w.data.spent} help="Paid for completed sessions" />
        </div>
      )}
      <section className="card mt-8 p-5" aria-labelledby="hist">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="hist" className="text-lg font-semibold">Transaction history</h2>
          <select aria-label="Filter by type" className="input w-48" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            <option value="">All types</option>{TX_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="mt-4">
          {tx.loading ? <PageLoader /> : tx.error ? <ErrorState error={tx.error} onRetry={tx.reload} />
            : tx.data.data.length === 0 ? <EmptyState title="No transactions yet" text="Your credit history will appear here." />
            : <><TransactionTable items={tx.data.data} /><Pagination meta={tx.data.meta} onPage={setPage} /></>}
        </div>
        <p className="mt-4 text-xs text-ink-mute">The history is an append-only ledger. Entries cannot be edited or deleted.</p>
      </section>
    </div>
  );
}
