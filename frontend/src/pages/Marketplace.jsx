import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import SkillCard from '../components/marketplace/SkillCard';
import Pagination from '../components/common/Pagination';
import { EmptyState, ErrorState } from '../components/common/States';
import { PageLoader } from '../components/common/Spinner';
import useAsync from '../hooks/useAsync';
import { api } from '../services/api';
import { CATEGORIES, LEVELS } from '../utils/format';

export default function Marketplace() {
  const [params, setParams] = useSearchParams();
  const get = (k) => params.get(k) || '';
  const [q, setQ] = useState(get('q'));
  const [showFilters, setShowFilters] = useState(false);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries({ page: '', ...patch }).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };
  useEffect(() => { const t = setTimeout(() => q !== get('q') && update({ q }), 350); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [q]);

  const key = params.toString();
  const { data, error, loading, reload } = useAsync(
    () => api.get('/skills', { q: get('q'), category: get('category'), level: get('level'), minCredits: get('min'), maxCredits: get('max'), sort: get('sort') || 'newest', page: get('page') || 1, limit: 9 }),
    [key]
  );
  const clear = () => { setQ(''); setParams({}, { replace: true }); };
  const filtered = ['q', 'category', 'level', 'min', 'max'].some((k) => get(k));

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold">Explore Skills</h1>
      <p className="mt-1 text-ink-soft">Find a student who can teach what you want to learn.</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input type="search" aria-label="Search skills" className="input pl-9" placeholder="Search by skill or keyword" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select aria-label="Sort" className="input sm:w-48" value={get('sort') || 'newest'} onChange={(e) => update({ sort: e.target.value === 'newest' ? '' : e.target.value })}>
          <option value="newest">Newest</option><option value="price_asc">Credits: low to high</option><option value="price_desc">Credits: high to low</option>
        </select>
        <button className="btn-secondary sm:hidden" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}><SlidersHorizontal className="h-4 w-4" />Filters</button>
      </div>

      <div className={`mt-3 grid-cols-2 gap-3 sm:grid sm:grid-cols-4 ${showFilters ? 'grid' : 'hidden'}`}>
        <select aria-label="Category" className="input" value={get('category')} onChange={(e) => update({ category: e.target.value })}><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        <select aria-label="Level" className="input" value={get('level')} onChange={(e) => update({ level: e.target.value })}><option value="">All levels</option>{LEVELS.map((c) => <option key={c}>{c}</option>)}</select>
        <input aria-label="Minimum credits" type="number" min="0" className="input" placeholder="Min credits" value={get('min')} onChange={(e) => update({ min: e.target.value })} />
        <input aria-label="Maximum credits" type="number" min="0" className="input" placeholder="Max credits" value={get('max')} onChange={(e) => update({ max: e.target.value })} />
      </div>
      {filtered && <button className="mt-3 text-sm font-semibold text-brand-700 hover:underline" onClick={clear}>Clear filters</button>}

      <div className="mt-6" aria-live="polite">
        {loading ? <PageLoader label="Finding skills" /> : error ? <ErrorState error={error} onRetry={reload} />
          : data.data.length === 0 ? (
            <EmptyState title="Your next learning opportunity starts here." text={filtered ? 'No skills match those filters. Try widening your search.' : 'No skills have been listed yet.'}
              action={filtered ? <button className="btn-secondary" onClick={clear}>Clear filters</button> : <Link to="/teach/new" className="btn-primary">Share Your Skills</Link>} />
          ) : (<>
            <p className="mb-3 text-sm text-ink-soft">{data.meta.total} skill{data.meta.total === 1 ? '' : 's'}</p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.data.map((s) => <SkillCard key={s.id} skill={s} />)}</div>
            <Pagination meta={data.meta} onPage={(p) => update({ page: String(p) })} />
          </>)}
      </div>
    </div>
  );
}
