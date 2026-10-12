import { ArrowDownLeft, ArrowUpRight, Lock, RotateCcw, Gift } from 'lucide-react';
import { fmtDateTime } from '../../utils/format';

const META = {
  welcome: { label: 'Welcome', icon: Gift, sign: '+', cls: 'text-emerald-700' },
  reward: { label: 'Teaching reward', icon: ArrowDownLeft, sign: '+', cls: 'text-emerald-700' },
  refund: { label: 'Refund', icon: RotateCcw, sign: '+', cls: 'text-emerald-700' },
  reservation: { label: 'Reserved', icon: Lock, sign: '−', cls: 'text-amber-700' },
  settlement: { label: 'Paid', icon: ArrowUpRight, sign: '', cls: 'text-ink-soft' },
};

export const TX_TYPES = Object.entries(META).map(([value, m]) => ({ value, label: m.label }));

export default function TransactionTable({ items }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <caption className="sr-only">Credit transactions</caption>
        <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-ink-mute">
          <tr><th scope="col" className="py-2 pr-4 font-medium">Type</th><th scope="col" className="py-2 pr-4 font-medium">Description</th><th scope="col" className="py-2 pr-4 font-medium">Date</th><th scope="col" className="py-2 text-right font-medium">Credits</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((t) => {
            const m = META[t.type]; const Icon = m.icon;
            return (
              <tr key={t.id}>
                <td className="py-3 pr-4"><span className="inline-flex items-center gap-2 font-medium"><Icon className={`h-4 w-4 ${m.cls}`} aria-hidden="true" />{m.label}</span></td>
                <td className="py-3 pr-4 text-ink-soft">{t.description}</td>
                <td className="whitespace-nowrap py-3 pr-4 text-ink-soft">{fmtDateTime(t.createdAt)}</td>
                <td className={`py-3 text-right font-semibold ${m.cls}`}>{m.sign}{t.amount}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
