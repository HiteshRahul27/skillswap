import { Link } from 'react-router-dom';
import { Clock, Coins, CalendarCheck } from 'lucide-react';
import { Rating } from '../common/Stars';
import { fmtDateTime } from '../../utils/format';

export default function SkillCard({ skill }) {
  const open = skill.availability?.openSlots || 0;
  return (
    <article className="card flex flex-col p-5 transition-shadow hover:shadow-lift">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">{skill.category}</span>
        <span className="text-xs font-medium text-ink-mute">{skill.level}</span>
      </div>
      <h3 className="mt-3 text-base font-semibold leading-snug text-ink">
        <Link to={`/skills/${skill.id}`} className="hover:text-brand-700 focus-visible:underline">{skill.title}</Link>
      </h3>
      <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{skill.description}</p>
      <div className="mt-3 text-sm text-ink-soft">
        by <Link to={`/u/${skill.teacher.id}`} className="font-medium text-ink hover:text-brand-700">{skill.teacher.name}</Link>
        <div className="mt-1"><Rating rating={skill.rating} /></div>
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{skill.durationMinutes} min</span>
        <span className="inline-flex items-center gap-1" title={open && skill.availability.nextStart ? `Next: ${fmtDateTime(skill.availability.nextStart)}` : undefined}>
          <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />{open ? `${open} open slot${open > 1 ? 's' : ''}` : 'No open slots'}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="inline-flex items-center gap-1.5 font-semibold text-ink"><Coins className="h-4 w-4 text-brand-600" aria-hidden="true" />{skill.credits} credit{skill.credits > 1 ? 's' : ''}</span>
        <Link to={`/skills/${skill.id}`} className="btn-primary btn-sm">View details</Link>
      </div>
    </article>
  );
}
