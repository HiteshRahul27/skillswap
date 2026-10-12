import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, GraduationCap, Coins, CalendarCheck, CheckCircle2, Users } from 'lucide-react';
import SkillCard from '../components/marketplace/SkillCard';
import { EmptyState } from '../components/common/States';
import { Spinner } from '../components/common/Spinner';
import useAsync from '../hooks/useAsync';
import { api } from '../services/api';

const steps = [
  { icon: GraduationCap, title: 'Offer a skill', text: 'List something you can teach, set a credit price and add the times you are free.' },
  { icon: CalendarCheck, title: 'Book a session', text: 'Pick a slot with another student. Credits are reserved safely while you wait for confirmation.' },
  { icon: Coins, title: 'Earn and spend credits', text: 'When a session is completed the teacher earns the credits. Declined or cancelled sessions refund in full.' },
];

export default function Landing() {
  const featured = useAsync(() => api.get('/skills', { limit: 3 }).then((r) => r.data), []);
  const stats = useAsync(() => api.get('/stats').then((r) => r.data), []);

  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <div className="container-page grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="text-sm font-semibold text-brand-700">Learn Together. Grow Together.</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight text-ink sm:text-5xl">Your skills are worth sharing.</h1>
            <p className="mt-5 max-w-lg text-lg text-ink-soft">Teach what you know. Learn what you need. Grow through a community that exchanges knowledge, not money.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/marketplace" className="btn-primary px-5 py-3">Explore Skills<ArrowRight className="h-4 w-4" /></Link>
              <Link to="/teach" className="btn-secondary px-5 py-3">Share Your Skills</Link>
            </div>
          </div>
          <div className="card p-6" aria-label="How the credit exchange works">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-mute">The credit exchange</h2>
            <ol className="mt-4 space-y-4">
              {[['Teach a session', 'You earn the credits you set.'], ['Spend credits', 'Learn from another student.'], ['Repeat', 'Every account starts with welcome credits.']].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">{i + 1}</span>
                  <div><p className="font-semibold text-ink">{t}</p><p className="text-sm text-ink-soft">{d}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="container-page py-16" aria-labelledby="featured">
        <div className="flex items-end justify-between">
          <h2 id="featured" className="text-2xl font-bold">Featured skills</h2>
          <Link to="/marketplace" className="text-sm font-semibold text-brand-700 hover:underline">View all</Link>
        </div>
        <div className="mt-6">
          {featured.loading ? <div className="flex justify-center py-10 text-ink-mute"><Spinner /></div>
            : featured.error || !featured.data?.length ? (
              <EmptyState title="Your next learning opportunity starts here." text="No skills have been listed yet. Be the first to share one." action={<Link to="/teach" className="btn-primary">Share Your Skills</Link>} />
            ) : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{featured.data.map((s) => <SkillCard key={s.id} skill={s} />)}</div>}
        </div>
      </section>

      <section id="how-it-works" className="border-y border-slate-200 bg-white py-16">
        <div className="container-page">
          <h2 className="text-2xl font-bold">How it works</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title}>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><s.icon className="h-5 w-5" aria-hidden="true" /></div>
                <h3 className="mt-4 font-semibold">{i + 1}. {s.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page grid gap-6 py-16 md:grid-cols-2">
        {[
          { icon: GraduationCap, title: 'For teachers', items: ['Turn what you know into credits', 'You choose your price and your time slots', 'Build a profile with real reviews'] },
          { icon: BookOpen, title: 'For learners', items: ['Learn from students who just did it', 'No money changes hands', 'Cancel or get refunded under clear rules'] },
        ].map((b) => (
          <div key={b.title} className="card p-6">
            <div className="flex items-center gap-3"><b.icon className="h-5 w-5 text-brand-600" aria-hidden="true" /><h3 className="text-lg font-semibold">{b.title}</h3></div>
            <ul className="mt-4 space-y-2.5">{b.items.map((i) => <li key={i} className="flex gap-2 text-sm text-ink-soft"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />{i}</li>)}</ul>
          </div>
        ))}
      </section>

      {stats.data && (
        <section className="border-t border-slate-200 bg-white py-12" aria-label="Community">
          <div className="container-page flex flex-wrap items-center justify-center gap-x-12 gap-y-6 text-center">
            <Users className="hidden h-6 w-6 text-brand-600 sm:block" aria-hidden="true" />
            {[['Active members', stats.data.members], ['Active listings', stats.data.listings], ['Sessions completed', stats.data.completedSessions]].map(([l, n]) => (
              <div key={l}><p className="text-3xl font-bold text-ink">{n}</p><p className="text-sm text-ink-soft">{l}</p></div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
