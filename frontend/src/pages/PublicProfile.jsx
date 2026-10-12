import { Link, useParams } from 'react-router-dom';
import useAsync from '../hooks/useAsync';
import { api } from '../services/api';
import { PageLoader } from '../components/common/Spinner';
import { ErrorState } from '../components/common/States';
import { Rating } from '../components/common/Stars';
import { fmtFull } from '../utils/format';

export default function PublicProfile() {
  const { id } = useParams();
  const { data, error, loading, reload } = useAsync(() => api.get(`/profiles/${id}`).then((r) => r.data), [id]);
  if (loading) return <PageLoader />;
  if (error) return <div className="container-page py-10"><ErrorState error={error} onRetry={reload} /></div>;
  const { profile, skillsOffered, activity, rating, reviews } = data;

  return (
    <div className="container-page max-w-3xl py-8">
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700" aria-hidden="true">{profile.name[0]}</span>
          <div><h1 className="text-2xl font-bold">{profile.name}</h1><p className="text-sm text-ink-soft">Member since {fmtFull(profile.memberSince)}</p><div className="mt-1"><Rating rating={rating} /></div></div>
        </div>
        {profile.bio && <p className="mt-4 text-ink-soft">{profile.bio}</p>}
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 text-center">
          <div><dt className="text-sm text-ink-soft">Sessions taught</dt><dd className="text-2xl font-bold">{activity.sessionsTaught}</dd></div>
          <div><dt className="text-sm text-ink-soft">Sessions completed as learner</dt><dd className="text-2xl font-bold">{activity.sessionsCompleted}</dd></div>
        </dl>
      </div>
      <section className="card mt-6 p-6"><h2 className="text-lg font-semibold">Skills offered</h2>
        {skillsOffered.length === 0 ? <p className="mt-2 text-sm text-ink-soft">No active listings.</p> : (
          <ul className="mt-3 divide-y divide-slate-100">{skillsOffered.map((s) => <li key={s._id} className="flex items-center justify-between py-3"><div><Link to={`/skills/${s._id}`} className="font-medium hover:text-brand-700">{s.title}</Link><p className="text-xs text-ink-soft">{s.category} · {s.level} · {s.durationMinutes} min</p></div><span className="text-sm font-semibold">{s.credits} cr</span></li>)}</ul>)}
      </section>
      {profile.skillsWanted.length > 0 && <section className="card mt-6 p-6"><h2 className="text-lg font-semibold">Wants to learn</h2><div className="mt-3 flex flex-wrap gap-2">{profile.skillsWanted.map((s) => <span key={s} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">{s}</span>)}</div></section>}
      <section className="card mt-6 p-6"><h2 className="text-lg font-semibold">Reviews</h2>
        {reviews.length === 0 ? <p className="mt-2 text-sm text-ink-soft">No reviews yet.</p> : (
          <ul className="mt-3 divide-y divide-slate-100">{reviews.map((r) => <li key={r.id} className="py-3"><div className="flex justify-between text-sm"><span className="font-medium">{r.reviewer?.name}</span><span className="text-xs text-ink-mute">{r.skill?.title}</span></div><Rating rating={{ avg: r.rating, count: 1 }} />{r.comment && <p className="mt-1 text-sm text-ink-soft">{r.comment}</p>}</li>)}</ul>)}
      </section>
    </div>
  );
}
