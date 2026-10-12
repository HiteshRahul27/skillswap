import { Star } from 'lucide-react';

export function Rating({ rating }) {
  if (!rating || !rating.count) return <span className="text-xs text-ink-mute">No reviews yet</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-soft" aria-label={`${rating.avg} out of 5 from ${rating.count} reviews`}>
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
      <span className="font-semibold text-ink">{rating.avg}</span> ({rating.count})
    </span>
  );
}

export function StarPicker({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Rating" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => onChange(n)} className="rounded p-0.5">
          <Star className={`h-7 w-7 ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
        </button>
      ))}
    </div>
  );
}
